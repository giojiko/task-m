import { supabase } from '@/lib/supabase';
import { initDB } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email';

// ONE-TIME DESTRUCTIVE RESET — delete this file immediately after running once!
export async function POST(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db: fresh, tempPassword, adminUser } = await initDB();

  const { error } = await supabase
    .from('store')
    .upsert({ id: 1, data: fresh, updated: new Date().toISOString() });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  try {
    await sendWelcomeEmail(adminUser, tempPassword);
  } catch (e) {
    console.error('reset welcome email failed', e);
    return Response.json({
      status: 'reset_ok_email_failed',
      message: 'ბაზა გასუფთავდა, მაგრამ email ვერ გაიგზავნა — ლოგები შეამოწმე',
      adminEmail: adminUser.email,
    }, { status: 207 });
  }

  return Response.json({
    status: 'reset_complete',
    message: 'ბაზა გასუფთავდა და welcome email გაიგზავნა',
    adminEmail: adminUser.email,
  });
}
