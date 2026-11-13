/**
 * 平面圖巡查筆記（主網站與離線版共用，原始檔在 web-prototype/js/pages/plan-notes.js）
 * 資料來源 window.PLAN_STORE：主網站 js/server-store.js（伺服器）、離線版 offline-store.js（裝置）。
 *
 *   1. 上傳平面圖（PDF 或照片）→ 自動找出圖框與標題欄並裁掉；一張圖有兩層樓時自動切成兩張，
 *      每張填樓層（例如 B2F）與圖別（建築／結構／水電…），範圍可以用手指拉四個角調整
 *   2. 在圖上點位置新增標記：狀況說明、分類（土建／水電／機電／職安）、負責單位、改善期限、發現時間、紀錄人、照片
 *   3. 改善追蹤：待改善（紅）→ 改善中（黃）→ 已改善（綠，補改善後照片）；「僅記錄」（藍）不需追蹤
 *   4. 疊圖：每張圖點兩個軸線交點對位（例如 1/A、5/E），其他圖（機電、結構）換成彩色線條、半透明疊上來確認位置
 *   5. 問題清單：依狀態、分類、負責單位、樓層篩選，列印成「缺失改善通知單」（含位置圖與照片）
 * PDF 用 js/vendor/pdfjs（Mozilla pdf.js 3.11.174），第一次上傳 PDF 時才載入。
 */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => window.PLAN_STORE;
  const STATUS = {
    open: { label: '待改善', cls: 'pn-s-open' },
    doing: { label: '改善中', cls: 'pn-s-doing' },
    done: { label: '已改善', cls: 'pn-s-done' },
    info: { label: '僅記錄', cls: 'pn-s-info' },
  };
  const CATS = ['土建', '水電', '機電', '職安', '其他'];
  const KINDS = ['建築', '結構', '水電', '機電', '其他'];
  const UNITS = ['鋼筋', '模板', '混凝土', '鷹架', '水電', '消防', '空調', '防水', '土方', '設計單位', '監造單位'];
  const pad = n => String(n).padStart(2, '0');
  const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const today = () => nowLocal().slice(0, 10);
  const fmtFound = f => (f ? f.replace('T', ' ') : '');
  const fmtTime = t => { const d = new Date(t * 1000); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  // 樓層排序：屋頂在上、地下室在下（RF、3F、2F、1F、B1F、B2F）
  function floorRank(f) {
    const s = String(f).toUpperCase();
    if (/^R|屋頂/.test(s)) return 1000;
    let m = s.match(/^B(\d+)/);
    if (m) return -+m[1];
    m = s.match(/^(\d+)/);
    return m ? +m[1] : 0;
  }
  // 從檔名猜樓層：「A2-1_地下二、地下一層平面圖」→ [B2F, B1F]
  function cnNum(t) {
    if (/^\d+$/.test(t)) return +t;
    const d = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (t === '十') return 10;
    const m = t.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 10 + (m[2] ? d[m[2]] : 0);
    return d[t] || 0;
  }
  function floorsFromName(name) {
    const out = [];
    const re = /(?:地下|B)\s*([一二三四五六七八九十]+|\d+)|([一二三四五六七八九十]+|\d+)\s*(?:層|樓|F(?![A-Z]))|屋頂|R\d*F/gi;
    let m;
    while ((m = re.exec(name))) {
      if (m[1]) out.push(`B${cnNum(m[1])}F`);
      else if (m[2]) out.push(`${cnNum(m[2])}F`);
      else out.push('RF');
    }
    return out.filter(f => !/^B?0F$/.test(f));
  }
  function kindFromName(name) {
    if (/結構/.test(name)) return '結構';
    if (/給排水|水電|電氣|弱電|照明|插座/.test(name)) return '水電';
    if (/空調|消防|機電|通風/.test(name)) return '機電';
    const m = name.match(/^\s*([A-Z])/i);
    const byLetter = { A: '建築', S: '結構', E: '水電', P: '水電', W: '水電', M: '機電', F: '機電', H: '機電' };
    return (m && byLetter[m[1].toUpperCase()]) || '建築';
  }

  /* ---------- 小工具：載入 pdf.js、壓縮照片 ---------- */
  let pdfReady = null;
  function loadPdfJs() {
    pdfReady = pdfReady || new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/pdfjs/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdfjs/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => { pdfReady = null; reject(new Error('無法載入 PDF 讀取元件')); };
      document.head.appendChild(s);
    });
    return pdfReady;
  }
  const toBlob = (canvas, q = 0.86) => new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('圖片產生失敗（可能是圖太大），請把範圍縮小一點'))), 'image/jpeg', q));
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('無法讀取圖片'));
      img.src = src;
    });
  }
  async function shrinkPhoto(file, max = 1600) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await toBlob(c, 0.8);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---------- 自動找圖框：長直線＝外框、標題欄、兩層樓中間的分隔線 ---------- */
  function detectRegions(canvas) {
    // 1400px 寬、淺灰也算線：CAD 轉出的 PDF 框線很細，縮太小或門檻太嚴會找不到
    const W = Math.min(1400, canvas.width);
    const k = W / canvas.width;
    const H = Math.round(canvas.height * k);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.drawImage(canvas, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    const dark = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) dark[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11 < 220 ? 1 : 0;
    // 每一列／每一行最長的連續深色線段（允許 3px 斷點）
    const longest = (n, len, at) => {
      const out = new Float32Array(n);
      for (let a = 0; a < n; a++) {
        let best = 0, run = 0, gap = 0;
        for (let b = 0; b < len; b++) {
          if (at(a, b)) { run += gap + 1; gap = 0; if (run > best) best = run; } else if (run && ++gap > 3) { run = 0; gap = 0; }
        }
        out[a] = best / len;
      }
      return out;
    };
    // 相鄰的線合併成一條（取中間）
    const lines = (arr, min) => {
      const out = [];
      let start = -1;
      for (let i = 0; i <= arr.length; i++) {
        const on = i < arr.length && arr[i] >= min;
        if (on && start < 0) start = i;
        if (!on && start >= 0) { out.push((start + i - 1) / 2); start = -1; }
      }
      return out;
    };
    // 三列合併成一條粗線，避免斜一點點的掃描圖斷掉
    const rowAt = (y, x) => dark[y * W + x] || (y > 0 && dark[(y - 1) * W + x]) || (y < H - 1 && dark[(y + 1) * W + x]);
    const colAt = (x, y) => dark[y * W + x] || (x > 0 && dark[y * W + x - 1]) || (x < W - 1 && dark[y * W + x + 1]);
    const hl = lines(longest(H, W, rowAt), 0.6);
    const vl = lines(longest(W, H, colAt), 0.6);
    const full = [{ x0: 0.01, y0: 0.01, x1: 0.99, y1: 0.99 }];
    if (hl.length < 2 || vl.length < 2) return full; // 找不到外框（例如手機拍的照片），先用整張
    let top = hl[0], bottom = hl[hl.length - 1], left = vl[0], right = vl[vl.length - 1];
    if (bottom - top < H * 0.3 || right - left < W * 0.3) return full;
    // 標題欄：外框下方 25% 內最上面那條橫線；沒有的話看右側 25%（直式標題欄）
    const lowH = hl.filter(y => y > top + (bottom - top) * 0.75 && y < bottom - 2);
    const rightV = vl.filter(x => x > left + (right - left) * 0.75 && x < right - 2);
    if (lowH.length) bottom = Math.min(...lowH);
    else if (rightV.length) right = Math.min(...rightV);
    // 中間的分隔線（一張圖兩層樓）：離邊至少 15%
    const midV = vl.filter(x => x > left + (right - left) * 0.15 && x < right - (right - left) * 0.15);
    const midH = hl.filter(y => y > top + (bottom - top) * 0.15 && y < bottom - (bottom - top) * 0.15);
    const xs = [left, ...midV, right], ys = [top, ...midH, bottom];
    const pad = 4; // 往內縮一點，不要包到框線
    const regions = [];
    for (let j = 0; j < ys.length - 1; j++) {
      for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i + 1] - xs[i] < W * 0.1 || ys[j + 1] - ys[j] < H * 0.1) continue;
        regions.push({ x0: (xs[i] + pad) / W, y0: (ys[j] + pad) / H, x1: (xs[i + 1] - pad) / W, y1: (ys[j + 1] - pad) / H });
      }
    }
    // 沒有分隔線、但兩層樓左右並排（例如水電圖，中間常有幾行註解，不會完全空白）：
    // 範圍明顯比較寬時，在中間 30%～70% 找線條最少的一段（寬 4%），比左右兩邊都少很多就從那裡切開
    const split = [];
    regions.forEach(r => {
      const X0 = Math.round(r.x0 * W), X1 = Math.round(r.x1 * W), Y0 = Math.round(r.y0 * H), Y1 = Math.round(r.y1 * H);
      if (X1 - X0 < (Y1 - Y0) * 1.25) { split.push(r); return; } // 直的或接近正方形＝只有一層，不切
      const col = new Float32Array(X1 - X0);
      for (let x = X0; x < X1; x++) { let n = 0; for (let y = Y0; y < Y1; y++) n += dark[y * W + x]; col[x - X0] = n; }
      const avg = (a, b) => { let s = 0; for (let j = a; j < b; j++) s += col[j]; return s / Math.max(1, b - a); };
      const win = Math.max(5, Math.round(col.length * 0.04));
      let best = null;
      for (let i = Math.round(col.length * 0.3); i + win < col.length * 0.7; i++) {
        const s = avg(i, i + win);
        if (!best || s < best.s) best = { s, i };
      }
      if (best && best.s < 0.6 * Math.min(avg(0, best.i), avg(best.i + win, col.length))) {
        const mid = (X0 + best.i + win / 2) / W;
        split.push({ ...r, x1: mid }, { ...r, x0: mid });
      } else split.push(r);
    });
    return split.length ? split : full;
  }

  /* ---------- 畫面 ---------- */
  let root = null;
  let data = { sheets: [], pins: [] };
  let view = 'home';     // home（樓層清單）、list（問題清單）、sheet（看圖）
  let sheetId = null;
  let filter = { status: ['open', 'doing'], cat: '', unit: '', floor: '' };
  let showDone = true;   // 看圖時是否顯示已改善／僅記錄的標記

  const sheetOf = id => data.sheets.find(s => s.id === id);
  const sheetLabel = s => (s ? `${s.floor}・${s.kind}${s.name ? `・${s.name}` : ''}` : '（平面圖已刪除）');
  const overdue = p => p.due && (p.status === 'open' || p.status === 'doing') && p.due < today();
  const counts = pins => Object.fromEntries(Object.keys(STATUS).map(k => [k, pins.filter(p => p.status === k).length]));
  const badge = st => `<span class="pn-badge ${STATUS[st].cls}">${STATUS[st].label}</span>`;

  async function reload() {
    data = await S().load();
    data.pins.sort((a, b) => b.no - a.no);
  }
  function rerender() {
    if (!root || !document.body.contains(root)) return;
    if (view === 'sheet' && sheetOf(sheetId)) return renderSheet();
    view = view === 'sheet' ? 'home' : view;
    root.innerHTML = view === 'list' ? listHTML() : homeHTML();
    if (view === 'home') loadThumbs();
  }

  function summaryHTML(pins) {
    const n = counts(pins);
    const late = pins.filter(overdue).length;
    return `<div class="pn-sum">
      ${['open', 'doing', 'done', 'info'].map(k => `<span class="pn-sum-i ${STATUS[k].cls}"><b>${n[k]}</b>${STATUS[k].label}</span>`).join('')}
      ${late ? `<span class="pn-sum-i pn-late"><b>${late}</b>已過期限</span>` : ''}
    </div>`;
  }
  function tabsHTML() {
    return `<div class="pn-tabs">
      <button class="${view === 'home' ? 'on' : ''}" data-pn="tab-home">🗺 依樓層</button>
      <button class="${view === 'list' ? 'on' : ''}" data-pn="tab-list">📋 問題清單（${data.pins.filter(p => p.status === 'open' || p.status === 'doing').length}）</button>
    </div>`;
  }

  function homeHTML() {
    const floors = [...new Set(data.sheets.map(s => s.floor))].sort((a, b) => floorRank(b) - floorRank(a));
    return `
      <div class="pn-head">
        <div>
          <h2>平面圖巡查筆記</h2>
          <p class="pn-hint">上傳平面圖後，在圖上點位置記下問題、照片與負責單位，追蹤到改善完成。</p>
        </div>
        <button class="sk-btn sk-btn-primary pn-upload" data-pn="upload">＋ 上傳平面圖</button>
      </div>
      ${data.sheets.length ? summaryHTML(data.pins) + tabsHTML() : ''}
      ${data.sheets.length ? floors.map(f => {
        const sheets = data.sheets.filter(s => s.floor === f).sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
        return `<section class="pn-floor">
          <h3>${esc(f)}</h3>
          <div class="pn-sheets">${sheets.map(s => {
            const n = counts(data.pins.filter(p => p.sheet === s.id));
            return `<button class="pn-sheet" data-pn="open" data-id="${esc(s.id)}">
              <span class="pn-thumb"><img data-thumb="${esc(s.id)}" alt="" /></span>
              <span class="pn-sheet-name"><b>${esc(s.kind)}</b>${esc(s.name)}</span>
              <span class="pn-sheet-n">
                ${n.open ? `<i class="pn-s-open">${n.open}</i>` : ''}${n.doing ? `<i class="pn-s-doing">${n.doing}</i>` : ''}
                ${n.done ? `<i class="pn-s-done">${n.done}</i>` : ''}${n.info ? `<i class="pn-s-info">${n.info}</i>` : ''}
                ${!(n.open + n.doing + n.done + n.info) ? '<small>還沒有標記</small>' : ''}
              </span>
            </button>`;
          }).join('')}</div>
        </section>`;
      }).join('') : `
        <div class="pn-empty">
          <div class="pn-empty-icon">🗺</div>
          <p><b>還沒有平面圖</b></p>
          <p>可以上傳 <b>PDF</b>（建築師、結構技師的圖），或用手機<b>拍下紙本圖</b>。<br />
            系統會自動裁掉圖框與標題欄；一張圖有兩層樓時會切成兩張。</p>
          <button class="sk-btn sk-btn-primary" data-pn="upload">＋ 上傳第一張平面圖</button>
        </div>`}`;
  }
  async function loadThumbs() {
    for (const img of root.querySelectorAll('img[data-thumb]')) {
      try { img.src = await S().fileURL(img.dataset.thumb); } catch (e) {}
    }
  }

  function filteredPins() {
    return data.pins.filter(p => {
      const s = sheetOf(p.sheet);
      return (!filter.status.length || filter.status.includes(p.status)) && (!filter.cat || p.cat === filter.cat)
        && (!filter.unit || p.unit === filter.unit) && (!filter.floor || (s && s.floor === filter.floor));
    });
  }
  function listHTML() {
    const pins = filteredPins();
    const units = [...new Set(data.pins.map(p => p.unit).filter(Boolean))].sort();
    const floors = [...new Set(data.sheets.map(s => s.floor))].sort((a, b) => floorRank(b) - floorRank(a));
    const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
    return `
      <div class="pn-head">
        <div><h2>平面圖巡查筆記</h2></div>
        <button class="sk-btn sk-btn-primary pn-upload" data-pn="upload">＋ 上傳平面圖</button>
      </div>
      ${summaryHTML(data.pins)}${tabsHTML()}
      <div class="pn-filter">
        <div class="pn-chips">${Object.keys(STATUS).map(k => `
          <button class="pn-chip ${STATUS[k].cls} ${filter.status.includes(k) ? 'on' : ''}" data-pn="f-status" data-k="${k}">${STATUS[k].label}</button>`).join('')}
        </div>
        <select data-f="cat" aria-label="分類">${opt('', filter.cat, '全部分類')}${CATS.map(c => opt(c, filter.cat)).join('')}</select>
        <select data-f="unit" aria-label="負責單位">${opt('', filter.unit, '全部負責單位')}${units.map(u => opt(u, filter.unit)).join('')}</select>
        <select data-f="floor" aria-label="樓層">${opt('', filter.floor, '全部樓層')}${floors.map(f => opt(f, filter.floor)).join('')}</select>
        <button class="sk-btn" data-pn="print" ${pins.length ? '' : 'disabled'}>🖨 列印改善通知單（${pins.length}）</button>
      </div>
      ${pins.length ? `<ul class="pn-list">${pins.map(p => `
        <li data-pn="goto" data-id="${esc(p.id)}">
          <span class="pn-no ${STATUS[p.status].cls}">${esc(p.no)}</span>
          <div class="pn-li-main">
            <div class="pn-li-top">${badge(p.status)}<span class="pn-cat">${esc(p.cat)}</span>
              ${p.unit ? `<span class="pn-unit">👷 ${esc(p.unit)}</span>` : ''}
              ${p.due ? `<span class="pn-due ${overdue(p) ? 'pn-late' : ''}">期限 ${esc(p.due)}${overdue(p) ? '（已過期）' : ''}</span>` : ''}</div>
            <div class="pn-li-text">${esc(p.text)}</div>
            <div class="pn-li-meta">📍 ${esc(sheetLabel(sheetOf(p.sheet)))}　🕒 ${esc(fmtFound(p.found))}${p.by ? `　✍ ${esc(p.by)}` : ''}
              ${p.photos.length ? `　📷 ${p.photos.length}` : ''}</div>
          </div>
        </li>`).join('')}</ul>` : '<div class="pn-empty"><p>沒有符合條件的標記</p></div>'}`;
  }

  /* ---------- 看圖：拖曳移動、兩指／滾輪縮放、點一下新增或打開標記 ---------- */
  let vp = null; // { s, x, y, minS } 目前的縮放與位置
  let addMode = false;
  let movePin = null; // 「移動位置」中的標記

  /* ---------- 疊圖：每張圖點兩個軸線交點（例如 1/A、5/E）對位，其他圖依同名交點縮放、旋轉、移動後疊上來 ---------- */
  let calMode = null;  // 對位中 { labels: ['1/A', '5/E'], pts: [] }
  let ovOpen = false;  // 疊圖面板打開
  let baseAlpha = 1;   // 底圖深淺
  const ov = {};       // 各張疊圖設定 { 平面圖 id: { on, color, alpha } }（這次開啟有效）
  const COLORS = { red: [229, 72, 77, '紅'], blue: [37, 99, 235, '藍'], green: [22, 150, 70, '綠'], purple: [147, 51, 234, '紫'], orange: [234, 120, 10, '橘'] };
  const KIND_COLOR = { 建築: 'purple', 結構: 'green', 水電: 'red', 機電: 'blue', 其他: 'orange' };
  const ovSet = o => (ov[o.id] = ov[o.id] || { on: false, color: KIND_COLOR[o.kind] || 'orange', alpha: 0.85 });
  const ovScale = o => Math.min(1, 2400 / Math.max(o.w, o.h)); // 疊圖用的解析度（手機記憶體有限）
  // 兩張圖的軸線名稱是否對得上：same 同順序、swap 順序相反、differ 名稱不同（照第 1 點對第 1 點）
  function calMatch(base, o) {
    const [a1, a2, b1, b2] = [base.cal.p1.label, base.cal.p2.label, o.cal.p1.label, o.cal.p2.label];
    if (a1 && a1 === b1 && a2 === b2) return 'same';
    if (a1 && a1 === b2 && a2 === b1) return 'swap';
    return 'differ';
  }
  // 疊圖的 CSS 轉換：把疊圖（縮小 k 倍的圖片像素）對應到底圖像素
  function ovMatrix(base, o) {
    const P = (s, p) => [s.cal[p].x * s.w, s.cal[p].y * s.h];
    const b1 = P(base, 'p1'), b2 = P(base, 'p2');
    let o1 = P(o, 'p1'), o2 = P(o, 'p2');
    if (calMatch(base, o) === 'swap') [o1, o2] = [o2, o1];
    const vb = [b2[0] - b1[0], b2[1] - b1[1]], vo = [o2[0] - o1[0], o2[1] - o1[1]];
    const sc = Math.hypot(...vb) / Math.hypot(...vo);
    let th = Math.atan2(vb[1], vb[0]) - Math.atan2(vo[1], vo[0]);
    th = Math.atan2(Math.sin(th), Math.cos(th));
    if (Math.abs(th) < 0.06) th = 0; // 圖面幾乎不會轉角度：手指點的小誤差不要讓整張圖歪掉
    const c = sc * Math.cos(th), sn = sc * Math.sin(th), k = ovScale(o);
    // 以兩點的中點對齊，誤差平均分到兩邊
    const om = [(o1[0] + o2[0]) / 2, (o1[1] + o2[1]) / 2], bm = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
    const tx = bm[0] - (c * om[0] - sn * om[1]), ty = bm[1] - (sn * om[0] + c * om[1]);
    return `matrix(${c / k},${sn / k},${-sn / k},${c / k},${tx},${ty})`;
  }
  // 把疊圖的線條換成顏色、白底變透明（每張圖每種顏色只做一次）
  const tintCache = new Map();
  function tinted(o, color) {
    const key = `${o.id}|${color}`;
    if (!tintCache.has(key)) {
      tintCache.set(key, (async () => {
        const img = await loadImage(await S().fileURL(o.id));
        const k = ovScale(o);
        const c = document.createElement('canvas');
        c.width = Math.round(o.w * k); c.height = Math.round(o.h * k);
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height);
        const px = d.data, [R, G, B] = COLORS[color];
        for (let i = 0; i < px.length; i += 4) {
          const l = (px[i] + px[i + 1] + px[i + 2]) / 3;
          px[i] = R; px[i + 1] = G; px[i + 2] = B;
          px[i + 3] = Math.max(0, Math.min(255, (240 - l) * 1.8));
        }
        g.putImageData(d, 0, 0);
        const blob = await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('疊圖產生失敗（手機記憶體不足），請少疊一張'))), 'image/png'));
        c.width = c.height = 0;
        return URL.createObjectURL(blob);
      })().catch(e => { tintCache.delete(key); throw e; }));
    }
    return tintCache.get(key);
  }
  // 對位預設的軸線名稱：沿用這張或其他張已設定的名稱，兩張圖才對得上
  function calLabels(s) {
    const c = s.cal || (data.sheets.find(x => x.cal) || {}).cal;
    return c ? [c.p1.label || '1/A', c.p2.label || '5/E'] : ['1/A', '5/E'];
  }
  function ovPanelHTML(s) {
    const others = data.sheets.filter(x => x.id !== s.id)
      .sort((a, b) => (a.floor === s.floor ? 0 : 1) - (b.floor === s.floor ? 0 : 1) || floorRank(b.floor) - floorRank(a.floor));
    const row = o => {
      const set = ovSet(o);
      const ok = s.cal && o.cal;
      return `<li>
        <label class="pn-ov-name"><input type="checkbox" data-ovon="${o.id}" ${set.on && ok ? 'checked' : ''} ${ok ? '' : 'disabled'} />
          <i class="pn-ov-dot" style="background:rgb(${COLORS[set.color].slice(0, 3)})"></i><b>${esc(o.floor)}</b>　${esc(o.kind)}<small>${esc(o.name)}</small></label>
        ${!o.cal ? '<small class="pn-ov-warn">這張還沒對位：打開那張圖按「📐 對位」</small>' : !s.cal ? '' : `
          <div class="pn-ov-ctl">
            <select data-ovcolor="${o.id}" aria-label="顏色">${Object.entries(COLORS).map(([k, v]) => `<option value="${k}" ${k === set.color ? 'selected' : ''}>${v[3]}</option>`).join('')}</select>
            <input type="range" min="0.2" max="1" step="0.05" value="${set.alpha}" data-range="${o.id}" aria-label="深淺" />
          </div>
          ${calMatch(s, o) === 'differ' ? `<small class="pn-ov-warn">軸線名稱不同（${esc(s.cal.p1.label)}、${esc(s.cal.p2.label)} ／ ${esc(o.cal.p1.label)}、${esc(o.cal.p2.label)}），照第 1 點對第 1 點</small>` : ''}`}
      </li>`;
    };
    return `<div class="pn-ovpanel">
      ${!s.cal ? '<p class="pn-ov-warn">這張圖還沒對位。請先按「📐 對位」，點兩個軸線交點（例如 1/A、5/E）；要疊上來的圖也要點同樣的兩個交點。</p>' : `
        <label class="pn-ov-base">底圖深淺<input type="range" min="0.1" max="1" step="0.05" value="${baseAlpha}" data-range="base" /></label>`}
      ${others.length ? `<ul class="pn-ov-list">${others.map(row).join('')}</ul>`
        : '<p class="pn-hint">這個工地只有這一張圖。先上傳機電圖（PDF 有很多頁時可以選頁），對位後就能疊上來。</p>'}
    </div>`;
  }
  async function saveCal(s, cal) {
    try {
      await S().updateSheet(s.id, { floor: s.floor, kind: s.kind, name: s.name, cal });
      await reload();
      ovOpen = true;
      alertBar('對位完成');
    } catch (e) { alertBar(e.message); }
    renderSheet();
  }
  function sheetHTML(s) {
    const same = data.sheets.filter(x => x.floor === s.floor).sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
    const pins = data.pins.filter(p => p.sheet === s.id);
    const ovOn = s.cal ? data.sheets.filter(o => o.id !== s.id && o.cal && ovSet(o).on) : [];
    return `
      <div class="pn-bar">
        <button class="sk-btn" data-pn="back">‹ 返回</button>
        <div class="pn-bar-title"><b>${esc(s.floor)}</b>
          ${same.length > 1 ? `<span class="pn-kinds">${same.map(x => `<button class="${x.id === s.id ? 'on' : ''}" data-pn="open" data-id="${esc(x.id)}">${esc(x.kind)}</button>`).join('')}</span>`
            : `<span class="pn-kind">${esc(s.kind)}</span>`}
          <small>${esc(s.name)}</small>
        </div>
        <button class="sk-btn" data-pn="sheet-edit" title="修改樓層、圖別、圖名">⚙</button>
      </div>
      <div class="pn-tools">
        <button class="pn-add ${addMode || movePin ? 'on' : ''}" data-pn="add">${movePin ? `📍 點新位置（#${movePin.no}）・取消` : addMode ? '📍 點圖上的位置…（取消）' : '📍 新增標記'}</button>
        <button class="sk-btn pn-tbtn ${calMode ? 'on' : ''}" data-pn="cal" title="點兩個軸線交點，讓其他圖可以疊上來">📐 對位${s.cal ? ' ✓' : ''}</button>
        <button class="sk-btn pn-tbtn ${ovOpen ? 'on' : ''}" data-pn="ov">🧩 疊圖${ovOn.length ? `（${ovOn.length}）` : ''}</button>
        <label class="pn-toggle"><input type="checkbox" data-pn="show-done" ${showDone ? 'checked' : ''} />顯示已改善、僅記錄</label>
        <span class="pn-tools-n">${summaryHTML(pins)}</span>
      </div>
      ${calMode ? `<div class="pn-calbar">
        <b>📐 對位：第 ${calMode.pts.length + 1} 點</b>
        <label>第 1 點<input data-cal="0" value="${esc(calMode.labels[0])}" maxlength="12" ${calMode.pts.length ? 'disabled' : ''} /></label>
        <label>第 2 點<input data-cal="1" value="${esc(calMode.labels[1])}" maxlength="12" /></label>
        <span>先放大，再點「${esc(calMode.labels[calMode.pts.length])}」軸線交點。兩點要離遠一點（例如對角），其他圖也點同樣名稱的交點。</span>
        <button class="sk-btn" data-pn="cal-cancel">取消</button>
      </div>` : ''}
      ${ovOpen && !calMode ? ovPanelHTML(s) : ''}
      <div class="pn-view ${addMode || movePin || calMode ? 'pn-adding' : ''}" id="pnView">
        <div class="pn-stage" id="pnStage" style="width:${+s.w || 0}px;height:${+s.h || 0}px">
          <img id="pnImg" alt="平面圖" draggable="false" style="opacity:${baseAlpha}" />
          ${ovOn.map(o => `<img class="pn-ov" data-ov="${o.id}" alt="" draggable="false"
            style="width:${Math.round(o.w * ovScale(o))}px;height:${Math.round(o.h * ovScale(o))}px;transform:${ovMatrix(s, o)};opacity:${ovSet(o).alpha}" />`).join('')}
          ${s.cal && (calMode || ovOpen) ? ['p1', 'p2'].map(k => `<i class="pn-cal" style="left:${s.cal[k].x * 100}%;top:${s.cal[k].y * 100}%"><span>${esc(s.cal[k].label)}</span></i>`).join('') : ''}
          ${calMode ? calMode.pts.map(p => `<i class="pn-cal pn-cal-new" style="left:${p.x * 100}%;top:${p.y * 100}%"><span>${esc(p.label)}</span></i>`).join('') : ''}
          ${pins.filter(p => showDone || p.status === 'open' || p.status === 'doing').map(p => `
            <button class="pn-pin ${STATUS[p.status].cls} ${overdue(p) ? 'pn-pin-late' : ''}" data-pin="${esc(p.id)}" style="left:${+p.x * 100}%;top:${+p.y * 100}%" title="#${esc(p.no)} ${esc(p.text)}"><span>${esc(p.no)}</span></button>`).join('')}
        </div>
        <div class="pn-zoom">
          <button data-pn="zin" aria-label="放大">＋</button>
          <button data-pn="zout" aria-label="縮小">－</button>
          <button data-pn="zfit" aria-label="看整張" title="看整張">⤢</button>
        </div>
        ${addMode || movePin ? '<div class="pn-adding-tip">點一下圖上要標記的位置（可以先放大）</div>' : ''}
      </div>`;
  }
  async function renderSheet(keepView = true) {
    const s = sheetOf(sheetId);
    const old = keepView && vp && vp.sheet === s.id ? vp : null;
    root.innerHTML = sheetHTML(s);
    const img = root.querySelector('#pnImg');
    img.src = await S().fileURL(s.id).catch(() => '');
    const v = root.querySelector('#pnView');
    const fit = Math.min(v.clientWidth / s.w, v.clientHeight / s.h) || 0.1;
    vp = old ? { ...old, minS: fit * 0.8 } : { sheet: s.id, s: fit, x: (v.clientWidth - s.w * fit) / 2, y: (v.clientHeight - s.h * fit) / 2, minS: fit * 0.8 };
    applyVP();
    bindViewer(v);
    for (const el of root.querySelectorAll('img[data-ov]')) {
      const o = sheetOf(el.dataset.ov);
      tinted(o, ovSet(o).color).then(u => { el.src = u; }, e => alertBar(e.message));
    }
  }
  function applyVP() {
    const st = root && root.querySelector('#pnStage');
    if (!st) return;
    st.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.s})`;
    st.style.setProperty('--inv', 1 / vp.s);
  }
  function zoomAt(k, cx, cy) {
    const s = Math.min(3, Math.max(vp.minS, vp.s * k));
    vp.x = cx - (cx - vp.x) * (s / vp.s);
    vp.y = cy - (cy - vp.y) * (s / vp.s);
    vp.s = s;
    applyVP();
  }
  function bindViewer(v) {
    const pts = new Map();
    let start = null; // 按下時的狀態
    let moved = false;
    const local = e => { const r = v.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    v.addEventListener('pointerdown', e => {
      if (e.target.closest('.pn-zoom')) return;
      v.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      moved = pts.size > 1 ? true : false;
      const p = [...pts.values()];
      start = { x: vp.x, y: vp.y, s: vp.s, p, d: p.length > 1 ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : 0, target: e.target };
    });
    v.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !start) return;
      pts.set(e.pointerId, local(e));
      const p = [...pts.values()];
      if (p.length === 1 && start.p.length === 1) {
        const dx = p[0][0] - start.p[0][0], dy = p[0][1] - start.p[0][1];
        if (!moved && Math.hypot(dx, dy) < 8) return;
        moved = true;
        vp.x = start.x + dx; vp.y = start.y + dy;
        applyVP();
      } else if (p.length >= 2 && start.d) {
        // 兩指：以兩指中心縮放並跟著移動
        const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        const c0 = [(start.p[0][0] + start.p[1][0]) / 2, (start.p[0][1] + start.p[1][1]) / 2];
        const c1 = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
        const s = Math.min(3, Math.max(vp.minS, start.s * d / start.d));
        vp.s = s;
        vp.x = c1[0] - (c0[0] - start.x) * (s / start.s);
        vp.y = c1[1] - (c0[1] - start.y) * (s / start.s);
        applyVP();
      }
    });
    const end = e => {
      if (!pts.has(e.pointerId)) return;
      const pos = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pts.size) { // 兩指放開一指：剩下那指重新開始拖曳
        const p = [...pts.values()];
        start = { x: vp.x, y: vp.y, s: vp.s, p, d: 0 };
        return;
      }
      const wasTap = !moved && e.type === 'pointerup' && start;
      const target = start && start.target;
      start = null;
      if (!wasTap) return;
      const pinEl = target.closest && target.closest('[data-pin]');
      if (pinEl && !addMode && !movePin && !calMode) { openPin(data.pins.find(p => p.id === pinEl.dataset.pin)); return; }
      if (!addMode && !movePin && !calMode) return;
      const s = sheetOf(sheetId);
      const x = (pos[0] - vp.x) / vp.s / s.w, y = (pos[1] - vp.y) / vp.s / s.h;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (calMode) {
        const label = String(calMode.labels[calMode.pts.length] || '').trim() || `第${calMode.pts.length + 1}點`;
        calMode.pts.push({ x, y, label });
        if (calMode.pts.length < 2) { renderSheet(); return; }
        const [p1, p2] = calMode.pts;
        calMode = null;
        saveCal(s, { p1, p2 });
        return;
      }
      if (movePin) {
        const p = movePin;
        movePin = null;
        savePinTo({ ...p, x, y });
        return;
      }
      addMode = false;
      renderSheet();
      openPin({ sheet: s.id, x, y, status: 'open', cat: '土建', text: '', unit: '', due: '', found: nowLocal(), by: S().userName(), photos: [], fixPhotos: [] });
    };
    v.addEventListener('pointerup', end);
    v.addEventListener('pointercancel', end);
    v.addEventListener('wheel', e => {
      e.preventDefault();
      const [cx, cy] = local(e);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, cx, cy);
    }, { passive: false });
  }
  async function savePinTo(p) {
    try {
      await S().savePin(p);
      await reload();
    } catch (e) { alertBar(e.message); }
    renderSheet();
  }
  function alertBar(msg) {
    const el = document.createElement('div');
    el.className = 'pn-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  /* ---------- 標記視窗 ---------- */
  let dlg = null;
  let ed = null;       // 編輯中的標記
  let edSnap = '';
  let newPhotos = { photos: [], fixPhotos: [] }; // 還沒上傳的照片 [{blob, url}]
  const dirty = () => ed && (JSON.stringify(ed) !== edSnap || newPhotos.photos.length || newPhotos.fixPhotos.length);
  function dialog() {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'sk-dialog pn-dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('cancel', e => { e.preventDefault(); closePin(); });
      dlg.addEventListener('click', onDlgClick);
      dlg.addEventListener('input', onDlgInput);
      dlg.addEventListener('change', onDlgChange);
    }
    return dlg;
  }
  async function photoTiles(kind) {
    const saved = await Promise.all(ed[kind].map(async (id, i) =>
      `<span class="pn-ph"><img src="${esc(await S().fileURL(id).catch(() => ''))}" data-pn="ph-view" alt="照片" /><button type="button" data-pn="ph-del" data-kind="${kind}" data-i="${i}" aria-label="刪除照片">✕</button></span>`));
    const fresh = newPhotos[kind].map((p, i) =>
      `<span class="pn-ph pn-ph-new"><img src="${p.url}" data-pn="ph-view" alt="新照片" /><button type="button" data-pn="ph-del-new" data-kind="${kind}" data-i="${i}" aria-label="刪除照片">✕</button></span>`);
    const n = ed[kind].length + newPhotos[kind].length;
    return [...saved, ...fresh].join('') + (n < 6 ? `<label class="pn-ph-add">📷<span>${kind === 'photos' ? '拍照／選照片' : '改善後照片'}</span>
      <input type="file" accept="image/*" multiple data-photo="${kind}" hidden /></label>` : '');
  }
  async function renderPin(msg = '') {
    const d = dialog();
    const s = sheetOf(ed.sheet);
    const units = [...new Set([...data.pins.map(p => p.unit).filter(Boolean), ...UNITS])];
    const top = d.querySelector('.sk-dlg-body') ? d.querySelector('.sk-dlg-body').scrollTop : 0;
    d.innerHTML = `
      <div class="sk-dlg-head">
        <div class="sk-dlg-title">
          <h3>${ed.id ? `標記 #${ed.no}` : '新增標記'}</h3>
          <div class="sk-dlg-meta">📍 ${esc(sheetLabel(s))}</div>
        </div>
        <button class="sk-dlg-x" type="button" data-pn="close" aria-label="關閉">✕</button>
        <div class="sk-dlg-ask pn-ask" hidden></div>
      </div>
      <div class="sk-dlg-body pn-form">
        <div class="pn-field"><span>狀態</span>
          <div class="pn-seg">${Object.keys(STATUS).map(k => `<button type="button" class="${STATUS[k].cls} ${ed.status === k ? 'on' : ''}" data-pn="set" data-k="status" data-v="${k}">${STATUS[k].label}</button>`).join('')}</div>
        </div>
        <div class="pn-field"><span>分類</span>
          <div class="pn-seg pn-seg-cat">${CATS.map(c => `<button type="button" class="${ed.cat === c ? 'on' : ''}" data-pn="set" data-k="cat" data-v="${c}">${c}</button>`).join('')}</div>
        </div>
        <label class="pn-field"><span>狀況說明（必填）</span>
          <textarea data-e="text" rows="3" maxlength="1000" placeholder="例如：C14 柱箍筋間距約 20cm，超過圖面 15cm；可以按鍵盤上的🎤用說的">${esc(ed.text)}</textarea>
        </label>
        <div class="pn-row">
          <label class="pn-field"><span>負責單位</span>
            <input data-e="unit" value="${esc(ed.unit)}" list="pnUnits" maxlength="40" placeholder="例如：鋼筋" autocomplete="off" />
            <datalist id="pnUnits">${units.map(u => `<option value="${esc(u)}"></option>`).join('')}</datalist>
          </label>
          <label class="pn-field"><span>改善期限</span><input type="date" data-e="due" value="${esc(ed.due)}" /></label>
        </div>
        <div class="pn-row">
          <label class="pn-field"><span>發現時間</span><input type="datetime-local" data-e="found" value="${esc(ed.found)}" /></label>
          <label class="pn-field"><span>紀錄人</span><input data-e="by" value="${esc(ed.by)}" maxlength="40" placeholder="你的名字" /></label>
        </div>
        <div class="pn-field"><span>現場照片</span><div class="pn-phs">${await photoTiles('photos')}</div></div>
        ${ed.status === 'done' || ed.fixPhotos.length ? `<div class="pn-field"><span>改善後照片</span><div class="pn-phs">${await photoTiles('fixPhotos')}</div></div>` : ''}
        ${ed.log && ed.log.length ? `<div class="pn-field"><span>處理紀錄</span><ul class="pn-log">${ed.log.map(l =>
          `<li>${esc(fmtTime(l.at))}　${badge(l.status)}${l.by ? `　${esc(l.by)}` : ''}</li>`).join('')}</ul></div>` : ''}
        <div class="pj-msg" ${msg ? '' : 'hidden'}>${esc(msg)}</div>
      </div>
      <div class="pn-dlg-foot">
        ${ed.id && S().canDeletePin(ed) ? '<button type="button" class="sk-btn sk-btn-danger" data-pn="pin-del">刪除</button>' : ''}
        ${ed.id ? '<button type="button" class="sk-btn" data-pn="pin-move">📍 移動位置</button>' : ''}
        <span class="pn-sp"></span>
        <button type="button" class="sk-btn" data-pn="close">取消</button>
        <button type="button" class="sk-btn sk-btn-primary" data-pn="pin-save">💾 儲存</button>
      </div>`;
    d.querySelector('.sk-dlg-body').scrollTop = top;
  }
  async function openPin(pin) {
    ed = JSON.parse(JSON.stringify(pin));
    edSnap = JSON.stringify(ed);
    newPhotos = { photos: [], fixPhotos: [] };
    await renderPin();
    if (!dialog().open) dlg.showModal();
    if (!ed.id) dlg.querySelector('[data-e="text"]').focus();
  }
  let askDone = null;
  function ask(text, choices) {
    const el = dlg.querySelector('.pn-ask');
    el.innerHTML = `<span>${esc(text)}</span><div>${choices.map(([k, label, cls]) =>
      `<button type="button" class="sk-btn ${cls || ''}" data-ask="${k}">${esc(label)}</button>`).join('')}</div>`;
    el.hidden = false;
    return new Promise(resolve => { askDone = resolve; });
  }
  function dropPhotos() {
    [...newPhotos.photos, ...newPhotos.fixPhotos].forEach(p => URL.revokeObjectURL(p.url));
    newPhotos = { photos: [], fixPhotos: [] };
  }
  async function closePin(force) {
    if (!force && dirty()) {
      const a = await ask('還沒儲存，要怎麼處理？', [['save', '💾 儲存', 'sk-btn-primary'], ['discard', '不儲存，關閉', 'sk-btn-danger'], ['keep', '繼續編輯']]);
      if (a === 'save') return savePin();
      if (a !== 'discard') return;
    }
    dropPhotos();
    ed = null;
    dlg.close();
  }
  async function savePin() {
    const btn = dlg.querySelector('[data-pn="pin-save"]');
    btn.disabled = true;
    btn.textContent = '儲存中…';
    try {
      const up = async kind => [...ed[kind], ...(await Promise.all(newPhotos[kind].map(p => S().addPhoto(p.blob))))];
      const pin = { ...ed, photos: await up('photos'), fixPhotos: await up('fixPhotos') };
      await S().savePin(pin);
      await reload();
      closePin(true);
      if (view === 'sheet') renderSheet(); else rerender();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '💾 儲存';
      if (e.status === 409) { await reload(); }
      renderPin(e.message);
    }
  }
  async function onDlgClick(e) {
    const ak = e.target.closest('[data-ask]');
    if (ak) {
      ak.closest('.pn-ask').hidden = true;
      if (askDone) askDone(ak.dataset.ask);
      askDone = null;
      return;
    }
    const b = e.target.closest('[data-pn]');
    if (!b || !ed) return;
    const a = b.dataset.pn;
    if (a === 'close') closePin();
    if (a === 'set') {
      ed[b.dataset.k] = b.dataset.v;
      renderPin();
    }
    if (a === 'ph-del') { ed[b.dataset.kind].splice(+b.dataset.i, 1); renderPin(); }
    if (a === 'ph-del-new') {
      const [p] = newPhotos[b.dataset.kind].splice(+b.dataset.i, 1);
      URL.revokeObjectURL(p.url);
      renderPin();
    }
    if (a === 'ph-view') viewPhoto(b.src);
    if (a === 'pin-save') savePin();
    if (a === 'pin-move') {
      if (dirty() && await ask('先儲存目前的修改，再移動位置？', [['ok', '💾 儲存', 'sk-btn-primary'], ['keep', '取消']]) !== 'ok') return;
      if (dirty()) await savePin(); else closePin(true);
      movePin = data.pins.find(p => p.id === (ed || {}).id) || data.pins.find(p => p.id === JSON.parse(edSnap).id);
      if (view === 'sheet') renderSheet();
    }
    if (a === 'pin-del') {
      if (await ask(`確定刪除標記 #${ed.no}？照片也會一起刪除，無法復原。`, [['ok', '確定刪除', 'sk-btn-danger'], ['keep', '取消']]) !== 'ok') return;
      try {
        await S().deletePin(ed.id);
        await reload();
        closePin(true);
        if (view === 'sheet') renderSheet(); else rerender();
      } catch (err) { renderPin(err.message); }
    }
  }
  function onDlgInput(e) {
    const k = e.target.dataset.e;
    if (ed && k) ed[k] = e.target.value;
  }
  async function onDlgChange(e) {
    const kind = e.target.dataset.photo;
    if (!kind || !ed) return;
    const files = [...e.target.files];
    e.target.value = '';
    const room = 6 - ed[kind].length - newPhotos[kind].length;
    for (const f of files.slice(0, room)) {
      try {
        const blob = await shrinkPhoto(f);
        newPhotos[kind].push({ blob, url: URL.createObjectURL(blob) });
      } catch (err) { alertBar(err.message); }
    }
    if (files.length > room) alertBar('每個標記最多 6 張照片');
    renderPin();
  }
  function viewPhoto(src) {
    const v = document.createElement('dialog');
    v.className = 'pn-photo-view';
    v.innerHTML = `<img src="${esc(src)}" alt="照片" /><button type="button" aria-label="關閉">✕ 關閉</button>`;
    document.body.appendChild(v);
    v.addEventListener('click', () => { v.close(); v.remove(); });
    v.addEventListener('cancel', () => v.remove());
    v.showModal();
  }

  /* ---------- 上傳與裁切 ---------- */
  let crop = null; // { name, canvas, pdfPage, pages, pageNo, regions: [{x0,y0,x1,y1,floor,kind,name}] }
  let cropDlg = null;
  function cropDialog() {
    if (!cropDlg) {
      cropDlg = document.createElement('dialog');
      cropDlg.className = 'sk-dialog pn-crop-dlg';
      document.body.appendChild(cropDlg);
      cropDlg.addEventListener('cancel', e => { e.preventDefault(); if (!crop || !crop.busy) { crop = null; cropDlg.close(); } });
      cropDlg.addEventListener('click', onCropClick);
      cropDlg.addEventListener('input', e => {
        const i = e.target.dataset.ri;
        if (i != null && crop) crop.regions[+i][e.target.dataset.rk] = e.target.value;
      });
      cropDlg.addEventListener('change', async e => {
        if (e.target.dataset.page && crop) { await loadPage(+e.target.value); renderCrop(); }
      });
      bindCropDrag(cropDlg);
    }
    return cropDlg;
  }
  const fileInput = () => {
    let el = document.getElementById('pnFile');
    if (!el) {
      el = document.createElement('input');
      el.type = 'file';
      el.id = 'pnFile';
      el.accept = 'application/pdf,.pdf,image/*';
      el.hidden = true;
      document.body.appendChild(el);
      el.addEventListener('change', async () => {
        const f = el.files[0];
        el.value = '';
        if (f) startCrop(f);
      });
    }
    return el;
  };
  // 預覽用的整張圖（最長邊約 2400px）
  async function loadPage(no) {
    const page = await crop.pdf.getPage(no);
    const base = page.getViewport({ scale: 1 });
    const scale = 2400 / Math.max(base.width, base.height);
    const vpt = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.round(vpt.width); c.height = Math.round(vpt.height);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vpt, intent: 'print' }).promise; // print：不等畫面更新，背景、切換 App 時也會繼續
    crop.page = page;
    crop.pageNo = no;
    crop.canvas = c;
    crop.preview = c.toDataURL('image/jpeg', 0.8);
    setRegions(detectRegions(c));
  }
  function setRegions(rects) {
    const floors = floorsFromName(crop.name);
    const kind = kindFromName(crop.name);
    const label = crop.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
    crop.regions = rects.map((r, i) => ({ ...r, floor: floors[i] || '', kind, name: label }));
  }
  async function startCrop(file) {
    const d = cropDialog();
    crop = { name: file.name, busy: true };
    d.innerHTML = '<div class="pn-crop-loading">讀取中…（PDF 第一次要載入讀取元件，請稍等）</div>';
    if (!d.open) d.showModal();
    try {
      if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
        const lib = await loadPdfJs();
        // 【資安】pdf.js 3.11 有 CVE-2024-4367：惡意 PDF 可在字型處理時執行程式碼；
        // 關閉 isEvalSupported 即可阻斷（官方建議的緩解方式），也配合 CSP 不允許 eval
        crop.pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
        crop.pages = crop.pdf.numPages;
        await loadPage(1);
      } else {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        // 手機照片：最長邊限制 5000px、總像素 1600 萬以內（iPhone Safari 畫布上限）
        const k = Math.min(1, 5000 / Math.max(img.naturalWidth, img.naturalHeight), Math.sqrt(16e6 / (img.naturalWidth * img.naturalHeight)));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        crop.canvas = c;
        crop.preview = c.toDataURL('image/jpeg', 0.8);
        setRegions(detectRegions(c));
      }
      crop.busy = false;
      renderCrop();
    } catch (e) {
      crop = null;
      d.innerHTML = `<div class="pn-crop-loading">無法讀取這個檔案：${esc(e.message)}<br /><button class="sk-btn" data-crop="close">關閉</button></div>`;
    }
  }
  function renderCrop(msg = '') {
    const d = cropDialog();
    const floors = [...new Set(data.sheets.map(s => s.floor))];
    d.innerHTML = `
      <div class="sk-dlg-head">
        <div class="sk-dlg-title">
          <h3>裁切平面圖</h3>
          <div class="sk-dlg-meta">${esc(crop.name)}</div>
        </div>
        <button class="sk-dlg-x" type="button" data-crop="close" aria-label="關閉">✕</button>
      </div>
      <div class="sk-dlg-body">
        <p class="pn-hint">已自動去掉圖框與標題欄。框框以外的地方不會存起來；拉<b>四個角的圓點</b>可以調整範圍，拉框框中間可以移動。</p>
        ${crop.pages > 1 ? `<label class="pn-field pn-page"><span>這個 PDF 有 ${crop.pages} 頁，選要裁切的頁</span>
          <select data-page="1">${Array.from({ length: crop.pages }, (_, i) => `<option value="${i + 1}" ${i + 1 === crop.pageNo ? 'selected' : ''}>第 ${i + 1} 頁</option>`).join('')}</select></label>` : ''}
        <div class="pn-crop" id="pnCrop">
          <img src="${crop.preview}" alt="整張圖" draggable="false" />
          ${crop.regions.map((r, i) => `
            <div class="pn-rect" data-r="${i}" style="left:${r.x0 * 100}%;top:${r.y0 * 100}%;width:${(r.x1 - r.x0) * 100}%;height:${(r.y1 - r.y0) * 100}%">
              <span class="pn-rect-label">${i + 1}. ${esc(r.floor || '樓層？')}</span>
              ${['nw', 'ne', 'sw', 'se'].map(h => `<i class="pn-h pn-h-${h}" data-h="${h}"></i>`).join('')}
            </div>`).join('')}
        </div>
        <datalist id="pnFloors">${[...new Set([...floors, 'B3F', 'B2F', 'B1F', '1F', '2F', '3F', 'RF'])].map(f => `<option value="${esc(f)}"></option>`).join('')}</datalist>
        <ol class="pn-regions">${crop.regions.map((r, i) => `
          <li>
            <span class="pn-r-no">${i + 1}</span>
            <label>樓層<input data-ri="${i}" data-rk="floor" value="${esc(r.floor)}" list="pnFloors" maxlength="20" placeholder="例如 B2F" autocomplete="off" /></label>
            <label>圖別<select data-ri="${i}" data-rk="kind">${KINDS.map(k => `<option ${k === r.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
            <label class="pn-r-name">圖名<input data-ri="${i}" data-rk="name" value="${esc(r.name)}" maxlength="80" /></label>
            <button type="button" class="sk-btn sk-btn-danger" data-crop="del" data-i="${i}" aria-label="刪除這個範圍">✕</button>
          </li>`).join('')}</ol>
        <div class="pn-crop-btns">
          <button type="button" class="sk-btn" data-crop="add">＋ 加一個範圍</button>
          <button type="button" class="sk-btn" data-crop="auto">↺ 重新自動偵測</button>
          <button type="button" class="sk-btn" data-crop="whole">整張都要</button>
        </div>
        <div class="pj-msg" ${msg ? '' : 'hidden'}>${esc(msg)}</div>
      </div>
      <div class="pn-dlg-foot">
        <span class="pn-sp"></span>
        <button type="button" class="sk-btn" data-crop="close">取消</button>
        <button type="button" class="sk-btn sk-btn-primary" data-crop="save" ${crop.regions.length ? '' : 'disabled'}>💾 儲存 ${crop.regions.length} 張平面圖</button>
      </div>`;
  }
  // 拉角落調整、拉中間移動（座標用 0～1，對應整張圖）
  function bindCropDrag(d) {
    let drag = null;
    d.addEventListener('pointerdown', e => {
      const rect = e.target.closest('.pn-rect');
      if (!rect || !crop) return;
      e.preventDefault();
      const box = d.querySelector('#pnCrop').getBoundingClientRect();
      drag = { i: +rect.dataset.r, h: e.target.dataset.h || 'move', box, x: e.clientX, y: e.clientY, r: { ...crop.regions[+rect.dataset.r] }, el: rect };
      rect.setPointerCapture(e.pointerId);
    });
    d.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / drag.box.width, dy = (e.clientY - drag.y) / drag.box.height;
      const r = { ...drag.r };
      const cl = v => Math.min(1, Math.max(0, v));
      if (drag.h === 'move') {
        const w = r.x1 - r.x0, h = r.y1 - r.y0;
        r.x0 = Math.min(1 - w, Math.max(0, r.x0 + dx)); r.x1 = r.x0 + w;
        r.y0 = Math.min(1 - h, Math.max(0, r.y0 + dy)); r.y1 = r.y0 + h;
      } else {
        if (drag.h.includes('w')) r.x0 = cl(Math.min(r.x1 - 0.03, r.x0 + dx));
        if (drag.h.includes('e')) r.x1 = cl(Math.max(r.x0 + 0.03, r.x1 + dx));
        if (drag.h.includes('n')) r.y0 = cl(Math.min(r.y1 - 0.03, r.y0 + dy));
        if (drag.h.includes('s')) r.y1 = cl(Math.max(r.y0 + 0.03, r.y1 + dy));
      }
      Object.assign(crop.regions[drag.i], { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });
      Object.assign(drag.el.style, { left: `${r.x0 * 100}%`, top: `${r.y0 * 100}%`, width: `${(r.x1 - r.x0) * 100}%`, height: `${(r.y1 - r.y0) * 100}%` });
    });
    const up = () => { drag = null; };
    d.addEventListener('pointerup', up);
    d.addEventListener('pointercancel', up);
  }
  // 高解析度裁切：PDF 依範圍重新畫（總像素 1000 萬以內），照片直接從原圖裁
  async function renderRegion(r) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    if (crop.page) {
      const base = crop.page.getViewport({ scale: 1 });
      const rw = (r.x1 - r.x0) * base.width, rh = (r.y1 - r.y0) * base.height;
      const scale = Math.min(Math.sqrt(10e6 / (rw * rh)), 5000 / Math.max(rw, rh), 6);
      const vpt = crop.page.getViewport({ scale });
      c.width = Math.round(rw * scale); c.height = Math.round(rh * scale);
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      await crop.page.render({ canvasContext: g, viewport: vpt, intent: 'print', transform: [1, 0, 0, 1, -r.x0 * vpt.width, -r.y0 * vpt.height] }).promise;
    } else {
      const src = crop.canvas;
      const sx = r.x0 * src.width, sy = r.y0 * src.height;
      c.width = Math.round((r.x1 - r.x0) * src.width); c.height = Math.round((r.y1 - r.y0) * src.height);
      g.drawImage(src, sx, sy, c.width, c.height, 0, 0, c.width, c.height);
    }
    const blob = await toBlob(c, 0.85);
    const out = { blob, w: c.width, h: c.height };
    c.width = c.height = 0; // 釋放記憶體（iPhone 畫布總量有限）
    return out;
  }
  async function onCropClick(e) {
    const b = e.target.closest('[data-crop]');
    if (!b) return;
    const a = b.dataset.crop;
    if (a === 'close') { if (crop && crop.busy) return; crop = null; cropDlg.close(); return; }
    if (!crop || crop.busy) return;
    if (a === 'del') { crop.regions.splice(+b.dataset.i, 1); renderCrop(); }
    if (a === 'add') {
      const last = crop.regions[crop.regions.length - 1];
      crop.regions.push({ x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7, floor: '', kind: last ? last.kind : kindFromName(crop.name), name: last ? last.name : crop.name.replace(/\.[^.]+$/, '') });
      renderCrop();
    }
    if (a === 'auto') { setRegions(detectRegions(crop.canvas)); renderCrop(); }
    if (a === 'whole') { setRegions([{ x0: 0, y0: 0, x1: 1, y1: 1 }]); renderCrop(); }
    if (a === 'save') {
      const missing = crop.regions.findIndex(r => !String(r.floor).trim());
      if (missing >= 0) { renderCrop(`請填第 ${missing + 1} 個範圍的樓層（例如 B2F）`); return; }
      crop.busy = true;
      b.disabled = true;
      let done = 0;
      try {
        for (const r of crop.regions) {
          b.textContent = `處理中 ${done + 1}／${crop.regions.length}…`;
          const img = await renderRegion(r);
          await S().addSheet({ ...img, floor: r.floor.trim().toUpperCase(), kind: r.kind, name: r.name });
          done += 1;
        }
        crop = null;
        cropDlg.close();
        await reload();
        view = 'home';
        rerender();
        alertBar(`已新增 ${done} 張平面圖`);
      } catch (err) {
        crop.busy = false;
        if (done) { crop.regions.splice(0, done); await reload(); }
        renderCrop(`${done ? `已存好 ${done} 張；` : ''}${err.message}`);
      }
    }
  }

  /* ---------- 平面圖設定（樓層、圖別、圖名、刪除） ---------- */
  function sheetEdit() {
    const s = sheetOf(sheetId);
    const d = dialog();
    const n = data.pins.filter(p => p.sheet === s.id).length;
    ed = null;
    d.innerHTML = `
      <form class="pj-box" data-sheet-form>
        <div class="pj-head"><h3>平面圖設定</h3><button class="sk-dlg-x" type="button" data-sh="close" aria-label="關閉">✕</button></div>
        <label class="pj-company">樓層<input name="floor" value="${esc(s.floor)}" maxlength="20" required /></label>
        <label class="pj-company">圖別<select name="kind">${KINDS.map(k => `<option ${k === s.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="pj-company">圖名<input name="name" value="${esc(s.name)}" maxlength="80" /></label>
        <div class="pj-msg" hidden></div>
        <div class="pn-dlg-foot pn-foot-in">
          ${S().canDeleteSheet() ? '<button type="button" class="sk-btn sk-btn-danger" data-sh="del">刪除這張圖</button>' : ''}
          <span class="pn-sp"></span>
          <button type="submit" class="sk-btn sk-btn-primary">儲存</button>
        </div>
      </form>`;
    const msg = d.querySelector('.pj-msg');
    d.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const f = e.target;
      try {
        await S().updateSheet(s.id, { floor: f.floor.value.trim().toUpperCase(), kind: f.kind.value, name: f.name.value });
        await reload();
        d.close();
        renderSheet();
      } catch (err) { msg.textContent = err.message; msg.hidden = false; }
    };
    d.querySelector('[data-sh="close"]').onclick = () => d.close();
    const del = d.querySelector('[data-sh="del"]');
    if (del) del.onclick = async () => {
      // 按兩次才刪除（不用 confirm()：LINE 等 App 內建瀏覽器會擋掉）
      if (!del.dataset.sure) {
        del.dataset.sure = '1';
        del.textContent = '確定刪除';
        msg.textContent = `再按一次「確定刪除」就會刪除這張圖${n ? `，上面的 ${n} 個標記與照片也會一起刪除，無法復原` : ''}。`;
        msg.hidden = false;
        return;
      }
      try {
        await S().deleteSheet(s.id);
        await reload();
        d.close();
        view = 'home';
        rerender();
      } catch (err) { msg.textContent = err.message; msg.hidden = false; }
    };
    if (!d.open) d.showModal();
  }

  /* ---------- 列印「缺失改善通知單」：每個標記附位置圖（圖上紅圈）與照片 ---------- */
  async function locationSnap(p) {
    const s = sheetOf(p.sheet);
    if (!s) return '';
    const img = await loadImage(await S().fileURL(s.id));
    const size = Math.round(Math.max(s.w, s.h) * 0.16); // 取標記周圍一塊
    const cx = p.x * s.w, cy = p.y * s.h;
    const sx = Math.max(0, Math.min(s.w - size, cx - size / 2)), sy = Math.max(0, Math.min(s.h - size, cy - size / 2));
    const c = document.createElement('canvas');
    c.width = c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 600, 600);
    const k = 600 / size;
    g.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);
    g.strokeStyle = '#e5484d';
    g.lineWidth = 6;
    g.beginPath();
    g.arc((cx - sx) * k, (cy - sy) * k, 34, 0, Math.PI * 2);
    g.stroke();
    return c.toDataURL('image/jpeg', 0.85);
  }
  async function printList() {
    const pins = filteredPins();
    const btn = root.querySelector('[data-pn="print"]');
    btn.disabled = true;
    btn.textContent = '準備中…';
    const units = [...new Set(pins.map(p => p.unit).filter(Boolean))];
    const rows = [];
    for (const p of pins) {
      const snap = await locationSnap(p).catch(() => '');
      const photos = await Promise.all([...p.photos, ...p.fixPhotos].slice(0, 4).map(id => S().fileURL(id).catch(() => '')));
      rows.push(`
        <section class="pnp-item">
          <div class="pnp-top"><b>#${esc(p.no)}</b>　${badge(p.status)}　${esc(p.cat)}　📍 ${esc(sheetLabel(sheetOf(p.sheet)))}</div>
          <div class="pnp-body">
            ${snap ? `<img class="pnp-snap" src="${snap}" alt="位置" />` : ''}
            <div class="pnp-text">
              <p>${esc(p.text)}</p>
              <table>
                <tr><th>負責單位</th><td>${esc(p.unit)}</td><th>改善期限</th><td>${esc(p.due)}</td></tr>
                <tr><th>發現時間</th><td>${esc(fmtFound(p.found))}</td><th>紀錄人</th><td>${esc(p.by)}</td></tr>
              </table>
              <div class="pnp-photos">${photos.filter(Boolean).map(u => `<img src="${esc(u)}" alt="照片" />`).join('')}</div>
            </div>
          </div>
        </section>`);
    }
    let box = document.getElementById('pnPrint');
    if (!box) { box = document.createElement('div'); box.id = 'pnPrint'; document.body.appendChild(box); }
    const company = window.SK_STORE.companyName();
    box.innerHTML = `
      <h1>${company ? `${esc(company)}　` : ''}缺失改善通知單</h1>
      <div class="pnp-meta">工程名稱：${esc(window.SK_STORE.projectName())}
        ${units.length === 1 ? `負責單位：${esc(units[0])}　` : ''}列印日期：${today()}　共 ${pins.length} 項</div>
      ${rows.join('')}
      <div class="pnp-sign"><span>通知人：</span><span>負責單位簽收：</span><span>日期：</span></div>`;
    // 等圖片載入完再列印
    await Promise.all([...box.querySelectorAll('img')].map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
    btn.disabled = false;
    btn.textContent = `🖨 列印改善通知單（${pins.length}）`;
    document.body.classList.add('pn-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('pn-printing'), 500);
  }

  /* ---------- 頁面事件 ---------- */
  async function onClick(e) {
    const b = e.target.closest('[data-pn]');
    if (!b) return;
    const a = b.dataset.pn;
    if (a === 'upload') fileInput().click();
    if (a === 'tab-home') { view = 'home'; rerender(); }
    if (a === 'tab-list') { view = 'list'; rerender(); }
    if (a === 'open') { sheetId = b.dataset.id; view = 'sheet'; addMode = false; movePin = null; calMode = null; renderSheet(false); window.scrollTo(0, 0); }
    if (a === 'back') { view = 'home'; addMode = false; movePin = null; calMode = null; rerender(); }
    if (a === 'add') { calMode = null; if (movePin) movePin = null; else addMode = !addMode; renderSheet(); }
    if (a === 'cal') {
      addMode = false; movePin = null;
      calMode = calMode ? null : { labels: calLabels(sheetOf(sheetId)), pts: [] };
      renderSheet();
    }
    if (a === 'cal-cancel') { calMode = null; renderSheet(); }
    if (a === 'ov') { ovOpen = !ovOpen; renderSheet(); }
    if (a === 'sheet-edit') sheetEdit();
    if (a === 'zin' || a === 'zout') {
      const v = root.querySelector('#pnView');
      zoomAt(a === 'zin' ? 1.4 : 1 / 1.4, v.clientWidth / 2, v.clientHeight / 2);
    }
    if (a === 'zfit') { vp = null; renderSheet(false); }
    if (a === 'f-status') {
      const k = b.dataset.k;
      filter.status = filter.status.includes(k) ? filter.status.filter(x => x !== k) : [...filter.status, k];
      rerender();
    }
    if (a === 'goto') {
      const p = data.pins.find(x => x.id === b.dataset.id);
      if (!p) return;
      sheetId = p.sheet;
      view = 'sheet';
      await renderSheet(false);
      // 放大到標記附近
      const v = root.querySelector('#pnView');
      const s = sheetOf(p.sheet);
      const k = Math.min(3, Math.max(vp.s, Math.min(v.clientWidth, v.clientHeight) / (Math.max(s.w, s.h) * 0.3)));
      vp.s = k;
      vp.x = v.clientWidth / 2 - p.x * s.w * k;
      vp.y = v.clientHeight / 2 - p.y * s.h * k;
      applyVP();
      openPin(p);
    }
    if (a === 'print') printList();
  }
  function onChange(e) {
    const f = e.target.dataset.f;
    if (f) { filter[f] = e.target.value; rerender(); }
    if (e.target.dataset.pn === 'show-done') { showDone = e.target.checked; renderSheet(); }
    const on = e.target.dataset.ovon, color = e.target.dataset.ovcolor;
    if (on) { ovSet(sheetOf(on)).on = e.target.checked; renderSheet(); }
    if (color) { ovSet(sheetOf(color)).color = e.target.value; renderSheet(); }
  }
  // 拉桿：直接改透明度，不重畫（拖動才順）；對位的軸線名稱
  function onInput(e) {
    const r = e.target.dataset.range;
    if (r === 'base') {
      baseAlpha = +e.target.value;
      const img = root.querySelector('#pnImg');
      if (img) img.style.opacity = baseAlpha;
    } else if (r) {
      ovSet(sheetOf(r)).alpha = +e.target.value;
      const img = root.querySelector(`img[data-ov="${r}"]`);
      if (img) img.style.opacity = e.target.value;
    }
    const c = e.target.dataset.cal;
    if (c != null && calMode) calMode.labels[+c] = e.target.value;
  }

  registerPage('plan-notes', {
    render: () => '<div class="plan-notes" id="pnRoot"><div class="sk-empty">載入中…</div></div>',
    async mount(el) {
      root = el.querySelector('#pnRoot');
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('input', onInput);
      view = view === 'sheet' ? 'home' : view; // 切換工地後回到樓層清單
      try {
        await reload();
        rerender();
      } catch (e) {
        root.innerHTML = `<div class="sk-empty">無法載入：${esc(e.message)}</div>`;
      }
    },
  });
})();
