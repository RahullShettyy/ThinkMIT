import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getContent } from '@/lib/content';
import { generateTeamCSV, generateMemberCSV, TeamRecord } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (auth.error) return auth.error;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') === 'member' ? 'member' : 'team';
  const idsParam = searchParams.get('ids');
  const status = searchParams.get('status') || '';
  const track = searchParams.get('track') || '';
  const programme = searchParams.get('programme') || '';
  const q = searchParams.get('q')?.trim().toLowerCase() || '';
  const includeInternal = searchParams.get('internal') === '1' || searchParams.get('internal') === 'true';

  try {
    const allTeams: TeamRecord[] = [];
    const batchSize = 1000;
    let page = 0;
    let hasMore = true;

    // Fetch in batches of 1000 to honour memory and pagination constraints
    while (hasMore) {
      let query = supabase
        .from('teams')
        .select('*, members(*)')
        .order('created_at', { ascending: true })
        .range(page * batchSize, (page + 1) * batchSize - 1);

      if (idsParam) {
        const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('id', ids);
        }
      } else {
        if (status) query = query.eq('status', status);
        if (track) query = query.eq('track_key', track);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allTeams.push(...(data as TeamRecord[]));
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    let filtered = allTeams;

    if (programme) {
      filtered = filtered.filter((t) =>
        t.members?.some((m) => m.programme === programme)
      );
    }

    if (q) {
      filtered = filtered.filter((t) => {
        const teamMatch =
          t.team_name?.toLowerCase().includes(q) ||
          t.reg_code?.toLowerCase().includes(q) ||
          t.idea_title?.toLowerCase().includes(q);

        const memberMatch = t.members?.some(
          (m) =>
            m.name?.toLowerCase().includes(q) ||
            m.usn?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.phone?.includes(q)
        );

        return teamMatch || memberMatch;
      });
    }

    const content = await getContent();

    const csvContent =
      format === 'member'
        ? generateMemberCSV(filtered, content)
        : generateTeamCSV(filtered, content, includeInternal);

    // Current date in IST for filename
    const now = new Date();
    const istDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const filename = `thinkmit-registrations-${format}-${istDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('CSV export error:', err);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
