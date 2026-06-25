'use client';
import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/Layout/AppShell';
import Modal from '@/components/UI/Modal';
import { useApp } from '@/context/AppContext';
import { uid } from '@/lib/utils';

/* ─── Direction Modal (add/edit) ─── */
function DirModal({ dir, onClose, onSave }) {
  const isNew = !dir?.id;
  const [form, setForm] = useState({
    name:   dir?.name   || '',
    nameEn: dir?.nameEn || '',
    nameRu: dir?.nameRu || '',
    desc:   dir?.desc   || '',
    icon:   dir?.icon   || '📁',
    color:  dir?.color  || '#1BEACD',
  });
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return setErr('სახელი სავალდებულოა');
    onSave({ ...dir, ...form, id: dir?.id || uid(), name: form.name.trim() });
    onClose();
  };

  return (
    <Modal open
      title={isNew ? '+ ახალი მიმართულება' : `✏️ ${dir.name}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>გაუქმება</button>
        <button className="btn btn-primary btn-sm" onClick={save}>შენახვა</button>
      </>}
    >
      {err && <div className="err-box">{err}</div>}
      <div className="frow">
        <div className="fg" style={{ maxWidth: 70 }}>
          <label className="form-label">ხატულა</label>
          <input className="input" value={form.icon}
            onChange={e => upd('icon', e.target.value)}
            style={{ fontSize: 22, textAlign: 'center' }} maxLength={4} />
        </div>
        <div className="fg" style={{ maxWidth: 110 }}>
          <label className="form-label">ფერი</label>
          <input type="color" value={form.color}
            onChange={e => upd('color', e.target.value)}
            style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent' }} />
        </div>
      </div>
      <div className="frow">
        <div className="fg">
          <label className="form-label req">სახელი (ქართ)</label>
          <input className="input" value={form.name} onChange={e => upd('name', e.target.value)} autoFocus />
        </div>
        <div className="fg">
          <label className="form-label">Name (EN)</label>
          <input className="input" value={form.nameEn} onChange={e => upd('nameEn', e.target.value)} />
        </div>
      </div>
      <div className="fg">
        <label className="form-label">Название (RU)</label>
        <input className="input" value={form.nameRu} onChange={e => upd('nameRu', e.target.value)} />
      </div>
      <div className="fg" style={{ marginBottom: 0 }}>
        <label className="form-label">აღწერა</label>
        <input className="input" value={form.desc} onChange={e => upd('desc', e.target.value)} />
      </div>
    </Modal>
  );
}

/* ─── Direction Card ─── */
function DirCard({ d, clientCount, isSuper, lang, onClick, onEdit, onDelete }) {
  const name = lang === 'en' ? (d.nameEn || d.name) : lang === 'ru' ? (d.nameRu || d.name) : d.name;
  return (
    <div
      className="card"
      style={{ cursor: 'pointer', borderColor: d.color + '44', transition: 'all .18s', padding: 0 }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = d.color}
      onMouseLeave={e => e.currentTarget.style.borderColor = d.color + '44'}
    >
      <div style={{ height: 3, background: d.color, borderRadius: '8px 8px 0 0' }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28 }}>{d.icon}</span>
          {isSuper && (
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <button className="btn btn-ghost btn-xs" onClick={onEdit}
                style={{ padding: '2px 6px', fontSize: 11 }}>✏️</button>
              <button className="btn btn-ghost btn-xs" onClick={onDelete}
                style={{ padding: '2px 6px', fontSize: 11, color: 'var(--danger)' }}>🗑</button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: d.color, marginTop: 8, marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>{d.desc}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: d.color + '18', borderRadius: 20,
          padding: '3px 10px', fontSize: 12, color: d.color, fontWeight: 600,
        }}>
          👥 {clientCount} კლიენტი
        </div>
      </div>
    </div>
  );
}

/* ─── Client Table ─── */
function ClientTable({ clients, emptyMsg }) {
  if (clients.length === 0) {
    return (
      <div className="empty" style={{ padding: '40px 0' }}>
        <div className="empty-icon">👥</div>
        <div className="empty-title">{emptyMsg}</div>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>სახელი</th>
            <th>ტელეფონი</th>
            <th>მისამართი</th>
            <th>ელ.ფოსტა</th>
            <th>პ/ნ</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>{c.name}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.addr || '—'}</td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.email || '—'}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.pid || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Content (needs Suspense for useSearchParams) ─── */
function DirectionsContent() {
  const { db, saveDB, toast, user, lang } = useApp();
  const isSuper = user?.role === 'super_admin';
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showModal,  setShowModal]  = useState(false);
  const [editDir,    setEditDir]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const dirs    = db?.directions || [];
  const clients = db?.clients    || [];

  // URL is source of truth
  const selectedDir = searchParams.get('dir');

  const onlineClients = useMemo(
    () => clients.filter(c => !c.directions || c.directions.length === 0),
    [clients]
  );

  const activeDir = dirs.find(d => d.id === selectedDir);
  const dirClients = useMemo(() => {
    if (!selectedDir || selectedDir === 'online') return [];
    return clients.filter(c => (c.directions || []).includes(selectedDir));
  }, [clients, selectedDir]);

  const goTo = (dirId) => {
    if (dirId) router.push(`/directions?dir=${dirId}`);
    else router.push('/directions');
  };

  /* ── CRUD ── */
  const handleSave = async (data) => {
    const newDb = { ...db };
    const exists = (newDb.directions || []).find(d => d.id === data.id);
    newDb.directions = exists
      ? newDb.directions.map(d => d.id === data.id ? data : d)
      : [...(newDb.directions || []), data];
    await saveDB(newDb);
    toast('✅ მიმართულება შენახულია');
  };

  const handleDelete = async (dirId) => {
    const newDb = { ...db };
    newDb.directions = (newDb.directions || []).filter(d => d.id !== dirId);
    newDb.clients = (newDb.clients || []).map(c => ({
      ...c,
      directions: (c.directions || []).filter(id => id !== dirId),
    }));
    await saveDB(newDb);
    toast('🗑 მიმართულება წაშლილია');
    setConfirmDel(null);
    if (selectedDir === dirId) goTo(null);
  };

  /* ── Detail View ── */
  if (selectedDir) {
    const isOnline = selectedDir === 'online';
    const displayClients = isOnline ? onlineClients : dirClients;
    const title = isOnline ? '🛒 ონლაინ გაყიდვა' : `${activeDir?.icon || ''} ${activeDir?.name || ''}`;
    const color = isOnline ? '#F59E0B' : (activeDir?.color || 'var(--accent)');
    return (
      <AppShell>
        <div className="page-header">
          <div>
            <div className="page-title">{title}</div>
            <div className="page-subtitle" style={{ color }}>
              {isOnline ? 'მიმართულების გარეშე კლიენტები' : activeDir?.desc}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo(null)}>
            ← ყველა მიმართულება
          </button>
        </div>
        <div style={{ height: 4, background: color, borderRadius: 4, marginBottom: 20 }} />
        <ClientTable clients={displayClients} emptyMsg="ამ მიმართულებაში კლიენტი არ არის" />
      </AppShell>
    );
  }

  /* ── Grid View ── */
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">მიმართულებები</div>
          <div className="page-subtitle">SmartPro-ს სამუშაო მიმართულებები</div>
        </div>
        {isSuper && (
          <button className="btn btn-primary btn-sm"
            onClick={() => { setEditDir(null); setShowModal(true); }}>
            + ახალი მიმართულება
          </button>
        )}
      </div>

      {/* ── ონლაინ გაყიდვა — special banner ── */}
      <div
        onClick={() => goTo('online')}
        style={{
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1.5px solid rgba(245,158,11,0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          transition: 'border-color .18s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🛒</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B', marginBottom: 2 }}>
              ონლაინ გაყიდვა
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              მიმართულების გარეშე კლიენტები — მხოლოდ გაყიდვა, მომსახურების გარეშე
            </div>
          </div>
        </div>
        <div style={{
          background: 'rgba(245,158,11,0.18)', borderRadius: 20,
          padding: '4px 14px', fontSize: 13, color: '#F59E0B', fontWeight: 700, flexShrink: 0,
        }}>
          👥 {onlineClients.length}
        </div>
      </div>

      {/* ── Direction Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {dirs.map(d => (
          <DirCard
            key={d.id}
            d={d}
            lang={lang}
            isSuper={isSuper}
            clientCount={clients.filter(c => (c.directions || []).includes(d.id)).length}
            onClick={() => goTo(d.id)}
            onEdit={() => { setEditDir(d); setShowModal(true); }}
            onDelete={() => setConfirmDel(d)}
          />
        ))}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <DirModal
          dir={editDir}
          onClose={() => { setShowModal(false); setEditDir(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Delete Confirm ── */}
      {confirmDel && (
        <Modal open
          title="🗑 წაშლის დადასტურება"
          onClose={() => setConfirmDel(null)}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>გაუქმება</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmDel.id)}>წაშლა</button>
          </>}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            დარწმუნებული ხარ, რომ გინდა წაშლა?<br />
            <strong style={{ color: confirmDel.color }}>{confirmDel.icon} {confirmDel.name}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              ეს მიმართულება კლიენტების პროფილებიდანაც ამოიშლება.
            </span>
          </p>
        </Modal>
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
