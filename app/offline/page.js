'use client';

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#F5F2EA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Noto Sans Georgian', system-ui, sans-serif", color: '#071A2B',
      flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56 }}>📡</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>ინტერნეტი არ არის</div>
      <div style={{ fontSize: 14, color: '#4A5868', lineHeight: 1.6, maxWidth: 280 }}>
        SmartPro-სთვის ინტერნეტ კავშირია საჭირო.<br />
        შეამოწმე კავშირი და სცადე ხელახლა.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: '12px 28px', border: 'none',
          background: '#C99A4A',
          color: '#071A2B', borderRadius: 10, fontWeight: 700,
          fontSize: 15, cursor: 'pointer',
        }}>
        🔄 ხელახლა ცდა
      </button>
      <div style={{ fontSize: 12, color: '#7A8592', marginTop: 8 }}>
        SmartPro Georgia
      </div>
    </div>
  );
}
