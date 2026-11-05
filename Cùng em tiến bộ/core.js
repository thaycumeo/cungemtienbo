/* ===== Cùng em tiến bộ — lõi: dữ liệu, tiện ích, định tuyến ===== */
'use strict';
/* chế độ: 'real' = dùng thật (tích sao) · 'demo' = dữ liệu mẫu đầy đủ. Hai chế độ lưu ở hai khoá riêng. */
const MODE_KEY = 'gvth_cet_mode';
let MODE = 'real';
try { const q = /[?&]mode=(demo|real)/.exec(location.search); if (q) localStorage.setItem(MODE_KEY, q[1]); if (localStorage.getItem(MODE_KEY) === 'demo') MODE = 'demo'; } catch (e) { }
const KEY = MODE === 'demo' ? 'gvth_cet_demo' : 'gvth_cet_v2';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ymOf = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const monthLabel = ym => 'Tháng ' + (+ym.slice(5)) + '/' + ym.slice(0, 4);
const weekStart = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const fmtDate = ts => { const d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const DAY = 86400000;
const PALETTE = ['#7C5CFF', '#F2536B', '#1FAE95', '#3D9BEB', '#E8761E', '#E04FB0', '#9B6BFF', '#2DB36E', '#E8554B', '#2B9FD6'];
const TEAM_COLORS = ['#FF6F7D', '#4FB3FF', '#27C3A6', '#FFB92E', '#9B6BFF', '#FF7EB3', '#4CD08A', '#7C5CFF'];

/* ---------- Bé Sao: nhân vật ngôi sao của app ---------- */
function starPts(cx, cy, R, r) { let d = ''; for (let k = 0; k < 10; k++) { const a = (-90 + 36 * k) * Math.PI / 180, rr = k % 2 ? r : R; d += (k ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; }
const BESAO_PATH = starPts(50, 54, 41, 26);
function BESAO(size = 64, mood = 'happy', cls = '') {
  const ink = '#40337A', eyes = mood === 'wink'
    ? `<ellipse cx="39" cy="53" rx="4.3" ry="5.6" fill="${ink}"/><circle cx="40.6" cy="51" r="1.6" fill="#fff"/><path d="M56 54 Q60 49.5 64 54" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`
    : `<ellipse cx="39" cy="53" rx="4.3" ry="5.6" fill="${ink}"/><ellipse cx="61" cy="53" rx="4.3" ry="5.6" fill="${ink}"/><circle cx="40.6" cy="51" r="1.6" fill="#fff"/><circle cx="62.6" cy="51" r="1.6" fill="#fff"/>`;
  const mouth = mood === 'cheer'
    ? `<path d="M41 61 Q50 77 59 61 Z" fill="${ink}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M45.5 68.2 Q50 64.8 54.5 68.2 Q50 71.6 45.5 68.2Z" fill="#FF7EB3"/>`
    : `<path d="M43 62 Q50 69.5 57 62" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>`;
  return `<svg class="besao ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="${BESAO_PATH}" fill="#FFCF3D" stroke="${ink}" stroke-width="5.5" stroke-linejoin="round"/><path d="M43.5 30 Q40.5 36 42 41.5" fill="none" stroke="#FFF6CF" stroke-width="4" stroke-linecap="round"/>${eyes}<ellipse cx="30.5" cy="63" rx="5.4" ry="3.6" fill="#FF7EB3" opacity=".75"/><ellipse cx="69.5" cy="63" rx="5.4" ry="3.6" fill="#FF7EB3" opacity=".75"/>${mouth}</svg>`;
}
const colorOf = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
const givenName = n => { const p = String(n).trim().split(/\s+/); return p[p.length - 1] || ''; };
const initial = n => givenName(n).charAt(0).toUpperCase();
const avatar = (s, extra = '') => `<span class="av" style="background:${colorOf(s.name)};${extra}">${esc(initial(s.name))}</span>`;
const viSort = (a, b) => givenName(a.name).localeCompare(givenName(b.name), 'vi') || a.name.localeCompare(b.name, 'vi');

/* ---------- dữ liệu ---------- */
const DEFAULT_REWARDS = [{ t: 'Phát biểu hay', d: 1 }, { t: 'Làm bài tốt', d: 1 }, { t: 'Giúp đỡ bạn', d: 2 }, { t: 'Chăm chỉ, nề nếp tốt', d: 1 }, { t: 'Có tiến bộ rõ rệt', d: 2 }];
const DEFAULT_PENALTIES = [{ t: 'Nói chuyện riêng', d: -1 }, { t: 'Quên đồ dùng học tập', d: -1 }, { t: 'Chưa hoàn thành bài', d: -1 }];
const SAMPLE_BANK = [
  { q: 'Từ trái nghĩa với "cao" là gì?', a: 'thấp' }, { q: 'Từ trái nghĩa với "siêng năng" là gì?', a: 'lười biếng' },
  { q: 'Điền ch hay tr: …ăm chỉ', a: 'ch (chăm chỉ)' }, { q: 'Điền ch hay tr: …ường học', a: 'tr (trường học)' },
  { q: 'Tìm từ chỉ hoạt động: "Bé đang đọc sách."', a: 'đọc' }, { q: 'Từ nào chỉ sự vật: bàn, chạy, đẹp?', a: 'bàn' },
  { q: 'Từ đồng nghĩa với "chăm chỉ": cần cù hay lười biếng?', a: 'cần cù' }, { q: 'Cuối câu hỏi ta dùng dấu gì?', a: 'dấu chấm hỏi' },
  { q: 'Cuối câu kể ta dùng dấu gì?', a: 'dấu chấm' }, { q: 'Tên riêng của người và địa danh phải viết thế nào?', a: 'viết hoa' }
];
function freshState() {
  return {
    v: 2,
    settings: { school: 'Trường TH–THCS Linh Đông', teacher: 'Phạm Thị Thanh Hằng', className: 'Lớp Ba 5', grade: 3, sound: true },
    students: [], teamNames: ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'], teamLog: [], bank: [], comments: {},
    rewards: DEFAULT_REWARDS, penalties: DEFAULT_PENALTIES, round: [], absent: { day: '', ids: [] }, lastBackup: 0,
    periods: null, reports: {}, notes: {}, reportCfg: { period: 'GK1', subjects: ['Đạo đức', 'Hoạt động trải nghiệm'] }, style: null, qcfg: null, qbank: []
  };
}
let S;
function load() {
  let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
  if (MODE === 'demo') {
    try { if (raw) { const o = JSON.parse(raw); if (o.demoVer === DEMO_VER && o.rosterSig === rosterSig()) return Object.assign(freshState(), o); } } catch (e) { }
    return buildDemo();
  }
  try { if (raw) { const st = Object.assign(freshState(), JSON.parse(raw)); seedRoster(st); return st; } } catch (e) { }
  const st = freshState(); seedRoster(st); return st;
}
let _saveT;
function save() { clearTimeout(_saveT); _saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Không lưu được dữ liệu (bộ nhớ đầy?)'); } }, 150); }
function saveNow() { clearTimeout(_saveT); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
S = load(); saveNow();

/* ---------- điểm sao ---------- */
const sum = a => a.reduce((x, y) => x + y, 0);
const stuTotal = s => sum(s.log.map(l => l.d));
const stuMonth = (s, ym) => sum(s.log.filter(l => ymOf(l.ts) === ym).map(l => l.d));
const curYM = () => ymOf(Date.now());
function weeksSeries(s, n = 8) {
  const w0 = weekStart(Date.now()), out = [];
  for (let i = n - 1; i >= 0; i--) {
    const a = w0 - i * 7 * DAY, b = a + 7 * DAY;
    out.push({ a, v: sum(s.log.filter(l => l.ts >= a && l.ts < b).map(l => l.d)) });
  }
  return out;
}
function rankList(ym) {
  const arr = S.students.map(s => ({ s, v: stuMonth(s, ym) }));
  arr.sort((x, y) => y.v - x.v || viSort(x.s, y.s));
  let r = 0, prev = null;
  arr.forEach((it, i) => { if (it.v !== prev) { r = i + 1; prev = it.v; } it.rank = r; });
  return arr;
}
function teamScore(ti, ym) {
  const m = sum(S.students.filter(s => s.team === ti).map(s => stuMonth(s, ym)));
  const t = sum(S.teamLog.filter(l => l.team === ti && ymOf(l.ts) === ym).map(l => l.d));
  return { members: m, bonus: t, total: m + t };
}
function addStar(id, d, why) {
  const s = S.students.find(x => x.id === id); if (!s) return;
  s.log.push({ ts: Date.now(), d, why: why || (d > 0 ? 'Được cộng sao' : 'Bị trừ sao') });
  save(); sfx(d > 0 ? 'ding' : 'buzz');
}
function monthsWithData() {
  const set = new Set([curYM()]);
  S.students.forEach(s => s.log.forEach(l => set.add(ymOf(l.ts))));
  S.teamLog.forEach(l => set.add(ymOf(l.ts)));
  return [...set].sort().reverse();
}

/* ---------- âm thanh ---------- */
let AC;
function tone(f, t0, dur, type = 'sine', vol = .18) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
    const t = AC.currentTime + t0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + dur); o.start(t); o.stop(t + dur + .05);
  } catch (e) { }
}
function sfx(k) {
  if (!S.settings.sound) return;
  if (k === 'ding') { tone(880, 0, .25, 'triangle'); tone(1320, .08, .35, 'triangle'); }
  else if (k === 'buzz') { tone(180, 0, .3, 'sawtooth', .1); }
  else if (k === 'tick') { tone(1000, 0, .05, 'square', .06); }
  else if (k === 'flip') { tone(520, 0, .08, 'triangle', .1); }
  else if (k === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .35, 'triangle', .16)); }
  else if (k === 'ufo') { for (let i = 0; i < 6; i++) tone(300 + i * 90, i * .07, .2, 'sine', .08); }
  else if (k === 'alarm') { for (let i = 0; i < 6; i++) { tone(988, i * .5, .22, 'square', .12); tone(1319, i * .5 + .24, .22, 'square', .12); } }
}

/* ---------- giao diện chung ---------- */
let _tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('on'), 2400); }
function openModal(html, cls = '', onClose) {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'modal';
  o.innerHTML = `<div class="modal ${cls}">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) closeModal(); });
  document.body.appendChild(o); o._onClose = onClose; return o;
}
function closeModal() { const m = $('#modal'); if (m) { m._onClose && m._onClose(); m.remove(); } }
function confetti(n = 90) {
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const g = c.getContext('2d'), cols = ['#FF6B6B', '#FFC93C', '#18B7A0', '#3AA7F0', '#6C4CF1', '#FF7BAC'];
  const ps = Array.from({ length: n }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 6, vy: 2 + Math.random() * 5, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: pick(cols) }));
  let f = 0;
  (function step() {
    g.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .08; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
    if (++f < 150) requestAnimationFrame(step); else c.remove();
  })();
}
function download(name, text, mime = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const csvCell = v => { v = String(v ?? ''); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function pageHead(title, sub, right = '') { const nv = NAV.find(n => n[0] === cur); return `<div class="pg-h"><div class="pg-t">${nv ? `<span class="pg-ic" style="background:${nv[3]}">${nv[1]}</span>` : ''}<div><h2><span>${title}</span></h2>${sub ? `<p>${sub}</p>` : ''}</div></div><div class="row no-print">${right}</div></div>`; }
const teamName = i => S.teamNames[i] || ('Tổ ' + (i + 1));
function todayAbsent() { const d = new Date().toDateString(); if (S.absent.day !== d) S.absent = { day: d, ids: [] }; return S.absent.ids; }

/* ---------- định tuyến ---------- */
const V = {};            // views: V[name] = {title, render(), mount()}
const A = {};            // actions: data-a
const NAV = [
  ['home', '🏠', 'Trang chủ', '#FFF1C7'], ['students', '🧒', 'Quản lí học sinh', '#DDF0FD'], ['call', '🛸', 'Gọi tên học sinh', '#EEE9FF'],
  ['single', '🏅', 'Thi đua cá nhân', '#FFE5E3'], ['teams', '🚩', 'Thi đua theo tổ', '#FFF1C7'],
  ['clock', '⏰', 'Đồng hồ đếm ngược', '#DDF0FD'], ['progress', '📈', 'Tiến bộ & phụ huynh', '#D9F6F0'], ['report', '📋', 'Nhận xét định kì', '#FFF1C7'], ['games', '🎮', 'Trò chơi ôn tập', '#EEE9FF'], ['settings', '⚙️', 'Cài đặt & sao lưu', '#EADFC8']
];
let cur = 'home', parentPayload = null;
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('pv/')) { parentPayload = h.slice(3); document.body.classList.add('pv-mode'); renderParent(); return; }
  document.body.classList.remove('pv-mode');
  const name = h.split('/')[0] || 'home';
  cur = V[name] && name !== 'review' ? name : 'home';
  document.body.classList.remove('nav-open');
  renderNav(); draw(true);
}
function renderNav() {
  $('#nav').innerHTML = `
  <div class="brand"><div class="logo">${BESAO(44, 'happy')}</div>
  <div><b>Cùng em tiến bộ</b><small>Trợ lí giáo viên tiểu học</small></div></div>
  ${NAV.map(([k, ic, t, bg]) => `<a class="nav-i ${k === cur ? 'on' : ''}" href="#/${k}"><span class="ic" style="background:${bg}">${ic}</span>${t}</a>`).join('')}
  <div class="nav-foot"><span class="net ${navigator.onLine ? '' : 'off'}"><i></i>${navigator.onLine ? 'Đang trực tuyến' : 'Ngoại tuyến — vẫn dùng được'}</span><br>${esc(S.settings.className)} · ${S.students.length} học sinh<br><span class="modesw" role="group" aria-label="Chế độ sử dụng"><button class="${MODE === 'real' ? 'on' : ''}" data-a="setMode" data-m="real" aria-pressed="${MODE === 'real'}">⭐ Thường</button><button class="${MODE === 'demo' ? 'on demo' : ''}" data-a="setMode" data-m="demo" aria-pressed="${MODE === 'demo'}">🎬 Demo</button></span></div>`;
}
const demoBar = () => MODE === 'demo' ? `<div class="demobar no-print"><b>🎬 DEMO</b><span>Dữ liệu mẫu — không ảnh hưởng dữ liệu thật.</span><button class="btn sm" data-a="demoReset">↺ Làm mới</button><button class="btn sm p" data-a="setMode" data-m="real">Về chế độ thường</button></div>` : '';
function draw(resetScroll) {
  const v = V[cur], m = $('#main'), y = m.scrollTop || window.scrollY;
  if (resetScroll) { window._stopGame && window._stopGame(); }
  m.innerHTML = demoBar() + v.render();
  v.mount && v.mount();
  if (resetScroll) window.scrollTo(0, 0); else window.scrollTo(0, y);
  $('#topbar b').textContent = ((NAV.find(n => n[0] === cur) || [])[2] || '') + (MODE === 'demo' ? ' · DEMO' : '');
  document.body.classList.toggle('demo', MODE === 'demo');
}
function refresh() { draw(false); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const f = A[b.dataset.a]; if (f) { e.preventDefault(); f(b, e); }
});
document.addEventListener('input', e => { const b = e.target.closest('[data-in]'); if (b && A[b.dataset.in]) A[b.dataset.in](b, e); });
document.addEventListener('change', e => { const b = e.target.closest('[data-ch]'); if (b && A[b.dataset.ch]) A[b.dataset.ch](b, e); });
A.setMode = el => { const m = el.dataset.m === 'demo' ? 'demo' : 'real'; if (m === MODE) return; saveNow(); try { localStorage.setItem(MODE_KEY, m); } catch (e) { } location.reload(); };
A.demoReset = () => openModal(`<h3>Làm mới dữ liệu demo?</h3><p class="muted">Mọi chỉnh sửa trong chế độ demo sẽ được đặt lại như ban đầu. Dữ liệu thật ở chế độ thường <b>không bị ảnh hưởng</b>.</p><div class="row"><button class="btn p" data-a="demoResetOk">Làm mới</button><button class="btn ghost" data-a="closeModal">Giữ nguyên</button></div>`);
A.demoResetOk = () => { S = buildDemo(); saveNow(); closeModal(); toast('Đã làm mới dữ liệu demo'); route(); };
A.menu = () => document.body.classList.toggle('nav-open');
A.closeModal = closeModal;
window.addEventListener('hashchange', route);
window.addEventListener('online', renderNav); window.addEventListener('offline', renderNav);
