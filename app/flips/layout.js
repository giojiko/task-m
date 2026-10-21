import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-guard';
import { checkFlipsAccess } from '@/lib/flips/access';

export const metadata = { title: 'ბინები — SmartPro' };

export default async function FlipsLayout({ children }) {
  const session = await getSessionUser();
  const level = await checkFlipsAccess(session);
  if (!level) notFound();
  return <>{children}</>;
}
