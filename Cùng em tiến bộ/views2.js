/* ===== Ôn tập hằng tuần · Thi đua cá nhân · Thi đua tổ · Đồng hồ ===== */
'use strict';
const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtDec = n => String(n).replace('.', ',');
const NAMES = ['Lan', 'Nam', 'Hoa', 'Minh', 'An', 'Mai', 'Bình', 'Chi', 'Dũng', 'Hà'];
const NUMR = { 1: [10, 20, 100], 2: [100, 100, 1000], 3: [1000, 10000, 100000], 4: [10000, 100000, 1000000], 5: [100000, 1000000, 10000000] };

/* ---- trình sinh bài toán (chạy ngoại tuyến, có đáp án) ---- */
const MATH_TYPES = [
  { k: 'add', n: 'Cộng', min: 1 }, { k: 'sub', n: 'Trừ', min: 1 }, { k: 'mul', n: 'Nhân', min: 2 }, { k: 'div', n: 'Chia', min: 2 },
  { k: 'cmp', n: 'So sánh', min: 1 }, { k: 'x', n: 'Tìm x', min: 2 }, { k: 'word', n: 'Toán có lời văn', min: 2 },
  { k: 'unit', n: 'Đổi đơn vị', min: 3 }, { k: 'frac', n: 'Phân số', min: 4 }, { k: 'pct', n: 'Phần trăm', min: 5 }
];
const G = {
  add(g, L) {
    if (g === 1) { const m = [10, 20, 100][L - 1], a = rnd(1, m - 2), b = rnd(1, m - a - 1); return { q: `${a} + ${b} = …`, a: a + b }; }
    if (g === 5 && L > 1) { const a = rnd(10, 999) / 10, b = rnd(10, 999) / 10; return { q: `${fmtDec(a.toFixed(1))} + ${fmtDec(b.toFixed(1))} = …`, a: fmtDec((a + b).toFixed(1)) }; }
    const m = NUMR[g][L - 1], a = rnd(Math.floor(m / 10), m - 2), b = L === 1 ? rnd(1, m - a - 1) : rnd(Math.floor(m / 10), m - 1);
    return { q: `${fmtN(a)} + ${fmtN(b)} = …`, a: fmtN(a + b) };
  },
  sub(g, L) {
    if (g === 1) { const m = [10, 20, 100][L - 1], a = rnd(3, m), b = rnd(1, a - 1); return { q: `${a} − ${b} = …`, a: a - b }; }
    if (g === 5 && L > 1) { let a = rnd(100, 999) / 10, b = rnd(10, 99) / 10; return { q: `${fmtDec(a.toFixed(1))} − ${fmtDec(b.toFixed(1))} = …`, a: fmtDec((a - b).toFixed(1)) }; }
    const m = NUMR[g][L - 1]; let a = rnd(Math.floor(m / 5), m - 1), b = rnd(Math.floor(m / 10), a - 1); return { q: `${fmtN(a)} − ${fmtN(b)} = …`, a: fmtN(a - b) };
  },
  mul(g, L) {
    let a, b;
    if (g === 2) { a = rnd(2, L === 1 ? 3 : 5); b = rnd(1, 10); }
    else if (g === 3) { a = rnd(L === 1 ? 10 : L === 2 ? 20 : 100, L === 3 ? 999 : 99); b = rnd(2, 9); }
    else if (g === 4) { a = rnd(L === 3 ? 100 : 10, L === 3 ? 999 : 99); b = L === 1 ? rnd(2, 9) : rnd(10, 99); }
    else { a = rnd(100, 999); b = rnd(L === 1 ? 10 : 11, L === 3 ? 99 : 40); }
    return { q: `${fmtN(a)} × ${fmtN(b)} = …`, a: fmtN(a * b) };
  },
  div(g, L) {
    let b, c;
    if (g === 2) { b = rnd(2, L === 1 ? 3 : 5); c = rnd(1, 10); }
    else if (g === 3) { b = rnd(2, 9); c = rnd(L === 1 ? 10 : L === 2 ? 20 : 100, L === 3 ? 999 : 99); }
    else { b = rnd(L === 1 ? 2 : 10, L === 1 ? 9 : 40); c = rnd(L === 3 ? 100 : 12, L === 3 ? 900 : 99); }
    return { q: `${fmtN(b * c)} : ${b} = …`, a: fmtN(c) };
  },
  cmp(g, L) {
    const m = NUMR[g][Math.max(0, L - 2)] || 20;
    const e = () => { const a = rnd(1, Math.max(3, m / 2)), b = rnd(1, Math.max(3, m / 2)); return [`${fmtN(a)} + ${fmtN(b)}`, a + b]; };
    const [t1, v1] = e(); let t2, v2; if (Math.random() < .3) { v2 = v1; t2 = fmtN(v1); } else[t2, v2] = e();
    return { q: `${t1}  …  ${t2}   (điền dấu >, <, =)`, a: v1 > v2 ? '>' : v1 < v2 ? '<' : '=' };
  },
  x(g, L) {
    const m = Math.max(20, NUMR[g][Math.max(0, L - 2)] / (g > 2 ? 10 : 1)); const t = rnd(0, g === 2 ? 1 : 3);
    if (t === 0) { const x = rnd(2, m / 2), a = rnd(2, m / 2); return { q: `x + ${fmtN(a)} = ${fmtN(x + a)}     x = …`, a: fmtN(x) }; }
    if (t === 1) { const a = rnd(2, m / 2), r = rnd(2, m / 2); return { q: `x − ${fmtN(a)} = ${fmtN(r)}     x = …`, a: fmtN(a + r) }; }
    if (t === 2) { const x = rnd(2, 12), a = rnd(2, 9); return { q: `x × ${a} = ${fmtN(x * a)}     x = …`, a: fmtN(x) }; }
    const a = rnd(2, 9), x = rnd(2, 12); return { q: `x : ${a} = ${x}     x = …`, a: fmtN(x * a) };
  },
  word(g, L) {
    const n1 = pick(NAMES), n2 = pick(NAMES.filter(x => x !== n1)), it = pick(['quả cam', 'quyển vở', 'viên bi', 'bông hoa', 'cái kẹo']);
    const m = Math.max(10, NUMR[g][Math.max(0, L - 1)] / (g > 2 ? 20 : 1)), a = rnd(5, m), b = rnd(3, m);
    const t = rnd(0, g >= 2 ? 3 : 1);
    if (t === 0) return { q: `${n1} có ${fmtN(a)} ${it}, ${n2} cho thêm ${fmtN(b)} ${it}. Hỏi ${n1} có tất cả bao nhiêu ${it}?`, a: `${fmtN(a + b)} ${it}` };
    if (t === 1) { const A = a + b; return { q: `${n1} có ${fmtN(A)} ${it}, cho ${n2} ${fmtN(b)} ${it}. Hỏi ${n1} còn lại bao nhiêu ${it}?`, a: `${fmtN(a)} ${it}` }; }
    if (t === 2) { const k = rnd(2, 9), c = rnd(2, g > 3 ? 40 : 12); return { q: `Mỗi hộp có ${c} ${it}. Hỏi ${k} hộp như vậy có bao nhiêu ${it}?`, a: `${c * k} ${it}` }; }
    const k = rnd(2, 9), c = rnd(2, g > 3 ? 40 : 12); return { q: `Có ${k * c} ${it} chia đều vào ${k} hộp. Hỏi mỗi hộp có bao nhiêu ${it}?`, a: `${c} ${it}` };
  },
  unit() {
    const t = rnd(0, 3);
    if (t === 0) { const a = rnd(2, 9); return { q: `${a} m = … cm`, a: a * 100 }; }
    if (t === 1) { const a = rnd(2, 9); return { q: `${a} kg = … g`, a: fmtN(a * 1000) }; }
    if (t === 2) { const a = rnd(2, 9); return { q: `${a} giờ = … phút`, a: a * 60 }; }
    const a = rnd(2, 9); return { q: `${a} l = … ml`, a: fmtN(a * 1000) };
  },
  frac() {
    const n = rnd(4, 12), a = rnd(1, n - 3), b = rnd(1, n - a - 1);
    return Math.random() < .5 ? { q: `${a}/${n} + ${b}/${n} = …`, a: `${a + b}/${n}` } : { q: `${a + b}/${n} − ${b}/${n} = …`, a: `${a}/${n}` };
  },
  pct() { const p = pick([10, 20, 25, 50]), v = pick([40, 80, 120, 200, 300]); return { q: `Tìm ${p}% của ${v}.`, a: v * p / 100 }; }
};
function mathQuestion(g, L, types) { const t = pick(types); return G[t](g, L); }

/* ---- Ôn tập hằng tuần ---- */
const RS = { grade: null, subj: 'math', count: 10, level: 2, types: null, sheet: null, weekNo: '', ans: false };
function defaultTypes(g) { return MATH_TYPES.filter(t => t.min <= g && (g > 1 || t.k !== 'word')).map(t => t.k).filter(k => ['add', 'sub', 'mul', 'div', 'cmp', 'x', 'word'].includes(k) || (g >= 3 && k === 'unit') || (g >= 4 && k === 'frac') || (g >= 5 && k === 'pct')); }
V.review = {
  render() {
    if (!RS.grade) RS.grade = S.settings.grade;
    if (!RS.types) RS.types = defaultTypes(RS.grade);
    const avail = MATH_TYPES.filter(t => t.min <= RS.grade);
    const bank = S.bank.length ? S.bank : SAMPLE_BANK;
    return pageHead('Ôn tập hằng tuần', 'Tạo phiếu ôn tập có đáp án, in ra hoặc chiếu lên lớp — làm được cả khi mất mạng',
      `<button class="btn sm" data-a="bankEdit">📚 Ngân hàng câu hỏi (${S.bank.length})</button>`) + `
    <div class="grid" style="grid-template-columns:minmax(260px,330px) 1fr;align-items:start" id="rvgrid">
      <div class="card no-print">
        <label class="f">Khối lớp</label><select data-ch="rvGrade">${[1, 2, 3, 4, 5].map(g => `<option ${RS.grade === g ? 'selected' : ''} value="${g}">Lớp ${g}</option>`).join('')}</select><div style="height:10px"></div>
        <label class="f">Môn</label><div class="row"><span class="chip ${RS.subj === 'math' ? 'on' : ''}" data-a="rvSubj" data-v="math">🔢 Toán</span><span class="chip ${RS.subj === 'vn' ? 'on' : ''}" data-a="rvSubj" data-v="vn">📖 Tiếng Việt / khác</span><span class="chip ${RS.subj === 'mix' ? 'on' : ''}" data-a="rvSubj" data-v="mix">🎯 Kết hợp</span>${window.AI_OK ? `<span class="chip ${RS.subj === 'ai' ? 'on' : ''}" data-a="rvSubj" data-v="ai">🤖 AI ra đề</span>` : ''}</div><div style="height:10px"></div>
        ${RS.subj === 'ai' ? aiPanelHtml() : RS.subj !== 'vn' ? `<label class="f">Dạng toán</label><div class="row" style="gap:6px">${avail.map(t => `<span class="chip ${RS.types.includes(t.k) ? 'on' : ''}" data-a="rvType" data-v="${t.k}">${t.n}</span>`).join('')}</div><div style="height:10px"></div>
        <label class="f">Mức độ</label><div class="row"><span class="chip ${RS.level === 1 ? 'on' : ''}" data-a="rvLevel" data-v="1">Dễ</span><span class="chip ${RS.level === 2 ? 'on' : ''}" data-a="rvLevel" data-v="2">Vừa</span><span class="chip ${RS.level === 3 ? 'on' : ''}" data-a="rvLevel" data-v="3">Khó</span></div><div style="height:10px"></div>` : `<p class="muted small">Lấy câu hỏi từ <b>ngân hàng câu hỏi</b> (${bank.length} câu${S.bank.length ? '' : ' — đang dùng câu mẫu'}).</p>`}
        <div class="row" ${RS.subj === 'ai' ? 'style="display:none"' : ''}><div style="flex:1"><label class="f">Số câu</label><select data-ch="rvCount">${[5, 8, 10, 12, 16, 20].map(n => `<option ${RS.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div style="flex:1"><label class="f">Tuần số</label><input type="text" value="${esc(RS.weekNo)}" data-in="rvWeek" placeholder="…"></div></div>
        ${RS.subj === 'ai' ? `<label class="f" style="margin-top:10px">Tuần số</label><input type="text" value="${esc(RS.weekNo)}" data-in="rvWeek" placeholder="…">` : ''}<button class="btn p lg" id="aiRun" style="width:100%;margin-top:16px" data-a="rvGen">${RS.subj === 'ai' ? '🤖 AI soạn phiếu ôn tập' : '✨ Tạo phiếu ôn tập'}</button><div id="aiStatus" class="small" hidden style="margin-top:10px"></div>
      </div>
      <div>${RS.sheet ? sheetHtml() : `<div class="card empty"><div class="em">📝</div><h3>Chọn dạng bài rồi bấm “Tạo phiếu”</h3><p class="muted">Mỗi lần bấm sẽ ra một phiếu khác nhau, kèm đáp án.</p></div>`}</div>
    </div>`;
  },
  mount() { if (window.innerWidth < 900) $('#rvgrid').style.gridTemplateColumns = '1fr'; }
};
function sheetHtml() {
  return `<div class="row no-print" style="margin-bottom:10px"><button class="btn g" data-a="rvPrint">🖨️ In phiếu</button><button class="btn s" data-a="rvAns">👁️ ${RS.ans ? 'Ẩn' : 'Hiện'} đáp án</button><button class="btn" data-a="rvGen">🔄 Tạo phiếu khác</button><button class="btn" data-a="present">🖥️ Chiếu lên lớp</button></div>
  <div class="sheet print-area ${RS.ans ? 'show' : ''}">
    <div class="hd"><span>${esc(S.settings.school)}</span><span>${esc(S.settings.className)}</span></div>
    <h3>PHIẾU ÔN TẬP${RS.weekNo ? ' TUẦN ' + esc(RS.weekNo) : ' HẰNG TUẦN'}</h3>
    <div class="hd" style="margin-bottom:12px"><span>Họ và tên: <span class="blank" style="min-width:220px"></span></span><span>Ngày: <span class="blank"></span></span></div>
    <ol>${RS.sheet.map(it => `<li>${esc(it.q).replace('…', '<span class="blank"></span>').replace(/\n/g, '<br>')} <span class="ans">→ ${esc(it.a)}</span></li>`).join('')}</ol>
    <p style="text-align:center;font-style:italic;font-size:13px;margin-top:10px">Chúc các em làm bài thật tốt! ⭐</p>
  </div>`;
}
A.rvGrade = el => { RS.grade = +el.value; RS.types = defaultTypes(RS.grade); refresh(); };
A.rvSubj = el => { RS.subj = el.dataset.v; refresh(); };
A.rvLevel = el => { RS.level = +el.dataset.v; refresh(); };
A.rvCount = el => { RS.count = +el.value; };
A.rvWeek = el => { RS.weekNo = el.value; };
A.rvType = el => { const k = el.dataset.v, i = RS.types.indexOf(k); if (i >= 0) { if (RS.types.length > 1) RS.types.splice(i, 1); } else RS.types.push(k); refresh(); };
A.rvGen = () => {
  if (RS.subj === 'ai') return aiGen();
  const out = [], bank = shuffle(S.bank.length ? S.bank : SAMPLE_BANK);
  for (let i = 0; i < RS.count; i++) {
    const useVn = RS.subj === 'vn' || (RS.subj === 'mix' && i % 2 === 1);
    if (useVn) out.push({ ...bank[i % bank.length] }); else out.push(mathQuestion(RS.grade, RS.level, RS.types));
  }
  RS.sheet = out; RS.ans = false; refresh();
};
A.rvAns = () => { RS.ans = !RS.ans; refresh(); };
A.rvPrint = () => window.print();
A.bankEdit = () => {
  openModal(`<h3>📚 Ngân hàng câu hỏi của lớp</h3><p class="muted small">Mỗi dòng một câu: <b>câu hỏi | đáp án</b>. Dùng cho phiếu ôn tập Tiếng Việt và các trò chơi.</p>
  <textarea id="bankTxt" style="min-height:260px;margin:10px 0" placeholder="Từ trái nghĩa với &quot;lớn&quot; là gì? | bé">${esc(S.bank.map(b => b.q + ' | ' + b.a).join('\n'))}</textarea>
  <div class="row"><button class="btn p" data-a="bankSave">Lưu</button><button class="btn" data-a="bankSample">Chèn câu mẫu</button><button class="btn ghost" data-a="closeModal">Đóng</button></div>`);
};
A.bankSave = () => {
  S.bank = $('#bankTxt').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf('|'); return i < 0 ? null : { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() }; }).filter(x => x && x.q && x.a);
  save(); closeModal(); toast(`Đã lưu ${S.bank.length} câu hỏi`); refresh();
};
A.bankSample = () => { const t = $('#bankTxt'); t.value = (t.value ? t.value + '\n' : '') + SAMPLE_BANK.map(b => b.q + ' | ' + b.a).join('\n'); };

/* ---- Thi đua cá nhân ---- */
const SS = { ym: null, q: '' };
V.single = {
  render() {
    SS.ym = SS.ym || curYM(); const isCur = SS.ym === curYM(), rk = rankList(SS.ym), maxV = Math.max(1, ...rk.map(r => r.v));
    const q = SS.q.toLowerCase(), shown = rk.filter(r => !q || r.s.name.toLowerCase().includes(q));
    const top = rk.slice(0, 3);
    return pageHead('Thi đua cá nhân', `Bảng xếp hạng ${monthLabel(SS.ym).toLowerCase()}`,
      `<select data-ch="ssMonth" style="width:auto">${monthsWithData().map(m => `<option value="${m}" ${m === SS.ym ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}</select>
      <button class="btn sm no-present" data-a="present">🖥️ Trình chiếu</button><button class="btn sm no-present" data-a="rankCsv">⬇️ Xuất CSV</button>`) + (!S.students.length ? `<div class="card empty"><div class="em">🏅</div><p>Chưa có học sinh.</p><a class="btn p" href="#/students">Nhập danh sách lớp</a></div>` : `
    ${top.length >= 3 ? `<div class="podium">
      ${[[1, 'p2', '🥈'], [0, 'p1', '🥇'], [2, 'p3', '🥉']].map(([i, c, m]) => `<div class="pod ${c}"><div class="medal">${m}</div>${avatar(top[i].s)}<b>${esc(top[i].s.name)}</b><div class="sc">★ ${top[i].v}</div></div>`).join('')}</div>` : ''}
    <input type="search" placeholder="🔎 Tìm tên học sinh…" value="${esc(SS.q)}" data-in="ssSearch" class="no-present" style="margin-bottom:12px">
    ${shown.map(r => `<div class="rk"><div class="no">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>${avatar(r.s)}
      <div class="nm">${esc(r.s.name)} <span class="tag">${esc(teamName(r.s.team))}</span><div class="bar"><i style="width:${Math.max(0, r.v) / maxV * 100}%"></i></div></div>
      <div class="sc star">★ ${r.v}</div>
      ${isCur ? `<div class="row no-present" style="gap:6px"><button class="pm dn" data-a="quick" data-id="${r.s.id}" data-d="-1">−1</button><button class="pm up" data-a="quick" data-id="${r.s.id}" data-d="1">+1</button><button class="pm up" data-a="quick" data-id="${r.s.id}" data-d="2">+2</button><button class="pm" title="Chọn lí do" data-a="reasons" data-id="${r.s.id}">⋯</button></div>` : ''}</div>`).join('')}
    ${!isCur ? `<p class="muted small" style="text-align:center">Đang xem tháng cũ — chỉ xem, không sửa điểm.</p>` : ''}`);
  }
};
A.ssMonth = el => { SS.ym = el.value; refresh(); };
A.ssSearch = el => { SS.q = el.value; const p = el.selectionStart; refresh(); const n = $('[data-in=ssSearch]'); n.focus(); n.setSelectionRange(p, p); };
A.quick = el => {
  const d = +el.dataset.d; addStar(el.dataset.id, d, d > 0 ? 'Cộng nhanh' : 'Trừ nhanh'); if (d >= 2) confetti(40);
  const y = window.scrollY; refresh(); window.scrollTo(0, y);
};
A.reasons = el => {
  const s = S.students.find(x => x.id === el.dataset.id);
  openModal(`<h3>${esc(s.name)}</h3><p class="muted small" style="margin-top:4px">Chọn lí do để ghi vào nhật ký của em:</p>
  <div class="row" style="gap:8px;margin:12px 0">${S.rewards.map((r, i) => `<span class="chip" style="border-color:var(--mint)" data-a="reasonGo" data-id="${s.id}" data-k="r${i}">+${r.d} ${esc(r.t)}</span>`).join('')}</div>
  <div class="row" style="gap:8px">${S.penalties.map((r, i) => `<span class="chip x" data-a="reasonGo" data-id="${s.id}" data-k="p${i}">${r.d} ${esc(r.t)}</span>`).join('')}</div>`);
};
A.reasonGo = el => { const it = (el.dataset.k[0] === 'r' ? S.rewards : S.penalties)[+el.dataset.k.slice(1)]; addStar(el.dataset.id, it.d, it.t); closeModal(); const y = window.scrollY; refresh(); window.scrollTo(0, y); };
A.rankCsv = () => { const rows = [['Hạng', 'Họ và tên', 'Tổ', 'Sao ' + monthLabel(SS.ym)]]; rankList(SS.ym).forEach(r => rows.push([r.rank, r.s.name, teamName(r.s.team), r.v])); download(`xep-hang-${SS.ym}.csv`, '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv'); };

/* ---- Thi đua theo tổ ---- */
V.teams = {
  render() {
    const ym = curYM(), n = S.teamNames.length, sc = S.teamNames.map((_, i) => teamScore(i, ym)), max = Math.max(1, ...sc.map(s => s.total));
    const order = sc.map((s, i) => i).sort((a, b) => sc[b].total - sc[a].total);
    return pageHead('Thi đua theo tổ', `${monthLabel(ym)} · điểm tổ = sao của các thành viên + điểm thưởng chung`, `<button class="btn sm no-present" data-a="present">🖥️ Trình chiếu</button><button class="btn sm no-present" data-a="shuffleTeams2">🎲 Chia tổ ngẫu nhiên</button>`) + (!S.students.length ? `<div class="card empty"><div class="em">🚩</div><p>Chưa có học sinh.</p><a class="btn p" href="#/students">Nhập danh sách lớp</a></div>` : `
    <div class="card" style="margin-bottom:18px"><h3>🏁 Cuộc đua các tổ</h3>${order.map((i, k) => `<div class="race"><div style="width:96px;font-weight:700">${k === 0 && sc[i].total > 0 ? '👑 ' : ''}${esc(teamName(i))}</div><div class="rb" style="width:${Math.max(1, sc[i].total / max * 100) * .7}%;background:${TEAM_COLORS[i % 8]}"></div><b>★ ${sc[i].total}</b></div>`).join('')}</div>
    <div class="grid g2">${S.teamNames.map((tn, i) => {
      const mem = S.students.filter(s => s.team === i).sort((a, b) => stuMonth(b, ym) - stuMonth(a, ym));
      return `<div class="team"><div class="tb" style="background:${TEAM_COLORS[i % 8]}"></div>
      <input class="tn" value="${esc(tn)}" data-ch="teamRename" data-i="${i}"><div class="row" style="margin:6px 0 10px"><div class="big star">★ ${sc[i].total}</div><span class="muted small">${sc[i].members} từ thành viên · ${sc[i].bonus >= 0 ? '+' : ''}${sc[i].bonus} thưởng chung</span></div>
      <div class="row no-present" style="margin-bottom:12px"><button class="pm dn" data-a="teamPts" data-i="${i}" data-d="-1">−1</button><button class="pm up" data-a="teamPts" data-i="${i}" data-d="1">+1</button><button class="pm up" data-a="teamPts" data-i="${i}" data-d="2">+2</button><button class="pm up" data-a="teamPts" data-i="${i}" data-d="5">+5</button><span class="muted small">thưởng chung cho tổ</span></div>
      <div class="row" style="gap:6px">${mem.map(s => `<span class="chip" title="${esc(s.name)}">${esc(givenName(s.name))} <b class="star">★${stuMonth(s, ym)}</b></span>`).join('') || '<span class="muted small">Chưa có thành viên</span>'}</div></div>`;
    }).join('')}</div>`);
  }
};
A.teamRename = el => { S.teamNames[+el.dataset.i] = el.value.trim() || ('Tổ ' + (+el.dataset.i + 1)); save(); refresh(); };
A.teamPts = el => { const d = +el.dataset.d; S.teamLog.push({ ts: Date.now(), team: +el.dataset.i, d, why: 'Thưởng chung' }); save(); sfx(d > 0 ? 'ding' : 'buzz'); if (d >= 5) confetti(60); const y = window.scrollY; refresh(); window.scrollTo(0, y); };
A.shuffleTeams2 = () => { A.shuffleTeams(); };

/* ---- Đồng hồ đếm ngược ---- */
const CK = { total: 120, left: 120, running: false, endAt: 0 };
const fmtClock = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
V.clock = {
  render() {
    const pre = [30, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700];
    return pageHead('Đồng hồ đếm ngược', 'Hẹn giờ cho hoạt động nhóm, làm bài, trực nhật…', `<button class="btn sm no-present" data-a="present">🖥️ Trình chiếu</button>`) + `
    <div class="card"><div class="clock-wrap"><div class="ring" id="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="none" stroke="var(--line)" stroke-width="14"/><circle id="arc" cx="100" cy="100" r="88" fill="none" stroke="var(--violet)" stroke-width="14" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0"/></svg><div class="tm" id="tm">${fmtClock(CK.left)}</div><div class="ck-bs">${BESAO(86, 'happy')}</div></div>
    <div class="row" style="margin-top:18px;justify-content:center"><button class="btn p lg" id="ckGo" data-a="ckToggle">${CK.running ? '⏸️ Tạm dừng' : '▶️ Bắt đầu'}</button><button class="btn lg" data-a="ckReset">↺ Đặt lại</button></div></div>
    <div class="no-present"><div class="row" style="justify-content:center;gap:8px;margin-top:20px">${pre.map(s => `<span class="chip ${CK.total === s ? 'on' : ''}" data-a="ckSet" data-s="${s}">${s < 60 ? s + ' giây' : s / 60 + ' phút'}</span>`).join('')}</div>
    <div class="row" style="justify-content:center;margin-top:14px"><span class="muted">Tự đặt:</span><input type="number" id="ckM" min="0" max="180" value="${Math.floor(CK.total / 60)}" style="width:80px"> phút <input type="number" id="ckS" min="0" max="59" value="${CK.total % 60}" style="width:80px"> giây <button class="btn sm" data-a="ckCustom">Đặt</button></div></div></div>`;
  },
  mount() { ckPaint(); if (CK.running) ckLoop(); }
};
function ckPaint() {
  const tm = $('#tm'); if (!tm) return; tm.textContent = fmtClock(CK.left);
  const arc = $('#arc'); arc.style.strokeDashoffset = String(553 * (1 - (CK.total ? CK.left / CK.total : 0)));
  const warn = CK.left <= 10 && CK.left > 0 && CK.running; $('#ring').classList.toggle('warn', warn); arc.style.stroke = CK.left <= 10 ? 'var(--coral)' : 'var(--violet)';
}
function ckLoop() {
  clearInterval(window._clockT);
  window._clockT = setInterval(() => {
    const left = Math.max(0, Math.ceil((CK.endAt - Date.now()) / 1000));
    if (left !== CK.left) { CK.left = left; if (left <= 10 && left > 0) sfx('tick'); ckPaint(); }
    if (left <= 0) { CK.running = false; clearInterval(window._clockT); sfx('alarm'); confetti(100); const b = $('#ckGo'); if (b) b.textContent = '▶️ Bắt đầu'; const t = $('#tm'); if (t) t.textContent = 'Hết giờ!'; }
  }, 200);
}
A.ckToggle = () => {
  if (CK.running) { CK.running = false; clearInterval(window._clockT); } else { if (CK.left <= 0) CK.left = CK.total; CK.running = true; CK.endAt = Date.now() + CK.left * 1000; ckLoop(); AC && AC.resume && AC.resume(); sfx('tick'); }
  $('#ckGo').textContent = CK.running ? '⏸️ Tạm dừng' : '▶️ Bắt đầu'; ckPaint();
};
A.ckReset = () => { CK.running = false; clearInterval(window._clockT); CK.left = CK.total; refresh(); };
A.ckSet = el => { CK.total = CK.left = +el.dataset.s; CK.running = false; clearInterval(window._clockT); refresh(); };
A.ckCustom = () => { const t = Math.max(1, (+$('#ckM').value || 0) * 60 + (+$('#ckS').value || 0)); CK.total = CK.left = t; CK.running = false; clearInterval(window._clockT); refresh(); };
