'use client';

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0D1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#F0F4F8',
      flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56 }}>📡</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>ინტერნეტი არ არის</div>
      <div style={{ fontSize: 14, color: '#6B7A8D', lineHeight: 1.6, maxWidth: 280 }}>
        SmartPro-სთვის ინტერნეტ კავშირია საჭირო.<br />
        შეამოწმე კავშირი და სცადე ხელახლა.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: '12px 28px', border: 'none',
          background: 'linear-gradient(135deg, #1BEACD, #13B89E)',
          color: '#0D1117', borderRadius: 10, fontWeight: 700,
          fontSize: 15, cursor: 'pointer',
        }}>
        🔄 ხელახლა ცდა
      </button>
      <div style={{ fontSize: 12, color: '#2A3347', marginTop: 8 }}>
        SmartPro Georgia
      </div>
    </div>
  );
}
