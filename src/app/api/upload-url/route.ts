import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/filebase-server';

// Rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (record.count >= 10) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }

    const { filename, contentType, size, identifier } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid filename.' },
        { status: 400 }
      );
    }

    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json(
        { error: 'Invalid file size.' },
        { status: 400 }
      );
    }

    const result = await generatePresignedUploadUrl({
      filename,
      contentType: String(contentType || 'application/octet-stream'),
      size,
      identifier: identifier ? String(identifier) : undefined,
    });

    try {
      const parsed = new URL(result.uploadUrl);
      console.log(`[API /upload-url] Host: ${parsed.host}, Bucket: ${process.env.FILEBASE_BUCKET || 'think-mitm'}, Key: ${result.objectKey}, Content-Type: ${result.contentType}`);
    } catch {
      // ignore
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate upload URL';
    const isValidationError =
      message.includes('Invalid file type') ||
      message.includes('exceeds maximum') ||
      message.includes('Unsupported content type');

    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
