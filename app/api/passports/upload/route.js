import { supabase } from '@/lib/supabase';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth-guard';

export async function POST(request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!['super_admin', 'admin'].includes(session.role)) return forbidden();

  const formData = await request.formData();
  const file = formData.get('file');
  const passportCode = formData.get('code');

  if (!file || !passportCode) {
    return Response.json({ error: 'file და code საჭიროა' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${passportCode}/${Date.now()}_${safeName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { data, error } = await supabase.storage
    .from('passports')
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    path: data.path,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
