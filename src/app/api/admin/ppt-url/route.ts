import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { generatePresignedDownloadUrl } from '@/lib/filebase-server';

export async function GET(req: NextRequest) {
  // 1. Authenticate admin: either via ADMIN_SECRET or Supabase Auth session
  const adminSecretHeader = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.ADMIN_SECRET;

  const isSecretValid = Boolean(configuredSecret && adminSecretHeader && adminSecretHeader === configuredSecret);

  if (!isSecretValid) {
    const auth = await requireAdminApi(req);
    if (auth.error) return auth.error;
  }

  // 2. Extract and validate objectKey
  const { searchParams } = new URL(req.url);
  const objectKey = searchParams.get('key')?.trim();

  if (!objectKey) {
    return NextResponse.json(
      { error: 'Missing "key" query parameter' },
      { status: 400 }
    );
  }

  if (!objectKey.startsWith('submissions/')) {
    return NextResponse.json(
      { error: 'Access denied: Key must reside under the submissions/ prefix' },
      { status: 403 }
    );
  }

  try {
    // 3. Generate presigned GET URL (valid for 10 minutes / 600s)
    const result = await generatePresignedDownloadUrl(objectKey, 600);

    // If client requested redirect (e.g. clicking direct link in browser with ?redirect=true)
    if (searchParams.get('redirect') === 'true') {
      return NextResponse.redirect(result.downloadUrl);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate download URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
