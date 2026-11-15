import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import rawData from '@data';
import { requireAdminApi } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { contentSaveSchema, validateContentStructure } from '@/lib/content-validator';

export const dynamic = 'force-dynamic';

const defaultSiteData = ((rawData as { default?: unknown }).default || rawData) as Record<string, unknown>;

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const supabase = getSupabaseServerClient();
  const overrides: Record<string, unknown> = {};
  const history: Record<string, Array<{ id: string; created_at: string; value: unknown }>> = {};

  if (supabase) {
    try {
      // 1. Fetch current overrides
      const { data: rows } = await supabase.from('site_content').select('section, value, updated_at');
      if (rows) {
        rows.forEach((r) => {
          overrides[r.section] = r.value;
        });
      }

      // 2. Fetch history (up to 20 per section)
      const { data: histRows } = await supabase
        .from('site_content_history')
        .select('id, section, value, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (histRows) {
        histRows.forEach((h) => {
          if (!history[h.section]) history[h.section] = [];
          if (history[h.section].length < 20) {
            history[h.section].push({
              id: h.id,
              created_at: h.created_at,
              value: h.value,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Error reading site_content or history:', e);
    }
  }

  return NextResponse.json(
    {
      defaults: defaultSiteData,
      overrides,
      history,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const body = await req.json();

    // Check if restore action
    if (body.action === 'restore') {
      const { section, historyId } = body;
      if (!section || !historyId) {
        return NextResponse.json({ error: 'Section and historyId required' }, { status: 400 });
      }

      const { data: histItem, error: histErr } = await supabase
        .from('site_content_history')
        .select('value')
        .eq('id', historyId)
        .single();

      if (histErr || !histItem) {
        return NextResponse.json({ error: 'History version not found' }, { status: 404 });
      }

      // Save restored value as current override
      const { error: upsertErr } = await supabase
        .from('site_content')
        .upsert({ section, value: histItem.value, updated_at: new Date().toISOString() });

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }

      revalidateTag('site-content');
      revalidatePath('/', 'layout');
      revalidatePath('/register');

      return NextResponse.json({ success: true, section, value: histItem.value });
    }

    // Standard save action
    const parsed = contentSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const { section, value } = parsed.data;

    // Validate structure against default data.js
    if (section in defaultSiteData) {
      const errors = validateContentStructure(defaultSiteData[section], value);
      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: `Structure validation failed: ${errors[0].message} (${errors[0].path})`,
            errors,
          },
          { status: 422 }
        );
      }
    }

    // 1. Upsert into site_content
    const { error: saveErr } = await supabase
      .from('site_content')
      .upsert({ section, value, updated_at: new Date().toISOString() });

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    // 2. Insert into site_content_history
    try {
      await supabase.from('site_content_history').insert({
        section,
        value,
        created_at: new Date().toISOString(),
      });

      // Trim older entries beyond 20
      const { data: oldEntries } = await supabase
        .from('site_content_history')
        .select('id')
        .eq('section', section)
        .order('created_at', { ascending: false });

      if (oldEntries && oldEntries.length > 20) {
        const toDelete = oldEntries.slice(20).map((r) => r.id);
        await supabase.from('site_content_history').delete().in('id', toDelete);
      }
    } catch (histError) {
      console.warn('Could not record site_content_history:', histError);
    }

    // 3. Revalidate site-content tag and layout paths
    revalidateTag('site-content');
    revalidatePath('/', 'layout');
    revalidatePath('/register');

    return NextResponse.json({ success: true, section, value });
  } catch (err) {
    console.error('Error saving content:', err);
    return NextResponse.json({ error: 'Internal server error saving content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section');
  const confirmCode = searchParams.get('confirm');

  try {
    if (section === 'ALL') {
      if (confirmCode !== 'RESET') {
        return NextResponse.json(
          { error: 'Typed confirmation "RESET" is required to reset all content.' },
          { status: 400 }
        );
      }

      const { error: delErr } = await supabase.from('site_content').delete().neq('section', '');
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }
    } else if (section) {
      const { error: delErr } = await supabase.from('site_content').delete().eq('section', section);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Section parameter required' }, { status: 400 });
    }

    revalidateTag('site-content');
    revalidatePath('/', 'layout');
    revalidatePath('/register');

    return NextResponse.json({ success: true, resetSection: section });
  } catch (err) {
    console.error('Error resetting content:', err);
    return NextResponse.json({ error: 'Internal server error resetting content' }, { status: 500 });
  }
}
