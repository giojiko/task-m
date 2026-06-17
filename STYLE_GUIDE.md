# SmartPro Style Guide

## Colors
- Primary Accent: `#1BEACD` (teal) — `var(--accent)`
- Secondary: `#E5D936` (yellow) — `var(--yellow)`
- Background: `#0D1117` (base), `#1C2333` (cards) — `var(--bg-base)`, `var(--bg-subtle)`
- Text: `#E6EDF3` (primary), `#8B98A5` (secondary), `#586374` (muted)
- Status: `var(--success)`, `var(--warning)`, `var(--danger)`, `var(--info)`, `var(--purple)`

## Typography
- Body: Inter, 13px, `var(--text-primary)`
- Headings: Space Grotesk, `font-weight: 800`
- Muted text: `var(--text-secondary)` / `var(--text-muted)`

## Components

### Button
```jsx
<button className="btn btn-primary">მთავარი</button>
<button className="btn btn-secondary btn-sm">მეორადი</button>
<button className="btn btn-ghost btn-xs">Ghost</button>
<button className="btn btn-danger btn-xs">წაშლა</button>
```
Sizes: default (34px), `btn-sm` (28px), `btn-xs` (24px). Add `btn-icon` for square icon buttons.

### Badge (status)
```jsx
<span className="badge b-pending">მოლოდინში</span>
<span className="badge b-in_progress">მიმდინარე</span>
<span className="badge b-paused">შეჩერებული</span>
<span className="badge b-completed">დასრულებული</span>
<span className="badge b-stopped">გაჩერებული</span>
<span className="badge b-pending_approval">დასამტკიცებელი</span>
```
Priority: `b-high`, `b-medium`, `b-low`
Roles: `b-super_admin`, `b-admin`, `b-specialist`

### Card
```jsx
<div className="card">
  <div className="card-header">
    <span className="card-title">სათაური</span>
    <button className="btn btn-primary btn-sm">ქმედება</button>
  </div>
  <div className="card-body">შიგთავსი</div>
</div>
```

### Form
```jsx
<div className="fg">
  <label>ველის სახელი</label>
  <input className="input" placeholder="..." />
</div>

<div className="frow">
  <div className="fg"><label>მარცხენა</label><input className="input" /></div>
  <div className="fg"><label>მარჯვენა</label><input className="input" /></div>
</div>

<select className="select">...</select>
<textarea className="textarea"></textarea>
```

### Page Header
```jsx
<div className="page-header">
  <div>
    <div className="page-title">გვერდის სათაური</div>
    <div className="page-subtitle">დამატებითი ინფო</div>
  </div>
  <button className="btn btn-primary btn-sm">+ დამატება</button>
</div>
```

### Stat Card
```jsx
<div className="stats-grid">
  <div className="stat-card stat-teal">
    <div className="stat-icon">📋</div>
    <div className="stat-value">42</div>
    <div className="stat-label">სულ ტასკები</div>
  </div>
</div>
```
Colors: `stat-teal`, `stat-blue`, `stat-green`, `stat-yellow`, `stat-purple`, `stat-red`

### Table
```jsx
<div className="table-wrap">
  <table className="table">
    <thead><tr><th>სვეტი</th></tr></thead>
    <tbody>
      <tr><td>მონაცემი</td></tr>
    </tbody>
  </table>
</div>
```

### Empty State
```jsx
<div className="empty">
  <div className="empty-icon">📭</div>
  <div className="empty-title">ჩანაწერი არ არის</div>
  <div className="empty-desc">დამატებითი ინფო</div>
</div>
```

### View Toggle (list/board)
```jsx
<div className="view-toggle">
  <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
    ☰ სია
  </button>
  <button className={`view-btn ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
    ⊞ დაფა
  </button>
</div>
```

### Price Calculator
```jsx
<div className="price-calc-box">
  <div className="price-calc-title">💰 ფასის კალკულატორი</div>
  <div className="price-calc-grid">
    <div className="fg" style={{ marginBottom: 0 }}>
      <label>თვითღირებულება (₾)</label>
      <input type="number" className="input" />
    </div>
    <div className="fg" style={{ marginBottom: 0 }}>
      <label>მარჟა (%)</label>
      <input type="number" className="input" />
    </div>
    <div className="fg" style={{ marginBottom: 0 }}>
      <label>გასაყიდი ფასი</label>
      <div className="price-sell-display">₾0.00</div>
    </div>
  </div>
</div>
```

## Rules for new features
1. **Always use CSS variables** — never hardcode colors (`#fff` is OK for white on dark bg)
2. **Buttons**: `btn btn-primary` for main CTA, `btn btn-ghost` for cancel/secondary, `btn btn-danger` for destructive
3. **Tables**: always `<div className="table-wrap"><table className="table">...</table></div>`
4. **Modals**: always use the `<Modal>` component — never build custom overlays
5. **Empty states**: always `.empty > .empty-icon + .empty-title + .empty-desc`
6. **Status**: always `.badge .b-{status}` — never custom colored spans
7. **Forms**: `.fg` for single field, `.frow` for 2-column row
8. **Every page starts with** `.page-header` then stats (if any) then content
9. **Kanban columns** use `.kanban-col-badge` for the count chip
10. **Spacing**: `gap:14px` for page-level grids, `gap:8px` inside cards
