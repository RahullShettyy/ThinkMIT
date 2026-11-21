import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const adminSecretHeader = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.ADMIN_SECRET;
  const isSecretValid = Boolean(configuredSecret && adminSecretHeader && adminSecretHeader === configuredSecret);

  if (!isSecretValid) {
    const auth = await requireAdminApi(req);
    if (auth.error) return auth.error;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Fetch all teams with members
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*, members(*)');

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    // Fetch all submissions
    const { data: submissions, error: subsError } = await supabase
      .from('submissions')
      .select('*');

    let validSubmissions = submissions || [];
    if (subsError) {
      // If table doesn't exist yet in schema cache, treat as empty list gracefully
      if (subsError.code === 'PGRST205' || subsError.message?.includes('schema cache')) {
        console.warn('public.submissions table not created yet in Supabase:', subsError.message);
        validSubmissions = [];
      } else {
        return NextResponse.json({ error: subsError.message }, { status: 500 });
      }
    }

    // Build a lookup map of submissions by reg_code
    const submissionMap = new Map<string, typeof validSubmissions[number]>();
    for (const sub of validSubmissions) {
      submissionMap.set(sub.reg_code, sub);
    }

    // Join in-memory: each team gets a submission field (or null)
    const evaluations = (teams || []).map((team) => ({
      ...team,
      submission: submissionMap.get(team.reg_code) || null,
    }));

    return NextResponse.json({ evaluations });
  } catch (err) {
    console.error('Evaluations query error:', err);
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}
