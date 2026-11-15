/* ===== Monitor PS — tracking pekerjaan ===== */
'use strict';

// ---------- Utilitas ----------
const LS = { cfg: 'mp_cfg', cache: 'mp_cache', queue: 'mp_queue', pref: 'mp_pref' };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh */ } };
const uid = p => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---------- Tanggal ----------
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => ymd(today());
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const fmtTgl = s => { if (!s) return '—'; const d = parseYmd(s); return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTglPanjang = s => { if (!s) return '—'; const d = parseYmd(s); return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const labelHari = s => {
  if (!s) return '—';
  if (s === todayStr()) return 'Hari ini';
  if (s === ymd(addDays(today(), -1))) return 'Kemarin';
  const d = parseYmd(s);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
};

// ---------- Konstanta ----------
const STATUS = ['Belum Mulai', 'Proses', 'Tertunda', 'Selesai'];
const ST_CLASS = { 'Belum Mulai': 'st-belum', 'Proses': 'st-proses', 'Tertunda': 'st-tertunda', 'Selesai': 'st-selesai' };
const ST_COLOR = { 'Belum Mulai': '#cbd5e1', 'Proses': '#0ea5e9', 'Tertunda': '#f59e0b', 'Selesai': '#10b981' };
const PRIO = ['Tinggi', 'Sedang', 'Rendah'];
const PR_CLASS = { Tinggi: 'pr-tinggi', Sedang: 'pr-sedang', Rendah: 'pr-rendah' };
const PRIO_RANK = { Tinggi: 0, Sedang: 1, Rendah: 2 };
const MAKS_FILE = 20 * 1024 * 1024;

const ICON = {
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  task: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m20 11-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
};

// ---------- State ----------
const cache = load(LS.cache, {});
const S = {
  cfg: load(LS.cfg, null),
  tugas: cache.tugas || [],
  log: cache.log || [],
  file: cache.file || [],
  settings: cache.pengaturan || { paket: [], kategori: [] },
  urlSheet: cache.urlSheet || '',
  urlFolder: cache.urlFolder || '',
  lastSync: cache.waktu || 0,
  queue: load(LS.queue, []),
  pref: Object.assign({ instansi: 'Satuan Kerja Pelaksanaan Prasarana Strategis Papua', penyusun: '', jabatan: 'Konsultan Individual', lastPaket: '', lastJenis: 'Teknis' }, load(LS.pref, {})),
  view: 'beranda',
  filter: { q: '', status: 'aktif', paket: '', jenis: '', sort: 'tenggat' },
  lap: { paket: '', periode: 'bulan', from: '', to: '' },
  loaded: !!cache.waktu,
  syncing: false
};

// ---------- API ----------
async function api(action, data = {}, cfg = S.cfg, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ token: cfg.token, action, data }), redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw netErr('Server membalas ' + res.status);
    let j;
    try { j = await res.json(); } catch (e) { throw new Error('Balasan server tidak valid. Pastikan URL Web App benar dan akses "Siapa saja".'); }
    if (!j.ok) throw new Error(j.error || 'Permintaan gagal');
    return j.data;
  } catch (e) {
    if (e.name === 'AbortError') throw netErr('Koneksi terlalu lama');
    if (e instanceof TypeError) throw netErr('Tidak ada koneksi internet');
    throw e;
  } finally { clearTimeout(timer); }
}
function netErr(msg) { const e = new Error(msg); e.network = true; return e; }

function saveCache() {
  store(LS.cache, { tugas: S.tugas, log: S.log, file: S.file, pengaturan: S.settings, urlSheet: S.urlSheet, urlFolder: S.urlFolder, waktu: S.lastSync });
}

async function sync(silent) {
  if (!S.cfg || S.syncing) return;
  S.syncing = true;
  $('#btnSync').classList.add('spin');
  try {
    await flushQueue();
    const d = await api('ambilSemua');
    // Data yang masih antre (belum terkirim) tetap dipakai versi lokalnya
    const pend = new Set(S.queue.map(q => q.data.id));
    const tLokal = S.tugas.filter(t => pend.has(t.id));
    S.tugas = d.tugas.map(t => tLokal.find(x => x.id === t.id) || t).concat(tLokal.filter(x => !d.tugas.some(t => t.id === x.id)));
    S.log = d.log.concat(S.log.filter(l => pend.has(l.id) && !d.log.some(x => x.id === l.id)));
    S.file = d.file;
    S.settings = d.pengaturan;
    S.urlSheet = d.urlSheet; S.urlFolder = d.urlFolder;
    S.lastSync = d.waktu; S.loaded = true;
    saveCache(); render();
    if (!silent) toast('Data tersinkron', 'ok');
  } catch (e) {
    if (!S.loaded) render();
    if (!silent || !e.network) toast(e.message, 'err');
  } finally {
    S.syncing = false;
    $('#btnSync').classList.remove('spin');
    updatePendingDot();
  }
}

let flushing = null;
function flushQueue() {
  if (!flushing) flushing = doFlush().finally(() => { flushing = null; });
  return flushing;
}
async function doFlush() {
  while (S.queue.length) {
    const item = S.queue[0];
    try {
      const r = await api(item.action, item.data);
      S.queue.shift(); store(LS.queue, S.queue);
      if (item.action === 'simpanTugas') {
        const i = S.tugas.findIndex(t => t.id === item.data.id);
        if (i >= 0 && !S.queue.some(q => q.data.id === item.data.id)) S.tugas[i] = { ...r, id: item.data.id };
      } else if (item.action === 'tambahLog') {
        const l = S.log.find(x => x.id === item.data.id); if (l) delete l.pending;
        const i = S.tugas.findIndex(t => t.id === item.data.idTugas);
        if (r.tugas && i >= 0 && !S.queue.some(q => q.data.id === item.data.idTugas)) S.tugas[i] = r.tugas;
      }
    } catch (e) {
      if (e.network) throw e;
      S.queue.shift(); store(LS.queue, S.queue);
      toast('Gagal disimpan: ' + e.message, 'err');
      if (item.action === 'tambahLog') S.log = S.log.filter(x => x.id !== item.data.id);
    }
  }
  saveCache(); updatePendingDot();
}
function updatePendingDot() { $('#dotPending').classList.toggle('hidden', !S.queue.length); }
const isPending = id => S.queue.some(q => q.data.id === id);

function antre(action, data) {
  S.queue.push({ action, data });
  store(LS.queue, S.queue); saveCache(); updatePendingDot();
  if (!navigator.onLine) { toast('Offline: disimpan di HP, dikirim saat online', 'info'); return; }
  flushQueue().then(() => render()).catch(() => { render(); toast('Sinyal lemah: data diantre & dikirim otomatis', 'info'); });
}

// ---------- Logika tugas ----------
const isLate = t => t.status !== 'Selesai' && t.tenggat && t.tenggat < todayStr();
const isSoon = (t, n = 7) => t.status !== 'Selesai' && t.tenggat && t.tenggat >= todayStr() && t.tenggat <= ymd(addDays(today(), n));
const progres = t => (t.status === 'Selesai' ? 100 : Math.max(0, Math.min(100, Number(t.progres) || 0)));
function dueLabel(t) {
  if (!t.tenggat) return { txt: 'Tanpa tenggat', cls: 'ok' };
  if (t.status === 'Selesai') return { txt: 'Selesai ' + (t.selesai ? fmtTgl(t.selesai) : ''), cls: 'ok' };
  const n = diffDays(todayStr(), t.tenggat);
  if (n < 0) return { txt: `Terlambat ${-n} hari`, cls: 'late' };
  if (n === 0) return { txt: 'Tenggat hari ini', cls: 'soon' };
  if (n === 1) return { txt: 'Tenggat besok', cls: 'soon' };
  return { txt: `${n} hari lagi · ${fmtTgl(t.tenggat)}`, cls: n <= 7 ? 'soon' : 'ok' };
}
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const logsOf = id => S.log.filter(l => l.idTugas === id).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.dibuat || 0) - (a.dibuat || 0));
const filesOf = id => S.file.filter(f => f.idTugas === id).sort((a, b) => (b.diunggah || 0) - (a.diunggah || 0));
const daftarPaket = () => [...new Set([...S.settings.paket, ...S.tugas.map(t => t.paket).filter(Boolean)])];

// ---------- Render utama ----------
const TITLES = { beranda: 'Beranda', tugas: 'Daftar Tugas', laporan: 'Laporan', atur: 'Pengaturan' };
function render() {
  $('#topTitle').textContent = TITLES[S.view];
  const h = new Date().getHours();
  $('#topSub').textContent = S.view === 'beranda'
    ? (h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam') + ' · ' + labelHari(todayStr())
    : (S.lastSync ? 'Sinkron ' + waktuLalu(S.lastSync) : '');
  $$('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + S.view));
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === S.view));
  ({ beranda: renderBeranda, tugas: renderTugas, laporan: renderLaporan, atur: renderAtur })[S.view]();
}
function waktuLalu(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'barusan';
  if (m < 60) return m + ' menit lalu';
  const j = Math.round(m / 60);
  return j < 24 ? j + ' jam lalu' : Math.round(j / 24) + ' hari lalu';
}
function go(view) {
  S.view = view;
  const el = $('#view-' + view);
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  render(); window.scrollTo({ top: 0 });
}
function skeleton() {
  return `<div class="skel" style="height:170px;border-radius:26px;margin-bottom:14px"></div>
    <div class="skel" style="height:150px;margin-bottom:14px"></div><div class="skel" style="height:240px"></div>`;
}
function emptyState(title, text, btn) {
  return `<div class="empty"><div class="empty-ic">${ICON.task}</div><b>${title}</b><p>${text}</p>
    ${btn ? '<button class="btn btn-primary btn-sm" data-add>+ Tambah Tugas</button>' : ''}</div>`;
}
function bindCommon(root) {
  $$('[data-add]', root).forEach(b => b.onclick = () => openForm());
  $$('[data-open]', root).forEach(b => b.onclick = () => openDetail(b.dataset.open));
}

function taskCard(t) {
  const d = dueLabel(t), p = progres(t);
  return `<button class="task ${isLate(t) ? 'late' : ''}" data-open="${esc(t.id)}">
    <div class="task-top"><div class="task-title">${esc(t.judul)}${isPending(t.id) ? '<span class="badge-pending">antre</span>' : ''}</div>
      <span class="pill ${ST_CLASS[t.status]}"><i></i>${t.status}</span></div>
    <div class="task-meta">${esc(t.paket || 'Tanpa paket')}${t.kategori ? ' · ' + esc(t.kategori) : ''}</div>
    <div class="task-foot"><div class="bar ${p === 100 ? 'done' : ''}"><i style="width:${p}%"></i></div><b class="num">${p}%</b></div>
    <div class="task-pills"><span class="due ${d.cls}">${esc(d.txt)}</span>
      ${t.prioritas === 'Tinggi' ? '<span class="pill pr-tinggi">Prioritas tinggi</span>' : ''}
      ${filesOf(t.id).length ? `<span class="pill pill-soft">📎 ${filesOf(t.id).length}</span>` : ''}</div>
  </button>`;
}

// ---------- BERANDA ----------
function renderBeranda() {
  const el = $('#view-beranda');
  if (!S.loaded) { el.innerHTML = skeleton(); return; }
  if (!S.tugas.length) {
    el.innerHTML = `<div class="card">${emptyState('Belum ada tugas', 'Catat pekerjaan pertamamu: survei lapangan, simak, laporan, atau administrasi.', true)}</div>`;
    bindCommon(el); return;
  }
  const aktif = S.tugas.filter(t => t.status !== 'Selesai');
  const late = aktif.filter(isLate), soon = aktif.filter(t => isSoon(t));
  const bulan = todayStr().slice(0, 7);
  const selesaiBln = S.tugas.filter(t => t.status === 'Selesai' && (t.selesai || '').startsWith(bulan));
  const perhatian = [...late, ...soon].sort((a, b) => a.tenggat.localeCompare(b.tenggat)).slice(0, 5);

  // Donut status
  const cnt = STATUS.map(s => S.tugas.filter(t => t.status === s).length);
  let acc = 0;
  const stops = cnt.map((c, i) => { const a = acc / S.tugas.length * 360; acc += c; return `${ST_COLOR[STATUS[i]]} ${a}deg ${acc / S.tugas.length * 360}deg`; }).join(',');

  // Per paket
  const pakets = daftarPaket().map(p => {
    const ls = S.tugas.filter(t => (t.paket || '') === p);
    return { p, ls, done: ls.filter(t => t.status === 'Selesai').length, late: ls.filter(isLate).length, avg: Math.round(avg(ls.map(progres))) };
  }).filter(x => x.ls.length).sort((a, b) => b.late - a.late || (a.avg - b.avg));
  const tanpa = S.tugas.filter(t => !t.paket);
  if (tanpa.length) pakets.push({ p: '', ls: tanpa, done: tanpa.filter(t => t.status === 'Selesai').length, late: tanpa.filter(isLate).length, avg: Math.round(avg(tanpa.map(progres))) });

  const logs = S.log.slice().sort((a, b) => (b.dibuat || 0) - (a.dibuat || 0) || (b.tanggal || '').localeCompare(a.tanggal || '')).slice(0, 5);

  el.innerHTML = `
    <div class="hero">
      <p class="hero-label">Pekerjaan aktif</p>
      <div class="hero-amount num">${aktif.length} <span style="font-size:15px;font-weight:600;opacity:.9">tugas · rata-rata ${Math.round(avg(aktif.map(progres)))}%</span></div>
      <div class="stat-grid">
        <button class="hero-box" data-f="terlambat"><small>Terlambat</small><b class="num">${late.length}</b></button>
        <button class="hero-box" data-f="soon"><small>≤ 7 hari</small><b class="num">${soon.length}</b></button>
        <button class="hero-box" data-f="Selesai"><small>Selesai bln ini</small><b class="num">${selesaiBln.length}</b></button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Perlu perhatian</div>
      ${perhatian.length ? perhatian.map(t => { const d = dueLabel(t); return `
        <button class="att" style="width:100%;text-align:left" data-open="${esc(t.id)}">
          <div class="att-dot" style="${isLate(t) ? 'background:#fee2e2;color:#dc2626' : 'background:#fff7ed;color:#c2410c'}">${progres(t)}%</div>
          <div style="min-width:0"><b>${esc(t.judul)}</b><span class="due ${d.cls}">${esc(d.txt)}</span></div></button>`; }).join('')
        : '<p class="muted" style="margin:0;font-size:14px">👍 Tidak ada tugas terlambat atau mendekati tenggat.</p>'}
    </div>

    <div class="card">
      <div class="card-title">Status semua tugas</div>
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops})"><span><div>${S.tugas.length}<small>tugas</small></div></span></div>
        <div class="donut-legend">${STATUS.map((s, i) => `<div><i style="background:${ST_COLOR[s]}"></i>${s}<b class="num">${cnt[i]}</b></div>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Progres per paket</div>
      ${pakets.map(x => `
        <button class="pk" data-pk="${esc(x.p)}">
          <div class="pk-head"><span>${esc(x.p || 'Tanpa paket')}</span><span class="num">${x.avg}%</span></div>
          <div class="pk-sub"><span>${x.ls.length} tugas · ${x.done} selesai</span>${x.late ? `<span class="pill pill-late">${x.late} terlambat</span>` : ''}</div>
          <div class="seg-bar">${STATUS.map(s => { const n = x.ls.filter(t => t.status === s).length; return n ? `<i style="flex:${n};background:${ST_COLOR[s]}"></i>` : ''; }).join('')}</div>
        </button>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">Aktivitas terbaru</div>
      ${logs.length ? logs.map(l => { const t = S.tugas.find(x => x.id === l.idTugas); return `
        <button class="att" style="width:100%;text-align:left" ${t ? `data-open="${esc(t.id)}"` : ''}>
          <div class="att-dot">${l.progres}%</div>
          <div style="min-width:0"><b>${esc(t ? t.judul : l.judulTugas)}</b><span>${labelHari(l.tanggal)} · ${esc(l.catatan).slice(0, 90)}</span></div></button>`; }).join('')
        : '<p class="muted" style="margin:0;font-size:14px">Belum ada log progres. Buka sebuah tugas lalu tekan "Catat progres".</p>'}
    </div>`;
  bindCommon(el);
  $$('[data-f]', el).forEach(b => b.onclick = () => { S.filter = { ...S.filter, q: '', paket: '', jenis: '', status: b.dataset.f }; go('tugas'); });
  $$('[data-pk]', el).forEach(b => b.onclick = () => { S.filter = { ...S.filter, q: '', jenis: '', paket: b.dataset.pk || '__none', status: 'semua' }; go('tugas'); });
}

// ---------- DAFTAR TUGAS ----------
function renderTugas() {
  const el = $('#view-tugas');
  if (!S.loaded) { el.innerHTML = skeleton(); return; }
  const f = S.filter;
  const opsi = [['aktif', 'Aktif'], ['terlambat', 'Terlambat'], ['soon', '≤ 7 hari'], ['Belum Mulai', 'Belum Mulai'], ['Proses', 'Proses'], ['Tertunda', 'Tertunda'], ['Selesai', 'Selesai'], ['semua', 'Semua']];
  el.innerHTML = `
    <div class="search">${ICON.search}<input id="tq" type="search" placeholder="Cari judul, catatan, paket…" value="${esc(f.q)}"></div>
    <div class="chips">${opsi.map(([k, l]) => `<button class="chip ${f.status === k ? 'active' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
    <div class="filter-row">
      <select id="tp"><option value="">Semua paket</option>${daftarPaket().map(p => `<option ${f.paket === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}<option value="__none" ${f.paket === '__none' ? 'selected' : ''}>Tanpa paket</option></select>
      <select id="tj"><option value="">Teknis & non teknis</option><option ${f.jenis === 'Teknis' ? 'selected' : ''}>Teknis</option><option ${f.jenis === 'Non Teknis' ? 'selected' : ''}>Non Teknis</option></select>
    </div>
    <div class="filter-row" style="grid-template-columns:1fr">
      <select id="ts">${[['tenggat', 'Urut: tenggat terdekat'], ['prioritas', 'Urut: prioritas'], ['diubah', 'Urut: terakhir diperbarui'], ['progres', 'Urut: progres terendah']].map(([k, l]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div id="tList"></div>`;
  $('#tq', el).oninput = debounce(() => { f.q = $('#tq', el).value; renderTugasList(); }, 180);
  $$('[data-st]', el).forEach(b => b.onclick = () => { f.status = b.dataset.st; renderTugas(); });
  $('#tp', el).onchange = e => { f.paket = e.target.value; renderTugasList(); };
  $('#tj', el).onchange = e => { f.jenis = e.target.value; renderTugasList(); };
  $('#ts', el).onchange = e => { f.sort = e.target.value; renderTugasList(); };
  renderTugasList();
}
function filterTugas() {
  const f = S.filter, q = f.q.trim().toLowerCase();
  let ls = S.tugas.filter(t => {
    if (f.status === 'aktif' && t.status === 'Selesai') return false;
    if (f.status === 'terlambat' && !isLate(t)) return false;
    if (f.status === 'soon' && !isSoon(t)) return false;
    if (STATUS.includes(f.status) && t.status !== f.status) return false;
    if (f.paket === '__none' ? !!t.paket : (f.paket && t.paket !== f.paket)) return false;
    if (f.jenis && t.jenis !== f.jenis) return false;
    if (q && !(t.judul + ' ' + t.catatan + ' ' + t.paket + ' ' + t.kategori).toLowerCase().includes(q)) return false;
    return true;
  });
  const byTenggat = (a, b) => (a.tenggat || '9999').localeCompare(b.tenggat || '9999');
  const sorters = {
    tenggat: (a, b) => (a.status === 'Selesai') - (b.status === 'Selesai') || byTenggat(a, b) || PRIO_RANK[a.prioritas] - PRIO_RANK[b.prioritas],
    prioritas: (a, b) => PRIO_RANK[a.prioritas] - PRIO_RANK[b.prioritas] || byTenggat(a, b),
    diubah: (a, b) => (b.diubah || b.dibuat || 0) - (a.diubah || a.dibuat || 0),
    progres: (a, b) => progres(a) - progres(b) || byTenggat(a, b)
  };
  return ls.sort(sorters[f.sort] || sorters.tenggat);
}
function renderTugasList() {
  const box = $('#tList');
  const ls = filterTugas();
  if (!S.tugas.length) box.innerHTML = `<div class="card">${emptyState('Belum ada tugas', 'Tekan tombol + untuk mencatat pekerjaan pertamamu.', true)}</div>`;
  else if (!ls.length) box.innerHTML = `<div class="card">${emptyState('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.', false)}</div>`;
  else box.innerHTML = `<p class="hist-sum" style="margin:2px 4px 10px"><span>${ls.length} tugas</span><span>rata-rata ${Math.round(avg(ls.map(progres)))}%</span></p>` + ls.map(taskCard).join('');
  bindCommon(box);
}

// ---------- DETAIL TUGAS ----------
function openDetail(id) {
  const t = S.tugas.find(x => x.id === id);
  if (!t) return;
  const p = progres(t), d = dueLabel(t), logs = logsOf(id), files = filesOf(id);
  openSheet(`
    ${sheetHead('Detail tugas')}
    <h3 class="detail-title">${esc(t.judul)}</h3>
    <div class="task-pills" style="margin-top:0">
      <span class="pill ${ST_CLASS[t.status]}"><i></i>${t.status}</span>
      <span class="pill ${PR_CLASS[t.prioritas] || 'pr-sedang'}">${esc(t.prioritas)}</span>
      <span class="pill pill-soft">${esc(t.jenis)}</span>
      ${isLate(t) ? '<span class="pill pill-late">Terlambat</span>' : ''}
    </div>
    <div class="big-progress"><b class="num">${p}%</b><div class="bar ${p === 100 ? 'done' : ''}"><i style="width:${p}%"></i></div></div>
    <div class="kv"><span class="muted">Paket</span><span>${esc(t.paket) || '—'}</span></div>
    <div class="kv"><span class="muted">Kategori</span><span>${esc(t.kategori) || '—'}</span></div>
    <div class="kv"><span class="muted">Mulai</span><span>${fmtTgl(t.mulai)}</span></div>
    <div class="kv"><span class="muted">Tenggat</span><span class="due ${d.cls}">${t.tenggat ? fmtTgl(t.tenggat) : '—'}${t.status !== 'Selesai' && t.tenggat ? '<br><small>' + esc(d.txt.split(' · ')[0]) + '</small>' : ''}</span></div>
    ${t.status === 'Selesai' ? `<div class="kv"><span class="muted">Selesai</span><span>${fmtTgl(t.selesai)}</span></div>` : ''}
    ${t.catatan ? `<div class="kv" style="display:block"><span class="muted" style="display:block;margin-bottom:4px">Catatan</span><span style="font-weight:500;white-space:pre-wrap;text-align:left">${esc(t.catatan)}</span></div>` : ''}

    <div class="quick-actions">
      <button class="qa" id="dLog">${ICON.pen}Catat progres</button>
      <label class="qa blue">${ICON.cam}Foto<input type="file" accept="image/*" capture="environment" id="dCam"></label>
      <label class="qa blue">${ICON.clip}File<input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.dwg" id="dFile"></label>
    </div>

    <div class="sec-title"><span>Data dukung (${files.length})</span>${t.folder ? `<a class="link" href="${esc(t.folder)}" target="_blank" rel="noopener">Buka folder</a>` : ''}</div>
    <div class="files" id="dFiles">${files.length ? files.map(fileCard).join('') : ''}</div>
    ${files.length ? '' : '<p class="muted" style="font-size:13px;margin:0" id="dNoFile">Belum ada. Unggah foto lapangan, BA, atau dokumen pendukung.</p>'}

    <div class="sec-title"><span>Log progres (${logs.length})</span></div>
    ${logs.length ? `<div class="timeline">${logs.map(l => `
      <div class="tl"><div class="tl-head"><span>${labelHari(l.tanggal)} · ${l.progres}%${l.pending ? '<span class="badge-pending">antre</span>' : ''}</span>
        ${l.pending ? '' : `<button class="x-btn" data-dellog="${esc(l.id)}" aria-label="Hapus log">${ICON.close}</button>`}</div>
        <p>${esc(l.catatan)}</p></div>`).join('')}</div>`
      : '<p class="muted" style="font-size:13px;margin:0">Belum ada catatan progres.</p>'}

    <div class="btn-row" style="grid-template-columns:auto 1fr 1fr;margin-top:22px">
      <button class="btn btn-danger" id="dDel" aria-label="Hapus tugas">${ICON.trash}</button>
      <button class="btn btn-ghost" id="dEdit">Ubah</button>
      ${t.status !== 'Selesai' ? `<button class="btn btn-primary" id="dDone">${ICON.check} Selesai</button>` : `<button class="btn btn-ghost" id="dReopen">Buka lagi</button>`}
    </div>`, root => {
    $('#dEdit', root).onclick = () => { closeSheet(true); setTimeout(() => openForm(t), 260); };
    $('#dLog', root).onclick = () => { closeSheet(true); setTimeout(() => openLogForm(t), 260); };
    const done = $('#dDone', root);
    if (done) done.onclick = () => { closeSheet(true); setTimeout(() => openLogForm(t, true), 260); };
    const reopen = $('#dReopen', root);
    if (reopen) reopen.onclick = () => simpanTugas({ ...t, status: 'Proses', progres: 90 }, 'Tugas dibuka kembali');
    $('#dDel', root).onclick = async () => {
      if (isPending(t.id)) return toast('Tunggu tugas ini terkirim dulu', 'err');
      const ok = await confirmDialog('Hapus tugas ini?', `"${t.judul}" beserta log progresnya akan dihapus dari spreadsheet. File di Google Drive tetap aman.`, 'Ya, hapus');
      if (!ok) return;
      try {
        await api('hapusTugas', { id: t.id });
        S.tugas = S.tugas.filter(x => x.id !== t.id); S.log = S.log.filter(l => l.idTugas !== t.id); S.file = S.file.filter(f => f.idTugas !== t.id);
        saveCache(); closeSheet(); render(); toast('Tugas dihapus', 'ok');
      } catch (e) { toast(e.network ? 'Butuh internet untuk menghapus' : e.message, 'err'); }
    };
    $$('[data-dellog]', root).forEach(b => b.onclick = async () => {
      const ok = await confirmDialog('Hapus log ini?', 'Catatan progres ini akan dihapus. Progres tugas tidak berubah.', 'Hapus');
      if (!ok) return;
      try {
        await api('hapusLog', { id: b.dataset.dellog });
        S.log = S.log.filter(l => l.id !== b.dataset.dellog); saveCache(); openDetail(t.id); toast('Log dihapus', 'ok');
      } catch (e) { toast(e.network ? 'Butuh internet untuk menghapus' : e.message, 'err'); }
    });
    bindFileCards(root, t);
    const onPick = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) unggah(t, fs); };
    $('#dCam', root).onchange = onPick;
    $('#dFile', root).onchange = onPick;
  });
}

function fileCard(f) {
  const isImg = /^image\//.test(f.tipe);
  const ext = (f.nama.split('.').pop() || 'file').toUpperCase().slice(0, 4);
  return `<a class="fcard" href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.nama)}">
    ${isImg && f.fileId ? `<img loading="lazy" alt="" src="https://drive.google.com/thumbnail?id=${encodeURIComponent(f.fileId)}&sz=w300" onerror="this.remove()">` : ''}
    <div class="ficon" style="${isImg && f.fileId ? 'z-index:-1' : ''}">${ICON.doc}<b>${esc(ext)}</b><span>${esc(f.nama)}</span></div>
    <button class="x-btn" data-delfile="${esc(f.id)}" aria-label="Hapus file">${ICON.close}</button></a>`;
}
function bindFileCards(root, t) {
  $$('[data-delfile]', root).forEach(b => b.onclick = async e => {
    e.preventDefault(); e.stopPropagation();
    const f = S.file.find(x => x.id === b.dataset.delfile);
    const ok = await confirmDialog('Hapus data dukung?', `"${f ? f.nama : ''}" akan dipindah ke Sampah Google Drive (bisa dipulihkan 30 hari).`, 'Hapus');
    if (!ok) return;
    try {
      await api('hapusFile', { id: b.dataset.delfile });
      S.file = S.file.filter(x => x.id !== b.dataset.delfile); saveCache(); openDetail(t.id); toast('File dihapus', 'ok');
    } catch (err) { toast(err.network ? 'Butuh internet untuk menghapus' : err.message, 'err'); }
  });
}

// ---------- Unggah data dukung ----------
async function kompresGambar(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1920, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
    if (!blob) throw new Error('kompres gagal');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
const keBase64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

async function siapkan(file) {
  if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size > 300 * 1024) {
    try { const b = await kompresGambar(file); return { nama: file.name.replace(/\.[^.]+$/, '') + '.jpg', tipe: 'image/jpeg', blob: b }; } catch (e) { /* kirim asli */ }
  }
  if (file.size > MAKS_FILE) throw new Error(`"${file.name}" lebih dari 20 MB`);
  return { nama: file.name || 'file', tipe: file.type || 'application/octet-stream', blob: file };
}

async function unggah(t, files) {
  if (isPending(t.id)) return toast('Tunggu tugas ini terkirim ke server dulu', 'err');
  if (!navigator.onLine) return toast('Butuh internet untuk mengunggah', 'err');
  const box = $('#dFiles');
  const nf = $('#dNoFile'); if (nf) nf.remove();
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    const ph = document.createElement('div');
    ph.className = 'fcard uploading';
    ph.innerHTML = `<div class="ficon"><span class="spinner" style="border-color:#bae6fd;border-top-color:#0891b2;width:22px;height:22px;border-width:3px;border-style:solid;border-radius:50%;animation:spin .7s linear infinite"></span><span>${i + 1}/${files.length}</span></div>`;
    if (box) box.prepend(ph);
    try {
      const p = await siapkan(files[i]);
      const b64 = await keBase64(p.blob);
      const r = await api('unggahFile', { idTugas: t.id, nama: p.nama, tipe: p.tipe, base64: b64 }, S.cfg, 180000);
      S.file.push(r);
      const tt = S.tugas.find(x => x.id === t.id); if (tt && r.folder) tt.folder = r.folder;
      ok++;
    } catch (e) {
      toast('Gagal unggah: ' + e.message, 'err');
    } finally { ph.remove(); }
  }
  saveCache();
  if (ok) toast(`${ok} file terunggah ke Drive`, 'ok');
  if (sheetOpen) openDetail(t.id);
  render();
}

// ---------- FORM TUGAS ----------
function sheetHead(title) {
  return `<div class="sheet-grip"></div><div class="sheet-head"><h2>${title}</h2><button class="close-btn" data-close aria-label="Tutup">${ICON.close}</button></div>`;
}
const chipRow = (list, val, attr) => list.map(v => `<button type="button" class="chip ${val === v ? 'active' : ''}" data-${attr}="${esc(v)}">${esc(v)}</button>`).join('');

function openForm(edit) {
  const f = edit ? { ...edit } : {
    judul: '', paket: S.pref.lastPaket || '', jenis: S.pref.lastJenis || 'Teknis', kategori: '', status: 'Belum Mulai',
    prioritas: 'Sedang', mulai: todayStr(), tenggat: '', progres: 0, catatan: ''
  };
  const paketList = daftarPaket();
  const katList = f.kategori && !S.settings.kategori.includes(f.kategori) ? [...S.settings.kategori, f.kategori] : S.settings.kategori;
  openSheet(`
    ${sheetHead(edit ? 'Ubah tugas' : 'Tugas baru')}
    <form id="tForm" novalidate>
      <label class="field"><span>Judul pekerjaan *</span>
        <input id="fJudul" maxlength="200" placeholder="Mis. Cek progres pembesian kolom lt. 2" value="${esc(f.judul)}"></label>
      <p class="form-err" id="errJudul" style="margin-top:-10px"></p>

      <div class="seg" data-v="${f.jenis === 'Non Teknis' ? 'pemasukan' : 'pengeluaran'}" id="fJenis">
        <span class="seg-ind"></span>
        <button type="button" data-v="Teknis" style="${f.jenis === 'Teknis' ? 'color:var(--pri)' : ''}">Teknis</button>
        <button type="button" data-v="Non Teknis" style="${f.jenis === 'Non Teknis' ? 'color:var(--pri)' : ''}">Non Teknis</button>
      </div>

      <div class="lbl"><span>Paket</span></div>
      <div class="chip-grid" id="fPaket" style="margin-bottom:14px">${chipRow(paketList, f.paket, 'pk')}</div>

      <div class="lbl"><span>Kategori</span></div>
      <div class="chip-grid" id="fKat" style="margin-bottom:14px">${chipRow(katList, f.kategori, 'kt')}</div>

      <div class="lbl"><span>Status</span></div>
      <div class="chips" id="fSt">${chipRow(STATUS, f.status, 'st')}</div>

      <div class="lbl"><span>Prioritas</span></div>
      <div class="chips" id="fPr">${chipRow(PRIO, f.prioritas, 'pr')}</div>

      <div class="row2">
        <label class="field"><span>Mulai</span><input type="date" id="fMulai" value="${f.mulai || ''}"></label>
        <label class="field"><span>Tenggat</span><input type="date" id="fTenggat" value="${f.tenggat || ''}"></label>
      </div>
      <p class="form-err" id="errTgl" style="margin-top:-10px"></p>

      <div class="lbl"><span>Progres</span></div>
      <div class="range-row"><input type="range" id="fProg" min="0" max="100" step="5" value="${progres(f)}"><b class="num" id="fProgV">${progres(f)}%</b></div>

      <label class="field"><span>Catatan / uraian (opsional)</span><textarea id="fCat" class="textarea-lg" maxlength="2000" placeholder="Lingkup, lokasi, pihak terkait…">${esc(f.catatan)}</textarea></label>
      <button class="btn btn-primary btn-block" type="submit">${edit ? 'Simpan perubahan' : 'Simpan tugas'}</button>
    </form>`, root => {
    const pick = (boxSel, attr, key, toggle) => $$(`[data-${attr}]`, root).forEach(b => b.onclick = () => {
      f[key] = toggle && f[key] === b.dataset[attr] ? '' : b.dataset[attr];
      $$(`[data-${attr}]`, root).forEach(x => x.classList.toggle('active', x.dataset[attr] === f[key]));
      if (key === 'status') syncProg();
    });
    pick('#fPaket', 'pk', 'paket', true); pick('#fKat', 'kt', 'kategori', true); pick('#fSt', 'st', 'status'); pick('#fPr', 'pr', 'prioritas');
    const seg = $('#fJenis', root);
    $$('button', seg).forEach(b => b.onclick = () => {
      f.jenis = b.dataset.v; seg.dataset.v = f.jenis === 'Non Teknis' ? 'pemasukan' : 'pengeluaran';
      $$('button', seg).forEach(x => x.style.color = x.dataset.v === f.jenis ? 'var(--pri)' : '');
    });
    const prog = $('#fProg', root), progV = $('#fProgV', root);
    const syncProg = () => {
      if (f.status === 'Selesai') prog.value = 100;
      progV.textContent = prog.value + '%';
    };
    prog.oninput = () => {
      progV.textContent = prog.value + '%';
      if (+prog.value === 100 && f.status !== 'Selesai') { f.status = 'Selesai'; $$('[data-st]', root).forEach(x => x.classList.toggle('active', x.dataset.st === 'Selesai')); }
      else if (+prog.value > 0 && +prog.value < 100 && (f.status === 'Belum Mulai' || f.status === 'Selesai')) { f.status = 'Proses'; $$('[data-st]', root).forEach(x => x.classList.toggle('active', x.dataset.st === 'Proses')); }
    };
    $('#fJudul', root).oninput = () => { $('#errJudul', root).textContent = ''; };
    $('#tForm', root).onsubmit = e => {
      e.preventDefault();
      f.judul = $('#fJudul', root).value.trim();
      f.mulai = $('#fMulai', root).value; f.tenggat = $('#fTenggat', root).value;
      f.progres = +prog.value; f.catatan = $('#fCat', root).value.trim();
      let ok = true;
      $('#errJudul', root).textContent = ''; $('#errTgl', root).textContent = '';
      if (!f.judul) { $('#errJudul', root).textContent = 'Judul pekerjaan wajib diisi'; $('#fJudul', root).focus(); ok = false; }
      if (f.mulai && f.tenggat && f.tenggat < f.mulai) { $('#errTgl', root).textContent = 'Tenggat tidak boleh sebelum tanggal mulai'; ok = false; }
      if (!ok) { if (navigator.vibrate) navigator.vibrate(30); return; }
      if (!edit) { S.pref.lastPaket = f.paket; S.pref.lastJenis = f.jenis; store(LS.pref, S.pref); }
      simpanTugas(edit ? f : { ...f, id: uid('TG'), dibuat: Date.now() }, edit ? 'Perubahan tersimpan' : 'Tugas tersimpan');
    };
    if (!edit) setTimeout(() => $('#fJudul', root).focus(), 320);
  });
}

function simpanTugas(t, pesan) {
  const data = { id: t.id, judul: t.judul, paket: t.paket, jenis: t.jenis, kategori: t.kategori, status: t.status, prioritas: t.prioritas, mulai: t.mulai, tenggat: t.tenggat, progres: t.status === 'Selesai' ? 100 : t.progres, catatan: t.catatan };
  const i = S.tugas.findIndex(x => x.id === t.id);
  const lokal = { ...(i >= 0 ? S.tugas[i] : {}), ...data, diubah: Date.now() };
  if (lokal.status === 'Selesai' && !lokal.selesai) lokal.selesai = todayStr();
  if (lokal.status !== 'Selesai') lokal.selesai = '';
  if (i >= 0) S.tugas[i] = lokal; else S.tugas.push({ ...lokal, dibuat: t.dibuat || Date.now(), folder: '' });
  closeSheet(); render();
  toast(pesan, 'ok', 1800);
  antre('simpanTugas', data);
}

// ---------- FORM LOG PROGRES ----------
function openLogForm(t, tandaiSelesai) {
  const f = { tanggal: todayStr(), progres: tandaiSelesai ? 100 : progres(t), status: tandaiSelesai ? 'Selesai' : (t.status === 'Belum Mulai' ? 'Proses' : t.status), catatan: '' };
  openSheet(`
    ${sheetHead(tandaiSelesai ? 'Tandai selesai' : 'Catat progres')}
    <p class="muted" style="margin:-6px 0 14px;font-size:13.5px">${esc(t.judul)}</p>
    <form id="lForm" novalidate>
      <div class="lbl"><span>Progres sekarang</span></div>
      <div class="range-row"><input type="range" id="lProg" min="0" max="100" step="5" value="${f.progres}"><b class="num" id="lProgV">${f.progres}%</b></div>
      <div class="lbl"><span>Status</span></div>
      <div class="chips" id="lSt">${chipRow(STATUS, f.status, 'st')}</div>
      <div class="lbl"><span>Tanggal</span></div>
      <div class="date-row">
        <button type="button" class="chip" data-d="${todayStr()}">Hari ini</button>
        <button type="button" class="chip" data-d="${ymd(addDays(today(), -1))}">Kemarin</button>
        <input type="date" id="lTgl" value="${f.tanggal}" max="${todayStr()}">
      </div>
      <label class="field"><span>Apa yang dikerjakan? *</span>
        <textarea id="lCat" class="textarea-lg" maxlength="1000" placeholder="${tandaiSelesai ? 'Mis. BA serah terima ditandatangani, dokumen diserahkan ke PPK' : 'Mis. Cek lapangan: pengecoran plat lt. 2 selesai 80%, kendala material besi'}"></textarea></label>
      <p class="form-err" id="errCat" style="margin-top:-10px"></p>
      <button class="btn btn-primary btn-block" type="submit">Simpan</button>
      <p class="muted" style="font-size:12px;text-align:center;margin:10px 0 0">Foto/dokumen bisa diunggah dari halaman detail tugas.</p>
    </form>`, root => {
    const prog = $('#lProg', root), tgl = $('#lTgl', root);
    const setSt = s => { f.status = s; $$('[data-st]', root).forEach(x => x.classList.toggle('active', x.dataset.st === s)); };
    prog.oninput = () => {
      $('#lProgV', root).textContent = prog.value + '%';
      if (+prog.value === 100) setSt('Selesai'); else if (f.status === 'Selesai' || (f.status === 'Belum Mulai' && +prog.value > 0)) setSt('Proses');
    };
    $$('[data-st]', root).forEach(b => b.onclick = () => { setSt(b.dataset.st); if (b.dataset.st === 'Selesai') { prog.value = 100; $('#lProgV', root).textContent = '100%'; } });
    const syncD = () => $$('[data-d]', root).forEach(b => b.classList.toggle('active', b.dataset.d === tgl.value));
    $$('[data-d]', root).forEach(b => b.onclick = () => { tgl.value = b.dataset.d; syncD(); });
    tgl.onchange = syncD; syncD();
    $('#lCat', root).oninput = () => { $('#errCat', root).textContent = ''; };
    $('#lForm', root).onsubmit = e => {
      e.preventDefault();
      f.catatan = $('#lCat', root).value.trim(); f.tanggal = tgl.value; f.progres = +prog.value;
      if (!f.catatan) { $('#errCat', root).textContent = 'Tulis singkat apa yang dikerjakan'; $('#lCat', root).focus(); return; }
      if (!f.tanggal) return toast('Tanggal wajib diisi', 'err');
      const data = { id: uid('LG'), idTugas: t.id, tanggal: f.tanggal, progres: f.status === 'Selesai' ? 100 : f.progres, status: f.status, catatan: f.catatan };
      S.log.push({ ...data, judulTugas: t.judul, dibuat: Date.now(), pending: true });
      const tt = S.tugas.find(x => x.id === t.id);
      Object.assign(tt, { progres: data.progres, status: f.status, diubah: Date.now(), selesai: f.status === 'Selesai' ? (tt.selesai || f.tanggal) : '' });
      closeSheet(true);
      toast(f.status === 'Selesai' ? 'Tugas ditandai selesai 🎉' : 'Progres tercatat', 'ok', 1800);
      antre('tambahLog', data);
      setTimeout(() => openDetail(t.id), 280);
      render();
    };
    setTimeout(() => $('#lCat', root).focus(), 320);
  });
}

// ---------- LAPORAN ----------
function rangeLaporan() {
  const t = today(), L = S.lap;
  if (L.periode === 'bulan') return { from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: ymd(new Date(t.getFullYear(), t.getMonth() + 1, 0)), label: `Bulan ${BULAN[t.getMonth()]} ${t.getFullYear()}` };
  if (L.periode === 'lalu') { const a = new Date(t.getFullYear(), t.getMonth() - 1, 1); return { from: ymd(a), to: ymd(new Date(t.getFullYear(), t.getMonth(), 0)), label: `Bulan ${BULAN[a.getMonth()]} ${a.getFullYear()}` }; }
  if (L.periode === 'minggu') { const dow = (t.getDay() + 6) % 7; const a = addDays(t, -dow), b = addDays(a, 6); return { from: ymd(a), to: ymd(b), label: `Minggu ${fmtTglPanjang(ymd(a))} – ${fmtTglPanjang(ymd(b))}` }; }
  if (L.periode === 'custom' && L.from && L.to) { const [a, b] = L.from <= L.to ? [L.from, L.to] : [L.to, L.from]; return { from: a, to: b, label: `${fmtTglPanjang(a)} – ${fmtTglPanjang(b)}` }; }
  return { from: '0000-01-01', to: '9999-12-31', label: 'Semua waktu' };
}
function dataLaporan() {
  const r = rangeLaporan(), L = S.lap;
  const tugas = S.tugas.filter(t => {
    if (L.paket && t.paket !== L.paket) return false;
    const mulaiOk = !t.mulai || t.mulai <= r.to;
    const belumTutup = t.status !== 'Selesai' || !t.selesai || t.selesai >= r.from;
    const adaLog = S.log.some(l => l.idTugas === t.id && l.tanggal >= r.from && l.tanggal <= r.to);
    return (mulaiOk && belumTutup) || adaLog;
  });
  const grup = {};
  tugas.forEach(t => (grup[t.paket || 'Tanpa paket'] = grup[t.paket || 'Tanpa paket'] || []).push(t));
  Object.values(grup).forEach(ls => ls.sort((a, b) => STATUS.indexOf(b.status) - STATUS.indexOf(a.status) || (a.tenggat || '9').localeCompare(b.tenggat || '9')));
  const logPer = id => S.log.filter(l => l.idTugas === id && l.tanggal >= r.from && l.tanggal <= r.to).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const ringkas = {
    total: tugas.length,
    selesai: tugas.filter(t => t.status === 'Selesai').length,
    proses: tugas.filter(t => t.status === 'Proses').length,
    tertunda: tugas.filter(t => t.status === 'Tertunda').length,
    belum: tugas.filter(t => t.status === 'Belum Mulai').length,
    late: tugas.filter(isLate).length,
    avg: Math.round(avg(tugas.map(progres)))
  };
  return { r, grup, logPer, ringkas };
}
function renderLaporan() {
  const el = $('#view-laporan');
  if (!S.loaded) { el.innerHTML = skeleton(); return; }
  const L = S.lap, D = dataLaporan();
  const opsi = [['minggu', 'Minggu ini'], ['bulan', 'Bulan ini'], ['lalu', 'Bulan lalu'], ['custom', 'Pilih tanggal'], ['semua', 'Semua']];
  el.innerHTML = `
    <div class="card">
      <label class="field"><span>Paket</span><select id="lpPaket"><option value="">Semua paket</option>${daftarPaket().map(p => `<option ${L.paket === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
      <div class="lbl"><span>Periode</span></div>
      <div class="chips">${opsi.map(([k, l]) => `<button class="chip ${L.periode === k ? 'active' : ''}" data-per="${k}">${l}</button>`).join('')}</div>
      ${L.periode === 'custom' ? `<div class="row2"><label class="field"><span>Dari</span><input type="date" id="lpFrom" value="${L.from}"></label><label class="field"><span>Sampai</span><input type="date" id="lpTo" value="${L.to}"></label></div>` : ''}
    </div>
    <div class="card">
      <div class="rep-head"><b>Laporan Kemajuan Pekerjaan</b><div class="muted" style="font-size:13px">${esc(L.paket || 'Semua paket')} · ${esc(D.r.label)}</div></div>
      <div class="rep-tiles">
        <div><b>${D.ringkas.total}</b><small>Tugas</small></div>
        <div><b style="color:#15803d">${D.ringkas.selesai}</b><small>Selesai</small></div>
        <div><b style="color:#0284c7">${D.ringkas.proses}</b><small>Proses</small></div>
        <div><b style="color:#b45309">${D.ringkas.tertunda + D.ringkas.belum}</b><small>Tertunda/belum</small></div>
        <div><b style="color:#dc2626">${D.ringkas.late}</b><small>Terlambat</small></div>
        <div><b>${D.ringkas.avg}%</b><small>Rata-rata</small></div>
      </div>
      ${D.ringkas.total ? Object.entries(D.grup).map(([p, ls]) => `
        <p class="section-label" style="margin:14px 2px 6px">${esc(p)}</p>
        ${ls.map(t => `<button class="att" style="width:100%;text-align:left" data-open="${esc(t.id)}"><div class="att-dot">${progres(t)}%</div>
          <div style="min-width:0"><b>${esc(t.judul)}</b><span>${t.status}${D.logPer(t.id).length ? ' · ' + D.logPer(t.id).length + ' log' : ''}${filesOf(t.id).length ? ' · ' + filesOf(t.id).length + ' file' : ''}</span></div></button>`).join('')}`).join('')
        : emptyState('Tidak ada tugas di periode ini', 'Ubah paket atau periode laporan.', false)}
    </div>
    <div class="btn-row" style="margin-top:0">
      <button class="btn btn-ghost" id="lpShare">Bagikan ringkasan</button>
      <button class="btn btn-primary" id="lpPrint" ${D.ringkas.total ? '' : 'disabled'}>Cetak / PDF</button>
    </div>
    <p class="muted" style="font-size:12px;text-align:center;margin-top:10px">Di layar cetak, pilih printer <b>"Simpan sebagai PDF"</b> untuk mendapatkan file PDF.</p>`;
  bindCommon(el);
  $('#lpPaket', el).onchange = e => { L.paket = e.target.value; renderLaporan(); };
  $$('[data-per]', el).forEach(b => b.onclick = () => {
    L.periode = b.dataset.per;
    if (L.periode === 'custom' && !L.from) { L.from = ymd(new Date(today().getFullYear(), today().getMonth(), 1)); L.to = todayStr(); }
    renderLaporan();
  });
  const fr = $('#lpFrom', el), to = $('#lpTo', el);
  if (fr) fr.onchange = e => { L.from = e.target.value; renderLaporan(); };
  if (to) to.onchange = e => { L.to = e.target.value; renderLaporan(); };
  $('#lpPrint', el).onclick = cetakLaporan;
  $('#lpShare', el).onclick = bagikanRingkasan;
}

function cetakLaporan() {
  const D = dataLaporan(), L = S.lap, P = S.pref;
  let no = 0;
  const html = `
    <div class="kop"><h1>LAPORAN KEMAJUAN PEKERJAAN</h1><p>${esc(P.instansi)}</p>
      <p><b>${esc(L.paket || 'Semua paket')}</b> · Periode: ${esc(D.r.label)}</p></div>
    <div class="ringkas"><span>Jumlah tugas: <b>${D.ringkas.total}</b></span><span>Selesai: <b>${D.ringkas.selesai}</b></span>
      <span>Proses: <b>${D.ringkas.proses}</b></span><span>Tertunda: <b>${D.ringkas.tertunda}</b></span><span>Belum mulai: <b>${D.ringkas.belum}</b></span>
      <span>Terlambat: <b>${D.ringkas.late}</b></span><span>Rata-rata progres: <b>${D.ringkas.avg}%</b></span></div>
    ${Object.entries(D.grup).map(([p, ls]) => `
      <h2>${esc(p)}</h2>
      <table><thead><tr><th style="width:24px">No</th><th>Pekerjaan</th><th style="width:70px">Status</th><th style="width:44px">Prog.</th><th style="width:70px">Tenggat</th><th>Kegiatan dalam periode</th><th style="width:50px">Data dukung</th></tr></thead>
      <tbody>${ls.map(t => { no++; const lg = D.logPer(t.id); const fl = filesOf(t.id); return `<tr>
        <td>${no}</td><td><b>${esc(t.judul)}</b><br><small>${esc(t.jenis)}${t.kategori ? ' · ' + esc(t.kategori) : ''}</small>${t.catatan ? `<br><small>${esc(t.catatan).slice(0, 200)}</small>` : ''}</td>
        <td>${t.status}${isLate(t) ? '<br><small>(terlambat)</small>' : ''}</td><td>${progres(t)}%</td><td>${t.tenggat ? fmtTgl(t.tenggat) : '—'}</td>
        <td>${lg.length ? `<ul>${lg.map(l => `<li>${fmtTgl(l.tanggal)} (${l.progres}%): ${esc(l.catatan)}</li>`).join('')}</ul>` : '—'}</td>
        <td>${fl.length ? fl.length + ' file' + (t.folder ? `<br><small><a href="${esc(t.folder)}">folder</a></small>` : '') : '—'}</td></tr>`; }).join('')}</tbody></table>`).join('')}
    <div class="ttd"><p>Jayapura, ${fmtTglPanjang(todayStr())}</p><p>${esc(P.jabatan || '')}</p><div class="sp"></div><p><b><u>${esc(P.penyusun || '(nama)')}</u></b></p></div>`;
  $('#printArea').innerHTML = html;
  // Kelas 'printing' hanya berpengaruh saat mencetak (@media print), jadi aman dibiarkan aktif.
  // Tidak dilepas otomatis karena Chrome Android merender pratinjau cetak setelah print() kembali.
  document.body.classList.add('printing');
  setTimeout(() => window.print(), 60);
}

async function bagikanRingkasan() {
  const D = dataLaporan(), L = S.lap;
  const baris = [`*Laporan Kemajuan Pekerjaan*`, `${L.paket || 'Semua paket'} · ${D.r.label}`, '',
    `Total ${D.ringkas.total} tugas: ${D.ringkas.selesai} selesai, ${D.ringkas.proses} proses, ${D.ringkas.tertunda} tertunda, ${D.ringkas.belum} belum mulai. Terlambat: ${D.ringkas.late}. Rata-rata progres ${D.ringkas.avg}%.`];
  Object.entries(D.grup).forEach(([p, ls]) => {
    baris.push('', `*${p}*`);
    ls.forEach((t, i) => {
      const lg = D.logPer(t.id); const last = lg[lg.length - 1];
      baris.push(`${i + 1}. ${t.judul} — ${t.status} (${progres(t)}%)${t.tenggat && t.status !== 'Selesai' ? ', tenggat ' + fmtTgl(t.tenggat) : ''}${isLate(t) ? ' ⚠️' : ''}`);
      if (last) baris.push(`   ↳ ${fmtTgl(last.tanggal)}: ${last.catatan}`);
    });
  });
  const text = baris.join('\n');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); toast('Ringkasan disalin, tinggal tempel di WhatsApp', 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') { try { await navigator.clipboard.writeText(text); toast('Ringkasan disalin', 'ok'); } catch (_) { toast('Tidak bisa membagikan', 'err'); } }
  }
}

// ---------- PENGATURAN ----------
function renderAtur() {
  const el = $('#view-atur'), s = S.settings, P = S.pref;
  const blok = (key, judul, ph) => `
    <div class="card set-list">
      <div class="card-title">${judul} <span class="muted" style="font-size:12px">${s[key].length} item</span></div>
      <div class="chip-grid">${s[key].map((v, i) => `<span class="chip">${esc(v)}<button class="chip-x" data-del="${key}" data-i="${i}" aria-label="Hapus ${esc(v)}">×</button></span>`).join('') || '<span class="muted" style="font-size:13px">Belum ada</span>'}</div>
      <form class="add-row" data-addto="${key}"><input placeholder="${ph}" maxlength="80"><button class="btn btn-primary btn-sm" type="submit">Tambah</button></form>
    </div>`;
  el.innerHTML = `
    <p class="section-label">Daftar pilihan</p>
    ${blok('paket', 'Paket pekerjaan', 'Mis. Sekolah Rakyat IIIb - Kab. Boven Digoel')}
    ${blok('kategori', 'Kategori', 'Kategori baru…')}
    <p class="section-label">Identitas laporan</p>
    <div class="card">
      <label class="field"><span>Instansi / satker</span><input id="pInst" value="${esc(P.instansi)}"></label>
      <label class="field"><span>Disusun oleh (nama)</span><input id="pNama" value="${esc(P.penyusun)}" placeholder="Nama lengkap"></label>
      <label class="field"><span>Jabatan</span><input id="pJab" value="${esc(P.jabatan)}"></label>
      <button class="btn btn-ghost btn-block btn-sm" id="pSave">Simpan identitas</button>
    </div>
    <p class="section-label">Koneksi</p>
    <div class="card">
      <div class="kv"><span class="muted">Status</span><span>${navigator.onLine ? '🟢 Online' : '🟠 Offline'}</span></div>
      <div class="kv"><span class="muted">Sinkron terakhir</span><span>${S.lastSync ? waktuLalu(S.lastSync) : '—'}</span></div>
      <div class="kv"><span class="muted">Tugas · log · file</span><span>${S.tugas.length} · ${S.log.length} · ${S.file.length}</span></div>
      <div class="kv"><span class="muted">Menunggu dikirim</span><span>${S.queue.length}</span></div>
      <div class="btn-row">
        ${S.urlSheet ? `<a class="btn btn-ghost btn-sm" href="${esc(S.urlSheet)}" target="_blank" rel="noopener">Buka Sheet</a>` : '<span></span>'}
        ${S.urlFolder ? `<a class="btn btn-ghost btn-sm" href="${esc(S.urlFolder)}" target="_blank" rel="noopener">Folder Drive</a>` : '<span></span>'}
      </div>
      <button class="btn btn-ghost btn-block btn-sm" id="sSync" style="margin-top:10px">Sinkron sekarang</button>
      <button class="btn btn-danger btn-block btn-sm" id="sLogout" style="margin-top:10px">Putuskan perangkat ini</button>
    </div>
    <p class="muted" style="text-align:center;font-size:12px;margin-top:18px">Monitor PS v1.0 · Data di Google Sheets & Drive milikmu</p>`;
  $$('[data-addto]', el).forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const key = f.dataset.addto, v = $('input', f).value.trim();
    if (!v) return;
    if (s[key].some(x => x.toLowerCase() === v.toLowerCase())) return toast('Sudah ada', 'err');
    simpanSettings({ ...s, [key]: [...s[key], v] }, `"${v}" ditambahkan`);
  });
  $$('[data-del]', el).forEach(b => b.onclick = async () => {
    const key = b.dataset.del, i = +b.dataset.i, v = s[key][i];
    if (s[key].length <= 1) return toast('Minimal harus ada 1 item', 'err');
    const ok = await confirmDialog(`Hapus "${v}"?`, 'Tugas lama yang memakai nama ini tetap aman dan tidak berubah.', 'Hapus');
    if (ok) simpanSettings({ ...s, [key]: s[key].filter((_, j) => j !== i) }, `"${v}" dihapus`);
  });
  $('#pSave', el).onclick = () => {
    Object.assign(S.pref, { instansi: $('#pInst', el).value.trim(), penyusun: $('#pNama', el).value.trim(), jabatan: $('#pJab', el).value.trim() });
    store(LS.pref, S.pref); toast('Identitas laporan disimpan', 'ok');
  };
  $('#sSync', el).onclick = () => sync(false);
  $('#sLogout', el).onclick = async () => {
    const ok = await confirmDialog('Putuskan perangkat ini?', 'URL & token dihapus dari HP ini. Data di spreadsheet & Drive tetap aman.', 'Putuskan');
    if (!ok) return;
    [LS.cfg, LS.cache, LS.queue].forEach(k => localStorage.removeItem(k));
    location.reload();
  };
}
async function simpanSettings(baru, pesan) {
  const lama = S.settings;
  S.settings = baru; renderAtur();
  try { S.settings = await api('simpanPengaturan', baru); saveCache(); renderAtur(); toast(pesan, 'ok'); }
  catch (e) { S.settings = lama; renderAtur(); toast(e.network ? 'Butuh internet untuk mengubah pengaturan' : e.message, 'err'); }
}

// ---------- Sheet, dialog, toast ----------
let sheetOpen = false;
function openSheet(html, onMount) {
  const sh = $('#sheet');
  sh.innerHTML = html; sh.scrollTop = 0;
  requestAnimationFrame(() => { sh.classList.add('show'); $('#sheetBackdrop').classList.add('show'); });
  if (!(history.state && history.state.sheet)) history.pushState({ sheet: 1 }, '');
  sheetOpen = true;
  $$('[data-close]', sh).forEach(b => b.onclick = () => closeSheet());
  bindCommon(sh);
  if (onMount) onMount(sh);
}
function closeSheet(keepHistory) {
  if (!sheetOpen) return;
  sheetOpen = false;
  $('#sheet').classList.remove('show'); $('#sheetBackdrop').classList.remove('show');
  if (!keepHistory && history.state && history.state.sheet) history.back();
  if (document.activeElement) document.activeElement.blur();
}
window.addEventListener('popstate', () => { if (sheetOpen) { sheetOpen = false; $('#sheet').classList.remove('show'); $('#sheetBackdrop').classList.remove('show'); } });

function confirmDialog(title, text, okLabel) {
  return new Promise(res => {
    const w = $('#dialog');
    w.innerHTML = `<div class="dialog"><div class="dialog-ic">${ICON.trash}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>
      <div class="btn-row" style="margin-top:0"><button class="btn btn-ghost" data-r="0">Batal</button><button class="btn btn-danger-solid" data-r="1">${esc(okLabel)}</button></div></div>`;
    w.classList.remove('hidden');
    const done = v => { w.classList.add('hidden'); w.innerHTML = ''; res(v); };
    $$('[data-r]', w).forEach(b => b.onclick = () => done(b.dataset.r === '1'));
    w.onclick = e => { if (e.target === w) done(false); };
  });
}
function toast(msg, type = 'info', ms = 2600) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="t-ic">${type === 'ok' ? '✓' : type === 'err' ? '!' : 'i'}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
}
function setBusy(btn, busy) {
  btn.disabled = busy;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Menghubungkan…'; }
  else if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
}

// ---------- Setup & mulai ----------
function showSetup() {
  $('#setup').classList.remove('hidden'); $('#app').classList.add('hidden');
  $('#setupForm').onsubmit = async e => {
    e.preventDefault();
    const url = $('#setupUrl').value.trim(), token = $('#setupToken').value.trim();
    const err = $('#setupErr'), btn = $('#setupBtn');
    err.textContent = '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) { err.textContent = 'URL harus diawali https://script.google.com/macros/s/ dan diakhiri /exec'; return; }
    setBusy(btn, true);
    try {
      await api('ping', {}, { url, token });
      S.cfg = { url, token }; store(LS.cfg, S.cfg);
      toast('Terhubung! Memuat data…', 'ok'); startApp();
    } catch (ex) { err.textContent = ex.message; } finally { setBusy(btn, false); }
  };
}
function startApp() {
  $('#setup').classList.add('hidden'); $('#app').classList.remove('hidden');
  render(); updatePendingDot(); sync(true);
}

$$('.nav-item').forEach(b => b.onclick = () => go(b.dataset.view));
$('#fab').onclick = () => openForm();
$('#btnSync').onclick = () => sync(false);
$('#sheetBackdrop').onclick = () => closeSheet();
const setOnline = () => $('#offlineBar').classList.toggle('hidden', navigator.onLine);
window.addEventListener('online', () => { setOnline(); sync(true); });
window.addEventListener('offline', setOnline);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.cfg && Date.now() - S.lastSync > 60000) sync(true); });
setOnline();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

if (S.cfg) startApp(); else showSetup();
