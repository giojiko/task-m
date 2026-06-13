/* ═══════════════════════════════════════════
   SmartPro — app.js
   Entry point: global state + navigation
   ═══════════════════════════════════════════ */

// Global state
let _cu      = null;   // current user
let _curPage = '';     // active page

function goto(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  const page = document.getElementById('page-'+p);
  if(page) page.classList.add('active');
  document.querySelector('[data-p="'+p+'"]')?.classList.add('active');
  _curPage = p;
  const loaders = {
    dashboard: loadDash,
    tasks:     loadTasks,
    clients:   loadClients,
    warehouse: loadWh,
    employees: loadEmps,
    directions:loadDirections,
    profile:   loadProfile,
  };
  loaders[p]?.();
}
