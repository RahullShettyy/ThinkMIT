import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database / Storage client unavailable' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { filename, fileType, fileSize, category = 'promo' } = body;

    if (!filename || !fileType || typeof fileSize !== 'number') {
      return NextResponse.json({ error: 'filename, fileType and fileSize are required' }, { status: 400 });
    }

    const lowerName = filename.toLowerCase();
    const ext = lowerName.slice(lowerName.lastIndexOf('.'));

    // Check for dangerous extensions (.exe, .bat, .cmd, .sh, .php, etc.)
    if (/\.(exe|bat|cmd|sh|php|js|jsx|ts|tsx|dll|scr|vbs)$/i.test(lowerName)) {
      return NextResponse.json(
        { error: 'Executable and script file types are strictly prohibited.' },
        { status: 400 }
      );
    }

    if (category === 'promo') {
      if (!ALLOWED_VIDEO_TYPES.includes(fileType) || !ALLOWED_VIDEO_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: 'Invalid video format. Only MP4 and WebM videos are allowed.' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum video size is 200 MB (provided: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).` },
          { status: 400 }
        );
      }
    } else {
      // media category
      if (!ALLOWED_IMAGE_TYPES.includes(fileType) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: 'Invalid image format. Only JPG, PNG, WebP, and AVIF images are allowed.' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum image size is 5 MB (provided: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).` },
          { status: 400 }
        );
      }
    }

    const cleanBaseName = filename
      .slice(0, filename.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `${category}/${timestamp}_${cleanBaseName}${ext}`;

    // Generate signed upload URL from Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.warn('Storage signed URL error, fallback path available:', error.message);
      // Return storage path so caller can fallback to server upload route
      return NextResponse.json({
        storagePath,
        fallbackToDirect: true,
        error: error.message,
      });
    }

    const { data: pubData } = supabase.storage.from('media').getPublicUrl(storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: pubData.publicUrl,
    });
  } catch (err: unknown) {
    console.error('Sign upload URL error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
