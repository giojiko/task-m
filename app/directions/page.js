'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';

function DirectionsContent() {
  const { db, t, lang } = useApp();
  const searchParams = useSearchParams();
  const [selectedDir, setSelectedDir] = useState(null);

  useEffect(() => {
    const dirParam = searchParams.get('dir');
    if (dirParam) setSelectedDir(dirParam);
  }, [searchParams]);

  const dirs = db?.directions || [];
  const clients = db?.clients || [];

  const getDirName = (d) => lang === 'en' ? d.nameEn : lang === 'ru' ? (d.nameRu || d.nameEn) : d.name;

  const activeDir = dirs.find(d => d.id === selectedDir);
  const dirClients = selectedDir ? clients.filter(c => (c.directions || []).includes(selectedDir)) : [];

  return (
    <AppShell>
      <div className="ph">
        <div>
          <div className="pt">{t('directions')}</div>
          <div className="ps">{t('directions_sub')}</div>
        </div>
        {selectedDir && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDir(null)}>{t('show_all_dirs')}</button>
        )}
      </div>

      {!selectedDir ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
          {dirs.map(d => {
            const clientCount = clients.filter(c => (c.directions || []).includes(d.id)).length;
            return (
              <div key={d.id} className="card" style={{ cursor:'pointer', borderColor: d.color+'44', transition:'all .18s' }}
                onClick={() => setSelectedDir(d.id)}
                onMouseEnter={e => e.currentTarget.style.borderColor = d.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = d.color+'44'}
              >
                <div style={{ fontSize:32, marginBottom:8 }}>{d.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color: d.color, marginBottom:4 }}>{getDirName(d)}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>{d.desc}</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>
                  {t('clients_count')}: <strong style={{ color:'var(--text)' }}>{clientCount}</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {activeDir && (
            <div className="card" style={{ marginBottom:18, borderColor: activeDir.color+'44' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:36 }}>{activeDir.icon}</span>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color: activeDir.color }}>{getDirName(activeDir)}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{activeDir.desc}</div>
                </div>
              </div>
            </div>
          )}
          <div className="tw">
            <table>
              <thead>
                <tr><th>{t('name')}</th><th>{t('phone')}</th><th>{t('address')}</th><th>{t('email_lbl')}</th></tr>
              </thead>
              <tbody>
                {dirClients.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>{t('dir_no_clients')}</td></tr>
                ) : dirClients.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td style={{ color:'var(--text2)' }}>{c.phone}</td>
                    <td style={{ color:'var(--text2)', fontSize:12 }}>{c.addr}</td>
                    <td style={{ color:'var(--text2)', fontSize:12 }}>{c.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function DirectionsPage() {
  return (
    <Suspense>
      <DirectionsContent />
    </Suspense>
  );
}
