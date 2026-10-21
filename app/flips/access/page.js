'use client';
import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import AppShell from '@/components/Layout/AppShell';

export default function FlipsAccessPage() {
  const [myAccess, setMyAccess] = useState(undefined);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [level, setLevel] = useState('view');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/flips/me').then(r => r.json()).then(d => {
      setMyAccess(d.level);
      if (d.level === 'owner') {
        fetch('/api/flips/access').then(r => r.json()).then(rows => {
          setRows(Array.isArray(rows) ? rows : []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  // owner check happens after load
  if (myAccess !== undefined && myAccess !== 'owner') {
    // redirect to /flips since this page is owner-only
    if (typeof window !== 'undefined') window.location.replace('/flips');
    return null;
  }

  async function grant(e) {
    e.preventDefault();
    if (!uid.trim()) return;
    setSaving(true); setErr('');
    const res = await fetch('/api/flips/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid.trim(), level }),
    }).then(r => r.json());
    setSaving(false);
    if (res.user_id) {
      setRows(prev => {
        const idx = prev.findIndex(r => r.user_id === res.user_id);
        return idx >= 0 ? prev.map((r, i) => i === idx ? res : r) : [res, ...prev];
      });
      setUid('');
    } else {
      setErr(res.error || 'შეცდომა');
    }
  }

  async function revoke(user_id) {
    await fetch(`/api/flips/access?user_id=${encodeURIComponent(user_id)}`, { method: 'DELETE' });
    setRows(prev => prev.filter(r => r.user_id !== user_id));
  }

  if (loading) return <AppShell><div className="empty">იტვირთება...</div></AppShell>;

  return (
    <AppShell>
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,3.5vw,26px)', fontWeight: 800 }}>წვდომის მართვა</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>მხოლოდ მფლობელს შეუძლია სხვა მომხმარებლებს წვდომა მისცეს ან გაუუქმოს.</p>
        </div>

        {/* grant form */}
        <div className="card">
          <h2 className="card-title">წვდომის მიცემა</h2>
          <form onSubmit={grant} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label">მომხმარებლის ID</label>
              <input className="input" placeholder="uuid ან სისტემური ID" value={uid} onChange={e => setUid(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label">დონე</label>
              <select className="select" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="view">ნახვა (view)</option>
                <option value="edit">რედაქტირება (edit)</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'ვინახავ...' : 'მიცემა / განახლება'}</button>
          </form>
          {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{err}</p>}
        </div>

        {/* access list */}
        <div className="card">
          <h2 className="card-title">წვდომის სია {rows.length > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{rows.length} მომხმარებელი</span>}</h2>
          {rows.length === 0 ? (
            <div className="empty">სხვა მომხმარებლებს ჯერ წვდომა არ აქვთ.</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5 }}>
              <thead><tr>
                {['მომხმარებლის ID','დონე','მიცემის თარიღი',''].map((h, i) => (
                  <th key={i} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.user_id}>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 13 }}>{r.user_id}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: r.level === 'edit' ? 'var(--accent-soft,rgba(0,100,200,0.1))' : 'var(--bg)', color: r.level === 'edit' ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {r.level === 'edit' ? 'რედაქტირება' : 'ნახვა'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {r.granted_at ? new Date(r.granted_at).toLocaleDateString('ka-GE') : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <button onClick={() => revoke(r.user_id)} className="btn" style={{ fontSize: 12, padding: '4px 12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>გაუქმება</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>შენიშვნა:</strong> მოდული „ბინები" მხოლოდ მათ ჩანს, ვისაც წვდომა პირდაპირ აქვს მიცემული. სისტემური ადმინი და სუპერ-ადმინი ვერ ხედავს ამ მოდულს, თუ ამ ცხრილში ჩამოთვლილ არ არის.
        </div>
      </div>
    </AppShell>
  );
}
