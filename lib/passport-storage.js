import { supabase } from '@/lib/supabase';

const BUCKET = 'passports';

export async function uploadPassportFile(passportCode, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${passportCode}/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return { path: data.path, name: file.name, size: file.size, type: file.type };
}

export async function getSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePassportFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function fileIcon(type) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  if (type.includes('dwg') || type.includes('dxf') || type.includes('autocad')) return '📐';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
  return '📁';
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
