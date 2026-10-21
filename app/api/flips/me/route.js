import { getSessionUser } from '@/lib/auth-guard';
import { checkFlipsAccess } from '@/lib/flips/access';

export async function GET() {
  const session = await getSessionUser();
  const level = await checkFlipsAccess(session);
  if (!level) return Response.json({ level: null });
  return Response.json({ level, uid: session.uid });
}
