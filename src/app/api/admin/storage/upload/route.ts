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
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'promo';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    const lowerName = filename.toLowerCase();
    const ext = lowerName.slice(lowerName.lastIndexOf('.'));

    // Security check: executable prevention
    if (/\.(exe|bat|cmd|sh|php|js|jsx|ts|tsx|dll|scr|vbs)$/i.test(lowerName)) {
      return NextResponse.json(
        { error: 'Executable and script file types are strictly prohibited.' },
        { status: 400 }
      );
    }

    if (category === 'promo') {
      if (!ALLOWED_VIDEO_TYPES.includes(fileType) && !ALLOWED_VIDEO_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: 'Invalid video format. Only MP4 and WebM videos are allowed.' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `Video exceeds 200 MB limit (received: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).` },
          { status: 400 }
        );
      }
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(fileType) && !ALLOWED_IMAGE_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: 'Invalid image format. Only JPG, PNG, WebP, and AVIF images are allowed.' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image exceeds 5 MB limit (received: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).` },
          { status: 400 }
        );
      }
    }

    const cleanBaseName = filename
      .slice(0, filename.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${category}/${Date.now()}_${cleanBaseName}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, {
        contentType: fileType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pubData } = supabase.storage.from('media').getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      path: storagePath,
      publicUrl: pubData.publicUrl,
    });
  } catch (err: unknown) {
    console.error('Server upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload processing failed' },
      { status: 500 }
    );
  }
}
