export async function readDB() {
  const res = await fetch('/api/db', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to read DB');
  return res.json();
}

export async function writeDB(data) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to write DB');
  return res.json();
}
