import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const ALLOWED_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'selected',
  'not_selected',
  'withdrawn',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id } = params;

  try {
    const body = await req.json();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Validate and set status
    if (body.status !== undefined) {
      let mappedStatus = body.status;
      if (mappedStatus === 'rejected') mappedStatus = 'not_selected';
      if (mappedStatus === 'waiting_list') mappedStatus = 'under_review';
      if (!ALLOWED_STATUSES.includes(mappedStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status value. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.status = mappedStatus;
    }

    // Validate and set score
    if (body.score !== undefined) {
      const score = body.score === null || body.score === '' ? null : Number(body.score);
      if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
        return NextResponse.json(
          { error: 'Score must be between 0 and 100' },
          { status: 400 }
        );
      }
      updateData.score = score;
    }

    // Set notes (teams table uses admin_notes column)
    const notes = body.admin_notes !== undefined ? body.admin_notes : body.internal_notes;
    if (notes !== undefined) {
      updateData.admin_notes = notes ? String(notes) : null;
    }

    // Update the team record
    const { data: updatedTeam, error: teamErr } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select('*, members(*)')
      .single();

    if (teamErr) {
      return NextResponse.json({ error: teamErr.message }, { status: 500 });
    }

    if (!updatedTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Fetch the submission for this team
    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('reg_code', updatedTeam.reg_code)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      submission: submission || null,
    });
  } catch (err) {
    console.error('Evaluation update error:', err);
    return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
