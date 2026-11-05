/* ===== Nhận xét định kì: gom khen thưởng theo giai đoạn → viết nhận xét → xuất đúng file mẫu ===== */
'use strict';
const PERIODS = [['GK1', 'Giữa học kì I'], ['CK1', 'Cuối học kì I'], ['GK2', 'Giữa học kì II'], ['CK2', 'Cuối học kì II']];
const PERIOD_DEFAULT = { GK1: ['2026-09-05', '2026-10-31'], CK1: ['2026-11-01', '2027-01-15'], GK2: ['2027-01-16', '2027-03-15'], CK2: ['2027-03-16', '2027-05-31'] };
const REPORT_SUBJECTS = ['Tiếng việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'TH-CN (Công nghệ)', 'Nghệ thuật (Âm nhạc)', 'Nghệ thuật (Mĩ thuật)', 'Hoạt động trải nghiệm'];
const MAX_LEN = 500;
const RP = { q: '', busy: false, ctl: null, msg: '', exportMsg: '', styleMsg: '' };
const RC = () => S.reportCfg;
const dmy = s => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
const K = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const normName = s => String(s || '').normalize('NFC').replace(/[.\s]+$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
function periodRange(p) {
  const r = (S.periods && S.periods[p]) || PERIOD_DEFAULT[p];
  return { from: new Date(r[0] + 'T00:00:00').getTime(), to: new Date(r[1] + 'T23:59:59').getTime(), fromS: r[0], toS: r[1] };
}
const GENERIC = /^(Cộng nhanh|Trừ nhanh|Được cộng sao|Bị trừ sao|Trả lời tốt khi được gọi|Trả lời xuất sắc khi được gọi|Thưởng chung|Trò chơi ôn tập)$/;
function evidence(s, p) {
  const { from, to } = periodRange(p), logs = s.log.filter(l => l.ts >= from && l.ts <= to), pos = {}, neg = {};
  let total = 0, genPos = 0, genNeg = 0;
  for (const l of logs) {
    total += l.d;
    if (GENERIC.test(l.why)) { l.d > 0 ? genPos++ : genNeg++; continue; }
    const m = l.d > 0 ? pos : neg; m[l.why] = (m[l.why] || 0) + 1;
  }
  const sorted = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const i = PERIODS.findIndex(x => x[0] === p); let prev = null;
  if (i > 0) { const r = periodRange(PERIODS[i - 1][0]); prev = sum(s.log.filter(l => l.ts >= r.from && l.ts <= r.to).map(l => l.d)); }
  return { n: logs.length, total, pos: sorted(pos), neg: sorted(neg), genPos, genNeg, prev };
}
const noteOf = (s, p) => (S.notes[p] || {})[s.id] || '';
const hasEvidence = (s, p) => evidence(s, p).n > 0 || !!noteOf(s, p).trim();
const repOf = (s, p) => (S.reports[p] || {})[s.id];
const hasComment = (s, p) => { const c = repOf(s, p); return !!(c && (c.nlc || c.pc || Object.values(c.subj || {}).some(Boolean))); };
function clip(t, max = MAX_LEN) {
  t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= max) return t;
  const cut = t.slice(0, max), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'), cut.lastIndexOf('; '));
  return i > max * .5 ? cut.slice(0, i + 1) : cut.slice(0, max - 1).trimEnd() + '…';
}
function ensureRep(p, id) { S.reports[p] = S.reports[p] || {}; return S.reports[p][id] = S.reports[p][id] || { nlc: '', pc: '', subj: {} }; }

/* ---------- Học văn phong từ file cô đã nhận xét ---------- */
const STYLE_CAP = 60, NUDGE = /cần (?!cù)|chưa|còn |nên |đôi khi|đôi lúc|cố gắng hơn|hạn chế|thiếu/i;
const periodTag = s => { const m = /(GK1|CK1|GK2|CK2)/i.exec(String(s || '')); return m ? m[1].toUpperCase() : ''; };
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function mentionsName(t, names) {
  const T = t.normalize('NFC'), low = T.toLowerCase();
  return names.some(n => { if (low.includes(n.toLowerCase())) return true; const w = n.split(' ').filter(Boolean), g = w[w.length - 1] || ''; return g.length >= 3 && new RegExp('(^|[\\s,;(])' + escRe(g) + '(?=$|[\\s,;.!?)])').test(T.slice(3)); });
}
async function learnFromBook(wb, fname) {
  const out = { nlc: [], pc: [], subj: {}, skipped: 0 }, ftag = periodTag(fname);
  for (const sh of wb.sheetNames()) {
    if (K(sh) === K('HuongDan')) continue;
    const cells = await wb.read(sh), max = cells.__maxRow || 0; if (!max) continue; const tag = periodTag(sh) || ftag, names = [];
    const top = Math.min(15, max), heads = []; for (let r = 1; r <= top; r++) heads[r] = findCols(cells, r);
    for (let r = 1; r <= top; r++) for (const [c, v] of Object.entries(heads[r])) if (K(v) === K('Họ và tên')) for (let q = r + 1; q <= max; q++) { const nm = String(cells[c + q] || '').normalize('NFC').replace(/[.\s]+$/, '').trim(); if (nm.length > 3) names.push(nm); }
    const targets = [], canon = REPORT_SUBJECTS.find(x => K(x) === K(sh));
    for (let r = 1; r <= top; r++) for (const [c, v] of Object.entries(heads[r])) {
      if (canon && K(v) === K('Nội dung nhận xét')) targets.push({ f: 'subj', col: c, hr: r });
      const f = K(v).startsWith(K('Nhận xét năng lực chung')) ? 'nlc' : K(v).startsWith(K('Nhận xét phẩm chất')) ? 'pc' : '';
      if (f) { let found = null; for (let k = XL.colNum(c); k < XL.colNum(c) + 4 && !found; k++) for (let rr = r; rr <= Math.min(top, r + 3); rr++) if (K(cells[XL.colName(k) + rr]) === K('Nội dung')) { found = { f, col: XL.colName(k), hr: rr }; break; } if (found) targets.push(found); }
    }
    for (const tg of targets) for (let r = tg.hr + 1; r <= max; r++) {
      const t = String(cells[tg.col + r] || '').normalize('NFC').replace(/\s+/g, ' ').trim();
      if (t.length < 15 || t.length > 400 || !/^em /i.test(t)) continue;
      if (mentionsName(t, names)) { out.skipped++; continue; }
      if (tg.f === 'subj') (out.subj[canon] = out.subj[canon] || []).push({ t, p: tag }); else out[tg.f].push({ t, p: tag });
    }
  }
  return out;
}
function mergeStyle(L, fname) {
  const st = S.style = S.style || { on: true, files: [], nlc: [], pc: [], subj: {} };
  const add = (arr, items) => { const seen = new Set(arr.map(x => x.p + '|' + K(x.t))); let n = 0; for (const it of items) { const k = it.p + '|' + K(it.t); if (!seen.has(k) && arr.length < STYLE_CAP) { seen.add(k); arr.push(it); n++; } } return n; };
  const r = { nlc: add(st.nlc, L.nlc), pc: add(st.pc, L.pc), subj: {} };
  for (const [n, items] of Object.entries(L.subj)) { st.subj[n] = st.subj[n] || []; r.subj[n] = add(st.subj[n], items); }
  if (!st.files.includes(fname)) st.files.push(fname); st.on = true; return r;
}
const styleTotal = st => st ? st.nlc.length + st.pc.length + Object.values(st.subj).reduce((a, x) => a + x.length, 0) : 0;
function lenRange(pool) {
  const L = pool.map(x => x.t.length).sort((a, b) => a - b); if (!L.length) return [0, 0];
  if (L.length < 6) return [L[0], L[L.length - 1]]; const q = f => L[Math.min(L.length - 1, Math.floor(f * (L.length - 1)))];
  return [Math.round(q(.1) / 5) * 5, Math.round(q(.9) / 5) * 5];
}
function styleBoxHtml() {
  const st = S.style, n = styleTotal(st);
  const head = `<p class="muted small" style="margin:0 0 10px">Chọn các file cô <b>đã nhận xét xong</b> (chọn được nhiều file, cả file năng lực – phẩm chất lẫn file đánh giá môn học). App đọc các câu nhận xét của cô để AI bắt chước <b>giọng văn, độ dài và cách nhắc nhở</b>. Chỉ lấy câu nhận xét, không lấy tên hay mã học sinh, và câu nào có nhắc tên học sinh sẽ bị bỏ. Dữ liệu chỉ nằm trong trình duyệt của cô.</p>
    <div class="row"><label class="btn p" style="cursor:pointer">📚 Chọn file đã nhận xét (.xlsx)<input type="file" accept=".xlsx" multiple hidden data-ch="rpStyleLoad"></label>${n ? `<button class="btn ghost" data-a="rpStyleClear">Xoá văn phong đã học</button>` : ''}</div>`;
  if (!n) return head + `<div id="rpStyleMsg" class="small" style="margin-top:10px;white-space:pre-line">${esc(RP.styleMsg || '')}</div>`;
  const parts = [`Năng lực chung <b>${st.nlc.length}</b>`, `Phẩm chất <b>${st.pc.length}</b>`].concat(Object.entries(st.subj).filter(([, a]) => a.length).map(([k, a]) => `${esc(k)} <b>${a.length}</b>`));
  const all = [].concat(st.nlc, st.pc, ...Object.values(st.subj)), r = lenRange(all), ex = shuffle(all).slice(0, 4);
  return head + `<div id="rpStyleMsg" class="small" style="margin-top:10px;white-space:pre-line">${esc(RP.styleMsg || '')}</div>
    <div class="small" style="margin-top:10px">✔ Đã học <b>${n}</b> câu từ ${st.files.length} file · ${parts.join(' · ')} · độ dài thường gặp ${r[0]}–${r[1]} ký tự</div>
    <label class="row small" style="cursor:pointer;margin-top:8px;gap:8px"><input type="checkbox" ${st.on !== false ? 'checked' : ''} data-ch="rpStyleOn" style="width:18px;height:18px"><span>Dùng văn phong của cô khi AI viết nhận xét</span></label>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:14px">Xem vài câu đã học</summary><ul class="small" style="margin:8px 0 0;padding-left:18px">${ex.map(x => `<li>${esc(x.t)}</li>`).join('')}</ul></details>`;
}
const privacyText = () => `AI chỉ nhận số liệu sao, tên tiêu chí và ghi chú của cô${styleOn() ? ', cùng vài câu nhận xét mẫu của cô ở bước ③' : ''}. Tên và mã học sinh không được gửi đi.`;
const repaintStyle = () => { const b = $('#rpStyleBox'); if (b) b.innerHTML = styleBoxHtml(); const q = $('#rpPrivacy'); if (q) q.textContent = privacyText(); };
A.rpStyleLoad = async el => {
  const files = [...el.files]; el.value = ''; if (!files.length) return; const lines = [], msg = () => { const m = $('#rpStyleMsg'); if (m) m.textContent = lines.join('\n'); };
  for (const f of files) {
    lines.push('⏳ Đang đọc ' + f.name + '…'); msg();
    try {
      const L = await learnFromBook(await XL.open(await f.arrayBuffer()), f.name), got = L.nlc.length + L.pc.length + Object.values(L.subj).reduce((a, x) => a + x.length, 0);
      lines.pop();
      if (!got) { lines.push(`⚠️ ${f.name}: chưa thấy câu nhận xét nào (file mẫu trống hoặc không đúng mẫu).`); continue; }
      const r = mergeStyle(L, f.name), added = r.nlc + r.pc + Object.values(r.subj).reduce((a, x) => a + x, 0);
      lines.push(`✔ ${f.name}: học thêm ${added} câu mới (đọc được ${got} câu${L.skipped ? `, bỏ ${L.skipped} câu có nhắc tên học sinh` : ''}).`);
    } catch (e) { lines.pop(); lines.push(`❌ ${f.name}: ${e.message || 'không đọc được file'}`); }
  }
  RP.styleMsg = lines.join('\n'); save(); repaintStyle();
};
A.rpStyleOn = el => { if (S.style) { S.style.on = el.checked; save(); repaintStyle(); } };
A.rpStyleClear = () => { S.style = null; RP.styleMsg = ''; save(); repaintStyle(); toast('Đã xoá văn phong đã học'); };
function pickEx(pool, p, nK, nN) {
  let pl = pool.filter(x => x.p === p); if (pl.length < 3) pl = pool;
  return { praise: shuffle(pl.filter(x => !NUDGE.test(x.t))).slice(0, nK), nudge: shuffle(pl.filter(x => NUDGE.test(x.t))).slice(0, nN), range: lenRange(pl) };
}
const styleOn = () => !!(S.style && S.style.on !== false && styleTotal(S.style));
function styleBlock(p, subs) {
  if (!styleOn()) return ''; const st = S.style, q = a => a.map(x => '“' + x.t + '”').join(' | '), lines = [];
  const fields = [['Năng lực chung (trường "nlc")', st.nlc], ['Phẩm chất (trường "pc")', st.pc]].concat(subs.map(n => [`Môn ${n} (khóa "${n}" trong "mon")`, (st.subj || {})[n]]));
  for (const [label, pool] of fields) {
    if (!pool || !pool.length) continue; const e = pickEx(pool, p, 3, 2);
    lines.push(`• ${label}: độ dài thường gặp ${e.range[0]}–${e.range[1]} ký tự.` + (e.praise.length ? `\n   Mẫu khen: ${q(e.praise)}` : '') + (e.nudge.length ? `\n   Mẫu khen kèm nhắc nhẹ: ${q(e.nudge)}` : ''));
  }
  if (!lines.length) return '';
  return `\nVĂN PHONG CỦA GIÁO VIÊN: dưới đây là các câu nhận xét thật do chính cô giáo chủ nhiệm đã viết cho lớp. Hãy học giọng văn, độ dài, nhịp câu và cách dùng từ của cô để viết mới cho từng em, như thể chính cô viết. Quy tắc: (1) KHÔNG chép nguyên câu mẫu; (2) KHÔNG đưa nội dung trong câu mẫu (kiến thức, kĩ năng, thành tích) vào nhận xét nếu dữ kiện của em không có, vì mẫu chỉ để học cách viết; (3) em nào không bị trừ sao thì viết theo kiểu "Mẫu khen", em nào có bị trừ sao thì viết theo kiểu "Mẫu khen kèm nhắc nhẹ"; (4) giữ độ dài trong khoảng thường gặp của cô.\n${lines.join('\n')}\n`;
}

/* ---------- Giao diện ---------- */
function rowHtml(s) {
  const p = RC().period, e = evidence(s, p), c = repOf(s, p) || {}, subj = c.subj || {}, subs = RC().subjects;
  const top = e.pos.slice(0, 4).map(([k, n]) => `${esc(k)} ×${n}`).join(' · ') + (e.genPos ? ` · +sao khác ×${e.genPos}` : ''), bad = e.neg.slice(0, 2).map(([k, n]) => `${esc(k)} ×${n}`).join(' · ');
  const ta = (f, v, label) => `<div><label class="f">${label} <span class="cnt ${v && v.length > MAX_LEN ? 'over' : ''}">${(v || '').length}/${MAX_LEN}</span></label><textarea data-in="rpEdit" data-id="${s.id}" data-f="${esc(f)}">${esc(v || '')}</textarea></div>`;
  return `<div class="card rp-row" data-sid="${s.id}">
    <div class="row"><b style="font-size:17px">${esc(s.name)}</b>${s.code ? `<span class="tag">${esc(s.code)}</span>` : ''}${s.inclusive ? `<span class="tag" style="background:var(--sun-l)">Học hòa nhập</span>` : ''}<span class="sp"></span>
      <b class="star" style="font-size:18px">★ ${e.total}</b><span class="muted small">${e.n} ghi nhận${e.prev != null ? ` · giai đoạn trước ★${e.prev}` : ''}</span></div>
    <div class="small" style="margin:3px 0 8px;color:var(--ink2)">${e.n ? (top || '—') : '<i>Chưa có ghi nhận nào trong giai đoạn này</i>'}${bad ? ` <span style="color:var(--coral)">· cần nhắc: ${bad}</span>` : ''}</div>
    <input type="text" placeholder="Khen thưởng / ghi nhận khác của cô (không bắt buộc), ví dụ: Đạt giải Ba viết chữ đẹp cấp trường" value="${esc(noteOf(s, p))}" data-in="rpNote" data-id="${s.id}">
    <label class="row small" style="cursor:pointer;margin-top:8px;gap:8px"><input type="checkbox" ${s.inclusive ? 'checked' : ''} data-ch="rpIncl" data-id="${s.id}" style="width:18px;height:18px"><span>Học sinh khuyết tật học hòa nhập: AI không viết, cô tự nhận xét theo kế hoạch giáo dục cá nhân</span></label>
    <div class="grid g2" style="margin-top:10px">${ta('nlc', c.nlc, 'Nhận xét năng lực chung')}${ta('pc', c.pc, 'Nhận xét phẩm chất chủ yếu')}</div>
    ${subs.length ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:14px">Nhận xét môn học (${subs.length} môn)</summary><div class="grid g2" style="margin-top:8px">${subs.map(n => ta('s:' + n, subj[n], esc(n))).join('')}</div></details>` : ''}
  </div>`;
}
function listHtml() {
  const q = RP.q.toLowerCase(), p = RC().period;
  const list = S.students.slice().sort(viSort).filter(s => !q || s.name.toLowerCase().includes(q));
  return list.map(rowHtml).join('') || `<div class="empty card"><p class="muted">Không có học sinh nào khớp.</p></div>`;
}
function summaryHtml() {
  const p = RC().period, tot = S.students.length, withE = S.students.filter(s => hasEvidence(s, p)).length, done = S.students.filter(s => hasComment(s, p)).length;
  const over = S.students.reduce((a, s) => { const c = repOf(s, p); if (!c) return a; return a + [c.nlc, c.pc, ...Object.values(c.subj || {})].filter(t => t && t.length > MAX_LEN).length; }, 0);
  return `<b>${done}/${tot}</b> em đã có nhận xét · <b>${withE}</b> em có ghi nhận trong giai đoạn này${tot - withE ? ` · <span style="color:var(--coral)">${tot - withE} em chưa có ghi nhận (AI sẽ không viết thay, cô tự nhập)</span>` : ''}${S.students.some(x => x.inclusive) ? ` · ${S.students.filter(x => x.inclusive).length} em học hòa nhập (cô tự nhận xét)` : ''}${over ? ` · <span style="color:var(--coral)">${over} ô dài quá ${MAX_LEN} ký tự</span>` : ''}`;
}
V.report = {
  render() {
    const p = RC().period, r = periodRange(p), withCodes = S.students.filter(s => s.code).length;
    return pageHead('Nhận xét định kì', 'Gom khen thưởng của từng em theo giai đoạn, viết nhận xét và xuất đúng file mẫu của hệ thống') + `
    <div class="card" style="margin-bottom:16px"><h3>① Chọn giai đoạn đánh giá</h3>
      <div class="row">${PERIODS.map(([k, n]) => `<span class="chip ${k === p ? 'on' : ''}" data-a="rpPeriod" data-v="${k}"><b>${k}</b> ${n}</span>`).join('')}</div>
      <div class="row" style="margin-top:12px"><label class="small muted" style="font-weight:700">Tính các khen thưởng từ ngày</label><input type="date" value="${r.fromS}" data-ch="rpDate" data-k="0" style="width:auto"><label class="small muted" style="font-weight:700">đến ngày</label><input type="date" value="${r.toS}" data-ch="rpDate" data-k="1" style="width:auto"></div>
      <p class="muted small" style="margin:8px 0 0">Mốc ngày là gợi ý, cô chỉnh theo kế hoạch của trường. Những lần cộng/trừ sao nằm trong khoảng này sẽ được dùng làm căn cứ viết nhận xét.</p></div>
    <div class="card" style="margin-bottom:16px"><h3>② Lấy danh sách lớp từ file mẫu</h3>
      <p class="muted small" style="margin:0 0 10px">Chọn file mẫu của cô (file đánh giá định kì hoặc file năng lực – phẩm chất). App đọc <b>mã định danh, họ tên, ngày sinh</b> để khớp từng em khi xuất file. Dữ liệu chỉ nằm trong trình duyệt của cô.</p>
      <div class="row"><label class="btn p" style="cursor:pointer">📂 Chọn file mẫu (.xlsx)<input type="file" accept=".xlsx" hidden data-ch="rpRoster"></label>
      <span class="small muted">${S.students.length ? `Lớp hiện có <b>${S.students.length}</b> em, <b>${withCodes}</b> em đã có mã định danh.` : 'Lớp chưa có học sinh.'}</span></div></div>
    <div class="card" style="margin-bottom:16px"><h3>③ Dạy AI viết theo văn phong của cô <span class="muted small" style="font-weight:600">(không bắt buộc)</span></h3><div id="rpStyleBox">${styleBoxHtml()}</div></div>
    <div class="card" style="margin-bottom:16px"><h3>④ Viết nhận xét</h3>
      <label class="f">Các môn cần viết nhận xét thái độ, ý thức học tập</label>
      <div class="row" style="gap:6px">${REPORT_SUBJECTS.map(n => `<span class="chip ${RC().subjects.includes(n) ? 'on' : ''}" data-a="rpSubj" data-v="${esc(n)}">${esc(n)}</span>`).join('')}</div>
      <p class="muted small" style="margin:8px 0 12px">Khen thưởng chỉ nói được về <b>thái độ, nề nếp, sự tích cực</b>, không nói được về kiến thức hay điểm số. Vì vậy mặc định chỉ chọn Đạo đức và Hoạt động trải nghiệm. Mức T/H/C, điểm KTĐK, mã nhận xét và nhận xét năng lực đặc thù cô tự nhập trong file.</p>
      <div class="row">${window.AI_OK ? `<button class="btn p" id="rpAll" data-a="rpAi" data-v="all">🤖 AI viết cho cả lớp</button><button class="btn" id="rpMiss" data-a="rpAi" data-v="miss">🤖 Chỉ viết cho em chưa có nhận xét</button>` : `<span class="muted small">🤖 Mở app trong Claude để dùng AI viết nhận xét. Cô vẫn tự gõ nhận xét được.</span>`}<span id="rpStatus" class="small" hidden></span></div>
      <p id="rpPrivacy" class="muted small" style="margin:10px 0 0">${privacyText()}</p>
      <hr style="border:0;border-top:2px dashed var(--line);margin:14px 0"><div id="rpSummary" class="small">${summaryHtml()}</div>
      <input type="search" placeholder="🔎 Tìm tên học sinh…" value="${esc(RP.q)}" data-in="rpSearch" style="margin-top:10px"></div>
    <div id="rpList" class="grid" style="gap:12px">${S.students.length ? listHtml() : '<div class="card empty"><div class="em">📋</div><p>Chưa có học sinh. Hãy chọn file mẫu ở bước ②.</p></div>'}</div>
    <div class="card" style="margin-top:16px"><h3>⑤ Xuất file theo mẫu</h3>
      <p class="muted small" style="margin:0 0 10px">Chọn lại file mẫu cần điền (chọn được cả hai file một lúc). App điền nhận xét và <b>Thời điểm đánh giá = ${p}</b>, các cột khác giữ nguyên như file của cô.</p>
      <label class="btn g lg" style="cursor:pointer">⬇️ Chọn file mẫu và xuất<input type="file" accept=".xlsx" multiple hidden data-ch="rpExport"></label>
      <div id="rpExportMsg" class="small" style="margin-top:12px;white-space:pre-line">${esc(RP.exportMsg)}</div></div>`;
  }
};
const repaintSummary = () => { const s = $('#rpSummary'); if (s) s.innerHTML = summaryHtml(); };
A.rpPeriod = el => { RC().period = el.dataset.v; save(); refresh(); };
A.rpDate = el => {
  const p = RC().period; S.periods = S.periods || JSON.parse(JSON.stringify(PERIOD_DEFAULT)); const cur = S.periods[p] ? S.periods[p].slice() : PERIOD_DEFAULT[p].slice();
  cur[+el.dataset.k] = el.value; if (!cur[0] || !cur[1] || cur[0] > cur[1]) { toast('Ngày bắt đầu phải trước ngày kết thúc'); return refresh(); }
  S.periods[p] = cur; save(); refresh();
};
A.rpSubj = el => { const a = RC().subjects, n = el.dataset.v, i = a.indexOf(n); i < 0 ? a.push(n) : a.splice(i, 1); save(); refresh(); };
A.rpSearch = el => { RP.q = el.value; $('#rpList').innerHTML = listHtml(); };
A.rpNote = el => { const p = RC().period; S.notes[p] = S.notes[p] || {}; S.notes[p][el.dataset.id] = el.value; save(); };
A.rpEdit = el => {
  const p = RC().period, c = ensureRep(p, el.dataset.id), f = el.dataset.f; if (f.startsWith('s:')) { c.subj = c.subj || {}; c.subj[f.slice(2)] = el.value; } else c[f] = el.value;
  const cnt = el.parentNode.querySelector('.cnt'); if (cnt) { cnt.textContent = el.value.length + '/' + MAX_LEN; cnt.classList.toggle('over', el.value.length > MAX_LEN); }
  save(); repaintSummary();
};

/* ---------- Nạp danh sách từ file mẫu ---------- */
async function detectTemplate(wb) {
  const names = wb.sheetNames(), data = {};
  for (const n of names) { if (n === 'HuongDan') continue; data[n] = await wb.read(n); }
  const hasCell = (cells, rowN, text) => Object.entries(cells).some(([k, v]) => new RegExp('^[A-Z]+' + rowN + '$').test(k) && K(v) === K(text));
  for (const n of Object.keys(data)) if (hasCell(data[n], 1, 'Năng lực chung') || hasCell(data[n], 2, 'Năng lực chung')) return { type: 'nlpc', sheets: [n], data };
  const subj = Object.keys(data).filter(n => REPORT_SUBJECTS.some(x => K(x) === K(n)));
  if (subj.length) return { type: 'mon', sheets: subj, data };
  return null;
}
function studentRows(cells) {
  const out = []; for (let r = 1; r <= (cells.__maxRow || 0); r++) { const code = (cells['B' + r] || '').trim(), name = (cells['C' + r] || '').trim(); if (name && /^\d{6,}$/.test(code)) out.push({ r, code, name, dob: (cells['D' + r] || '').trim() }); }
  return out;
}
const findCols = (cells, row) => { const o = {}; for (const [k, v] of Object.entries(cells)) { const m = /^([A-Z]+)(\d+)$/.exec(k); if (m && +m[2] === row) o[m[1]] = String(v).trim(); } return o; };
A.rpRoster = async el => {
  const f = el.files[0]; el.value = ''; if (!f) return;
  try {
    const wb = await XL.open(await f.arrayBuffer()), det = await detectTemplate(wb); if (!det) return toast('Không nhận ra mẫu. Hãy chọn đúng file mẫu đánh giá.');
    const rows = studentRows(det.data[det.sheets[0]]); if (!rows.length) return toast('Không thấy dòng học sinh nào trong file');
    window._rosterRows = rows;
    openModal(`<h3>Tìm thấy ${rows.length} học sinh trong file</h3><p class="muted small" style="margin:6px 0 4px">Ví dụ: ${rows.slice(0, 3).map(r => esc(r.name)).join(', ')}…</p>
      <p style="margin:10px 0">Lớp hiện có <b>${S.students.length}</b> em. Cô muốn làm gì?</p>
      <div class="row"><button class="btn p" data-a="rpRosterGo" data-v="replace">Thay bằng danh sách trong file</button><button class="btn" data-a="rpRosterGo" data-v="merge">Giữ lớp hiện tại, chỉ thêm và cập nhật mã</button><button class="btn ghost" data-a="closeModal">Huỷ</button></div>
      <p class="muted small" style="margin:12px 0 0">Em nào trùng mã hoặc họ tên sẽ giữ nguyên điểm sao và tổ. “Thay bằng danh sách trong file” sẽ bỏ những em không có trong file (ví dụ lớp mẫu).</p>`);
  } catch (e) { toast('Không đọc được file: ' + (e.message || e)); }
};
A.rpRosterGo = el => {
  const rows = window._rosterRows || [], replace = el.dataset.v === 'replace', byCode = new Map(S.students.filter(s => s.code).map(s => [s.code, s])), byName = new Map(S.students.map(s => [normName(s.name), s]));
  let upd = 0, add = 0; const keep = [], n = S.teamNames.length;
  rows.forEach((r, i) => {
    let s = byCode.get(r.code) || byName.get(normName(r.name));
    if (s) { s.code = r.code; s.dob = r.dob; upd++; } else { s = { id: uid(), name: r.name.replace(/[.\s]+$/, ''), team: i % n, log: [], code: r.code, dob: r.dob }; S.students.push(s); add++; }
    keep.push(s.id);
  });
  if (replace) { S.students = S.students.filter(s => keep.includes(s.id)); S.round = S.round.filter(id => keep.includes(id)); }
  save(); closeModal(); renderNav(); toast(`Đã nạp lớp: ${add} em mới, ${upd} em cập nhật mã`); refresh();
};

/* ---------- AI viết nhận xét ---------- */
function reportPrompt(batch, p) {
  const rg = periodRange(p), subs = RC().subjects, label = PERIODS.find(x => x[0] === p)[1], style = styleBlock(p, subs);
  const facts = batch.map((s, i) => {
    const e = evidence(s, p), o = { id: i + 1, tong_sao_giai_doan: e.total, so_lan_ghi_nhan: e.n };
    if (e.prev != null) o.tong_sao_giai_doan_truoc = e.prev;
    o.duoc_cong = e.pos.map(([k, c]) => `${k} (${c} lần)`); if (e.genPos) o.duoc_cong.push(`được cộng sao khi học tập, không ghi lí do cụ thể (${e.genPos} lần)`);
    o.bi_tru = e.neg.map(([k, c]) => `${k} (${c} lần)`); if (e.genNeg) o.bi_tru.push(`bị trừ sao, không ghi lí do cụ thể (${e.genNeg} lần)`);
    const nt = noteOf(s, p).trim(); if (nt) o.khen_thuong_khac_cua_giao_vien = nt; return o;
  });
  return `Bạn là giáo viên chủ nhiệm lớp ${S.settings.grade} ở Việt Nam, viết nhận xét đánh giá định kì (${label}, từ ${dmy(rg.fromS)} đến ${dmy(rg.toS)}) theo Thông tư 27/2020/TT-BGDĐT.
Căn cứ DUY NHẤT là dữ kiện khen thưởng và cộng/trừ sao của từng em dưới đây. TUYỆT ĐỐI không bịa điểm số, kết quả bài kiểm tra, kĩ năng cụ thể từng môn, thành tích, gia cảnh hay điều gì không có trong dữ kiện. Nếu dữ kiện ít, viết ngắn gọn và trung tính.
Với mỗi em, trả về các trường:
- "nlc": nhận xét NĂNG LỰC CHUNG (tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề và sáng tạo), chỉ nêu điều có căn cứ trong dữ kiện.
- "pc": nhận xét PHẨM CHẤT CHỦ YẾU (yêu nước, nhân ái, chăm chỉ, trung thực, trách nhiệm), chỉ nêu điều có căn cứ trong dữ kiện.
${subs.length ? `- "mon": một đối tượng có đúng các khóa sau: ${JSON.stringify(subs)}. Mỗi giá trị là nhận xét về THÁI ĐỘ, Ý THỨC, sự tích cực của em trong môn đó (không nhận xét kiến thức, kĩ năng, điểm số).` : ''}
Quy tắc viết: ${style ? 'mỗi nhận xét 1–2 câu, độ dài theo văn phong của cô giáo (xem bên dưới), tuyệt đối không quá 300 ký tự' : 'mỗi nhận xét 1–3 câu, tối đa 300 ký tự'}, văn phong sư phạm, khích lệ, khách quan; mở đầu bằng "Em"; không dùng tên riêng; không xưng "con"; nếu có bị trừ sao thì nêu nhẹ nhàng một việc em cần cố gắng; nếu có "khen_thuong_khac_cua_giao_vien" thì ghi nhận ngắn gọn trong "pc" hoặc "nlc" cho phù hợp.${style}
Dữ kiện (mảng JSON):
${JSON.stringify(facts)}
Chỉ trả về MỘT mảng JSON, mỗi phần tử có dạng {"id": số, "nlc": "...", "pc": "..."${subs.length ? ', "mon": {...}' : ''}}.`;
}
A.rpAi = async el => {
  if (RP.busy || !SAMPLE) return; const p = RC().period, onlyMiss = el.dataset.v === 'miss';
  const targets = S.students.filter(s => !s.inclusive && hasEvidence(s, p) && (!onlyMiss || !hasComment(s, p)));
  if (!targets.length) return toast(onlyMiss ? 'Mọi em có ghi nhận đều đã có nhận xét' : 'Chưa em nào có ghi nhận trong giai đoạn này');
  RP.busy = true; RP.ctl = new AbortController(); const st = $('#rpStatus'), btns = $$('#rpAll,#rpMiss'); btns.forEach(b => b.disabled = true); st.hidden = false;
  const B = 8; let done = 0, failed = '';
  try {
    for (let i = 0; i < targets.length; i += B) {
      const batch = targets.slice(i, i + B);
      st.innerHTML = `⏳ AI đang viết… ${done}/${targets.length} em <button class="btn sm" data-a="rpStop">Dừng</button>`;
      const arr = await SAMPLE.json(reportPrompt(batch, p), { modelTier: 'default', cache: false, signal: RP.ctl.signal });
      for (const it of (Array.isArray(arr) ? arr : [])) {
        const s = batch[(+it.id || 0) - 1]; if (!s) continue; const c = ensureRep(p, s.id);
        if (typeof it.nlc === 'string') c.nlc = clip(it.nlc); if (typeof it.pc === 'string') c.pc = clip(it.pc);
        if (it.mon && typeof it.mon === 'object') { c.subj = c.subj || {}; for (const n of RC().subjects) if (typeof it.mon[n] === 'string') c.subj[n] = clip(it.mon[n]); }
        const row = $(`.rp-row[data-sid="${s.id}"]`); if (row) row.outerHTML = rowHtml(s);
      }
      done += batch.length; save(); repaintSummary();
    }
    st.textContent = `✔ Đã viết xong ${done} em${styleOn() ? ' theo văn phong của cô' : ''}. Cô đọc và sửa lại trước khi xuất nhé.`;
  } catch (e) { failed = aiErrText(e); st.textContent = (done ? `Đã viết ${done}/${targets.length} em. ` : '') + failed; }
  RP.busy = false; btns.forEach(b => b.disabled = false);
};
A.rpIncl = el => { const s = S.students.find(x => x.id === el.dataset.id); s.inclusive = el.checked; save(); const row = $(`.rp-row[data-sid="${s.id}"]`); if (row) row.outerHTML = rowHtml(s); repaintSummary(); };
A.rpStop = () => { if (RP.ctl) RP.ctl.abort(); };

/* ---------- Xuất file theo mẫu ---------- */
async function saveFile(name, u8, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) { await dl.save({ filename: name, data: u8 }); return 'saved'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: mime })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); return 'saved';
}
async function fillTemplate(file) {
  const p = RC().period, wb = await XL.open(await file.arrayBuffer()), det = await detectTemplate(wb);
  if (!det) throw new Error('Không nhận ra đây là file mẫu nào');
  const byCode = new Map(S.students.filter(s => s.code).map(s => [s.code, s])), byName = new Map(S.students.map(s => [normName(s.name), s]));
  const stats = { rows: 0, matched: 0, written: 0, over: 0, unmatched: [] };
  const cut = t => { if (t.length > MAX_LEN) stats.over++; return clip(t); };
  for (const sh of det.sheets) {
    const cells = det.data[sh], rows = studentRows(cells);
    if (det.type === 'nlpc') {
      const h1 = findCols(cells, 1), h2 = findCols(cells, 2), cols = Object.keys(h1).sort((a, b) => XL.colNum(a) - XL.colNum(b));
      const groupContent = pre => { const g = cols.find(c => K(h1[c]).startsWith(K(pre))); if (!g) return null; const start = XL.colNum(g); for (let k = start; k < start + 4; k++) { const cn = XL.colName(k); if (K(h2[cn]) === K('Nội dung')) return cn; } return null; };
      const cNlc = groupContent('Nhận xét năng lực chung'), cPc = groupContent('Nhận xét phẩm chất'), cPer = cols.find(c => K(h1[c]) === K('Thời điểm đánh giá'));
      if (!cNlc || !cPc) throw new Error('Không tìm thấy cột nhận xét trong file năng lực – phẩm chất');
      for (const r of rows) {
        stats.rows++; const s = byCode.get(r.code) || byName.get(normName(r.name)); if (cPer) await wb.set(sh, cPer + r.r, p);
        if (!s) { stats.unmatched.push(r.name); continue; } stats.matched++; const c = repOf(s, p); if (!c) continue;
        if (c.nlc && c.nlc.trim()) { await wb.set(sh, cNlc + r.r, cut(c.nlc)); stats.written++; }
        if (c.pc && c.pc.trim()) { await wb.set(sh, cPc + r.r, cut(c.pc)); stats.written++; }
      }
    } else {
      const h1 = findCols(cells, 1), cNote = Object.keys(h1).find(c => K(h1[c]) === K('Nội dung nhận xét')), cPer = Object.keys(h1).find(c => K(h1[c]) === K('Thời điểm đánh giá'));
      if (!cNote) throw new Error('Sheet ' + sh + ' không có cột “Nội dung nhận xét”');
      const canon = REPORT_SUBJECTS.find(x => K(x) === K(sh));
      for (const r of rows) {
        if (sh === det.sheets[0]) stats.rows++; const s = byCode.get(r.code) || byName.get(normName(r.name)); if (cPer) await wb.set(sh, cPer + r.r, p);
        if (!s) { if (sh === det.sheets[0]) stats.unmatched.push(r.name); continue; } if (sh === det.sheets[0]) stats.matched++;
        const t = (((repOf(s, p) || {}).subj || {})[canon] || '').trim(); if (t) { await wb.set(sh, cNote + r.r, cut(t)); stats.written++; }
      }
    }
  }
  const out = await wb.save(), base = file.name.replace(/\.xlsx$/i, '').replace(/^[0-9a-f]{8}-/, ''), name = (/(GK1|CK1|GK2|CK2)/.test(base) ? base.replace(/(GK1|CK1|GK2|CK2)/g, p) : base + '_' + p) + '_da_dien.xlsx';
  return { out, name, type: det.type, stats };
}
A.rpExport = async el => {
  const files = [...el.files]; el.value = ''; if (!files.length) return; const msg = $('#rpExportMsg'); const lines = [];
  for (const f of files) {
    msg.textContent = lines.concat(['⏳ Đang điền ' + f.name + '…']).join('\n');
    try {
      const r = await fillTemplate(f), s = r.stats;
      if (!s.written) { lines.push(`⚠️ ${f.name}: chưa có nhận xét nào để điền cho ${RC().period}. Hãy viết nhận xét ở bước ④ rồi xuất lại.`); continue; }
      await saveFile(r.name, r.out);
      lines.push(`✔ ${r.name}: đã điền ${s.written} ô nhận xét, khớp ${s.matched}/${s.rows} em trong file.` + (s.over ? ` ${s.over} ô dài quá ${MAX_LEN} ký tự đã được rút gọn.` : '') + (s.unmatched.length ? `\n   Chưa khớp ${s.unmatched.length} em (không có trong lớp): ${s.unmatched.slice(0, 4).join(', ')}${s.unmatched.length > 4 ? '…' : ''}` : ''));
    } catch (e) { lines.push(e && e.code === 'declined' ? `Đã huỷ lưu ${f.name}.` : `❌ ${f.name}: ${e.message || e.code || 'lỗi không rõ'}`); }
  }
  RP.exportMsg = lines.join('\n'); msg.textContent = RP.exportMsg;
};
