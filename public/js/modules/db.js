/* ═══════════════════════════════════════════
   SmartPro — db.js
   Database: localStorage + Node.js server sync
   ═══════════════════════════════════════════ */

const DB_KEY = 'spro_db_v4';
const IS_SERVER = window.location.protocol !== 'file:';

async function fetchDBFromServer() {
  try { const r=await fetch('/api/db'); if(!r.ok) return null; return await r.json(); }
  catch { return null; }
}

async function saveDBToServer(db) {
  try {
    await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(db) });
  } catch(e) { console.warn('Server save failed, using localStorage', e); }
}

function tryParseLS(key) { try { const v=localStorage.getItem(key); return v?JSON.parse(v):null; } catch { return null; } }
function tryParse(str) { try { return JSON.parse(str); } catch { return null; } }

function loadDB() {
  const current = tryParseLS(DB_KEY);
  if(current && current.users && current.users.length > 0) return current;
  for(const oldKey of ['spro_db_v3','spro_db_v2','spro_db_v1']) {
    const old = tryParseLS(oldKey);
    if(old && old.users && old.users.length > 0) {
      console.log('[SmartPro] Migrating from', oldKey);
      saveDB(old); localStorage.removeItem(oldKey); return old;
    }
  }
  return initDB();
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  if(IS_SERVER) saveDBToServer(db);
}

function initDB() {
  const db = { users:[], clients:[], tasks:[], wh:[], whlogs:[], tasklogs:[], photos:{}, directions:[] };
  db.directions = [
    {id:'d1',name:'ელექტროობა',nameEn:'Electricity',nameRu:'Электричество',desc:'ენერგოეფექტური ელექტრო სისტემები',color:'#E5D936',icon:'⚡'},
    {id:'d2',name:'სუსტი დენები',nameEn:'Low Voltage',nameRu:'Слаботочные системы',desc:'CCTV, განგაში, წვდომის კონტროლი',color:'#1BEACD',icon:'📡'},
    {id:'d3',name:'უსაფრთხოების კამერები',nameEn:'Security Cameras',nameRu:'Камеры безопасности',desc:'CCTV სისტემების მონტაჟი',color:'#7B5FD4',icon:'📷'},
    {id:'d4',name:'სახანძრო სიგნალიზაცია',nameEn:'Fire Alarm',nameRu:'Пожарная сигнализация',desc:'სახანძრო გამაფრთხილებელი სისტემები',color:'#FF4060',icon:'🔥'},
    {id:'d5',name:'ინტერნეტ ქსელი',nameEn:'Internet Network',nameRu:'Интернет-сеть',desc:'ქსელური ინფრასტრუქტურა',color:'#004584',icon:'🌐'},
    {id:'d6',name:'ჭკვიანი სახლი',nameEn:'Smart Home',nameRu:'Умный дом',desc:'ავტომატიზაციის სისტემები',color:'#06B59C',icon:'🏠'},
    {id:'d7',name:'მზის პანელები',nameEn:'Solar Panels',nameRu:'Солнечные панели',desc:'მზის ენერგიის სისტემები',color:'#FFB800',icon:'☀️'},
    {id:'d8',name:'კომპიუტერული მომსახურება',nameEn:'IT Service',nameRu:'IT Обслуживание',desc:'IT მხარდაჭერა და ოპტიმიზაცია',color:'#AAB9C8',icon:'💻'},
    {id:'d9',name:'ვებ დეველოპმენტი',nameEn:'Web Development',nameRu:'Веб-разработка',desc:'ვებსაიტების შექმნა',color:'#9B5CFF',icon:'🖥️'},
  ];
  db.users.push({
    id:'u1', name:'Giorgi Jikia', firstName:'Giorgi', lastName:'Jikia',
    email:'admin@smartpro.ge', password:'admin123', role:'super_admin',
    position:'Director', phone:'', personalId:'', birthDate:'',
    active:true, mustSetup:false, created:new Date().toISOString()
  });
  saveDB(db);
  return db;
}

async function initAsync() {
  if(!IS_SERVER) return;
  const serverDB = await fetchDBFromServer();
  if(!serverDB) { DB._saved=Date.now(); await saveDBToServer(DB); return; }
  const localStr = localStorage.getItem(DB_KEY);
  const localDB  = localStr ? tryParse(localStr) : null;
  const serverScore = (serverDB.users||[]).length*10+(serverDB.clients||[]).length*5+(serverDB.tasks||[]).length;
  const localScore  = localDB?(localDB.users||[]).length*10+(localDB.clients||[]).length*5+(localDB.tasks||[]).length:-1;
  const useServer = serverScore >= localScore;
  if(useServer) { window.DB = serverDB; }
  else { window.DB = localDB; await saveDBToServer(localDB); }
  migrateDirs();
  if(window._cu) { updateAddBtns(); applyI18n(); renderSidebarDirs(); goto(window._curPage||'dashboard'); }
}

function s() { saveDB(DB); }

// ensure directions seeded on old DBs
function migrateDirs() {
  const dirs = [
    {id:'d1',name:'ელექტროობა',nameEn:'Electricity',nameRu:'Электричество',desc:'ენერგოეფექტური ელექტრო სისტემები',color:'#E5D936',icon:'⚡'},
    {id:'d2',name:'სუსტი დენები',nameEn:'Low Voltage',nameRu:'Слаботочные системы',desc:'CCTV, განგაში, წვდომის კონტროლი',color:'#1BEACD',icon:'📡'},
    {id:'d3',name:'უსაფრთხოების კამერები',nameEn:'Security Cameras',nameRu:'Камеры безопасности',desc:'CCTV სისტემების მონტაჟი',color:'#7B5FD4',icon:'📷'},
    {id:'d4',name:'სახანძრო სიგნალიზაცია',nameEn:'Fire Alarm',nameRu:'Пожарная сигნალიზაცია',desc:'სახანძრო გამაფრთხილებელი სისტემები',color:'#FF4060',icon:'🔥'},
    {id:'d5',name:'ინტერნეტ ქსელი',nameEn:'Internet Network',nameRu:'Интернет-сеть',desc:'ქსელური ინფრასტრუქტურა',color:'#004584',icon:'🌐'},
    {id:'d6',name:'ჭკვიანი სახლი',nameEn:'Smart Home',nameRu:'Умный дом',desc:'ავტომატიზაციის სისტემები',color:'#06B59C',icon:'🏠'},
    {id:'d7',name:'მზის პანელები',nameEn:'Solar Panels',nameRu:'Солнечные панели',desc:'მზის ენერგიის სისტემები',color:'#FFB800',icon:'☀️'},
    {id:'d8',name:'კომპიუტერული მომსახურება',nameEn:'IT Service',nameRu:'IT Обслуживание',desc:'IT მხარდაჭერა და ოპტიმიზაცია',color:'#AAB9C8',icon:'💻'},
    {id:'d9',name:'ვებ დეველოპმენტი',nameEn:'Web Development',nameRu:'Веб-разработка',desc:'ვებსაიტების შექმნა',color:'#9B5CFF',icon:'🖥️'},
  ];
  if(!DB.directions || DB.directions.length===0) { DB.directions=dirs; s(); }
}

// Initialize
window.DB = loadDB();
migrateDirs();
