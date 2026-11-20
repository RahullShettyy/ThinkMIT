import { NextRequest, NextResponse } from 'next/server';
import { getTemplatePptBuffer, getTemplatePptMetadata, PPT_MIME_TYPE, TEMPLATE_PPT_FILENAME } from '@/lib/template-ppt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // If requesting info JSON
  if (searchParams.get('info') === 'true' || searchParams.get('format') === 'json') {
    const meta = await getTemplatePptMetadata();
    return NextResponse.json(meta);
  }

  const result = await getTemplatePptBuffer();

  if (!result) {
    return NextResponse.json(
      { error: 'Template PPT file not found on server or storage.' },
      { status: 404 }
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', PPT_MIME_TYPE);
  responseHeaders.set(
    'Content-Disposition',
    `attachment; filename="${TEMPLATE_PPT_FILENAME}"`
  );
  responseHeaders.set('Content-Length', result.buffer.length.toString());
  responseHeaders.set('X-Template-Source', result.source);
  responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: responseHeaders,
  });
}
