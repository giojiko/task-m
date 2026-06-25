import { supabase } from '@/lib/supabase';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth-guard';

// GET — signed URL (public access, scoped to a valid passport code)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const code = searchParams.get('code');

  if (!path || !code) {
    return Response.json({ error: 'path და code საჭიროა' }, { status: 400 });
  }

  // path must be scoped under the passport's own code (security check)
  if (!path.startsWith(`${code}/`)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from('passports')
    .createSignedUrl(path, 60 * 60 * 2);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ url: data.signedUrl });
}

// DELETE — admin only
export async function DELETE(request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!['super_admin', 'admin'].includes(session.role)) return forbidden();

  const { path } = await request.json();
  if (!path) return Response.json({ error: 'path საჭიროა' }, { status: 400 });

  const { error } = await supabase.storage.from('passports').remove([path]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
