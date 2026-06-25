'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function PassportPage() {
  const { urlId } = useParams();
  const [step, setStep] = useState('code'); // 'code' | 'loading' | 'passport'
  const [inputCode, setInputCode] = useState('');
  const [passport, setPassport] = useState(null);
  const [error, setError] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'info' | 'ai'
  const aiEndRef = useRef(null);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiHistory]);

  useEffect(() => {
    if (step === 'passport' && passport) {
      fetch('/api/passports/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: passport.code, userAgent: navigator.userAgent }),
      }).catch(() => {});
    }
  }, [step, passport]);

  const verify = async () => {
    const enteredCode = inputCode.trim().toUpperCase();
    if (!enteredCode) return;
    setStep('loading');
    setError('');

    try {
      const res = await fetch(
        `/api/passports/verify?urlId=${encodeURIComponent(urlId)}&code=${encodeURIComponent(enteredCode)}`
      );
      const data = await res.json();

      if (!res.ok || !data.passport) {
        setError(data.error || 'კოდი არასწორია');
        setStep('code');
        return;
      }
      setPassport(data.passport);
      setStep('passport');
    } catch {
      setError('კავშირი ვერ დამყარდა — სცადეთ ხელახლა');
      setStep('code');
    }
  };

  const openFile = async (file) => {
    const res = await fetch(`/api/passports/file?path=${encodeURIComponent(file.path)}&code=${passport.code}`);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  };

  const askAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const q = aiInput.trim();
    setAiInput('');
    setAiLoading(true);
    const newHistory = [...aiHistory, { role: 'user', content: q }];
    setAiHistory(newHistory);

    try {
      const res = await fetch('/api/passports/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: passport.code, question: q, history: aiHistory }),
      });
      const data = await res.json();
      setAiHistory([...newHistory, { role: 'assistant', content: data.answer || data.error || 'შეცდომა მოხდა' }]);
    } catch {
      setAiHistory([...newHistory, { role: 'assistant', content: 'შეცდომა მოხდა — სცადეთ ხელახლა' }]);
    }
    setAiLoading(false);
  };

  if (step === 'code' || step === 'loading') return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
            alt="SmartPro" style={{ height: 36, marginBottom: 10 }}
            onError={e => e.target.style.display = 'none'}
          />
          <div style={{ color: '#1BEACD', fontSize: 11, letterSpacing: '.15em',
            textTransform: 'uppercase', fontWeight: 700 }}>
            Project Passport
          </div>
        </div>

        <div style={{
          background: '#161B28', border: '1px solid #2A3347',
          borderRadius: 16, padding: 28,
        }}>
          <div style={{ color: '#F0F4F8', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            🔐 ავტორიზაცია
          </div>
          <div style={{ color: '#6B7A8D', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
            სტიკერზე მოცემული კოდი შეიყვანეთ<br/>
            <span style={{ color: '#4A5568', fontSize: 11 }}>
              (მაგ: SP-2026-A7X9)
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#FC8181', fontSize: 13,
            }}>
              ❌ {error}
            </div>
          )}

          <input
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="SP-2026-XXXX"
            autoFocus
            disabled={step === 'loading'}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0F1117', border: '1.5px solid #2A3347',
              borderRadius: 10, padding: '14px 16px',
              color: '#F0F4F8', fontSize: 20, fontFamily: 'monospace',
              letterSpacing: '.12em', textAlign: 'center',
              outline: 'none', marginBottom: 12, transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = '#1BEACD'}
            onBlur={e => e.target.style.borderColor = '#2A3347'}
          />

          <button onClick={verify} disabled={step === 'loading' || !inputCode.trim()}
            style={{
              width: '100%', padding: '14px',
              background: step === 'loading' ? '#2A3347' : 'linear-gradient(135deg, #1BEACD, #13B89E)',
              border: 'none', borderRadius: 10,
              color: '#0F1117', fontWeight: 700, fontSize: 15,
              cursor: step === 'loading' ? 'wait' : 'pointer',
              transition: 'all .2s',
            }}>
            {step === 'loading' ? '⏳ მოწმდება...' : 'გახსნა →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18,
          color: '#2A3347', fontSize: 11, lineHeight: 1.8 }}>
          SmartPro Georgia · smartpro.ge
        </div>
      </div>
    </div>
  );

  if (step === 'passport' && passport) {
    const TABS = [
      { key: 'files', label: `📁 ფაილები (${(passport.files || []).length})` },
      { key: 'info', label: '📋 პროექტი' },
      { key: 'ai', label: '🤖 AI ასისტენტი' },
    ];

    return (
      <div style={{ minHeight: '100vh', background: '#0F1117',
        fontFamily: 'Inter, system-ui, sans-serif', color: '#F0F4F8' }}>

        <div style={{
          background: '#161B28', borderBottom: '1px solid #2A3347',
          padding: '14px 20px',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
                alt="SmartPro" style={{ height: 26 }}
                onError={e => e.target.style.display = 'none'}
              />
              <div>
                <div style={{ fontSize: 10, color: '#1BEACD', fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Project Passport
                </div>
                <div style={{ fontSize: 12, color: '#4A5568', fontFamily: 'monospace' }}>
                  {passport.code}
                </div>
              </div>
            </div>
            <div style={{
              background: 'rgba(27,234,205,0.1)', border: '1px solid rgba(27,234,205,0.25)',
              borderRadius: 20, padding: '3px 12px',
              fontSize: 11, color: '#1BEACD', fontWeight: 700,
            }}>
              ✓ დამოწმებული
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '18px 16px' }}>

          <div style={{
            background: '#161B28', border: '1px solid #2A3347',
            borderRadius: 12, padding: '18px 20px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 5 }}>
              {passport.title}
            </div>
            {passport.description && (
              <div style={{ fontSize: 13, color: '#6B7A8D', lineHeight: 1.6 }}>
                {passport.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {passport.completedDate && (
                <span style={{ fontSize: 12, color: '#4A5568' }}>📅 {passport.completedDate}</span>
              )}
              {passport.projectType && (
                <span style={{ fontSize: 12, color: '#4A5568' }}>🔧 {passport.projectType}</span>
              )}
              <span style={{ fontSize: 12, color: '#4A5568' }}>👷 SmartPro Georgia</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 14,
            background: '#161B28', borderRadius: 10, padding: 4,
            border: '1px solid #2A3347' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                flex: 1, padding: '9px 6px', border: 'none', borderRadius: 7,
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab.key ? 'rgba(27,234,205,0.1)' : 'transparent',
                color: activeTab === tab.key ? '#1BEACD' : '#6B7A8D',
                borderBottom: activeTab === tab.key ? '2px solid #1BEACD' : '2px solid transparent',
                transition: 'all .15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!(passport.files || []).length ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#4A5568' }}>
                  ფაილები ჯერ არ დამატებულა
                </div>
              ) : passport.files.map(file => (
                <div key={file.id || file.path} onClick={() => openFile(file)} style={{
                  background: '#161B28', border: '1px solid #2A3347', borderRadius: 10,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'border-color .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#1BEACD44'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2A3347'}>
                  <span style={{ fontSize: 22 }}>
                    {file.type?.includes('pdf') ? '📄' :
                     file.type?.includes('image') ? '🖼️' :
                     file.name?.match(/\.(dwg|dxf)/i) ? '📐' : '📁'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </div>
                    {file.size && (
                      <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>
                        {file.size < 1024*1024
                          ? `${(file.size/1024).toFixed(1)} KB`
                          : `${(file.size/(1024*1024)).toFixed(1)} MB`}
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#1BEACD', fontSize: 18, flexShrink: 0 }}>↓</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'info' && (
            <div style={{ background: '#161B28', border: '1px solid #2A3347',
              borderRadius: 12, padding: 20 }}>
              {[
                { label: 'პასპორტის კოდი', value: passport.code, mono: true },
                { label: 'დასახელება', value: passport.title },
                { label: 'ტიპი', value: passport.projectType },
                { label: 'შესრულებულია', value: passport.completedDate },
                { label: 'სტანდარტები', value: passport.standards },
                { label: 'ინსტრუქციები', value: passport.instructions },
                { label: 'შემსრულებელი', value: 'SmartPro Georgia' },
                { label: 'კონტაქტი', value: '+995 505 55 65 65' },
                { label: 'ელ.ფოსტა', value: 'gj.jikia@smartpro.ge' },
              ].filter(r => r.value).map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid #1E2537' : 'none',
                }}>
                  <div style={{ width: 130, fontSize: 12, color: '#4A5568', flexShrink: 0 }}>
                    {row.label}
                  </div>
                  <div style={{
                    fontSize: 13, color: '#D1D9E6',
                    fontFamily: row.mono ? 'monospace' : 'inherit',
                    fontWeight: row.mono ? 700 : 400,
                  }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ background: '#161B28', border: '1px solid #2A3347',
              borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #2A3347',
                background: 'rgba(27,234,205,0.05)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1BEACD' }}>
                  🤖 SmartPro AI ასისტენტი
                </div>
                <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>
                  კითხვა ამ პროექტთან დაკავშირებით
                </div>
              </div>

              <div style={{ minHeight: 200, maxHeight: 360, overflowY: 'auto', padding: 16 }}>
                {aiHistory.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#3D4A5C', padding: '24px 0' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                      "ძირითადი ავტომატი სად არის?"<br />
                      "ელ. ფარის ამპერაჟი რამდენია?"<br />
                      "ნახაზი როგორ წავიკითხო?"
                    </div>
                  </div>
                )}
                {aiHistory.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                  }}>
                    <div style={{
                      maxWidth: '82%',
                      background: msg.role === 'user'
                        ? 'rgba(27,234,205,0.12)' : '#1A2235',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(27,234,205,0.25)' : '#2A3347'}`,
                      borderRadius: msg.role === 'user'
                        ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                      color: msg.role === 'user' ? '#D1D9E6' : '#B0BEC5',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', gap: 5, padding: '6px 0' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#1BEACD',
                        animation: `dot ${0.9 + i * 0.15}s ${i * 0.15}s ease-in-out infinite alternate`,
                      }} />
                    ))}
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              <div style={{ padding: '12px 14px', borderTop: '1px solid #2A3347',
                display: 'flex', gap: 8 }}>
                <input value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI()}
                  placeholder="კითხვა..." disabled={aiLoading}
                  style={{
                    flex: 1, background: '#0F1117', border: '1px solid #2A3347',
                    borderRadius: 8, padding: '10px 14px', color: '#F0F4F8',
                    fontSize: 13, outline: 'none',
                  }} />
                <button onClick={askAI} disabled={aiLoading || !aiInput.trim()} style={{
                  padding: '10px 16px', border: 'none', borderRadius: 8,
                  background: aiLoading ? '#2A3347' : 'linear-gradient(135deg, #1BEACD, #13B89E)',
                  color: '#0F1117', fontWeight: 700, cursor: 'pointer', fontSize: 15,
                }}>→</button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 22,
            color: '#2A3347', fontSize: 11, lineHeight: 1.8 }}>
            SmartPro Georgia · smartpro.ge · +995 505 55 65 65
          </div>
        </div>

        <style>{`
          @keyframes dot {
            from { opacity: .3; transform: translateY(0); }
            to   { opacity: 1;  transform: translateY(-4px); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
