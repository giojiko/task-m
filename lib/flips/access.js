import { supabase } from '@/lib/supabase';

const OWNER_ID = process.env.FLIPS_OWNER_USER_ID || '';
// Authorised emails — override via FLIPS_ALLOWED_EMAILS env var, or use default list
const DEFAULT_EMAILS = ['giorgi.j@smartpro.ge', 'akaki.i@smartpro.ge'];
const ALLOWED_EMAILS = process.env.FLIPS_ALLOWED_EMAILS
  ? process.env.FLIPS_ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  : DEFAULT_EMAILS;

async function getEmailByUid(uid) {
  // Email may be in JWT already (new logins) — caller passes session.email if present.
  // Fallback: look up from store table where users live.
  try {
    const { data } = await supabase.from('store').select('data').eq('id', 1).single();
    const users = data?.data?.users ?? [];
    const u = users.find(u => String(u.id) === String(uid));
    return u?.email?.toLowerCase() ?? null;
  } catch { return null; }
}

export async function isFlipsOwnerAsync(session) {
  if (!session) return false;
  if (OWNER_ID && String(session.uid) === String(OWNER_ID)) return true;
  if (!ALLOWED_EMAILS.length) return false;
  // Check email from session token (new logins) or look up from store
  const email = session.email
    ? String(session.email).toLowerCase()
    : await getEmailByUid(session.uid);
  return !!email && ALLOWED_EMAILS.includes(email);
}

export function isFlipsOwner(session) {
  // Sync version — only checks UID; use isFlipsOwnerAsync for email checks
  if (!session) return false;
  if (OWNER_ID && String(session.uid) === String(OWNER_ID)) return true;
  return false;
}

// Returns 'owner' | 'edit' | 'view' | null
export async function checkFlipsAccess(session) {
  if (!session) return null;
  if (await isFlipsOwnerAsync(session)) return 'owner';
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
