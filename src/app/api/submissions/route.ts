import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getFilebaseClient,
  validateFileMetadata,
  sanitizeFilename,
  getCanonicalMimeType,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/filebase-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getContent } from '@/lib/content';

// In-memory rate limiter: max 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (record.count >= 5) {
    return false;
  }

  record.count += 1;
  return true;
}

const REG_CODE_PATTERN = /^TMIT-\d{3}$/;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // 2. Submission window check (Open/Closed & Deadline)
    const content = await getContent();
    const subsConfig = content.submissions;
    const isManuallyClosed = subsConfig?.isOpen === false;
    const isPastDeadline = Boolean(
      subsConfig?.deadline && Date.now() > new Date(subsConfig.deadline).getTime()
    );

    if (isManuallyClosed || isPastDeadline) {
      return NextResponse.json(
        {
          error:
            subsConfig?.closedMessage ||
            'PPT submissions are currently closed. Thank you for your interest.',
        },
        { status: 403 }
      );
    }

    // 3. Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Could not parse form data. Please try again.' },
        { status: 400 }
      );
    }

    const regCode = formData.get('reg_code');
    if (!regCode || typeof regCode !== 'string' || !regCode.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: reg_code' },
        { status: 400 }
      );
    }

    // 3. Normalize & validate reg_code format (e.g. "TMIT 001", "tmit-001", "TMIT-001")
    let regCodeTrimmed = regCode.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
    if (/^[A-Za-z]+\d{3,}$/.test(regCodeTrimmed) && !regCodeTrimmed.includes('-')) {
      const match = regCodeTrimmed.match(/^([A-Za-z]+)(\d+)$/);
      if (match) regCodeTrimmed = `${match[1]}-${match[2]}`;
    }

    if (!REG_CODE_PATTERN.test(regCodeTrimmed)) {
      return NextResponse.json(
        { error: 'Invalid reg_code format. Expected format: TMIT-XXX (e.g. TMIT-001 or TMIT 001)' },
        { status: 400 }
      );
    }

    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      );
    }

    const file = fileEntry as File;

    // Get Supabase client
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 4. Verify reg_code exists in teams table
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, reg_code')
      .eq('reg_code', regCodeTrimmed)
      .maybeSingle();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Registration code not found. Please check your reg_code (e.g. TMIT-001) and try again.' },
        { status: 404 }
      );
    }

    // 5. Check if a submission already exists for this reg_code
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('reg_code', regCodeTrimmed)
      .maybeSingle();

    if (existingSubmission) {
      return NextResponse.json(
        {
          error: `A presentation has already been submitted for team ${regCodeTrimmed}. Submissions are limited to one per team.`,
        },
        { status: 409 }
      );
    }

    // 6. Validate file metadata
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`,
        },
        { status: 400 }
      );
    }

    const contentType = getCanonicalMimeType(file.name, file.type);
    const validation = validateFileMetadata(file.name, contentType, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 7. Build object key
    const cleanName = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const objectKey = `submissions/${regCodeTrimmed}/${timestamp}-${cleanName}`;

    // 8. Upload to Filebase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const s3 = getFilebaseClient();
    const bucket = process.env.FILEBASE_BUCKET || 'thinkmit-upload';

    console.log(
      `[API /submissions] Uploading ${cleanName} (${(file.size / 1024).toFixed(1)} KB) → ${bucket}/${objectKey}`
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        ContentLength: file.size,
      })
    );

    console.log(`[API /submissions] ✓ Upload success: ${objectKey}`);

    // 9. Insert row into submissions table
    const { error: insertError } = await supabase
      .from('submissions')
      .insert({
        reg_code: regCodeTrimmed,
        filebase_key: objectKey,
        filename: cleanName,
        file_size_bytes: file.size,
        content_type: contentType,
      });

    if (insertError) {
      console.error('[API /submissions] DB insert error:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to record submission. Please try again.' },
        { status: 500 }
      );
    }

    // 10. Return success
    return NextResponse.json(
      {
        success: true,
        reg_code: regCodeTrimmed,
        filename: cleanName,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Submission failed. Please try again.';
    console.error('[API /submissions] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
