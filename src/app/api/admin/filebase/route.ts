import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireAdminApi } from '@/lib/auth';
import { getFilebaseClient } from '@/lib/filebase-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminSecretHeader = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.ADMIN_SECRET;
  const isSecretValid = Boolean(configuredSecret && adminSecretHeader && adminSecretHeader === configuredSecret);

  if (!isSecretValid) {
    const auth = await requireAdminApi(req);
    if (auth.error) return auth.error;
  }

  const supabase = getSupabaseServerClient();
  const bucket = process.env.FILEBASE_BUCKET || 'thinkmit-upload';

  try {
    const s3 = getFilebaseClient();

    // 1. Fetch all objects from Filebase S3
    const s3Response = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    const s3Objects = s3Response.Contents || [];

    // 2. Fetch all submissions from Supabase
    let dbSubmissions: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('submissions').select('*');
      dbSubmissions = data || [];
    }

    // 3. Fetch all teams with members from Supabase
    let dbTeams: any[] = [];
    if (supabase) {
      const { data } = await supabase
        .from('teams')
        .select('id, reg_code, team_name, track_key, status, members(name, email, phone, position)');
      dbTeams = data || [];
    }

    const teamByRegCode = new Map<string, any>();
    for (const t of dbTeams) {
      teamByRegCode.set(t.reg_code, t);
    }

    const submissionByFileKey = new Map<string, any>();
    for (const s of dbSubmissions) {
      submissionByFileKey.set(s.filebase_key, s);
    }

    // 4. Merge Filebase objects with Team & Submission metadata
    let totalStorageBytes = 0;
    const files = s3Objects.map((obj) => {
      totalStorageBytes += obj.Size || 0;
      const key = obj.Key || '';

      // Match submission by file key
      const sub = submissionByFileKey.get(key);

      // Extract reg_code either from matched submission or parsed from key "submissions/{reg_code}/..."
      let regCode = sub?.reg_code;
      if (!regCode) {
        const match = key.match(/^submissions\/([^/]+)\//);
        if (match) regCode = match[1];
      }

      // Match team
      const team = regCode ? teamByRegCode.get(regCode) : null;
      const leader = team?.members?.find((m: any) => m.position === 1) || team?.members?.[0];

      return {
        key,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString() || null,
        filename: sub?.filename || key.split('/').pop() || key,
        contentType: sub?.content_type || null,
        submittedAt: sub?.submitted_at || obj.LastModified?.toISOString() || null,
        submissionId: sub?.id || null,
        isLinkedToDatabase: Boolean(sub),
        regCode: regCode || null,
        teamId: team?.id || null,
        teamName: team?.team_name || null,
        trackKey: team?.track_key || null,
        teamStatus: team?.status || null,
        leaderName: leader?.name || null,
        leaderEmail: leader?.email || null,
        leaderPhone: leader?.phone || null,
      };
    });

    return NextResponse.json({
      bucket,
      totalFiles: files.length,
      totalStorageBytes,
      files,
    });
  } catch (err: unknown) {
    console.error('Filebase list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to query Filebase storage' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const adminSecretHeader = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.ADMIN_SECRET;
  const isSecretValid = Boolean(configuredSecret && adminSecretHeader && adminSecretHeader === configuredSecret);

  if (!isSecretValid) {
    const auth = await requireAdminApi(req);
    if (auth.error) return auth.error;
  }

  const supabase = getSupabaseServerClient();
  const bucket = process.env.FILEBASE_BUCKET || 'thinkmit-upload';

  try {
    const body = await req.json();
    const { key, regCode, submissionId } = body;

    if (!key && !regCode && !submissionId) {
      return NextResponse.json({ error: 'Missing key, regCode, or submissionId' }, { status: 400 });
    }

    let targetKey = key;
    let targetRegCode = regCode;

    // 1. If key is missing, look it up in Supabase
    if (!targetKey && supabase) {
      let query = supabase.from('submissions').select('id, reg_code, filebase_key');
      if (submissionId) query = query.eq('id', submissionId);
      else if (targetRegCode) query = query.eq('reg_code', targetRegCode);

      const { data: sub } = await query.maybeSingle();
      if (sub) {
        targetKey = sub.filebase_key;
        targetRegCode = sub.reg_code;
      }
    }

    // 2. Delete from Filebase S3 if key is available
    if (targetKey) {
      try {
        const s3 = getFilebaseClient();
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: targetKey,
          })
        );
        console.log(`[Filebase DELETE] Deleted ${bucket}/${targetKey}`);
      } catch (s3Err) {
        console.warn(`[Filebase DELETE] Failed to delete S3 object ${targetKey}:`, s3Err);
      }
    }

    // 3. Delete from Supabase submissions table
    if (supabase) {
      let deleteQuery = supabase.from('submissions').delete();
      if (submissionId) {
        deleteQuery = deleteQuery.eq('id', submissionId);
      } else if (targetKey) {
        deleteQuery = deleteQuery.eq('filebase_key', targetKey);
      } else if (targetRegCode) {
        deleteQuery = deleteQuery.eq('reg_code', targetRegCode);
      }
      const { error: dbErr } = await deleteQuery;
      if (dbErr) {
        console.warn('[Filebase DELETE] Supabase deletion error:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      deletedKey: targetKey || null,
      deletedRegCode: targetRegCode || null,
    });
  } catch (err: unknown) {
    console.error('Filebase delete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}
