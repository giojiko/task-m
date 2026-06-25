'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import Modal from '@/components/UI/Modal';
import { useApp } from '@/context/AppContext';
import { uid, generatePassportCode, generatePassportUrlId } from '@/lib/utils';

export default function PassportsPage() {
  const { db, user, saveDB, toast } = useApp();
  const isSuper = ['super_admin', 'admin'].includes(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [editingP, setEditingP] = useState(null);
  const [viewP, setViewP] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const passports = useMemo(() =>
    [...(db?.passports || [])]
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase())
        || p.code?.toLowerCase().includes(search.toLowerCase())),
    [db?.passports, search]
  );

  const clients = db?.clients || [];

  const savePassport = async (data, newFiles) => {
    const isNew = !(db?.passports || []).some(p => p.id === data.id);

    if (newFiles?.length > 0) {
      setUploading(true);
      const uploaded = [];
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('code', data.code);
        const res = await fetch('/api/passports/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const fileData = await res.json();
          uploaded.push({ id: uid(), ...fileData, uploadedAt: new Date().toISOString() });
        }
      }
      data.files = [...(data.files || []), ...uploaded];
      setUploading(false);
    }

    const newDb = { ...db };
    newDb.passports = isNew
      ? [...(newDb.passports || []), { ...data, id: data.id || uid(), urlId: generatePassportUrlId(), created: new Date().toISOString(), updated: new Date().toISOString(), scans: data.scans || [], totalScans: data.totalScans || 0 }]
      : (newDb.passports || []).map(p => p.id === data.id ? { ...p, ...data, updated: new Date().toISOString() } : p);

    await saveDB(newDb);
    toast(isNew ? '✅ Passport შეიქმნა' : '✅ Passport განახლდა');
    setShowForm(false);
    setEditingP(null);
  };

  const deleteFile = async (passport, file) => {
    await fetch('/api/passports/file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path }),
    });
    if (!passport.id) return; // not yet saved — only strip from in-memory form state
    const newDb = { ...db };
    newDb.passports = newDb.passports.map(p =>
      p.id === passport.id ? { ...p, files: (p.files || []).filter(f => f.id !== file.id) } : p
    );
    await saveDB(newDb);
    toast('🗑 ფაილი წაიშალა');
  };

  const printQR = (p) => {
    if (!p.urlId) return toast('⚠️ ეს passport-ი urlId-ის გარეშეა — შეცვალე და შეინახე ხელახლა');
    const url = `https://office.smartpro.ge/p/${p.urlId}`;
    const win = window.open('', '_blank', 'width=420,height=560');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>QR სტიკერი — ${p.code}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family: 'Inter', sans-serif; }
        .page { padding: 24px; display:flex; flex-direction:column; align-items:center; }
        .sticker {
          width: 300px;
          border: 2px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,.08);
        }
        .logo { height: 32px; margin-bottom: 12px; }
        .project-type {
          font-size: 10px; color: #1BEACD; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .title {
          font-size: 14px; font-weight: 700; color: #0F1117;
          margin-bottom: 16px; line-height: 1.4;
        }
        .qr-wrap {
          width: 160px; height: 160px;
          margin: 0 auto 16px;
          border-radius: 10px; overflow: hidden;
          border: 1px solid #E2E8F0;
          padding: 6px; background: #fff;
        }
        .divider { border: none; border-top: 1.5px dashed #CBD5E0; margin: 14px 0; }
        .code-label {
          font-size: 9px; color: #94A3B8; letter-spacing: .1em;
          text-transform: uppercase; margin-bottom: 4px;
        }
        .code {
          font-family: 'Courier New', monospace;
          font-size: 22px; font-weight: 700; color: #0F1117;
          letter-spacing: .12em;
        }
        .instruction { font-size: 10px; color: #64748B; margin-top: 10px; line-height: 1.6; }
        .footer {
          font-size: 9px; color: #94A3B8;
          margin-top: 12px; border-top: 1px solid #F1F5F9;
          padding-top: 10px;
        }
        .btn {
          margin-top: 20px; padding: 10px 24px;
          background: #1BEACD; border: none; border-radius: 8px;
          font-weight: 700; cursor: pointer; font-size: 13px;
        }
        @media print { .btn { display: none; } .page { padding: 0; } }
      </style>
    </head><body>
      <div class="page">
        <div class="sticker">
          <img class="logo"
            src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
            alt="SmartPro" onerror="this.style.display='none'" />

          <div class="project-type">Project Passport</div>
          <div class="title">${p.title}</div>

          <div class="qr-wrap" id="qr"></div>

          <hr class="divider" />

          <div class="code-label">ავტორიზაციის კოდი</div>
          <div class="code">${p.code}</div>
          <div class="instruction">
            📱 QR დასკანირება და<br/>
            კოდის შეყვანა საჭიროა
          </div>

          <div class="footer">
            SmartPro Georgia · smartpro.ge<br/>
            +995 505 55 65 65
          </div>
        </div>
        <button class="btn" onclick="window.print()">🖨️ ბეჭდვა</button>
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${url}',
          width: 148, height: 148,
          colorDark: '#0F1117', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      </script>
    </body></html>`);
    win.document.close();
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">🔖 Project Passports</div>
          <div className="page-subtitle">{passports.length} passport სულ</div>
        </div>
        {isSuper && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingP(null); setShowForm(true); }}>
            + ახალი Passport
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input className="input" style={{ maxWidth: 280 }} value={search}
          onChange={e => setSearch(e.target.value)} placeholder="კოდი ან სახელი" />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>კოდი</th>
              <th>პროექტი</th>
              <th>კლიენტი</th>
              <th>ფაილები</th>
              <th>სკანირება</th>
              <th>სტატუსი</th>
              <th style={{ width: 120 }}>მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {passports.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty">
                  <div className="empty-icon">🔖</div>
                  <div className="empty-title">Passport-ები არ არის</div>
                </div>
              </td></tr>
            ) : passports.map(p => {
              const client = clients.find(c => c.id === p.clientId);
              return (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                    {p.code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{client?.name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(p.files || []).length} ფაილი</td>
                  <td>
                    <span style={{ fontSize: 12, color: (p.totalScans || 0) > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {p.totalScans || 0}×
                    </span>
                  </td>
                  <td>
                    <span className={`badge b-${p.status === 'active' ? 'completed' : 'stopped'}`}>
                      {p.status === 'active' ? '✅ აქტიური' : p.status === 'archived' ? '📦 დაარქივებული' : '🔒 დაბლოკილი'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" title="QR ბეჭდვა" onClick={() => printQR(p)}>🖨️</button>
                      <button className="btn btn-ghost btn-xs" title="გახსნა" onClick={() => setViewP(p)}>👁️</button>
                      {isSuper && (
                        <button className="btn btn-ghost btn-xs" title="რედაქტირება"
                          onClick={() => { setEditingP(p); setShowForm(true); }}>✏️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && isSuper && (
        <PassportFormModal
          passport={editingP}
          clients={clients}
          uploading={uploading}
          onClose={() => { setShowForm(false); setEditingP(null); }}
          onSave={savePassport}
          onDeleteFile={deleteFile}
        />
      )}

      {viewP && (
        <PassportAnalyticsModal
          passport={viewP}
          clients={clients}
          onClose={() => setViewP(null)}
        />
      )}
    </AppShell>
  );
}

function PassportFormModal({ passport, clients, uploading, onClose, onSave, onDeleteFile }) {
  const isNew = !passport?.id;
  const [form, setForm] = useState({
    id: passport?.id || '',
    code: passport?.code || generatePassportCode(),
    title: passport?.title || '',
    clientId: passport?.clientId || '',
    description: passport?.description || '',
    projectType: passport?.projectType || '',
    completedDate: passport?.completedDate || new Date().toISOString().slice(0, 10),
    standards: passport?.standards || '',
    instructions: passport?.instructions || '',
    status: passport?.status || 'active',
    files: passport?.files || [],
  });
  const [newFiles, setNewFiles] = useState([]);
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.code.trim()) return setErr('კოდი სავალდებულოა');
    if (!form.title.trim()) return setErr('პროექტის სახელი სავალდებულოა');
    onSave(form, newFiles);
  };

  return (
    <Modal open size="modal-xl"
      title={isNew ? '🔖 ახალი Passport' : `✏️ ${passport.code}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>გაუქმება</button>
        <button className="btn btn-primary btn-sm" disabled={uploading} onClick={submit}>
          {uploading ? '⏳ იტვირთება...' : '💾 შენახვა'}
        </button>
      </>}
    >
      {err && <div className="err-box" style={{ display: 'block', marginBottom: 12 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fg">
          <label className="form-label req">პასპორტის კოდი</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              style={{ fontFamily: 'monospace', fontWeight: 700 }} />
            <button className="btn btn-ghost btn-sm"
              onClick={() => setForm(p => ({ ...p, code: generatePassportCode() }))}>
              🎲
            </button>
          </div>
        </div>

        <div className="fg">
          <label className="form-label">სტატუსი</label>
          <select className="select" value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">✅ აქტიური</option>
            <option value="archived">📦 დაარქივებული</option>
            <option value="restricted">🔒 დაბლოკილი</option>
          </select>
        </div>
      </div>

      <div className="fg">
        <label className="form-label req">პროექტის სახელი</label>
        <input className="input" value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fg">
          <label className="form-label">კლიენტი</label>
          <select className="select" value={form.clientId}
            onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
            <option value="">— კლიენტი —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="form-label">პროექტის ტიპი</label>
          <input className="input" value={form.projectType}
            onChange={e => setForm(p => ({ ...p, projectType: e.target.value }))}
            placeholder="მაგ: ელ. ფარი 200A" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fg">
          <label className="form-label">შესრულების თარიღი</label>
          <input className="input" type="date" value={form.completedDate}
            onChange={e => setForm(p => ({ ...p, completedDate: e.target.value }))} />
        </div>
        <div className="fg">
          <label className="form-label">სტანდარტები</label>
          <input className="input" value={form.standards}
            onChange={e => setForm(p => ({ ...p, standards: e.target.value }))}
            placeholder="მაგ: IEC 60364" />
        </div>
      </div>

      <div className="fg">
        <label className="form-label">აღწერა</label>
        <textarea className="textarea" rows={2} value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>

      <div className="fg">
        <label className="form-label">კლიენტის ინსტრუქციები</label>
        <textarea className="textarea" rows={3} value={form.instructions}
          onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
          placeholder="მაგ: მთავარი ავტომატი — ქვედა მარცხენა. ძაბვა 230V..." />
      </div>

      <div className="fg" style={{ marginBottom: 0 }}>
        <label className="form-label">ფაილები</label>

        {form.files.length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.files.map(file => (
              <div key={file.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-muted)', borderRadius: 8,
                padding: '8px 12px', border: '1px solid var(--border)',
              }}>
                <span>{file.type?.includes('pdf') ? '📄' : file.name?.match(/\.(dwg|dxf)/i) ? '📐' : '🖼️'}</span>
                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <button className="btn btn-ghost btn-xs"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => {
                    onDeleteFile({ id: passport?.id }, file);
                    setForm(p => ({ ...p, files: p.files.filter(f => f.id !== file.id) }));
                  }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <input type="file" multiple
          style={{ display: 'none' }} id="passport-file-input"
          accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.zip,.xlsx"
          onChange={e => setNewFiles(Array.from(e.target.files))}
        />
        <label htmlFor="passport-file-input" className="btn btn-ghost btn-sm"
          style={{ border: '1.5px dashed var(--border)', width: '100%',
            justifyContent: 'center', cursor: 'pointer', display: 'flex' }}>
          {newFiles.length > 0 ? `📁 ${newFiles.length} ფაილი არჩეულია` : '+ ფაილების დამატება'}
        </label>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          PDF, JPG, PNG, DWG, DXF, ZIP, XLSX — მაქსიმუმ 50MB
        </div>
      </div>
    </Modal>
  );
}

function PassportAnalyticsModal({ passport, clients, onClose }) {
  const scans = passport.scans || [];
  const url = `https://office.smartpro.ge/p/${passport.urlId || passport.code}`;

  return (
    <Modal open title={`📊 ${passport.code} — Analytics`} onClose={onClose}
      footer={<button className="btn btn-ghost btn-sm" onClick={onClose}>დახურვა</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'სულ სკანირება', value: passport.totalScans || 0, icon: '📱' },
          { label: 'ფაილები', value: (passport.files || []).length, icon: '📁' },
          { label: 'სტატუსი', value: passport.status === 'active' ? 'აქტიური' : 'დაარქივებული', icon: '🔖' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-muted)', borderRadius: 10, padding: '14px',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22 }}>{stat.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="fg">
        <label className="form-label">Public URL</label>
        <div style={{
          background: 'var(--bg-muted)', borderRadius: 8, padding: '10px 12px',
          fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{url}</span>
          <button className="btn btn-ghost btn-xs"
            onClick={() => { navigator.clipboard.writeText(url); }}>📋</button>
        </div>
      </div>

      {scans.length > 0 && (
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="form-label">ბოლო სკანირებები</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...scans].reverse().slice(0, 8).map((scan, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                background: 'var(--bg-muted)', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(scan.at).toLocaleString('ka-GE')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {scan.ip}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
