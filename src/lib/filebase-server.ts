import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Constants
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = ['.ppt', '.pptx', '.pdf'] as const;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/mspowerpoint',
  'application/x-mspowerpoint',
  'application/powerpoint',
  'application/x-powerpoint',
  'application/x-pdf',
  'application/octet-stream', // Fallback browsers sometimes send
];

let s3ClientInstance: S3Client | null = null;

export function resetFilebaseClient() {
  s3ClientInstance = null;
}

export function getFilebaseClient(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const endpoint = (process.env.FILEBASE_ENDPOINT || 'https://s3.filebase.io').trim();
  const region = (process.env.FILEBASE_REGION || 'us-east-1').trim();
  const accessKeyId = process.env.FILEBASE_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.FILEBASE_SECRET_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Filebase S3 credentials are missing from environment variables');
  }

  s3ClientInstance = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return s3ClientInstance;
}

export function getCanonicalMimeType(filename: string, providedType?: string): string {
  const ext = ('.' + filename.split('.').pop()?.toLowerCase()) as string;
  if (providedType && providedType.trim() && providedType !== 'application/octet-stream') {
    return providedType.trim().toLowerCase().split(';')[0];
  }
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    default:
      return 'application/octet-stream';
  }
}

export function sanitizeFilename(filename: string): string {
  // Strip any directory traversal (../, ..\, etc.)
  const base = filename.replace(/^.*[\\\/]/, '').trim();
  // Separate name and extension
  const lastDot = base.lastIndexOf('.');
  if (lastDot === -1) return 'pitch-deck';

  const namePart = base.substring(0, lastDot);
  const extPart = base.substring(lastDot).toLowerCase();

  // Sanitize name: keep only letters, digits, dashes, underscores
  const cleanName = namePart
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .substring(0, 60);

  return `${cleanName || 'pitch-deck'}${extPart}`;
}

export function validateFileMetadata(filename: string, contentType: string, size?: number) {
  const ext = ('.' + filename.split('.').pop()?.toLowerCase()) as string;
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`,
    };
  }

  if (size !== undefined && (size <= 0 || size > MAX_FILE_SIZE_BYTES)) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 25 MB (${(size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  // Normalize / validate MIME
  const lowerMime = (contentType || '').toLowerCase().split(';')[0].trim();
  if (lowerMime && !ALLOWED_MIME_TYPES.includes(lowerMime)) {
    return {
      valid: false,
      error: `Unsupported content type "${lowerMime}". Please select a valid PPT or PDF document.`,
    };
  }

  return { valid: true };
}

export async function generatePresignedUploadUrl({
  filename,
  contentType,
  size,
  identifier,
}: {
  filename: string;
  contentType: string;
  size: number;
  identifier?: string;
}) {
  const validation = validateFileMetadata(filename, contentType, size);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const s3 = getFilebaseClient();
  const bucket = process.env.FILEBASE_BUCKET || 'think-mitm';

  // Sanitize filename
  const cleanName = sanitizeFilename(filename);

  // Extract the numeric prefix from identifier (e.g. "sub_1795062544264_yqwu54" -> "1795062544264")
  const numMatch = identifier ? String(identifier).match(/\d{10,}/) : null;
  const submissionNumber = numMatch ? numMatch[0] : String(Date.now());

  // Use the submission key directly for the folder
  const safeFolder = identifier
    ? String(identifier).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40)
    : `sub_${submissionNumber}`;

  // Filename prefix uses the EXACT same number as the Supabase submission_key
  const prefixedFilename = `${submissionNumber}-${cleanName}`;
  const objectKey = `submissions/${safeFolder}/${prefixedFilename}`;

  const signedContentType = getCanonicalMimeType(filename, contentType);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: signedContentType,
  });

  // Short-lived presigned PUT URL (5 minutes / 300 seconds)
  // Ensure signableHeaders contains only content-type and host, no checksum headers
  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300,
    signableHeaders: new Set(['content-type', 'host']),
  });

  return {
    uploadUrl,
    objectKey,
    filename: prefixedFilename,
    size,
    contentType: signedContentType,
    expiresIn: 300,
  };
}

export async function generatePresignedDownloadUrl(objectKey: string, expiresIn = 600) {
  if (!objectKey || !objectKey.startsWith('submissions/')) {
    throw new Error('Invalid or unauthorized object key');
  }

  const s3 = getFilebaseClient();
  const bucket = process.env.FILEBASE_BUCKET || 'think-mitm';

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });

  // Presigned GET URL (10 minutes / 600 seconds)
  const downloadUrl = await getSignedUrl(s3, command, { expiresIn });

  return {
    downloadUrl,
    expiresIn,
  };
}
