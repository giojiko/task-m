import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req) {
  try {
    const { employee, tempPassword } = await req.json();
    if (!employee?.email) return Response.json({ error: 'Missing employee' }, { status: 400 });
    await sendWelcomeEmail(employee, tempPassword);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('welcome email error', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
