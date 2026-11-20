import fs from 'fs';
import path from 'path';
import { getSupabaseServerClient } from './supabase-server';

export const TEMPLATE_PPT_STORAGE_BUCKET = 'media';
export const TEMPLATE_PPT_STORAGE_KEY = 'templates/THINK_MIT_Pitchfest_Pitch_Deck.pptx';
export const TEMPLATE_PPT_FILENAME = 'THINK_MIT_Pitchfest_Pitch_Deck.pptx';
export const PPT_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export interface TemplatePptMetadata {
  filename: string;
  sizeBytes: number;
  storageKey: string;
  publicUrl: string;
  existsInSupabase: boolean;
  localFallbackAvailable: boolean;
  updatedAt: string;
  source: 'supabase' | 'local_sample';
}

function getLocalSamplePptPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'sample_ppt', 'THINK MIT Pitchfest Pitch Deck.pptx'),
    path.join(process.cwd(), 'public', 'templates', 'THINK_MIT_Pitchfest_Pitch_Deck.pptx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Get metadata about the PPT template currently in Supabase storage,
 * with graceful fallback information if Supabase is not yet populated.
 */
export async function getTemplatePptMetadata(): Promise<TemplatePptMetadata> {
  const supabase = getSupabaseServerClient();
  const localPath = getLocalSamplePptPath();
  const localSize = localPath ? fs.statSync(localPath).size : 0;
  const localMtime = localPath ? fs.statSync(localPath).mtime.toISOString() : new Date().toISOString();

  let existsInSupabase = false;
  let supabaseSize = 0;
  let supabaseUpdatedAt = localMtime;
  let publicUrl = '';

  if (supabase) {
    try {
      const { data: pubData } = supabase.storage
        .from(TEMPLATE_PPT_STORAGE_BUCKET)
        .getPublicUrl(TEMPLATE_PPT_STORAGE_KEY);
      publicUrl = pubData?.publicUrl || '';

      // Check if file exists in Supabase bucket
      const { data: listData, error: listError } = await supabase.storage
        .from(TEMPLATE_PPT_STORAGE_BUCKET)
        .list('templates', { limit: 10, search: 'THINK_MIT_Pitchfest_Pitch_Deck' });

      if (!listError && listData && listData.length > 0) {
        const item = listData.find((f) => f.name.includes('Pitch_Deck') || f.name.endsWith('.pptx'));
        if (item) {
          existsInSupabase = true;
          supabaseSize = item.metadata?.size || item.id ? (item.metadata?.size as number) || localSize : localSize;
          supabaseUpdatedAt = item.updated_at || item.created_at || new Date().toISOString();
        }
      }
    } catch {
      // Supabase storage query failed or unreachable
    }
  }

  return {
    filename: TEMPLATE_PPT_FILENAME,
    sizeBytes: existsInSupabase ? supabaseSize : localSize,
    storageKey: TEMPLATE_PPT_STORAGE_KEY,
    publicUrl: publicUrl || `/templates/${TEMPLATE_PPT_FILENAME}`,
    existsInSupabase,
    localFallbackAvailable: Boolean(localPath),
    updatedAt: existsInSupabase ? supabaseUpdatedAt : localMtime,
    source: existsInSupabase ? 'supabase' : 'local_sample',
  };
}

/**
 * Sync the local sample PPT from /sample_ppt folder into Supabase Storage.
 */
export async function syncSamplePptToSupabase(): Promise<{ success: boolean; message: string; metadata?: TemplatePptMetadata }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  const localPath = getLocalSamplePptPath();
  if (!localPath) {
    return { success: false, message: 'Could not find sample PPT in /sample_ppt or /public/templates.' };
  }

  try {
    const fileBuffer = fs.readFileSync(localPath);

    // Ensure bucket exists
    try {
      await supabase.storage.createBucket(TEMPLATE_PPT_STORAGE_BUCKET, { public: true });
    } catch {
      // Bucket may already exist
    }

    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_PPT_STORAGE_BUCKET)
      .upload(TEMPLATE_PPT_STORAGE_KEY, fileBuffer, {
        contentType: PPT_MIME_TYPE,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, message: `Supabase storage upload failed: ${uploadError.message}` };
    }

    const { data: pubData } = supabase.storage
      .from(TEMPLATE_PPT_STORAGE_BUCKET)
      .getPublicUrl(TEMPLATE_PPT_STORAGE_KEY);

    const meta: TemplatePptMetadata = {
      filename: TEMPLATE_PPT_FILENAME,
      sizeBytes: fileBuffer.length,
      storageKey: TEMPLATE_PPT_STORAGE_KEY,
      publicUrl: pubData.publicUrl,
      existsInSupabase: true,
      localFallbackAvailable: true,
      updatedAt: new Date().toISOString(),
      source: 'supabase',
    };

    // Also persist record in site_content table if possible
    try {
      await supabase.from('site_content').upsert({
        section: 'template_ppt',
        value: meta,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal if site_content is unavailable
    }

    return {
      success: true,
      message: 'Sample PPT synced to Supabase Storage successfully.',
      metadata: meta,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error during Supabase storage sync.',
    };
  }
}

/**
 * Upload a custom PPT/PPTX file directly to Supabase storage.
 */
export async function uploadCustomTemplatePpt(
  buffer: Buffer,
  originalFilename: string
): Promise<{ success: boolean; message: string; metadata?: TemplatePptMetadata }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  try {
    // Ensure bucket exists
    try {
      await supabase.storage.createBucket(TEMPLATE_PPT_STORAGE_BUCKET, { public: true });
    } catch {
      // Bucket may already exist
    }

    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_PPT_STORAGE_BUCKET)
      .upload(TEMPLATE_PPT_STORAGE_KEY, buffer, {
        contentType: PPT_MIME_TYPE,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, message: `Upload to Supabase failed: ${uploadError.message}` };
    }

    // Also update local copy in public/templates so server fallbacks match
    try {
      const publicDest = path.join(process.cwd(), 'public', 'templates', 'THINK_MIT_Pitchfest_Pitch_Deck.pptx');
      fs.writeFileSync(publicDest, buffer);
    } catch {
      // Non-fatal
    }

    const { data: pubData } = supabase.storage
      .from(TEMPLATE_PPT_STORAGE_BUCKET)
      .getPublicUrl(TEMPLATE_PPT_STORAGE_KEY);

    const meta: TemplatePptMetadata = {
      filename: originalFilename || TEMPLATE_PPT_FILENAME,
      sizeBytes: buffer.length,
      storageKey: TEMPLATE_PPT_STORAGE_KEY,
      publicUrl: pubData.publicUrl,
      existsInSupabase: true,
      localFallbackAvailable: true,
      updatedAt: new Date().toISOString(),
      source: 'supabase',
    };

    try {
      await supabase.from('site_content').upsert({
        section: 'template_ppt',
        value: meta,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      message: 'New Template PPT uploaded and stored in Supabase successfully.',
      metadata: meta,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Upload failed.',
    };
  }
}

/**
 * Retrieve the PPT buffer for download, downloading from Supabase storage first,
 * or falling back to the local file in sample_ppt.
 */
export async function getTemplatePptBuffer(): Promise<{ buffer: Buffer; filename: string; source: 'supabase' | 'local' } | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(TEMPLATE_PPT_STORAGE_BUCKET)
        .download(TEMPLATE_PPT_STORAGE_KEY);

      if (data && !error) {
        const arrayBuf = await data.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuf),
          filename: TEMPLATE_PPT_FILENAME,
          source: 'supabase',
        };
      }
    } catch {
      // Fall through to local fallback
    }
  }

  const localPath = getLocalSamplePptPath();
  if (localPath && fs.existsSync(localPath)) {
    return {
      buffer: fs.readFileSync(localPath),
      filename: TEMPLATE_PPT_FILENAME,
      source: 'local',
    };
  }

  return null;
}
