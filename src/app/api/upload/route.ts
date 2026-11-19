import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getFilebaseClient,
  validateFileMetadata,
  sanitizeFilename,
  getCanonicalMimeType,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/filebase-server';
import crypto from 'crypto';

// Rate limiter: max 10 uploads per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 10) return false;
  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Could not parse form data. Please try again.' },
        { status: 400 }
      );
    }

    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const file = fileEntry as File;
    const identifier = String(formData.get('identifier') || '');

    // Server-side validation
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

    // Build the object key matching the exact submission_key number
    const cleanName = sanitizeFilename(file.name);
    
    // Extract the timestamp/numeric prefix from identifier (e.g. "sub_1795062544264_yqwu54" -> "1795062544264")
    const numMatch = identifier ? String(identifier).match(/\d{10,}/) : null;
    const submissionNumber = numMatch ? numMatch[0] : String(Date.now());
    
    // Use the submission key directly for the folder
    const safeFolder = identifier
      ? String(identifier).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40)
      : `sub_${submissionNumber}`;

    // Filename prefix uses the EXACT same number as the Supabase submission_key
    const prefixedFilename = `${submissionNumber}-${cleanName}`;
    const objectKey = `submissions/${safeFolder}/${prefixedFilename}`;

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly to Filebase — server to S3, no CORS involved
    const s3 = getFilebaseClient();
    const bucket = process.env.FILEBASE_BUCKET || 'think-mitm';

    console.log(
      `[API /upload] Uploading ${cleanName} (${(file.size / 1024).toFixed(1)} KB) → ${bucket}/${objectKey}`
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

    console.log(`[API /upload] ✓ Success: ${objectKey}`);

    return NextResponse.json(
      {
        objectKey,
        filename: prefixedFilename,
        size: file.size,
        contentType,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Upload failed. Please try again.';
    console.error('[API /upload] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
