import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import {
  getTemplatePptMetadata,
  syncSamplePptToSupabase,
  uploadCustomTemplatePpt,
} from '@/lib/template-ppt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const metadata = await getTemplatePptMetadata();
  return NextResponse.json(metadata);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const contentType = req.headers.get('content-type') || '';

  // Case 1: JSON action request (e.g., sync from /sample_ppt folder)
  if (contentType.includes('application/json')) {
    try {
      const body = await req.json();
      if (body.action === 'sync_sample') {
        const result = await syncSamplePptToSupabase();
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }
  }

  // Case 2: Multipart form upload of a new PPT template file
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.ppt') && !lowerName.endsWith('.pptx')) {
        return NextResponse.json(
          { error: 'Invalid file type. Only .ppt and .pptx files are allowed for presentation templates.' },
          { status: 400 }
        );
      }

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 50 MB.` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadCustomTemplatePpt(buffer, file.name);
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Upload failed' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Invalid request Content-Type' }, { status: 400 });
}
