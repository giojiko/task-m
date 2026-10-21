import { supabase } from '@/lib/supabase';

const OWNER_ID = process.env.FLIPS_OWNER_USER_ID || '';

export function isFlipsOwner(session) {
  return !!session && !!OWNER_ID && String(session.uid) === String(OWNER_ID);
}

// Returns 'owner' | 'edit' | 'view' | null
export async function checkFlipsAccess(session) {
  if (!session) return null;
  if (isFlipsOwner(session)) return 'owner';
  const { data } = await supabase
    .from('flips_access')
    .select('level')
    .eq('user_id', String(session.uid))
    .maybeSingle();
  return data?.level ?? null;
}

// Returns access level or throws a 404-shaped response
export async function requireFlipsAccess(session, minLevel = 'view') {
  const level = await checkFlipsAccess(session);
  if (!level) return null; // caller must return notFound() or 404 response
  const order = { view: 1, edit: 2, owner: 3 };
  if ((order[level] ?? 0) < (order[minLevel] ?? 1)) return null;
  return level;
}

export async function auditLog(actorId, action, targetId = null, meta = null) {
  await supabase.from('flips_audit').insert({
    actor_id: String(actorId),
    action,
    target_id: targetId ? String(targetId) : null,
    meta,
  });
}
