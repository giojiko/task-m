import { sendWelcomeEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth-guard';

export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!['super_admin', 'admin'].includes(session.role)) return forbidden();

  try {
    const { employeeId, tempPassword } = await req.json();
    if (!employeeId) return Response.json({ error: 'Missing employeeId' }, { status: 400 });

    const { data } = await supabase.from('store').select('data').eq('id', 1).single();
    const employee = (data?.data?.users || []).find(u => u.id === employeeId);
    if (!employee?.email) return Response.json({ error: 'Employee not found' }, { status: 404 });

    await sendWelcomeEmail(employee, tempPassword);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('welcome email error', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
