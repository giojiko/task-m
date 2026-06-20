import { supabase } from '@/lib/supabase';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return Response.json({ error: 'Email და password საჭიროა' }, { status: 400 });
  }

  const { data, error } = await supabase.from('store').select('data').eq('id', 1).single();
  if (error || !data?.data) {
    return Response.json({ error: 'სისტემური შეცდომა' }, { status: 500 });
  }

  const db = data.data;
  const user = (db.users || []).find(u =>
    u.email?.toLowerCase() === email.toLowerCase() && u.active !== false
  );

  if (!user) {
    return Response.json({ error: 'არასწორი ელ.ფოსტა ან პაროლი' }, { status: 401 });
  }

  const passwordValid = user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : user.password === password;

  if (!passwordValid) {
    return Response.json({ error: 'არასწორი ელ.ფოსტა ან პაროლი' }, { status: 401 });
  }

  const token = await createSessionToken(user.id, user.role);
  const { password: _p, passwordHash: _ph, ...safeUser } = user;

  const response = Response.json({ user: safeUser });
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`
  );
  return response;
}
