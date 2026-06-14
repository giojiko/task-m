'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import SetupModal from '@/components/SetupModal';

export default function AppShell({ children }) {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text2)' }}>
      Loading...
    </div>
  );

  if (!user) return null;

  return (
    <div className="app-shell">
      <Topbar />
      <div className="wrap">
        <Sidebar />
        <div className="content">{children}</div>
      </div>
      {user.mustSetup && <SetupModal />}
    </div>
  );
}
