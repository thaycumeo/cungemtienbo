/* ===== Ngân hàng câu hỏi theo phân phối chương trình + Trò chơi ôn tập =====
   Câu hỏi = câu máy tự soạn theo bài (qgen.js) + câu cô thêm từ file Word/PDF (AI) hoặc nhập gói câu hỏi. */
'use strict';
const QTYPE = { mc: 'Chọn đáp án', tf: 'Đúng hay sai', fill: 'Điền vào chỗ trống', multi: 'Chọn nhiều đáp án', match: 'Ghép đôi', order: 'Sắp xếp', short: 'Trả lời ngắn' };
const QTYPES6 = ['mc', 'tf', 'fill', 'multi', 'match', 'order'];
const MON = { toan: 'Toán', tv: 'Tiếng Việt' };
const QC = () => (S.qcfg = S.qcfg || { start: '2026-09-07', mon: 'toan', week: 0, les: [] });
function weekNow() { const st = new Date(QC().start + 'T00:00:00').getTime(); return Math.max(1, Math.min(35, Math.floor((Date.now() - st) / 6048e5) + 1)); }
const curWk = () => QC().week || weekNow();
const lessonsOf = (mon, w) => PPCT.filter(l => l.mon === mon && l.tuan.includes(w));
const LES = id => PPCT.find(l => l.id === id);
const lesName = l => !l ? '' : l.on ? l.ten : (l.mon === 'toan' ? `Bài ${l.so}. ` : `Bài ${l.so}${l.hk === 2 ? ' (HK II)' : ''}: `) + l.ten;
function selLessons() { const c = QC(), all = lessonsOf(c.mon, curWk()), sel = (c.les || []).filter(id => all.some(l => l.id === id)); return sel.length ? all.filter(l => sel.includes(l.id)) : all; }
const ownFor = ids => S.qbank.filter(q => ids.includes(q.les));
const staticFor = ids => typeof QSTATIC === 'undefined' ? [] : ids.flatMap(id => (QSTATIC[id] || []).map(q => ({ ...q, les: id, src: 'soan' })));
const qsig = q => q.t + '|' + q.q + '|' + JSON.stringify(q.o || q.p || q.a);
function prepQ(q) {   // xáo thứ tự phương án mỗi lần dùng
  if (q.t !== 'mc' && q.t !== 'fill' && q.t !== 'multi') return { ...q };
  const idx = shuffle(q.o.map((_, i) => i)), o = idx.map(i => q.o[i]);
  return { ...q, o, a: q.t === 'multi' ? q.a.map(i => idx.indexOf(i)).sort((x, y) => x - y) : idx.indexOf(q.a) };
}
function questionsFor(n, types) {
  const ls = selLessons(), ids = ls.map(l => l.id), keys = [...new Set(ls.flatMap(l => l.g))], ok = q => !types || types.includes(q.t);
  const own = shuffle(ownFor(ids)).filter(ok), fixed = shuffle(staticFor(ids)).filter(ok);
  const k1 = Math.min(own.length, Math.ceil(n * .5)), k2 = Math.min(fixed.length, Math.ceil(n * .35), n - k1);
  const gen = QG.make(keys, n - k1 - k2, types).map(q => ({ ...q, les: (ls.find(l => l.g.includes(q.k)) || ls[0] || {}).id }));
  return shuffle(own.slice(0, k1).concat(fixed.slice(0, k2), gen)).slice(0, n).map(prepQ);
}
function qValid(x) {
  if (!x || typeof x !== 'object') return null;
  const t = x.t, q = String(x.q || '').replace(/\s+/g, ' ').trim(); if (!q || !QTYPE[t] || q.length > 600) return null;
  const strs = a => Array.isArray(a) && a.length && a.every(v => typeof v === 'string' || typeof v === 'number') ? a.map(v => String(v).trim()) : null;
  const exp = x.exp ? String(x.exp).trim().slice(0, 240) : undefined, out = o => (exp ? { ...o, exp } : o);
  if (t === 'mc' || t === 'fill') { const o = strs(x.o), a = +x.a; if (!o || o.some(v => !v) || o.length < 2 || o.length > 6 || new Set(o).size !== o.length || !(a >= 0 && a < o.length)) return null; return out({ t, q, o, a }); }
  if (t === 'tf') { const a = x.a === true || x.a === 'true' ? true : x.a === false || x.a === 'false' ? false : null; return a === null ? null : out({ t, q, a }); }
  if (t === 'multi') { const o = strs(x.o); if (!o || o.length < 3 || o.length > 7 || new Set(o).size !== o.length) return null; const a = Array.isArray(x.a) ? [...new Set(x.a.map(Number))].filter(i => i >= 0 && i < o.length).sort() : []; if (a.length < 1 || a.length >= o.length) return null; return out({ t, q, o, a }); }
  if (t === 'match') { const p = Array.isArray(x.p) ? x.p.filter(r => Array.isArray(r) && r.length === 2).map(r => r.map(v => String(v).trim())) : []; if (p.length < 2 || p.length > 6 || p.some(r => !r[0] || !r[1]) || new Set(p.map(r => r[0])).size !== p.length || new Set(p.map(r => r[1])).size !== p.length) return null; return out({ t, q, p }); }
  if (t === 'order') { const o = strs(x.o); if (!o || o.length < 3 || o.length > 7 || new Set(o).size !== o.length) return null; return out({ t, q, o }); }
  if (t === 'short') { const a = String(x.a ?? '').trim(); return a ? out({ t, q, a }) : null; }
  return null;
}
const qtxt = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<b class="hl">$1</b>');
function qAnswerText(q) {
  if (q.t === 'mc' || q.t === 'fill') return q.o[q.a];
  if (q.t === 'tf') return q.a ? 'Đúng' : 'Sai';
  if (q.t === 'multi') return q.a.map(i => q.o[i]).join('; ');
  if (q.t === 'match') return q.p.map(r => r[0] + ' – ' + r[1]).join('; ');
  if (q.t === 'order') return q.o.join(' → ');
  return q.a;
}
/* hiển thị tĩnh (xem trước, quản lí, in) */
function qStatic(q, i, opt = {}) {
  const L = 'ABCDEF', ans = opt.ans !== false, stem = qtxt(q.q).replace('___', '<span class="qb">……</span>');
  let b = '';
  if (q.t === 'mc' || q.t === 'fill' || q.t === 'multi') b = `<div class="qs-o">${q.o.map((o, j) => `<span class="${ans && (q.t === 'multi' ? q.a.includes(j) : j === q.a) ? 'ok' : ''}">${q.t === 'multi' ? '☐' : L[j] + '.'} ${qtxt(o)}</span>`).join('')}</div>`;
  else if (q.t === 'tf') b = `<div class="qs-o"><span class="${ans && q.a ? 'ok' : ''}">Đúng</span><span class="${ans && !q.a ? 'ok' : ''}">Sai</span></div>`;
  else if (q.t === 'match') { const r = opt.shuf ? opt.shuf : q.p.map((_, j) => j); b = `<div class="qs-m">${q.p.map((p, j) => `<span>${qtxt(p[0])}</span><span class="dash">${ans ? '⟶' : '•'}</span><span>${qtxt(q.p[ans ? j : r[j]][1])}</span>`).join('')}</div>`; }
  else if (q.t === 'order') b = `<div class="qs-o">${(ans ? q.o : opt.shuf.map(j => q.o[j])).map((o, j) => `<span>${ans ? (j + 1) + '. ' : ''}${qtxt(o)}</span>`).join('')}</div>`;
  else if (q.t === 'short' && ans) b = `<div class="qs-o"><span class="ok">${esc(q.a)}</span></div>`;
  return `<div class="qs"><div class="qs-h"><b>${i != null ? 'Câu ' + (i + 1) + '.' : ''}</b><span class="tag">${QTYPE[q.t]}</span>${opt.les ? `<span class="muted small">${esc(lesName(LES(q.les)))}</span>` : ''}${opt.tools || ''}</div><div class="qs-q">${stem}</div>${b}${ans && q.exp ? `<div class="muted small">💡 ${esc(q.exp)}</div>` : ''}</div>`;
}

/* ---------- chơi một câu (trình chiếu) ---------- */
let QS = null;
function qsNew(q) {
  let os = null; if (q.t === 'order') { do { os = shuffle(q.o.map((_, i) => i)); } while (os.every((v, i) => v === i)); }
  QS = { q, pick: null, set: [], pairs: {}, selL: null, seq: [], shown: false, res: null, rs: q.t === 'match' ? shuffle(q.p.map((_, i) => i)) : null, os };
}
const PCOL = ['#4FB3FF', '#FF7EB3', '#FFB92E', '#27C3A6', '#9B6BFF', '#FF6F7D'];
function qPlayHtml() {
  const q = QS.q, sh = QS.shown, L = 'ABCDEF';
  let stem = qtxt(q.q);
  if (q.t === 'fill') stem = stem.replace('___', `<span class="qb ${QS.pick != null ? 'fill' : ''}">${QS.pick != null ? esc(q.o[QS.pick]) : '&nbsp;?&nbsp;'}</span>`);
  let b = '';
  if (q.t === 'mc' || q.t === 'fill') b = `<div class="qo-g">${q.o.map((o, i) => `<button class="qo ${QS.pick === i ? 'sel' : ''} ${sh && i === q.a ? 'ok' : ''} ${sh && QS.pick === i && i !== q.a ? 'no' : ''}" data-a="qPick" data-i="${i}" ${sh ? 'disabled' : ''}><i>${L[i]}</i><span>${qtxt(o)}</span></button>`).join('')}</div>`;
  else if (q.t === 'tf') b = `<div class="qo-g tf">${[true, false].map(v => `<button class="qo ${QS.pick === v ? 'sel' : ''} ${sh && v === q.a ? 'ok' : ''} ${sh && QS.pick === v && v !== q.a ? 'no' : ''}" data-a="qPick" data-v="${v}" ${sh ? 'disabled' : ''}><i>${v ? '✓' : '✗'}</i><span>${v ? 'Đúng' : 'Sai'}</span></button>`).join('')}</div>`;
  else if (q.t === 'multi') b = `<div class="qo-g">${q.o.map((o, i) => { const on = QS.set.includes(i), good = q.a.includes(i); return `<button class="qo multi ${on ? 'on' : ''} ${sh && good ? 'ok' : ''} ${sh && on && !good ? 'no' : ''}" data-a="qToggle" data-i="${i}" ${sh ? 'disabled' : ''}><i>${on ? '☑' : '☐'}</i><span>${qtxt(o)}</span></button>`; }).join('')}</div>`;
  else if (q.t === 'match') {
    const leftOf = j => Object.keys(QS.pairs).find(k => QS.pairs[k] === j);
    b = `<div class="qm"><div>${q.p.map((p, i) => { const pi = QS.pairs[i]; return `<button class="qo ml ${QS.selL === i ? 'sel' : ''} ${sh ? (pi === i ? 'ok' : 'no') : ''}" style="${pi != null ? `--pc:${PCOL[i % 6]}` : ''}" data-a="qMatchL" data-i="${i}" ${sh ? 'disabled' : ''}><i>${i + 1}</i><span>${qtxt(p[0])}</span></button>`; }).join('')}</div>
      <div>${QS.rs.map(j => { const l = leftOf(j); return `<button class="qo mr" style="${l != null ? `--pc:${PCOL[l % 6]}` : ''}" data-a="qMatchR" data-j="${j}" ${sh ? 'disabled' : ''}><i>${l != null ? +l + 1 : '•'}</i><span>${qtxt(q.p[j][1])}</span></button>`; }).join('')}</div></div>
      ${sh && QS.res === false ? `<div class="qans">Đáp án: ${q.p.map((p, i) => `<b>${i + 1}</b> ${qtxt(p[0])} – ${qtxt(p[1])}`).join(' · ')}</div>` : ''}`;
  }
  else if (q.t === 'order') {
    b = `<div class="qord"><div class="qseq">${QS.seq.length ? QS.seq.map((j, k) => `<button class="qo chip-o ${sh ? (j === k ? 'ok' : 'no') : ''}" data-a="qUnseq" data-k="${k}" ${sh ? 'disabled' : ''}><i>${k + 1}</i><span>${qtxt(q.o[j])}</span></button>`).join('') : '<span class="muted">Bấm lần lượt các thẻ bên dưới theo đúng thứ tự</span>'}</div>
      <div class="qpool">${QS.os.filter(j => !QS.seq.includes(j)).map(j => `<button class="qo chip-o" data-a="qSeq" data-j="${j}" ${sh ? 'disabled' : ''}><span>${qtxt(q.o[j])}</span></button>`).join('')}</div></div>
      ${sh && QS.res === false ? `<div class="qans">Thứ tự đúng: ${q.o.map((o, i) => `<b>${i + 1}.</b> ${qtxt(o)}`).join(' ')}</div>` : ''}`;
  }
  else if (q.t === 'short') b = `<div class="qans big">${sh ? '= ' + esc(q.a) : ''}</div>`;
  const needCheck = ['multi', 'match', 'order'].includes(q.t);
  const verdict = sh && QS.res != null ? `<div class="qverdict ${QS.res ? 'ok' : 'no'}">${QS.res ? BESAO(54, 'cheer') + '<span>Chính xác!</span>' : '<span>Chưa đúng rồi, xem đáp án nhé!</span>'}</div>` : '';
  return `<div class="qplay"><div class="qtype"><span class="tag">${QTYPE[q.t]}</span>${q.les ? `<span class="muted small">${esc(lesName(LES(q.les)))}</span>` : ''}</div>
    <div class="qstem">${stem}</div>${b}${verdict}${sh && q.exp ? `<div class="muted" style="margin-top:8px">💡 ${esc(q.exp)}</div>` : ''}
    <div class="row qctl" style="justify-content:center;margin-top:16px">${needCheck && !sh ? `<button class="btn g lg" data-a="qCheck">✔ Kiểm tra</button>` : ''}${!sh ? `<button class="btn s lg" data-a="qReveal">👁️ Hiện đáp án</button>` : ''}</div></div>`;
}
function qJudge() {
  const q = QS.q;
  if (q.t === 'mc' || q.t === 'fill' || q.t === 'tf') return QS.pick === q.a;
  if (q.t === 'multi') return QS.set.slice().sort().join() === q.a.slice().sort().join();
  if (q.t === 'match') return q.p.every((_, i) => QS.pairs[i] === i);
  if (q.t === 'order') return QS.seq.length === q.o.length && QS.seq.every((j, k) => j === k);
  return null;
}
function qFinish(reveal) {
  const answered = QS.pick != null || QS.set.length || Object.keys(QS.pairs).length || QS.seq.length;
  QS.shown = true; QS.res = reveal && !answered ? null : qJudge(); clearInterval(GM.tt);
  if (QS.res === true) { sfx('ding'); confetti(50); } else if (QS.res === false) sfx('buzz');
  const box = $('#qbox'); if (box) box.innerHTML = qPlayHtml(); else refresh();
}
const qRepaint = () => { const box = $('#qbox'); if (box) box.innerHTML = qPlayHtml(); };
A.qPick = el => { if (QS.shown) return; QS.pick = el.dataset.v != null ? el.dataset.v === 'true' : +el.dataset.i; qFinish(false); };
A.qToggle = el => { const i = +el.dataset.i, k = QS.set.indexOf(i); k < 0 ? QS.set.push(i) : QS.set.splice(k, 1); sfx('flip'); qRepaint(); };
A.qMatchL = el => { QS.selL = +el.dataset.i; sfx('flip'); qRepaint(); };
A.qMatchR = el => { if (QS.selL == null) return toast('Bấm vào một ô bên trái trước'); const j = +el.dataset.j; for (const k of Object.keys(QS.pairs)) if (QS.pairs[k] === j) delete QS.pairs[k]; QS.pairs[QS.selL] = j; QS.selL = null; sfx('flip'); qRepaint(); };
A.qSeq = el => { QS.seq.push(+el.dataset.j); sfx('flip'); qRepaint(); };
A.qUnseq = el => { QS.seq.splice(+el.dataset.k, 1); qRepaint(); };
A.qCheck = () => qFinish(false);
A.qReveal = () => qFinish(true);

/* ---------- Trang trò chơi ---------- */
const GM = { game: null, src: 'bai', cards: [], open: [], moves: 0, t0: 0, tt: null, n: 0, total: 10, scores: {}, cd: 0, items: [] };
window._stopGame = () => { clearInterval(GM.tt); };
function mathQuick(n) {
  const g = S.settings.grade, items = [], seen = new Set(); let guard = 0; const types = ['add', 'sub', 'mul', 'div'];
  while (items.length < n && guard++ < 200) { const t = pick(types), r = G[t](g, 2), a = String(r.a); if (seen.has(a)) continue; seen.add(a); items.push({ t: 'short', q: r.q.replace(/\s*=\s*…$/, ''), a }); }
  return items;
}
function gameItems(n) {
  if (GM.src === 'nhanh') return mathQuick(n);
  if (GM.src === 'cu') return shuffle(S.bank.length ? S.bank : SAMPLE_BANK).slice(0, n).map(b => ({ t: 'short', q: b.q, a: b.a }));
  return questionsFor(n);
}
function memPairs(k) {
  if (GM.src !== 'bai') return gameItems(k).map(x => [x.q, x.a]);
  const out = [], used = new Set(), ok = s => s.length <= 46 && !used.has(s);
  const add = (a, b) => { if (out.length < k && ok(a) && ok(b) && a !== b) { used.add(a); used.add(b); out.push([a, b]); } };
  const ls = selLessons(), keys = [...new Set(ls.flatMap(l => l.g))];
  for (const q of shuffle(ownFor(ls.map(l => l.id)).concat(staticFor(ls.map(l => l.id))))) { if (q.t === 'match') q.p.forEach(p => add(...p)); else if ((q.t === 'mc' || q.t === 'fill') && !q.q.includes('___')) add(q.q, q.o[q.a]); else if (q.t === 'short') add(q.q, q.a); }
  for (const q of QG.make(keys, 8, ['match'])) q.p.forEach(p => add(p[0].replace(/\[\[|\]\]/g, ''), p[1]));
  for (const q of QG.make(keys, 12, ['mc'])) add(q.q.replace(/ = \?$/, '').replace(/\[\[|\]\]/g, ''), q.o[q.a]);
  return out;
}
function bankCardHtml() {
  const c = QC(), w = curWk(), all = lessonsOf(c.mon, w), sel = selLessons(), own = ownFor(sel.map(l => l.id)).length, now = weekNow();
  const wkOpts = Array.from({ length: 35 }, (_, i) => i + 1).map(i => `<option value="${i}" ${i === w ? 'selected' : ''}>Tuần ${i}${i === now ? ' (tuần này)' : ''}${i === 18 || i === 35 ? ' · ôn tập cuối kì' : i === 9 || i === 27 ? ' · ôn tập giữa kì' : ''}</option>`).join('');
  return `<div class="card qbank" style="margin-bottom:18px"><h3>📚 Ôn bài nào hôm nay?</h3>
    <div class="row" style="gap:8px">${Object.entries(MON).map(([k, n]) => `<span class="chip ${c.mon === k ? 'on' : ''}" data-a="qMon" data-v="${k}">${k === 'toan' ? '🔢' : '📖'} ${n}</span>`).join('')}
      <span class="sp"></span><button class="btn sm" data-a="qWk" data-d="-1" aria-label="Tuần trước">◀</button><select data-ch="qWkSel" style="width:auto">${wkOpts}</select><button class="btn sm" data-a="qWk" data-d="1" aria-label="Tuần sau">▶</button></div>
    <div class="row" style="gap:8px;margin-top:12px">${all.length ? all.map(l => `<span class="chip les ${sel.includes(l) && sel.length < all.length ? 'on' : ''}" data-a="qLes" data-v="${l.id}" title="${esc(l.chude || '')}">${esc(lesName(l))}</span>`).join('') : '<span class="muted">Tuần này môn này không có bài trong phân phối chương trình.</span>'}</div>
    <p class="muted small" style="margin:10px 0 0">${sel.length ? `Đang ôn: <b>${sel.length === all.length && all.length > 1 ? 'tất cả các bài của tuần ' + w : esc(sel.map(lesName).join(', '))}</b>. Câu hỏi soạn sẵn theo bài được tạo mới mỗi lần chơi${own ? `, kèm <b>${own}</b> câu cô đã thêm` : ''}.` : ''} ${sel.length < all.length ? '' : all.length > 1 ? 'Bấm vào tên bài để chỉ ôn riêng bài đó.' : ''}</p>
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn sm" data-a="qPreview">👀 Xem thử câu hỏi</button><button class="btn sm p" data-a="qAdd">➕ Thêm câu hỏi từ file Word/PDF</button><button class="btn sm" data-a="qManage">🗂️ Câu hỏi cô đã thêm (${S.qbank.length})</button></div></div>`;
}
V.games = {
  render() {
    if (GM.game === 'mem') return memHtml(); if (GM.game === 'bat') return batHtml();
    return pageHead('Trò chơi ôn tập', 'Câu hỏi bám theo bài học trong phân phối chương trình. Chiếu lên màn hình để cả lớp cùng chơi.', `<button class="btn sm" data-a="present">🖥️ Trình chiếu</button>`) + `
    <div class="row" style="gap:8px;margin-bottom:12px"><b class="small muted">Nguồn câu hỏi:</b><span class="chip ${GM.src === 'bai' ? 'on' : ''}" data-a="gmSrc" data-v="bai">📚 Theo bài học</span><span class="chip ${GM.src === 'nhanh' ? 'on' : ''}" data-a="gmSrc" data-v="nhanh">⚡ Tính nhanh</span>${S.bank.length ? `<span class="chip ${GM.src === 'cu' ? 'on' : ''}" data-a="gmSrc" data-v="cu">🗂️ Câu hỏi ngắn đã lưu (${S.bank.length})</span>` : ''}</div>
    ${GM.src === 'bai' ? bankCardHtml() : ''}
    <div class="grid g2">
      <div class="tile" style="cursor:pointer;--tc:#FFE5E3" data-a="gmStart" data-v="bat"><span class="ic">⚔️</span><b style="font-size:24px">Đối kháng giữa các tổ</b><span>Mỗi lần một câu, đủ 6 dạng: chọn đáp án, đúng/sai, điền chỗ trống, chọn nhiều, ghép đôi, sắp xếp. Tổ trả lời đúng được cộng điểm thi đua.</span></div>
      <div class="tile" style="cursor:pointer;--tc:#EEE9FF" data-a="gmStart" data-v="mem"><span class="ic">🃏</span><b style="font-size:24px">Ghép đôi trí nhớ</b><span>Lật thẻ, tìm từng cặp phù hợp trong bài đang học. Cả lớp cùng hô to!</span></div>
    </div>`;
  }
};
A.gmSrc = el => { GM.src = el.dataset.v; refresh(); };
A.gmStart = el => {
  GM.game = el.dataset.v; const ok = GM.game === 'mem' ? memNew() : batNew();
  if (!ok) { GM.game = null; return toast('Chưa có đủ câu hỏi cho lựa chọn này. Cô chọn tuần hoặc bài khác nhé.'); } refresh();
};
A.gmBack = () => { clearInterval(GM.tt); GM.game = null; refresh(); };
A.qMon = el => { const c = QC(); c.mon = el.dataset.v; c.les = []; save(); refresh(); };
A.qWk = el => { const c = QC(); c.week = Math.max(1, Math.min(35, curWk() + +el.dataset.d)); c.les = []; save(); refresh(); };
A.qWkSel = el => { const c = QC(), v = +el.value; c.week = v === weekNow() ? 0 : v; c.les = []; save(); refresh(); };
A.qLes = el => { const c = QC(), id = el.dataset.v, all = lessonsOf(c.mon, curWk()); let s = (c.les || []).filter(x => all.some(l => l.id === x)); s = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; c.les = s.length >= all.length ? [] : s; save(); refresh(); };
A.qPreview = () => {
  const qs = questionsFor(8); if (!qs.length) return toast('Chưa có câu hỏi cho bài này');
  openModal(`<h3>👀 Xem thử 8 câu hỏi</h3><p class="muted small" style="margin:4px 0 12px">Mỗi lần chơi, câu hỏi soạn sẵn theo bài được tạo mới với số liệu khác. Đáp án đúng được tô xanh.</p><div class="qs-list">${qs.map((q, i) => qStatic(q, i, { les: true })).join('')}</div><div class="row" style="margin-top:14px"><button class="btn" data-a="qPreview">🔄 Xem bộ khác</button><button class="btn ghost" data-a="closeModal">Đóng</button></div>`, 'big');
};
/* ghép đôi */
function memNew() {
  const pairs = memPairs(6); if (pairs.length < 3) return false; const cards = [];
  pairs.forEach(([a, b], i) => { cards.push({ p: i, t: a, done: false }); cards.push({ p: i, t: b, done: false }); });
  GM.cards = shuffle(cards); GM.open = []; GM.moves = 0; GM.t0 = Date.now(); clearInterval(GM.tt);
  GM.tt = setInterval(() => { const e = $('#memT'); if (e) e.textContent = Math.floor((Date.now() - GM.t0) / 1000) + ' giây'; }, 500); return true;
}
function memHtml() {
  const left = GM.cards.filter(c => !c.done).length / 2;
  return pageHead('🃏 Ghép đôi trí nhớ', `Còn ${left} cặp · <span id="memT">0 giây</span> · ${GM.moves} lượt lật`, `<button class="btn sm" data-a="memNewBtn">🔄 Ván mới</button><button class="btn sm" data-a="gmBack">← Chọn trò khác</button>`) +
    `<div class="mem">${GM.cards.map((c, i) => `<button class="mc ${c.done ? 'flip done' : GM.open.includes(i) ? 'flip' : ''}" data-a="memFlip" data-i="${i}"><div class="in"><div class="f">${BESAO(56, 'happy')}</div><div class="b ${c.t.length > 22 ? 'long' : ''}">${qtxt(c.t)}</div></div></button>`).join('')}</div>`;
}
A.memNewBtn = () => { memNew(); refresh(); };
A.memFlip = async el => {
  const i = +el.dataset.i, c = GM.cards[i]; if (c.done || GM.open.includes(i) || GM.open.length >= 2) return;
  GM.open.push(i); sfx('flip'); el.classList.add('flip');
  if (GM.open.length === 2) {
    GM.moves++; const [a, b] = GM.open.map(k => GM.cards[k]); await sleep(900);
    if (a.p === b.p) { a.done = b.done = true; sfx('ding'); }
    GM.open = []; const done = GM.cards.every(c => c.done);
    refresh(); if (done) { clearInterval(GM.tt); sfx('win'); confetti(140); toast(`Hoàn thành sau ${GM.moves} lượt lật!`); }
  }
};
/* đối kháng */
function batNew() { GM.scores = {}; GM.n = 0; GM.items = gameItems(GM.total); if (!GM.items.length) return false; qsNew(GM.items[0]); batTimer(); return true; }
function batTimer() {
  clearInterval(GM.tt); GM.cd = ['match', 'order', 'multi'].includes(QS.q.t) ? 45 : 25;
  GM.tt = setInterval(() => { GM.cd = Math.max(0, GM.cd - 1); const e = $('#batCd'); if (e) e.textContent = GM.cd; if (GM.cd <= 5 && GM.cd > 0) sfx('tick'); if (GM.cd === 0) { clearInterval(GM.tt); sfx('alarm'); } }, 1000);
}
function batBoard() { return `<div class="row" style="gap:10px;justify-content:center;margin-top:16px">${S.teamNames.map((t, i) => `<div class="card" style="padding:8px 16px;text-align:center;border-color:${TEAM_COLORS[i % 8]}"><b>${esc(t)}</b><div class="star" style="font-family:var(--font-h);font-size:30px;font-weight:800">★ ${GM.scores[i] || 0}</div></div>`).join('')}</div>`; }
function batHtml() {
  if (GM.n >= GM.items.length) {
    const best = Object.entries(GM.scores).sort((a, b) => b[1] - a[1])[0];
    return pageHead('⚔️ Kết quả', '', `<button class="btn sm" data-a="gmStart" data-v="bat">🔄 Chơi lại</button><button class="btn sm" data-a="gmBack">← Chọn trò khác</button>`) + `<div class="card empty"><div class="em">🏆</div><h2>${best && best[1] > 0 ? 'Tổ chiến thắng: ' + esc(teamName(+best[0])) : 'Hoà nhau!'}</h2><p class="muted">Điểm đã được cộng vào mục Thi đua theo tổ.</p>${batBoard()}</div>`;
  }
  return pageHead(`⚔️ Câu ${GM.n + 1}/${GM.items.length}`, '', `<span class="chip" style="font-size:20px;padding:6px 16px">⏱ <span id="batCd">${GM.cd}</span></span><button class="btn sm" data-a="batNext">Câu tiếp ➜</button><button class="btn sm" data-a="gmBack">← Chọn trò khác</button>`) + `
  <div class="card" style="padding:24px 20px"><div id="qbox">${qPlayHtml()}</div>
    <p class="muted" style="text-align:center;margin:18px 0 6px">Tổ nào trả lời đúng? (bấm để cộng 1 điểm)</p>
    <div class="row" style="justify-content:center;gap:10px">${S.teamNames.map((t, i) => `<button class="btn lg" style="background:${TEAM_COLORS[i % 8]};color:#fff" data-a="batPt" data-i="${i}">${esc(t)} +1</button>`).join('')}</div>
    ${batBoard()}</div>`;
}
A.batNext = () => { GM.n++; if (GM.n < GM.items.length) { qsNew(GM.items[GM.n]); batTimer(); } else clearInterval(GM.tt); refresh(); };
A.batPt = el => {
  const i = +el.dataset.i; GM.scores[i] = (GM.scores[i] || 0) + 1; S.teamLog.push({ ts: Date.now(), team: i, d: 1, why: 'Trò chơi ôn tập' }); save(); sfx('ding'); confetti(40);
  if (!QS.shown) { QS.shown = true; clearInterval(GM.tt); } refresh();
};

/* ---------- Quản lí câu hỏi cô đã thêm ---------- */
A.qManage = () => {
  const c = QC(), mine = S.qbank.filter(q => (LES(q.les) || {}).mon === c.mon), byL = {};
  mine.forEach(q => { (byL[q.les] = byL[q.les] || []).push(q); });
  const ids = Object.keys(byL).sort((a, b) => PPCT.indexOf(LES(a)) - PPCT.indexOf(LES(b)));
  openModal(`<h3>🗂️ Câu hỏi cô đã thêm · ${MON[c.mon]}</h3><p class="muted small" style="margin:4px 0 12px">${mine.length ? `${mine.length} câu, dùng chung với câu hỏi soạn sẵn khi chơi đúng bài đó.` : 'Chưa có câu nào. Bấm “Thêm câu hỏi từ file Word/PDF” hoặc nhập gói câu hỏi.'}</p>
    <div class="row" style="gap:8px;margin-bottom:12px"><label class="btn sm" style="cursor:pointer">📥 Nhập gói câu hỏi (.json)<input type="file" accept=".json,application/json" hidden data-ch="qImport"></label>${S.qbank.length ? `<button class="btn sm" data-a="qExport">⬇️ Tải toàn bộ câu hỏi (${S.qbank.length})</button>` : ''}</div>
    <div class="qs-list">${ids.map(id => `<h4 style="margin:14px 0 6px">${esc(lesName(LES(id)))} <span class="muted small">· tuần ${LES(id).tuan.join(', ')}</span></h4>${byL[id].map(q => qStatic(q, null, { tools: `<span class="sp"></span><button class="btn sm ghost" data-a="qDel" data-id="${q.id}" aria-label="Xoá câu này">🗑️</button>` })).join('')}`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="btn ghost" data-a="closeModal">Đóng</button></div>`, 'big');
};
A.qDel = el => { S.qbank = S.qbank.filter(q => q.id !== el.dataset.id); save(); const card = el.closest('.qs'); if (card) card.remove(); toast('Đã xoá câu hỏi'); };
A.qExport = async () => {
  const name = `ngan-hang-cau-hoi-${new Date().toISOString().slice(0, 10)}.json`, data = new TextEncoder().encode(JSON.stringify({ app: 'cung-em-tien-bo', loai: 'ngan-hang-cau-hoi', ts: Date.now(), questions: S.qbank }, null, 1));
  try { await saveFile(name, data, 'application/json'); toast('Đã tải ngân hàng câu hỏi'); } catch (e) { if (e && e.code !== 'declined') toast('Không lưu được file'); }
};
function addQuestions(list, lesId, src) {
  const have = new Set(S.qbank.map(qsig)); let n = 0;
  for (const x of list) { const v = qValid(x); if (!v) continue; const les = LES(x.les) ? x.les : lesId; if (!LES(les)) continue; const q = { id: uid(), ...v, les, src: x.src || src, ts: Date.now() }; if (have.has(qsig(q))) continue; have.add(qsig(q)); S.qbank.push(q); n++; }
  save(); return n;
}
A.qImport = async el => {
  const f = el.files[0]; el.value = ''; if (!f) return;
  try { const d = JSON.parse(await f.text()), arr = Array.isArray(d) ? d : d.questions; if (!Array.isArray(arr)) throw 0; const n = addQuestions(arr, (selLessons()[0] || {}).id, 'file'); closeModal(); toast(n ? `Đã thêm ${n} câu hỏi` : 'Không có câu hỏi mới hợp lệ trong file'); refresh(); }
  catch (e) { toast('File không đúng định dạng gói câu hỏi'); }
};

/* ---------- Cách 2: soạn câu hỏi từ file Word/PDF (AI) ---------- */
const QA = { les: '', text: '', fname: '', n: 10, types: QTYPES6.slice(), busy: false, ctl: null, res: [], err: '', msg: '', found: [] };
async function docxText(buf) {
  if (typeof DOC !== 'undefined') { try { const t = await DOC.docxText(buf); if (t && t.trim()) return t; } catch (e) { } }
  const xml = await XL.unzipText(buf, 'word/document.xml'); if (!xml) throw new Error('Không thấy nội dung trong file Word');
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}
async function pdfText(buf) {
  try { return await pdfjsText(buf); } catch (e) { if (typeof DOC !== 'undefined') return DOC.pdfText(buf); throw e; }
}
async function pdfjsText(buf) {
  const lib = await import(new URL('vendor/pdfjs/pdf.min.mjs', location.href).href);
  lib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', location.href).href;
  const doc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; let out = '';
  for (let p = 1; p <= Math.min(doc.numPages, 40); p++) { const tc = await (await doc.getPage(p)).getTextContent(); out += tc.items.map(i => (i.str || '') + (i.hasEOL ? '\n' : '')).join('') + '\n'; }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function qaLesOptions(mon) {
  const by = {}; PPCT.filter(l => l.mon === mon).forEach(l => { const w = l.tuan[0]; (by[w] = by[w] || []).push(l); });
  return Object.entries(by).map(([w, ls]) => `<optgroup label="Tuần ${w}">${ls.map(l => `<option value="${l.id}" ${l.id === QA.les ? 'selected' : ''}>${esc(lesName(l))}</option>`).join('')}</optgroup>`).join('');
}
function qaHtml() {
  const l = LES(QA.les), mon = l ? l.mon : QC().mon;
  return `<h3>➕ Thêm câu hỏi từ tài liệu của cô</h3>
  <p class="muted small" style="margin:4px 0 12px">Chọn bài, đưa file Word hoặc PDF (bài đọc, phiếu bài tập, đề ôn) rồi để AI soạn câu hỏi trắc nghiệm theo đúng nội dung tài liệu. Cô duyệt từng câu trước khi thêm vào ngân hàng.</p>
  <label class="f">Môn</label><div class="row" style="gap:8px">${Object.entries(MON).map(([k, n]) => `<span class="chip ${mon === k ? 'on' : ''}" data-a="qaMon" data-v="${k}">${n}</span>`).join('')}</div>
  <label class="f" style="margin-top:10px">Bài học</label><select data-ch="qaField" data-k="les">${qaLesOptions(mon)}</select>
  <label class="f" style="margin-top:10px">Tài liệu</label>
  <div class="row"><label class="btn sm" style="cursor:pointer">📄 Chọn file Word / PDF / TXT<input type="file" accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden data-ch="qaFile"></label><span id="qaFileInfo" class="small muted">${QA.fname ? esc(QA.fname) + ` · ${QA.text.length.toLocaleString('vi-VN')} ký tự` : 'Chưa chọn file'}</span></div>
  <textarea data-in="qaField" data-k="text" placeholder="…hoặc dán nội dung bài đọc / phiếu bài tập vào đây" style="margin-top:8px;min-height:110px">${esc(QA.text)}</textarea>
  <p class="muted small" style="margin:6px 0 0">Không có tài liệu thì AI soạn theo kiến thức của bài, không hỏi chi tiết bài đọc.</p>
  <div class="row" style="margin-top:10px;gap:14px"><div><label class="f">Số câu</label><select data-ch="qaField" data-k="n" style="width:auto">${[5, 10, 15, 20].map(n => `<option ${QA.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div style="flex:1;min-width:240px"><label class="f">Dạng câu hỏi</label><div class="row" style="gap:6px">${QTYPES6.map(t => `<span class="chip ${QA.types.includes(t) ? 'on' : ''}" data-a="qaType" data-v="${t}">${QTYPE[t]}</span>`).join('')}</div></div></div>
  <div class="row" style="margin-top:14px">${window.AI_OK ? `<button class="btn p" id="qaRun" data-a="qaRun">🤖 AI soạn câu hỏi</button>` : `<span class="small" style="color:var(--coral)">AI chỉ dùng được khi mở app trong Claude. Ở bản cài trên máy, cô gửi file cho trợ lí Claude để nhận gói câu hỏi (.json), rồi nhập ở mục “Câu hỏi cô đã thêm”.</span>`}<button class="btn ghost" data-a="closeModal">Đóng</button></div>
  ${QA.found.length ? `<div class="card t-mint" style="margin-top:12px;padding:12px 14px"><b>📋 Trong file đã có sẵn ${QA.found.length} câu trắc nghiệm kèm đáp án.</b><p class="small muted" style="margin:4px 0 8px">Cô có thể thêm thẳng vào ngân hàng mà không cần AI (dùng được cả khi không có mạng).</p><button class="btn sm g" data-a="qaFound">✔ Xem và thêm ${QA.found.length} câu có sẵn</button></div>` : ''}
  <div id="qaStatus" class="small" style="margin-top:10px;white-space:pre-line">${esc(QA.msg || QA.err)}</div><div id="qaRes">${qaResHtml()}</div>`;
}
function qaResHtml() {
  if (!QA.res.length) return '';
  return `<hr style="border:0;border-top:2px dashed var(--line);margin:14px 0"><div class="row"><b>AI đã soạn ${QA.res.length} câu</b><span class="sp"></span><span class="muted small">Bỏ chọn những câu cô không dùng</span></div>
    <div class="qs-list" style="margin-top:8px">${QA.res.map((q, i) => `<label class="qa-pick"><input type="checkbox" ${q.keep ? 'checked' : ''} data-ch="qaKeep" data-i="${i}">${qStatic(q, i)}</label>`).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn g" data-a="qaSave">✔ Thêm ${QA.res.filter(q => q.keep).length} câu vào ngân hàng</button></div>`;
}
const qaRepaint = () => { const m = $('#modal .modal'); if (m) m.innerHTML = qaHtml(); };
A.qAdd = () => { QA.les = QA.les && LES(QA.les) && LES(QA.les).mon === QC().mon ? QA.les : (selLessons()[0] || PPCT.find(l => l.mon === QC().mon)).id; QA.msg = QA.err = ''; openModal(qaHtml(), 'big'); };
A.qaMon = el => { QA.les = (PPCT.find(l => l.mon === el.dataset.v && l.tuan.includes(curWk())) || PPCT.find(l => l.mon === el.dataset.v)).id; qaRepaint(); };
A.qaField = el => { const k = el.dataset.k; QA[k] = k === 'n' ? +el.value : el.value; if (k === 'text') { const i = $('#qaFileInfo'); if (i && !QA.fname) i.textContent = QA.text ? QA.text.length.toLocaleString('vi-VN') + ' ký tự đã dán' : 'Chưa chọn file'; } };
A.qaType = el => { const t = el.dataset.v, i = QA.types.indexOf(t); if (i < 0) QA.types.push(t); else if (QA.types.length > 1) QA.types.splice(i, 1); el.classList.toggle('on', QA.types.includes(t)); };
A.qaKeep = el => { QA.res[+el.dataset.i].keep = el.checked; const b = $('[data-a="qaSave"]'); if (b) b.textContent = `✔ Thêm ${QA.res.filter(q => q.keep).length} câu vào ngân hàng`; };
A.qaFile = async el => {
  const f = el.files[0]; el.value = ''; if (!f) return; const info = $('#qaFileInfo'); if (info) info.textContent = '⏳ Đang đọc ' + f.name + '…';
  try {
    const buf = await f.arrayBuffer(), ext = (f.name.split('.').pop() || '').toLowerCase();
    let t = ext === 'docx' ? await docxText(buf) : ext === 'pdf' ? await pdfText(buf) : ext === 'txt' ? new TextDecoder().decode(buf) : null;
    if (t == null) throw new Error('Chỉ đọc được file .docx, .pdf hoặc .txt (file .doc cũ hãy lưu lại thành .docx)');
    t = t.trim(); if (t.length < 30) throw new Error(ext === 'pdf' ? 'File PDF này có vẻ là ảnh chụp nên app không đọc được chữ. Cô dán nội dung vào ô bên dưới, hoặc gửi file cho trợ lí Claude trong khung chat.' : 'File gần như không có chữ');
    QA.text = t; QA.fname = f.name; QA.err = ''; QA.msg = t.length > 12000 ? 'Tài liệu dài, AI sẽ dùng khoảng 12 000 ký tự đầu.' : '';
    QA.found = typeof DOC !== 'undefined' ? DOC.parseMCQ(t).map(qValid).filter(Boolean) : [];
    qaRepaint();
  } catch (e) { QA.fname = ''; QA.err = '⚠️ ' + (e.message || 'Không đọc được file này') + (/pdf/i.test(f.name) && !/ảnh chụp/.test(e.message || '') ? ' Cô có thể mở PDF, chọn hết chữ (Ctrl + A), sao chép rồi dán vào ô bên dưới.' : ''); qaRepaint(); }
};
function qaPrompt(l, n, types, text) {
  const D = { mc: '{"t":"mc","q":"câu hỏi","o":["phương án A","B","C","D"],"a":chỉ số đáp án đúng (0–3)}', tf: '{"t":"tf","q":"một nhận định","a":true hoặc false}', fill: '{"t":"fill","q":"câu có một chỗ trống viết là ___","o":["3–4 phương án"],"a":chỉ số đáp án đúng}', multi: '{"t":"multi","q":"Chọn tất cả …","o":["5–6 phương án"],"a":[các chỉ số đúng, ít nhất 2]}', match: '{"t":"match","q":"Nối …","p":[["vế trái","vế phải"], …3–4 cặp]}', order: '{"t":"order","q":"Sắp xếp …","o":["3–5 mục theo ĐÚNG thứ tự"]}' };
  return `Bạn là giáo viên tiểu học Việt Nam giàu kinh nghiệm. Soạn câu hỏi ôn tập môn ${MON[l.mon]} lớp 3 (bộ sách Kết nối tri thức với cuộc sống) cho bài “${lesName(l)}” (tuần ${l.tuan.join(', ')}, chủ đề: ${l.chude}).
${text ? 'Căn cứ DUY NHẤT vào TÀI LIỆU của giáo viên ở cuối. Mọi câu hỏi và đáp án phải đúng với tài liệu; không bịa tên nhân vật, sự việc, số liệu không có trong tài liệu.' : 'Không có tài liệu kèm theo: soạn theo kiến thức trọng tâm của bài trong chương trình. KHÔNG hỏi chi tiết cụ thể của bài đọc (tên nhân vật, sự việc trong bài) vì có thể sai.'}
Soạn đúng ${n} câu, chia đều các dạng sau (không dùng dạng khác):
${types.map(t => '- ' + D[t]).join('\n')}
Yêu cầu: tiếng Việt chuẩn, câu ngắn gọn, dễ hiểu với học sinh lớp 3; mỗi câu mc/fill/tf chỉ có MỘT đáp án đúng; phương án nhiễu hợp lí, không trùng nhau; không cần hình ảnh; viết số kiểu Việt Nam (1 000; 2 500). Có thể thêm "exp": lời giải thích rất ngắn.
Chỉ trả về MỘT mảng JSON gồm các đối tượng như trên.${text ? `\nTÀI LIỆU:\n"""\n${text.slice(0, 12000)}\n"""` : ''}`;
}
A.qaRun = async () => {
  if (QA.busy || !SAMPLE) return; const l = LES(QA.les); if (!l) return toast('Chọn bài học trước');
  QA.busy = true; QA.err = ''; QA.res = []; QA.ctl = new AbortController(); const b = $('#qaRun'), st = $('#qaStatus'); if (b) b.disabled = true;
  if (st) st.innerHTML = `⏳ AI đang soạn ${QA.n} câu… thường mất 20–60 giây <button class="btn sm" data-a="qaStop">Dừng</button>`;
  try {
    const arr = await SAMPLE.json(qaPrompt(l, QA.n, QA.types, QA.text.trim()), { modelTier: 'default', cache: false, signal: QA.ctl.signal });
    QA.res = (Array.isArray(arr) ? arr : []).map(qValid).filter(Boolean).map(q => ({ ...q, les: l.id, keep: true }));
    QA.msg = QA.res.length ? '' : ''; if (!QA.res.length) throw { code: 'invalid_json' };
  } catch (e) { QA.err = e && e.code === 'cancelled' ? 'Đã dừng.' : aiErrText(e); }
  QA.busy = false; qaRepaint();
};
A.qaStop = () => { if (QA.ctl) QA.ctl.abort(); };
A.qaFound = () => { QA.res = QA.found.map(q => ({ ...q, les: QA.les, keep: true, src: 'file' })); QA.found = []; QA.msg = 'Các câu có sẵn trong file của cô (đáp án theo file):'; qaRepaint(); };
A.qaSave = () => { const keep = QA.res.filter(q => q.keep); const n = addQuestions(keep.map(q => ({ ...q, les: QA.les })), QA.les, 'ai'); QA.res = []; QA.text = ''; QA.fname = ''; QA.found = []; closeModal(); toast(`Đã thêm ${n} câu vào ${lesName(LES(QA.les))}`); refresh(); };
