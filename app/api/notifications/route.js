import { supabase } from '@/lib/supabase';
import { getSessionUser, unauthorized } from '@/lib/auth-guard';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const { data, error } = await supabase
    .from('store')
    .select('data')
    .eq('id', 1)
    .single();

  if (error || !data?.data) return Response.json([]);

  const db = data.data;
  const now = Date.now();
  const warnings = (db.tasks || []).filter(tk => {
    if (!tk.deadline || ['completed','stopped'].includes(tk.status)) return false;
    const diff = new Date(tk.deadline).getTime() - now;
    return diff < 24 * 3600 * 1000;
  });

  return Response.json(warnings.map(tk => ({
    id: tk.id,
    title: tk.title,
    deadline: tk.deadline,
    status: tk.status,
  })));
}
