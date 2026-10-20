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
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>იტვირთება...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-body">
          {children}
        </main>
      </div>
      {user.mustSetup && <SetupModal />}
    </div>
  );
}
