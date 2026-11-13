/**
 * 自主檢查表離線版：資料存在裝置本身（瀏覽器 IndexedDB），不需伺服器、不需網路
 * 提供與主網站相同介面的 SK_STORE（見 web-prototype/js/selfcheck-store-server.js），
 * 另加 OFFLINE 物件管理「工地」（工程名稱）與備份匯出／匯入。
 *
 * 資料：
 *   forms 表：每份檢查表 { id, project, template, location, date, contractor, sub, timing, marks,
 *             notes, review, signs, extras, std, version, createdAt, updatedAt }
 *             std：儲存時當下的管理標準修改 {項目序號: 文字}（之後工地再改，已填的表不會跟著變）
 *   kv 表   ：projects（工地清單 [{id, name, stds?}]；stds＝這個工地修改過的管理標準 {範本: {項目序號: 文字}}）、
 *             current（目前工地 id）、
 *             company（公司名稱，印在表頭，可空白）、customTemplates（使用者自己新增的範本 {C01: {...}}）、
 *             lastBackup（上次匯出備份的時間，用來提醒「超過 7 天沒備份」）
 *   平面圖巡查筆記（js/pages/plan-notes.js；與主網站 server/plans.py 格式相同）：
 *     sheets 表：裁掉圖框的平面圖 { id, project, floor, kind, name, w, h, cal（疊圖對位點，可無）, createdAt }
 *     pins 表  ：圖上的標記 { id, project, sheet, no, x, y, cat, status, text, unit, due, found, by, photos, fixPhotos, log, version… }
 *     files 表 ：圖檔與照片 { id, blob }
 * 新增工地時，自動為每份範本建立一份空白檢查表（與主網站相同）。
 * 自訂範本與內建範本一起使用；沒有越南文，切到越南文時顯示中文。
 */
(function () {
  // 富民工具箱：資料庫與備份檔用自己的名稱，避免與原「酪梨營造工具箱」混用
  const DB_NAME = 'fumin-toolbox';
  const BACKUP_APP = 'fumin-toolbox';
  const BACKUP_APPS = [BACKUP_APP, 'selfcheck-offline']; // 也接受酪梨工具箱的備份檔（搬資料用）
  const REMIND_DAYS = 7;
  let dbp = null;
  let tplCache = null; // 內建範本（data/templates.json）
  let custom = {};     // 自訂範本
  // 富民工具箱：公司名稱固定，不讓使用者修改（印在每張檢查表最上方）
  const FIXED_COMPANY = '富民營造股份有限公司';
  let company = FIXED_COMPANY;

  /* ---------- IndexedDB 小工具 ---------- */
  function db() {
    dbp = dbp || new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = e => {
        const d = req.result;
        if (e.oldVersion < 1) {
          d.createObjectStore('forms', { keyPath: 'id' }).createIndex('project', 'project');
          d.createObjectStore('kv', { keyPath: 'key' });
        }
        if (e.oldVersion < 2) { // 2026-11-09 平面圖巡查筆記
          d.createObjectStore('sheets', { keyPath: 'id' }).createIndex('project', 'project');
          d.createObjectStore('pins', { keyPath: 'id' }).createIndex('project', 'project');
          d.createObjectStore('files', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('無法開啟裝置上的資料庫（可能是瀏覽器的無痕模式或儲存空間不足）'));
    });
    return dbp;
  }
  async function tx(stores, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(stores, mode);
      let result;
      Promise.resolve(fn(t)).then(r => { result = r; }, reject);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error || new Error('資料庫寫入失敗'));
      t.onabort = () => reject(t.error || new Error('資料庫寫入失敗（可能是儲存空間不足）'));
    });
  }
  const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const kvGet = async key => (await tx(['kv'], 'readonly', t => req(t.objectStore('kv').get(key))))?.value;
  const kvSet = (key, value) => tx(['kv'], 'readwrite', t => { t.objectStore('kv').put({ key, value }); });
  const newId = p => p + Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4);
  const now = () => Math.floor(Date.now() / 1000);

  /* ---------- 範本（內建＋自訂） ---------- */
  async function templates() {
    if (!tplCache) {
      const res = await fetch('data/templates.json');
      if (!res.ok) throw new Error('無法讀取檢查表範本');
      tplCache = await res.json();
    }
    // 自訂範本用到新的工作類別時，接在內建類別後面
    const categories = [...tplCache.categories];
    Object.keys(custom).sort().forEach(id => { if (!categories.includes(custom[id].category)) categories.push(custom[id].category); });
    return { ...tplCache, categories, templates: { ...tplCache.templates, ...custom } };
  }

  const allForms = () => tx(['forms'], 'readonly', t => req(t.objectStore('forms').getAll()));
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  function cleanTemplate(t) {
    const title = str(t.title, 60);
    const category = str(t.category, 20);
    if (!title) throw new Error('請填寫檢查表名稱');
    if (!category) throw new Error('請填寫工作類別');
    const items = (Array.isArray(t.items) ? t.items : [])
      .map(it => {
        const g = str(it && it[2], 20); // 大項（可無）
        return g ? [str(it && it[0], 200), str(it && it[1], 300), g] : [str(it && it[0], 200), str(it && it[1], 300)];
      })
      .filter(([name]) => name);
    if (!items.length) throw new Error('至少要有一個檢查項目（空白的項目不會儲存）');
    if (items.length > 80) throw new Error('檢查項目最多 80 項');
    return { category, title, sub: str(t.sub, 60), items, custom: true };
  }
  // 新增（id 空白）或修改自訂範本；修改時舊表單的標記照項目順序保留
  async function saveTemplate(id, t) {
    const tpl = cleanTemplate(t);
    const all = (await templates()).templates;
    if (Object.entries(all).some(([k, x]) => k !== id && x.title === tpl.title)) {
      throw new Error(`已經有「${tpl.title}」這份檢查表，請換一個名稱`);
    }
    if (id && !custom[id]) throw new Error('內建範本不能修改，請用「複製」另存一份自訂範本');
    if (!id) {
      const n = Math.max(0, ...Object.keys(custom).map(k => parseInt(k.slice(1), 10) || 0)) + 1;
      id = 'C' + String(n).padStart(2, '0');
    }
    const n = tpl.items.length;
    const stale = (await allForms()).filter(f => f.template === id && f.marks.length !== n);
    custom = { ...custom, [id]: tpl };
    await tx(['forms', 'kv'], 'readwrite', t => {
      t.objectStore('kv').put({ key: 'customTemplates', value: custom });
      stale.forEach(f => {
        const marks = Array.from({ length: n }, (_, i) => f.marks[i] ?? null);
        const notes = Object.fromEntries(Object.entries(f.notes || {}).filter(([k]) => +k < n));
        t.objectStore('forms').put({ ...f, marks, notes });
      });
    });
    await fillMissing();
    return id;
  }
  async function deleteTemplate(id) {
    if (!custom[id]) throw new Error('內建範本不能刪除');
    const ids = (await allForms()).filter(f => f.template === id).map(f => f.id);
    const { [id]: _, ...rest } = custom;
    custom = rest;
    await tx(['forms', 'kv'], 'readwrite', t => {
      ids.forEach(fid => t.objectStore('forms').delete(fid));
      t.objectStore('kv').put({ key: 'customTemplates', value: custom });
    });
  }
  // 這份範本在所有工地已填寫過幾份（修改、刪除前提醒用）
  const templateUsage = async id => (await allForms()).filter(f => f.template === id && f.version > 0).length;

  function blankForm(project, tid, n, location = '') {
    const t = now();
    return {
      id: newId('L'), project, template: tid, location, date: '', contractor: '', sub: '', timing: [],
      marks: Array(n).fill(null), notes: {}, review: { status: null, date: '', title: '' }, signs: {},
      version: 0, createdAt: t, updatedAt: t,
    };
  }
  async function projectSet(project) {
    const tpl = (await templates()).templates;
    return Object.keys(tpl).sort().map(tid => blankForm(project, tid, tpl[tid].items.length));
  }

  /* ---------- 工地（工程名稱） ---------- */
  const DEFAULT_PROJECT = '我的工地'; // 第一次開啟時的暫用名稱，進入檢查表時會請使用者改成實際工地名稱
  let projects = [];
  let current = null;

  async function init() {
    custom = (await kvGet('customTemplates')) || {};
    company = FIXED_COMPANY; // 不讀裝置上存的公司名稱，一律用固定值
    projects = (await kvGet('projects')) || [];
    current = await kvGet('current');
    if (!projects.length) await addProject(DEFAULT_PROJECT);
    if (!projects.some(p => p.id === current)) await setCurrent(projects[0].id);
    const all = await templates();
    const tpl = all.templates;
    // 範本調整（例如 2026-10-17 把 49 號併入 23 號）：依 migrations 把舊表單的標記搬到新位置
    for (const m of all.migrations || []) {
      const stale = (await allForms())
        .filter(f => f.template === m.template && f.marks.length === m.fromItems);
      if (!stale.length || !tpl[m.template]) continue;
      const n = tpl[m.template].items.length;
      await tx(['forms'], 'readwrite', t => stale.forEach(f => {
        const marks = Array(n).fill(null), notes = {};
        m.map.forEach((to, from) => {
          marks[to] = f.marks[from];
          if (f.notes && f.notes[from] != null) notes[to] = f.notes[from];
        });
        t.objectStore('forms').put({ ...f, marks, notes });
      }));
    }
    await fillMissing();
  }
  // 範本新增後（例如 46 號、自訂範本），每個工地補上該範本的空白表
  async function fillMissing() {
    const tpl = (await templates()).templates;
    for (const p of projects) {
      const have = new Set((await formsOf(p.id)).map(f => f.template));
      const missing = Object.keys(tpl).sort().filter(t => !have.has(t));
      if (missing.length) {
        await tx(['forms'], 'readwrite', t => missing.forEach(tid =>
          t.objectStore('forms').put(blankForm(p.id, tid, tpl[tid].items.length))));
      }
    }
  }
  const formsOf = project => tx(['forms'], 'readonly', t =>
    req(t.objectStore('forms').index('project').getAll(project)));

  function cleanName(name, exceptId) {
    name = String(name || '').trim();
    if (!name || name.length > 50) throw new Error('工地名稱需為 1～50 個字');
    if (projects.some(p => p.name === name && p.id !== exceptId)) throw new Error(`工地「${name}」已存在`);
    return name;
  }
  async function addProject(name) {
    const p = { id: newId('P'), name: cleanName(name) };
    const set = await projectSet(p.id);
    projects = [...projects, p];
    await tx(['forms', 'kv'], 'readwrite', t => {
      set.forEach(f => t.objectStore('forms').put(f));
      t.objectStore('kv').put({ key: 'projects', value: projects });
    });
    return p;
  }
  async function renameProject(id, name) {
    const n = cleanName(name, id);
    projects = projects.map(p => (p.id === id ? { ...p, name: n } : p));
    await kvSet('projects', projects);
  }
  async function deleteProject(id) {
    if (projects.length === 1) throw new Error('至少要保留一個工地');
    const ids = (await formsOf(id)).map(f => f.id);
    const { sheets, pins } = await plansOf(id);
    projects = projects.filter(p => p.id !== id);
    await tx(['forms', 'kv', 'sheets', 'pins', 'files'], 'readwrite', t => {
      ids.forEach(fid => t.objectStore('forms').delete(fid));
      t.objectStore('kv').put({ key: 'projects', value: projects });
      sheets.forEach(x => { t.objectStore('sheets').delete(x.id); t.objectStore('files').delete(x.id); });
      pins.forEach(x => { t.objectStore('pins').delete(x.id); pinFiles(x).forEach(f => t.objectStore('files').delete(f)); });
    });
    if (current === id) await setCurrent(projects[0].id);
  }
  async function setCurrent(id) { current = id; await kvSet('current', id); }
  // 修改目前工地的一項管理標準；空白或與範本相同＝恢復原本。回傳這份範本修改過的標準
  const MAX_STD = 300;
  const siteStds = () => (projects.find(p => p.id === current) || {}).stds || {};
  async function setSiteStd(template, index, text) {
    const tpl = (await templates()).templates[template];
    if (!tpl || !tpl.items[index]) throw new Error('找不到這個檢查項目');
    text = String(text ?? '').trim();
    if (text.length > MAX_STD) throw new Error(`管理標準最多 ${MAX_STD} 個字`);
    projects = projects.map(p => {
      if (p.id !== current) return p;
      const stds = { ...(p.stds || {}) };
      const t = { ...(stds[template] || {}) };
      if (!text || text === tpl.items[index][1]) delete t[index]; else t[index] = text;
      if (Object.keys(t).length) stds[template] = t; else delete stds[template];
      const { stds: _, ...rest } = p;
      return Object.keys(stds).length ? { ...rest, stds } : rest;
    });
    await kvSet('projects', projects);
    return siteStds()[template] || {};
  }
  // 匯入備份用：只留文字欄位、限長
  function cleanStds(stds) {
    if (!stds || typeof stds !== 'object') return null;
    const out = {};
    Object.entries(stds).forEach(([tid, m]) => {
      if (!m || typeof m !== 'object') return;
      const t = {};
      Object.entries(m).forEach(([k, v]) => { if (/^\d+$/.test(k) && typeof v === 'string' && v.trim()) t[k] = v.trim().slice(0, MAX_STD); });
      if (Object.keys(t).length) out[tid] = t;
    });
    return Object.keys(out).length ? out : null;
  }
  const savedCount = async id => (await formsOf(id)).filter(f => f.version > 0).length;

  /* ---------- 備份 ---------- */
  async function exportBackup() {
    const forms = await allForms();
    return {
      app: BACKUP_APP, format: 1, exportedAt: new Date().toISOString(),
      projects, current, company, customTemplates: custom, forms, plans: await exportPlans(),
    };
  }
  // 匯出檔案成功後呼叫，重新計算「幾天沒備份」
  const markBackedUp = () => kvSet('lastBackup', now());
  // 有填寫內容還沒備份、而且已經超過 7 天 → 回傳天數（never：從來沒備份過）；不用提醒時回傳 null
  async function backupDue() {
    const last = (await kvGet('lastBackup')) || 0;
    const pending = (await allForms()).filter(f => f.version > 0 && f.updatedAt > last);
    if (!pending.length) return null;
    const since = last || Math.min(...pending.map(f => f.updatedAt));
    const days = Math.floor((now() - since) / 86400);
    return days >= REMIND_DAYS ? { days, never: !last } : null;
  }
  // 合併匯入：同 id 的工地／表單／自訂範本以備份檔為準，其餘保留
  /* 【資安】備份檔可能被別人改過（例如從 LINE 收到的「備份檔」）：
     匯入時每個欄位都重新檢查型別、格式與長度，只留下程式認得的欄位，
     避免夾帶 HTML／程式碼在畫面上執行（XSS）。 */
  const ID_RE = /^[A-Za-z][0-9A-Za-z]{1,40}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const SIGN_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
  const MARK = v => (['o', 'x', '/'].includes(v) ? v : null);
  const int = v => (Number.isFinite(+v) ? Math.floor(+v) : 0);
  function cleanForm(f) {
    if (!f || typeof f !== 'object' || !ID_RE.test(f.id) || !ID_RE.test(f.project)) return null;
    if (typeof f.template !== 'string' || !/^C?\d{1,4}$/.test(f.template) || !Array.isArray(f.marks)) return null;
    const date = str(f.date, 10);
    const rv = f.review && typeof f.review === 'object' ? f.review : {};
    const rvDate = str(rv.date, 10);
    const notes = {};
    Object.entries(f.notes && typeof f.notes === 'object' ? f.notes : {}).forEach(([k, v]) => {
      if (/^\d{1,3}$/.test(k) && typeof v === 'string') notes[k] = v.slice(0, 500);
    });
    const signs = {};
    ['review', 'manager', 'worker'].forEach(k => {
      const s = f.signs && f.signs[k];
      if (typeof s === 'string' && s.length < 2000000 && SIGN_RE.test(s)) signs[k] = s;
    });
    const extras = (Array.isArray(f.extras) ? f.extras : []).slice(0, 50).filter(x => x && typeof x === 'object')
      .map(x => ({ name: str(x.name, 200), std: str(x.std, 200), mark: MARK(x.mark), note: str(x.note, 500) }));
    const std = {};
    Object.entries(f.std && typeof f.std === 'object' ? f.std : {}).forEach(([k, v]) => {
      if (/^\d{1,3}$/.test(k) && typeof v === 'string') std[k] = v.slice(0, MAX_STD);
    });
    return {
      id: f.id, project: f.project, template: f.template,
      location: str(f.location, 100), date: DATE_RE.test(date) ? date : '',
      contractor: str(f.contractor, 100), sub: str(f.sub, 100),
      timing: (Array.isArray(f.timing) ? f.timing : []).filter(v => ['before', 'during', 'after'].includes(v)),
      marks: f.marks.slice(0, 200).map(MARK), notes,
      review: { status: ['done', 'pending'].includes(rv.status) ? rv.status : null, date: DATE_RE.test(rvDate) ? rvDate : '', title: str(rv.title, 60) },
      signs, extras, ...(Object.keys(std).length ? { std } : {}),
      version: Math.max(0, int(f.version)), createdAt: int(f.createdAt), updatedAt: int(f.updatedAt),
    };
  }
  async function importBackup(data) {
    if (!data || !BACKUP_APPS.includes(data.app) || !Array.isArray(data.projects) || !Array.isArray(data.forms)) {
      throw new Error('這不是富民工具箱（或自主檢查表離線版）的備份檔');
    }
    const forms = data.forms.map(cleanForm).filter(Boolean);
    const byId = new Map(projects.map(p => [p.id, p]));
    data.projects.forEach(p => {
      if (!p || !ID_RE.test(p.id) || !p.name) return;
      const stds = cleanStds(p.stds);
      byId.set(p.id, { id: p.id, name: String(p.name).slice(0, 50), ...(stds ? { stds } : {}) });
    });
    projects = [...byId.values()];
    const tpls = data.customTemplates && typeof data.customTemplates === 'object' ? data.customTemplates : {};
    Object.entries(tpls).forEach(([id, t]) => {
      if (!/^C\d+$/.test(id)) return;
      try { custom = { ...custom, [id]: cleanTemplate(t) }; } catch (e) {} // 格式不對的略過
    });
    // 公司名稱固定，不從備份檔帶入
    await tx(['forms', 'kv'], 'readwrite', t => {
      forms.forEach(f => t.objectStore('forms').put(f));
      t.objectStore('kv').put({ key: 'projects', value: projects });
      t.objectStore('kv').put({ key: 'customTemplates', value: custom });
      t.objectStore('kv').put({ key: 'company', value: company });
    });
    const pins = await importPlans(data.plans);
    await init(); // 補齊缺少的範本
    return { projects: data.projects.length, forms: forms.length, templates: Object.keys(tpls).length, pins };
  }
  // 公司名稱固定：保留介面相容，但不接受修改
  async function setCompany() { company = FIXED_COMPANY; }

  /* ---------- 平面圖巡查筆記（與主網站 js/server-store.js 的 PLAN_STORE 相同介面） ---------- */
  const CATS = ['土建', '水電', '機電', '職安', '其他'];
  const STATUSES = ['open', 'doing', 'done', 'info'];
  const pinFiles = p => [...(p.photos || []), ...(p.fixPhotos || [])];
  const getOne = (store, id) => tx([store], 'readonly', t => req(t.objectStore(store).get(id)));
  // 兩個查詢先一起送出再等結果（Safari 舊版在 await 之後交易可能已結束）
  const plansOf = project => tx(['sheets', 'pins'], 'readonly', t => Promise.all([
    req(t.objectStore('sheets').index('project').getAll(project)),
    req(t.objectStore('pins').index('project').getAll(project)),
  ]).then(([sheets, pins]) => ({ sheets, pins })));
  const urls = new Map(); // 圖檔 id → 物件網址（同一張圖只建立一次）
  async function fileURL(id) {
    if (!urls.has(id)) {
      const rec = await getOne('files', id);
      if (!rec) throw new Error('找不到圖檔');
      urls.set(id, URL.createObjectURL(rec.blob));
    }
    return urls.get(id);
  }
  async function putFile(prefix, blob) {
    const id = prefix + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
    await tx(['files'], 'readwrite', t => { t.objectStore('files').put({ id, blob }); });
    return id;
  }
  function cleanSheet(s) {
    const floor = str(s.floor, 20);
    if (!floor) throw new Error('請填寫樓層，例如 B2F');
    return { floor, kind: str(s.kind, 20) || '其他', name: str(s.name, 80) };
  }
  // 疊圖對位點 {p1: {x, y, label}, p2: {...}}（與主網站 plans.clean_cal 相同）；null＝清除
  function cleanCal(cal) {
    if (cal == null) return null;
    const pt = p => {
      const x = +(p && p.x), y = +(p && p.y);
      if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) throw new Error('對位點要在圖面範圍內');
      return { x, y, label: str(p.label, 12) };
    };
    const out = { p1: pt(cal.p1), p2: pt(cal.p2) };
    if (Math.abs(out.p1.x - out.p2.x) + Math.abs(out.p1.y - out.p2.y) < 0.02) throw new Error('兩個對位點太近，請選相距遠一點的軸線交點');
    return out;
  }
  const okFile = f => typeof f === 'string' && /^[SF][0-9a-f]{16}$/.test(f);
  function cleanPin(p) {
    const text = str(p.text, 1000);
    if (!text) throw new Error('請寫下狀況說明');
    const clamp = v => Math.min(1, Math.max(0, +v || 0));
    const due = str(p.due, 10), found = str(p.found, 16);
    return {
      x: clamp(p.x), y: clamp(p.y), cat: CATS.includes(p.cat) ? p.cat : '其他',
      status: STATUSES.includes(p.status) ? p.status : 'open', text, unit: str(p.unit, 40),
      due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '', found: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(found) ? found : '',
      by: str(p.by, 40), photos: (p.photos || []).filter(okFile).slice(0, 6), fixPhotos: (p.fixPhotos || []).filter(okFile).slice(0, 6),
    };
  }
  async function savePin(input) {
    const pin = cleanPin(input);
    const t = now();
    let saved, gone = [];
    if (!input.id) {
      const sheet = await getOne('sheets', input.sheet);
      if (!sheet) throw new Error('找不到這張平面圖，可能已被刪除');
      const { pins } = await plansOf(sheet.project);
      saved = {
        id: newId('N'), project: sheet.project, sheet: sheet.id, no: Math.max(0, ...pins.map(p => p.no)) + 1, ...pin,
        log: [{ at: t, status: pin.status, by: pin.by }], createdAt: t, updatedAt: t, version: 1,
      };
    } else {
      const old = await getOne('pins', input.id);
      if (!old) throw new Error('找不到這個標記，可能已被刪除');
      const log = pin.status !== old.status ? [...(old.log || []), { at: t, status: pin.status, by: pin.by }] : old.log;
      saved = { ...old, ...pin, log, updatedAt: t, version: old.version + 1 };
      const keep = new Set(pinFiles(saved));
      gone = pinFiles(old).filter(f => !keep.has(f));
    }
    if (pin.by) { try { localStorage.setItem('plan-by', pin.by); } catch (e) {} } // 下次預設同一位紀錄人
    await tx(['pins', 'files'], 'readwrite', x => {
      x.objectStore('pins').put(saved);
      gone.forEach(f => x.objectStore('files').delete(f));
    });
    return saved;
  }
  async function deleteSheet(id) {
    const s = await getOne('sheets', id);
    if (!s) return;
    const pins = (await plansOf(s.project)).pins.filter(p => p.sheet === id);
    await tx(['sheets', 'pins', 'files'], 'readwrite', x => {
      x.objectStore('sheets').delete(id);
      x.objectStore('files').delete(id);
      pins.forEach(p => { x.objectStore('pins').delete(p.id); pinFiles(p).forEach(f => x.objectStore('files').delete(f)); });
    });
  }
  // 備份：圖檔轉成 data URL 放進 JSON（與主網站相同格式）
  const toDataURL = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('無法讀取圖檔'));
    r.readAsDataURL(blob);
  });
  async function exportPlans() {
    const [sheets, pins, files] = await tx(['sheets', 'pins', 'files'], 'readonly', t => Promise.all([
      req(t.objectStore('sheets').getAll()), req(t.objectStore('pins').getAll()), req(t.objectStore('files').getAll())]));
    const out = {};
    for (const f of files) out[f.id] = await toDataURL(f.blob);
    return { sheets, pins, files: out };
  }
  async function importPlans(plans) {
    if (!plans || typeof plans !== 'object') return 0;
    const known = new Set(projects.map(p => p.id));
    const sheets = [];
    (plans.sheets || []).forEach(s => {
      if (!s || !okFile(s.id) || !known.has(s.project)) return;
      try {
        const c = s.cal ? cleanCal(s.cal) : null;
        // 【資安】只留認得的欄位；寬高必須是合理的數字（會放進 style 屬性）
        const w = int(s.w), h = int(s.h);
        if (!(w > 0 && w <= 20000 && h > 0 && h <= 20000)) return;
        sheets.push({ id: s.id, project: s.project, w, h, createdAt: int(s.createdAt), ...cleanSheet(s), ...(c ? { cal: c } : {}) });
      } catch (e) {}
    });
    const byId = new Map(sheets.map(s => [s.id, s]));
    const pins = [];
    (plans.pins || []).forEach(p => {
      if (!p || !ID_RE.test(p.id) || !byId.has(p.sheet)) return;
      try {
        const log = (Array.isArray(p.log) ? p.log : []).slice(0, 200).filter(l => l && typeof l === 'object')
          .map(l => ({ at: int(l.at), status: STATUSES.includes(l.status) ? l.status : 'open', by: str(l.by, 40) }));
        pins.push({
          id: p.id, sheet: p.sheet, project: byId.get(p.sheet).project, no: Math.max(1, int(p.no)), ...cleanPin(p), log,
          createdAt: int(p.createdAt), updatedAt: int(p.updatedAt), version: Math.max(1, int(p.version)),
        });
      } catch (e) {}
    });
    const files = [];
    for (const [id, url] of Object.entries(plans.files || {})) {
      if (okFile(id) && /^data:image\/(jpeg|png);base64,/.test(url)) files.push({ id, blob: await (await fetch(url)).blob() });
    }
    await tx(['sheets', 'pins', 'files'], 'readwrite', t => {
      files.forEach(f => t.objectStore('files').put(f));
      sheets.forEach(s => t.objectStore('sheets').put(s));
      pins.forEach(p => t.objectStore('pins').put(p));
    });
    return pins.length;
  }
  window.PLAN_STORE = {
    load: () => plansOf(current),
    fileURL,
    async addSheet({ blob, w, h, ...s }) {
      const sheet = { ...cleanSheet(s), project: current, w, h, createdAt: now() };
      sheet.id = await putFile('S', blob);
      await tx(['sheets'], 'readwrite', t => { t.objectStore('sheets').put(sheet); });
      return sheet;
    },
    async updateSheet(id, s) {
      const old = await getOne('sheets', id);
      if (!old) throw new Error('找不到這張平面圖，可能已被刪除');
      const sheet = { ...old, ...cleanSheet(s) };
      if ('cal' in s) { // 有傳才改，沒傳保留原本的對位
        const cal = cleanCal(s.cal);
        if (cal) sheet.cal = cal; else delete sheet.cal;
      }
      await tx(['sheets'], 'readwrite', t => { t.objectStore('sheets').put(sheet); });
      return sheet;
    },
    deleteSheet,
    addPhoto: blob => putFile('F', blob),
    savePin,
    async deletePin(id) {
      const p = await getOne('pins', id);
      if (!p) return;
      await tx(['pins', 'files'], 'readwrite', t => {
        t.objectStore('pins').delete(id);
        pinFiles(p).forEach(f => t.objectStore('files').delete(f));
      });
    },
    canDeleteSheet: () => true,
    canDeletePin: () => true,
    userName: () => { try { return localStorage.getItem('plan-by') || ''; } catch (e) { return ''; } },
  };

  /* ---------- 與主網站相同介面的 SK_STORE ---------- */
  window.SK_STORE = {
    templates,
    async listForms() {
      const tpl = (await templates()).templates;
      return (await formsOf(current))
        .filter(f => tpl[f.template]) // 已移除的範本（例如併入其他表）不顯示
        .map(({ signs, ...f }) => ({ ...f, signed: Object.keys(signs || {}) }));
    },
    async getForm(id) {
      const f = await tx(['forms'], 'readonly', t => req(t.objectStore('forms').get(id)));
      if (!f) throw new Error('找不到此檢查表，可能已被刪除');
      return f;
    },
    async saveForm(id, body) {
      const f = await this.getForm(id);
      if (!body.date) throw new Error('請填寫檢查日期');
      const fields = ['location', 'date', 'contractor', 'sub', 'timing', 'marks', 'notes', 'review', 'signs', 'extras'];
      fields.forEach(k => { f[k] = body[k]; });
      if (body.std) f.std = body.std;
      f.version += 1;
      f.updatedAt = now();
      await tx(['forms'], 'readwrite', t => { t.objectStore('forms').put(f); });
      return f;
    },
    async createForm({ template, location }) {
      const tpl = (await templates()).templates[template];
      if (!tpl) throw new Error('請選擇檢查表種類');
      const f = blankForm(current, template, tpl.items.length, String(location || '').trim().slice(0, 100));
      await tx(['forms'], 'readwrite', t => { t.objectStore('forms').put(f); });
      return f;
    },
    deleteForm: id => tx(['forms'], 'readwrite', t => { t.objectStore('forms').delete(id); }),
    canDelete: () => true,
    projectName: () => (projects.find(p => p.id === current) || {}).name || '',
    companyName: () => company,
    siteStds, setSiteStd,
    canEditStd: () => true,
  };

  // 外框（js/app-shell.js）用的資料介面；主網站的同一介面在 web-prototype/js/server-store.js
  window.APP_STORE = window.OFFLINE = {
    offline: true,
    can: () => true, // 離線版沒有登入，所有功能都可用
    init,
    projects: () => projects,
    DEFAULT_PROJECT,
    current: () => current,
    setCurrent, addProject, renameProject, deleteProject, savedCount,
    exportBackup, importBackup, markBackedUp, backupDue,
    company: () => company, setCompany,
    templates, customTemplates: () => custom, saveTemplate, deleteTemplate, templateUsage,
  };
})();
