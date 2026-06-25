'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function PassportPage() {
  const { code: urlCode } = useParams();
  const [step, setStep] = useState('code'); // 'code' | 'loading' | 'passport' | 'error'
  const [inputCode, setInputCode] = useState(urlCode && urlCode !== 'undefined' ? String(urlCode).toUpperCase() : '');
  const [passport, setPassport] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'info' | 'ai'
  const aiEndRef = useRef(null);

  useEffect(() => {
    if (step === 'passport' && passport) {
      fetch('/api/passports/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: passport.code, userAgent: navigator.userAgent }),
      }).catch(() => {});
    }
  }, [step, passport]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiHistory]);

  const verify = async (codeOverride) => {
    const entered = (codeOverride ?? inputCode).trim().toUpperCase();
    if (!entered) return;
    setStep('loading');

    try {
      const res = await fetch(`/api/passports/verify?code=${encodeURIComponent(entered)}`);
      const data = await res.json();
      if (!res.ok || !data.passport) {
        setStep('error');
        return;
      }
      setPassport(data.passport);
      setStep('passport');
    } catch {
      setStep('error');
    }
  };

  // auto-verify if a code arrived via the URL
  useEffect(() => {
    if (urlCode && urlCode !== 'undefined') verify(String(urlCode));
  }, [urlCode]);

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

  if (step === 'code' || step === 'error') return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
            alt="SmartPro" style={{ height: 40, marginBottom: 12 }}
            onError={e => e.target.style.display = 'none'}
          />
          <div style={{ color: '#1BEACD', fontSize: 11, letterSpacing: '.15em',
            textTransform: 'uppercase', fontWeight: 600 }}>
            Project Passport
          </div>
        </div>

        <div style={{
          background: '#161B28', border: '1px solid #2A3347',
          borderRadius: 16, padding: 32,
        }}>
          <div style={{ color: '#F0F4F8', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            🔒 შეიყვანეთ კოდი
          </div>
          <div style={{ color: '#6B7A8D', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
            სტიკერზე ან დოკუმენტზე მოცემული კოდი (მაგ: SP-2026-A7X9)
          </div>

          {step === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#FC8181', fontSize: 13,
            }}>
              ❌ კოდი არასწორია ან პასპორტი არ არსებობს
            </div>
          )}

          <input
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="SP-2026-XXXX"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0F1117', border: '1.5px solid #2A3347',
              borderRadius: 10, padding: '14px 16px',
              color: '#F0F4F8', fontSize: 18, fontFamily: 'monospace',
              letterSpacing: '.1em', textAlign: 'center',
              outline: 'none', marginBottom: 14,
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = '#1BEACD'}
            onBlur={e => e.target.style.borderColor = '#2A3347'}
          />

          <button
            onClick={() => verify()}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #1BEACD, #13B89E)',
              border: 'none', borderRadius: 10,
              color: '#0F1117', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', letterSpacing: '.02em',
            }}>
            გახსნა →
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20,
          color: '#3D4A5C', fontSize: 12, lineHeight: 1.6 }}>
          SmartPro Georgia · +995 505 55 65 65<br />
          smartpro.ge
        </div>
      </div>
    </div>
  );

  if (step === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#1BEACD', fontSize: 14 }}>⏳ იტვირთება...</div>
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
          background: 'linear-gradient(135deg, #161B28 0%, #1A2235 100%)',
          borderBottom: '1px solid #2A3347', padding: '16px 20px',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
                alt="SmartPro" style={{ height: 28 }}
                onError={e => e.target.style.display = 'none'}
              />
              <div>
                <div style={{ fontSize: 11, color: '#1BEACD', fontWeight: 600,
                  letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Project Passport
                </div>
                <div style={{ fontSize: 12, color: '#4A5568', fontFamily: 'monospace' }}>
                  {passport.code}
                </div>
              </div>
            </div>
            <div style={{
              background: 'rgba(27,234,205,0.12)', border: '1px solid rgba(27,234,205,0.25)',
              borderRadius: 20, padding: '3px 12px', fontSize: 11,
              color: '#1BEACD', fontWeight: 600,
            }}>
              ✓ დადასტურებული
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

          <div style={{
            background: '#161B28', border: '1px solid #2A3347',
            borderRadius: 12, padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              {passport.title}
            </div>
            {passport.description && (
              <div style={{ fontSize: 13, color: '#6B7A8D', lineHeight: 1.6 }}>
                {passport.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {passport.completedDate && (
                <div style={{ fontSize: 12, color: '#4A5568' }}>
                  📅 {passport.completedDate}
                </div>
              )}
              {passport.projectType && (
                <div style={{ fontSize: 12, color: '#4A5568' }}>
                  🔧 {passport.projectType}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#4A5568' }}>
                👷 SmartPro Georgia
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 16,
            background: '#161B28', borderRadius: 10, padding: 4,
            border: '1px solid #2A3347' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '9px 8px', border: 'none', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: activeTab === tab.key
                    ? 'linear-gradient(135deg, #1BEACD22, #13B89E22)'
                    : 'transparent',
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
              {(passport.files || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px',
                  color: '#4A5568', fontSize: 14 }}>
                  ფაილები ჯერ არ არის დამატებული
                </div>
              ) : (passport.files || []).map(file => (
                <div key={file.id || file.path}
                  onClick={() => openFile(file)}
                  style={{
                    background: '#161B28', border: '1px solid #2A3347',
                    borderRadius: 10, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1BEACD44'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2A3347'}
                >
                  <span style={{ fontSize: 24 }}>
                    {file.type?.includes('pdf') ? '📄' :
                     file.type?.includes('image') ? '🖼️' :
                     file.name?.match(/\.(dwg|dxf)/i) ? '📐' : '📁'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </div>
                    {file.size && (
                      <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>
                        {file.size < 1024*1024
                          ? `${(file.size/1024).toFixed(1)} KB`
                          : `${(file.size/1024/1024).toFixed(1)} MB`}
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#1BEACD', fontSize: 18 }}>↓</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'info' && (
            <div style={{
              background: '#161B28', border: '1px solid #2A3347',
              borderRadius: 12, padding: '20px',
            }}>
              {[
                { label: 'პროექტის კოდი', value: passport.code, mono: true },
                { label: 'დასახელება', value: passport.title },
                { label: 'ტიპი', value: passport.projectType },
                { label: 'შესრულების თარიღი', value: passport.completedDate },
                { label: 'სტანდარტები', value: passport.standards },
                { label: 'ინსტრუქციები', value: passport.instructions },
                { label: 'შემსრულებელი', value: 'SmartPro Georgia' },
                { label: 'კონტაქტი', value: '+995 505 55 65 65' },
                { label: 'ელ.ფოსტა', value: 'gj.jikia@smartpro.ge' },
              ].filter(r => r.value).map(row => (
                <div key={row.label} style={{
                  display: 'flex', padding: '10px 0',
                  borderBottom: '1px solid #1E2537',
                }}>
                  <div style={{ width: 140, fontSize: 12, color: '#4A5568', flexShrink: 0 }}>
                    {row.label}
                  </div>
                  <div style={{
                    fontSize: 13, color: '#D1D9E6',
                    fontFamily: row.mono ? 'monospace' : 'inherit',
                    fontWeight: row.mono ? 600 : 400,
                  }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{
              background: '#161B28', border: '1px solid #2A3347',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid #2A3347',
                background: 'rgba(27,234,205,0.05)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1BEACD' }}>
                  🤖 SmartPro AI ასისტენტი
                </div>
                <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>
                  დაუსვი კითხვა ამ პროექტთან დაკავშირებით
                </div>
              </div>

              <div style={{ minHeight: 200, maxHeight: 380, overflowY: 'auto', padding: '16px' }}>
                {aiHistory.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#3D4A5C', fontSize: 13, padding: '20px 0' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    მაგ: "ელ. ფარის ამპერაჟი რამდენია?"<br />
                    "ძირითადი ავტომატი სად არის?"<br />
                    "ნახაზი როგორ წავიკითხო?"
                  </div>
                )}
                {aiHistory.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}>
                    <div style={{
                      maxWidth: '82%',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #1BEACD22, #13B89E22)'
                        : '#1A2235',
                      border: `1px solid ${msg.role === 'user' ? '#1BEACD33' : '#2A3347'}`,
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: msg.role === 'user' ? '#D1D9E6' : '#B0BEC5',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#1BEACD',
                        animation: `pulse 1.2s ${i*0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              <div style={{
                padding: '12px 16px', borderTop: '1px solid #2A3347',
                display: 'flex', gap: 8,
              }}>
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI()}
                  placeholder="კითხვა ჩაწერეთ..."
                  disabled={aiLoading}
                  style={{
                    flex: 1, background: '#0F1117',
                    border: '1px solid #2A3347', borderRadius: 8,
                    padding: '10px 14px', color: '#F0F4F8', fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button onClick={askAI} disabled={aiLoading || !aiInput.trim()}
                  style={{
                    padding: '10px 16px', border: 'none', borderRadius: 8,
                    background: aiLoading ? '#2A3347' : 'linear-gradient(135deg, #1BEACD, #13B89E)',
                    color: '#0F1117', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                  }}>
                  →
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24,
            color: '#3D4A5C', fontSize: 11, lineHeight: 1.8 }}>
            SmartPro Georgia · smartpro.ge<br />
            +995 505 55 65 65 · gj.jikia@smartpro.ge
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: .3; transform: scale(.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
