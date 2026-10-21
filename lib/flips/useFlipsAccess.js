'use client';
import { useState, useEffect } from 'react';

export function useFlipsAccess() {
  const [level, setLevel] = useState(null);
  useEffect(() => {
    fetch('/api/flips/me').then(r => r.json()).then(d => setLevel(d.level ?? null)).catch(() => {});
  }, []);
  return level;
}
