/* ===== Bộ sinh câu hỏi ôn tập theo bài (Toán 3, Tiếng Việt 3 – Kết nối tri thức) =====
   Mỗi khoá (key) trong PPCT.g là một "bộ sinh" tạo câu hỏi mới mỗi lần, đáp án do máy tính tính.
   Dạng câu: mc (A/B/C/D), tf (Đúng/Sai), fill (chọn từ điền chỗ trống), multi (chọn nhiều đáp án),
   match (ghép đôi), order (sắp xếp thứ tự). [[…]] = phần in đậm gạch chân. */
'use strict';
const QG = (() => {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pk = a => a[Math.floor(Math.random() * a.length)];
  const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uniq = a => [...new Set(a)];
  const F = n => typeof n === 'number' && Math.abs(n) >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
  const S = x => typeof x === 'number' ? F(x) : String(x);

  /* ---- dựng câu hỏi ---- */
  function mc(q, right, wrongs, t = 'mc', minW = 2) {
    const r = S(right), w = uniq(wrongs.map(S)).filter(x => x !== r);
    if (w.length < minW) return null;
    const o = sh([r, ...sh(w).slice(0, 3)]);
    return { t, q, o, a: o.indexOf(r) };
  }
  const fill = (q, right, wrongs) => mc(q, right, wrongs, 'fill');
  const tf = (q, a) => ({ t: 'tf', q, a: !!a });
  function multi(q, rights, wrongs, total = 5) {
    const r = uniq(rights.map(S)), w = uniq(wrongs.map(S)).filter(x => !r.includes(x));
    const nr = Math.min(r.length, Math.max(2, total - 3)), rs = sh(r).slice(0, nr), ws = sh(w).slice(0, total - nr);
    if (rs.length < 2 || ws.length < 2) return null;
    const o = sh([...rs, ...ws]); return { t: 'multi', q, o, a: o.map((x, i) => rs.includes(x) ? i : -1).filter(i => i >= 0) };
  }
  function match(q, pairs) {
    const p = pairs.map(([l, r]) => [S(l), S(r)]);
    if (p.length < 3 || uniq(p.map(x => x[0])).length < p.length || uniq(p.map(x => x[1])).length < p.length) return null;
    return { t: 'match', q, p };
  }
  function order(q, items) { const o = items.map(S); if (o.length < 3 || uniq(o).length < o.length) return null; return { t: 'order', q, o }; }

  /* ---- số ---- */
  const DV = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function doc3(n, full) {
    const t = Math.floor(n / 100), c = Math.floor(n % 100 / 10), d = n % 10, w = [];
    if (t || full) w.push(DV[t], 'trăm');
    if (c === 0) { if (d) { if (t || full) w.push('linh'); w.push(DV[d]); } }
    else if (c === 1) { w.push('mười'); if (d) w.push(d === 5 ? 'lăm' : DV[d]); }
    else { w.push(DV[c], 'mươi'); if (d === 1) w.push('mốt'); else if (d === 4) w.push('tư'); else if (d === 5) w.push('lăm'); else if (d) w.push(DV[d]); }
    return w.join(' ');
  }
  const doc = n => { if (!n) return 'không'; const ng = Math.floor(n / 1000), r = n % 1000, w = []; if (ng) w.push(doc3(ng, false), 'nghìn'); if (r) w.push(doc3(r, ng > 0)); return w.join(' '); };
  function near(v, k = 3, min = 0) {
    const s = String(v), c = new Set();
    const steps = v >= 1000 ? [1, 10, 100, 1000, 2, 20] : v >= 100 ? [1, 10, 100, 2, 20, 5] : v >= 20 ? [1, 2, 10, 3, 5] : [1, 2, 3, 4];
    for (const d of steps) { c.add(v + d); c.add(v - d); }
    if (s.length > 1) { const a = s.split(''); [a[a.length - 1], a[a.length - 2]] = [a[a.length - 2], a[a.length - 1]]; c.add(+a.join('')); }
    return sh([...c].filter(x => x >= min && x !== v && String(x).length >= Math.max(1, s.length - 1))).slice(0, k);
  }
  const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, ':': (a, b) => a / b };
  const ex = (a, op, b) => `${F(a)} ${op} ${F(b)}`;

  /* bộ sinh dạng phép tính: make() trả về {a, op, b} (v tự tính) */
  function calc(make, opt = {}) {
    const one = () => { for (let i = 0; i < 40; i++) { const m = make(); const v = OPS[m.op](m.a, m.b); if (Number.isInteger(v) && v >= 0) return { ...m, v }; } return null; };
    const many = n => { const out = [], seen = new Set(); for (let i = 0; i < 80 && out.length < n; i++) { const m = one(); if (m && !seen.has(m.v)) { seen.add(m.v); out.push(m); } } return out; };
    return {
      types: ['mc', 'fill', 'tf', 'match', 'multi', 'order'],
      f(t) {
        const m = one(); if (!m) return null; const e = ex(m.a, m.op, m.b);
        if (t === 'mc') return mc(`${e} = ?`, m.v, near(m.v));
        if (t === 'fill') {
          if (Math.random() < .5) return fill(`${F(m.a)} ${m.op} ___ = ${F(m.v)}`, m.b, near(m.b, 3, 1));
          return fill(`___ ${m.op} ${F(m.b)} = ${F(m.v)}`, m.a, near(m.a, 3, 1));
        }
        if (t === 'tf') { const ok = Math.random() < .5; return tf(`${e} = ${F(ok ? m.v : (near(m.v, 1)[0] ?? m.v + 1))}`, ok); }
        if (t === 'match') { const ms = many(4); return ms.length < 3 ? null : match('Nối mỗi phép tính với kết quả đúng', ms.map(x => [ex(x.a, x.op, x.b), x.v])); }
        if (t === 'multi') {
          const ms = many(5); if (ms.length < 4) return null; const good = ms.slice(0, 2).map(x => `${ex(x.a, x.op, x.b)} = ${F(x.v)}`), bad = ms.slice(2).map(x => `${ex(x.a, x.op, x.b)} = ${F(near(x.v, 1)[0])}`);
          return multi('Chọn tất cả các phép tính đúng', good, bad, 5);
        }
        if (t === 'order') { const ms = many(4); if (ms.length < 4) return null; ms.sort((x, y) => x.v - y.v); return order('Sắp xếp các phép tính theo kết quả từ bé đến lớn', ms.map(x => ex(x.a, x.op, x.b))); }
        return null;
      }
    };
  }
  /* bộ sinh từ danh sách câu hỏi có sẵn: mỗi phần tử là hàm trả về câu hỏi */
  function list(fns, types) { return { types: types || ['mc', 'fill', 'tf', 'multi', 'match', 'order'], f(t) { const c = sh(fns.map(f => () => f(t))); for (const g of c) { const q = g(); if (q && q.t === t) return q; } return null; } }; }
  /* bộ sinh "đọc – viết – cấu tạo – so sánh" số trong một khoảng */
  function numbers(lo, hi, focus) {
    const rnd = () => { let n = R(lo, hi); if (Math.random() < .3) n = n - n % 10 + (Math.random() < .5 ? 0 : 5); if (Math.random() < .25 && hi >= 1000) n = n - Math.floor(n / 10 % 10) * 10; return Math.max(lo, Math.min(hi, n)); };
    const variants = n => { const s = String(n), v = new Set(); if (s.length > 1) { v.add(+s.split('').reverse().join('')); const a = s.split(''); [a[a.length - 1], a[a.length - 2]] = [a[a.length - 2], a[a.length - 1]]; v.add(+a.join('')); } v.add(+(s.slice(0, -1) + '0' + s.slice(-1))); v.add(+(s[0] + '0' + s.slice(1))); v.add(n + 10); v.add(n + 100); return [...v].filter(x => x !== n && x > 0); };
    const units = ['chục nghìn', 'nghìn', 'trăm', 'chục', 'đơn vị'];
    const parts = n => { const s = String(n), u = units.slice(units.length - s.length); return s.split('').map((d, i) => `${d} ${u[i]}`).join(', '); };
    const fns = [
      t => t === 'mc' && (n => mc(`Số “${doc(n)}” viết là:`, n, variants(n)))(rnd()),
      t => t === 'mc' && (n => mc(`Số ${F(n)} đọc là:`, doc(n), variants(n).map(doc)))(rnd()),
      t => t === 'mc' && (n => mc(`Số gồm ${parts(n)} là:`, n, variants(n)))(rnd()),
      t => t === 'fill' && (n => Math.random() < .5 ? fill(`Số liền sau của ${F(n)} là ___`, n + 1, [n - 1, n + 10, n]) : fill(`Số liền trước của ${F(n)} là ___`, n - 1, [n + 1, n - 10, n]))(rnd()),
      t => t === 'fill' && (n => { const g = hi >= 10000 ? pk([1000, 100, 10]) : hi >= 1000 ? pk([100, 10]) : pk([10, 100]); const a = n - n % g; return fill(`Viết số tròn ${g === 10 ? 'chục' : g === 100 ? 'trăm' : 'nghìn'} thích hợp: ${F(a)}; ${F(a + g)}; ___; ${F(a + 3 * g)}`, a + 2 * g, [a + 2 * g + 1, a + 3 * g, a + g * 4]); })(rnd()),
      t => t === 'tf' && (() => { const a = rnd(), b = pk(variants(a)), s = pk(['>', '<']); return tf(`${F(a)} ${s} ${F(b)}`, s === '>' ? a > b : a < b); })(),
      t => t === 'tf' && (n => { const ok = Math.random() < .5; return tf(`Số ${F(n)} đọc là “${ok ? doc(n) : doc(pk(variants(n)))}”.`, ok); })(rnd()),
      t => t === 'order' && (() => { const a = rnd(), xs = uniq([a, ...variants(a)]).slice(0, 4); if (xs.length < 4) return null; const up = Math.random() < .6; xs.sort((x, y) => up ? x - y : y - x); return order(`Sắp xếp các số theo thứ tự từ ${up ? 'bé đến lớn' : 'lớn đến bé'}`, xs); })(),
      t => t === 'multi' && (() => { const m = rnd(), xs = uniq([...variants(m), rnd(), rnd(), rnd()]).filter(x => x !== m), big = xs.filter(x => x > m), sm = xs.filter(x => x < m); return multi(`Chọn tất cả các số lớn hơn ${F(m)}`, big, sm, 5); })(),
      t => t === 'match' && (() => { const xs = uniq([rnd(), rnd(), rnd(), rnd()]); return match('Nối mỗi số với cách đọc đúng', xs.map(n => [n, doc(n)])); })(),
      t => t === 'mc' && focus === 'ss' && (() => { const xs = uniq([rnd(), rnd(), rnd(), rnd()]); if (xs.length < 4) return null; const big = Math.random() < .5, v = big ? Math.max(...xs) : Math.min(...xs); return mc(`Số ${big ? 'lớn' : 'bé'} nhất trong các số ${xs.map(F).join('; ')} là:`, v, xs.filter(x => x !== v)); })(),
    ];
    return list(fns);
  }
  const facts = arr => list(arr.map(x => t => x(t)));

  /* =================== TOÁN =================== */
  const T = {};
  T.so1000 = numbers(100, 999); T.so10000 = numbers(1000, 9999); T.ss10000 = numbers(1000, 9999, 'ss'); T.so100000 = numbers(10000, 99999); T.ss100000 = numbers(10000, 99999, 'ss');
  T.ct1000 = calc(() => { if (Math.random() < .5) { const a = R(100, 800), b = R(10, 999 - a); return { a, op: '+', b }; } const a = R(150, 999), b = R(10, a - 20); return { a, op: '−', b }; });
  T.cong10000 = calc(() => { const a = R(1000, 8000), b = R(100, 9999 - a); return { a, op: '+', b }; });
  T.tru10000 = calc(() => { const a = R(2000, 9999), b = R(100, a - 100); return { a, op: '−', b }; });
  T.cong100000 = calc(() => { const a = R(10000, 80000), b = R(1000, 99999 - a); return { a, op: '+', b }; });
  T.tru100000 = calc(() => { const a = R(20000, 99999), b = R(1000, a - 1000); return { a, op: '−', b }; });
  T.ttpct = facts([
    t => t === 'mc' && (() => { const x = R(12, 90), b = R(10, 90); return mc(`Tìm số thích hợp: ___ + ${b} = ${x + b}`, x, near(x)); })(),
    t => t === 'mc' && (() => { const a = R(50, 200), x = R(10, a - 10); return mc(`Tìm số thích hợp: ${a} − ___ = ${a - x}`, x, [...near(x, 2), a + (a - x)]); })(),
    t => t === 'fill' && (() => { const x = R(60, 300), b = R(10, x - 20); return fill(`___ − ${b} = ${x - b}`, x, [x - 2 * b, ...near(x, 2)].filter(y => y > 0)); })(),
    t => t === 'fill' && (() => { const a = R(10, 90), x = R(10, 90); return fill(`${a} + ___ = ${a + x}`, x, [a + x + a, ...near(x, 2)]); })(),
    t => t === 'tf' && tf('Muốn tìm số hạng chưa biết, ta lấy tổng trừ đi số hạng đã biết.', true),
    t => t === 'tf' && tf('Muốn tìm số bị trừ, ta lấy hiệu cộng với số trừ.', true),
    t => t === 'tf' && tf('Muốn tìm số trừ, ta lấy hiệu cộng với số bị trừ.', false),
    t => t === 'tf' && (() => { const x = R(20, 90), b = R(10, 50), ok = Math.random() < .5; return tf(`Nếu ___ + ${b} = ${x + b} thì số cần điền là ${ok ? x : x + 2 * b}.`, ok); })(),
    t => t === 'match' && match('Nối mỗi phép tính với số cần điền vào chỗ trống', sh([[R(10, 40), R(10, 40)], [R(41, 70), R(10, 40)], [R(71, 99), R(10, 40)]]).map(([x, b], i) => i === 1 ? [`${x + b} − ___ = ${x}`, b] : [`___ + ${b} = ${x + b}`, x])),
    t => t === 'mc' && mc('Trong phép cộng 35 + 47 = 82, số 82 được gọi là:', 'Tổng', ['Số hạng', 'Hiệu', 'Số trừ']),
    t => t === 'mc' && mc('Trong phép trừ 90 − 25 = 65, số 25 được gọi là:', 'Số trừ', ['Số bị trừ', 'Hiệu', 'Số hạng']),
  ]);
  for (const k of [2, 3, 4, 5, 6, 7, 8, 9]) {
    const base = calc(() => { const n = R(2, 10); return Math.random() < .55 ? (Math.random() < .5 ? { a: k, op: '×', b: n } : { a: n, op: '×', b: k }) : { a: k * n, op: ':', b: k }; });
    T['bang' + k] = list([
      t => base.f(t),
      t => t === 'order' && order(`Đếm thêm ${k} rồi sắp xếp các số từ bé đến lớn`, (s => sh([0, 1, 2, 3]).map(i => s + i * k).sort((a, b) => a - b))(k * R(1, 6))),
      t => t === 'fill' && (s => fill(`Đếm thêm ${k}: ${s}; ${s + k}; ___; ${s + 3 * k}`, s + 2 * k, [s + 2 * k + 1, s + 3 * k, s + k + 1]))(k * R(1, 6)),
      t => t === 'mc' && (n => mc(`Mỗi hộp có ${k} cái bánh. ${n} hộp như thế có tất cả bao nhiêu cái bánh?`, k * n, [k + n, k * (n + 1), k * n - 1]))(R(3, 9)),
      t => t === 'mc' && (n => mc(`Có ${k * n} quả cam xếp đều vào ${k} đĩa. Mỗi đĩa có mấy quả cam?`, n, [n + 1, k * n - k, n - 1].filter(x => x > 0)))(R(2, 9)),
    ], base.types);
  }
  T.ttpnc = facts([
    t => t === 'mc' && (() => { const x = R(2, 9), b = R(2, 9); return mc(`Tìm số thích hợp: ___ × ${b} = ${x * b}`, x, uniq([x + 1, x * b - b, x - 1, b]).filter(y => y > 0 && y !== x)); })(),
    t => t === 'mc' && (() => { const q = R(2, 9), b = R(2, 9); return mc(`Tìm số thích hợp: ___ : ${b} = ${q}`, q * b, [q + b, q * b + b, q * b - 1]); })(),
    t => t === 'fill' && (() => { const q = R(2, 9), b = R(2, 9); return fill(`${q * b} : ___ = ${q}`, b, uniq([b + 1, b - 1, q * b - q]).filter(y => y > 0)); })(),
    t => t === 'fill' && (() => { const x = R(2, 9), b = R(2, 9); return fill(`${b} × ___ = ${x * b}`, x, uniq([x + 1, x * b - b, x + b]).filter(y => y > 0 && y !== x)); })(),
    t => t === 'tf' && tf('Muốn tìm thừa số chưa biết, ta lấy tích chia cho thừa số đã biết.', true),
    t => t === 'tf' && tf('Muốn tìm số bị chia, ta lấy thương nhân với số chia.', true),
    t => t === 'tf' && tf('Muốn tìm số chia, ta lấy số bị chia nhân với thương.', false),
    t => t === 'match' && match('Nối mỗi phép tính với số cần điền', uniq([R(2, 9), R(2, 9), R(2, 9), R(2, 9)]).slice(0, 3).map((x, i) => { const b = i + 3; return [`___ × ${b} = ${x * b}`, x]; })),
    t => t === 'mc' && mc('Trong phép chia 56 : 7 = 8, số 56 được gọi là:', 'Số bị chia', ['Số chia', 'Thương', 'Tích']),
  ]);
  T.phan = facts([
    t => t === 'mc' && (() => { const n = R(2, 9), m = n * R(2, 9); return mc(`1/${n} của ${m} là:`, m / n, uniq([m - n, m / n + 1, n, m * n]).filter(x => x > 0 && x !== m / n)); })(),
    t => t === 'fill' && (() => { const n = R(2, 6), q = R(2, 8), m = n * q; return fill(`Có ${m} cái kẹo chia đều thành ${n} phần. Mỗi phần là 1/${n} số kẹo, tức là ___ cái kẹo.`, q, [q + 1, m - n, n]); })(),
    t => t === 'match' && match('Nối cách viết với cách đọc', [['1/2', 'một phần hai'], ['1/3', 'một phần ba'], ['1/4', 'một phần tư'], ['1/5', 'một phần năm']]),
    t => t === 'tf' && (() => { const n = R(2, 9), m = n * R(2, 9), ok = Math.random() < .5; return tf(`1/${n} của ${m} là ${ok ? m / n : m - n}.`, ok); })(),
    t => t === 'mc' && mc('Một cái bánh được cắt thành 4 phần bằng nhau. Bạn Hà ăn 1 phần. Bạn Hà đã ăn:', '1/4 cái bánh', ['1/3 cái bánh', '1/2 cái bánh', '1/5 cái bánh']),
    t => t === 'order' && order('Sắp xếp các số đo theo thứ tự từ bé đến lớn', ['1/2 của 10 cm', '1/2 của 16 cm', '1/3 của 30 cm', '1/2 của 24 cm']),
  ]);
  T.dl2 = facts([
    t => t === 'mc' && (n => mc(`${n} m = ___ cm`, n * 100, [n * 10, n * 1000, n + 100]))(R(2, 9)),
    t => t === 'fill' && (n => fill(`${n} dm = ___ cm`, n * 10, [n * 100, n + 10, n]))(R(2, 9)),
    t => t === 'fill' && fill('1 km = ___ m', 1000, [100, 10, 10000]),
    t => t === 'mc' && mc('1 giờ = ___ phút', 60, [100, 30, 24]),
    t => t === 'mc' && mc('1 ngày có ___ giờ', 24, [12, 60, 30]),
    t => t === 'tf' && tf('1 m = 10 dm', true), t => t === 'tf' && tf('1 dm = 100 cm', false),
    t => t === 'match' && match('Nối cho đúng', [['1 m', '100 cm'], ['1 dm', '10 cm'], ['1 km', '1000 m'], ['1 giờ', '60 phút']]),
    t => t === 'order' && order('Sắp xếp các độ dài từ bé đến lớn', ['9 cm', '1 dm 2 cm', '50 cm', '1 m']),
    t => t === 'multi' && multi('Chọn tất cả các đơn vị đo độ dài', ['cm', 'dm', 'm', 'km'], ['kg', 'l', 'giờ']),
  ]);
  T.hinh2 = facts([
    t => t === 'mc' && mc('Hình tứ giác có mấy cạnh?', 4, [3, 5, 2]),
    t => t === 'mc' && mc('Hình tam giác có mấy cạnh?', 3, [4, 2, 5]),
    t => t === 'fill' && (([a, b, c]) => fill(`Đường gấp khúc ABCD gồm ba đoạn dài ${a} cm, ${b} cm và ${c} cm. Độ dài đường gấp khúc là ___ cm.`, a + b + c, [a + b, a + b + c + 1, a * 3]))([R(2, 9), R(2, 9), R(2, 9)]),
    t => t === 'tf' && tf('Hình tứ giác có 4 đỉnh.', true),
    t => t === 'match' && match('Nối hình với số cạnh', [['Hình tam giác', '3 cạnh'], ['Hình tứ giác', '4 cạnh'], ['Hình chữ nhật', '2 cạnh dài bằng nhau, 2 cạnh ngắn bằng nhau'], ['Hình vuông', '4 cạnh bằng nhau']]),
  ]);
  T.trungdiem = facts([
    t => t === 'fill' && (h => fill(`M là trung điểm của đoạn thẳng AB. Đoạn thẳng AB dài ${2 * h} cm. Đoạn thẳng AM dài ___ cm.`, h, [2 * h, h + 2, 4 * h]))(R(2, 15)),
    t => t === 'mc' && (h => mc(`I là trung điểm của đoạn thẳng CD, CI = ${h} cm. Đoạn thẳng CD dài:`, `${2 * h} cm`, [`${h} cm`, `${h + 2} cm`, `${3 * h} cm`]))(R(2, 12)),
    t => t === 'tf' && tf('Trung điểm của đoạn thẳng chia đoạn thẳng đó thành hai phần bằng nhau.', true),
    t => t === 'tf' && tf('Mọi điểm ở giữa hai điểm A và B đều là trung điểm của đoạn thẳng AB.', false),
    t => t === 'tf' && tf('Ba điểm A, M, B thẳng hàng, M nằm giữa A và B thì M là điểm ở giữa hai điểm A và B.', true),
    t => t === 'match' && match('M là trung điểm của đoạn thẳng AB. Nối độ dài AB với độ dài AM', sh([4, 6, 8, 10, 12, 14, 16]).slice(0, 3).map(n => [`AB = ${n} cm`, `AM = ${n / 2} cm`])),
    t => t === 'multi' && multi('Chọn các câu đúng', ['Trung điểm của đoạn thẳng nằm ở giữa đoạn thẳng đó.', 'Trung điểm chia đoạn thẳng thành hai đoạn dài bằng nhau.'], ['Một đoạn thẳng có hai trung điểm.', 'Trung điểm luôn trùng với một đầu đoạn thẳng.', 'Điểm nằm ngoài đoạn thẳng có thể là trung điểm.']),
    t => t === 'mc' && mc('O là trung điểm của đoạn thẳng AB khi:', 'O ở giữa A, B và OA = OB', ['O nằm ngoài đoạn thẳng AB', 'O ở giữa A, B nhưng OA dài hơn OB', 'O trùng với điểm A']),
  ]);
  T.tron = facts([
    t => t === 'fill' && (r => fill(`Hình tròn tâm O có bán kính ${r} cm. Đường kính của hình tròn là ___ cm.`, 2 * r, [r, r + 2, r * 4]))(R(2, 12)),
    t => t === 'mc' && (r => mc(`Hình tròn có đường kính ${2 * r} cm thì bán kính là:`, `${r} cm`, [`${2 * r} cm`, `${4 * r} cm`, `${r + 1} cm`]))(R(2, 10)),
    t => t === 'tf' && tf('Trong một hình tròn, đường kính dài gấp 2 lần bán kính.', true),
    t => t === 'tf' && tf('Trong một hình tròn, các bán kính có độ dài khác nhau.', false),
    t => t === 'mc' && mc('Dụng cụ dùng để vẽ hình tròn là:', 'Com-pa', ['Ê ke', 'Thước đo độ', 'Bút chì màu']),
    t => t === 'match' && match('Nối cho đúng (hình tròn tâm O, AB là đường kính)', [['O', 'tâm'], ['OA', 'bán kính'], ['AB', 'đường kính']]),
  ]);
  T.goc = facts([
    t => t === 'mc' && mc('Dụng cụ dùng để kiểm tra góc vuông là:', 'Ê ke', ['Com-pa', 'Bút chì', 'Cục tẩy']),
    t => t === 'mc' && mc('Hình vuông có mấy góc vuông?', 4, [2, 3, 1]),
    t => t === 'tf' && tf('Lúc 3 giờ, kim giờ và kim phút tạo thành một góc vuông.', true),
    t => t === 'tf' && tf('Lúc 6 giờ, kim giờ và kim phút tạo thành một góc vuông.', false),
    t => t === 'tf' && tf('Một góc gồm có một đỉnh và hai cạnh.', true),
    t => t === 'multi' && multi('Chọn các hình có 4 góc vuông', ['Hình vuông', 'Hình chữ nhật'], ['Hình tam giác', 'Hình tròn', 'Đường gấp khúc']),
    t => t === 'fill' && fill('Góc vuông được kiểm tra bằng ___ .', 'ê ke', ['com-pa', 'thước dây', 'cân']),
    t => t === 'tf' && (h => tf(`Lúc ${h} giờ, kim giờ và kim phút tạo thành một góc vuông.`, h === 3 || h === 9))(pk([1, 2, 3, 4, 5, 6, 9, 12])),
    t => t === 'multi' && multi('Chọn các thời điểm kim giờ và kim phút tạo thành góc vuông', ['3 giờ', '9 giờ'], ['6 giờ', '12 giờ', '1 giờ', '7 giờ']),
    t => t === 'match' && match('Nối dụng cụ với công dụng', [['Ê ke', 'kiểm tra góc vuông'], ['Thước thẳng', 'đo độ dài đoạn thẳng'], ['Com-pa', 'vẽ hình tròn']]),
  ]);
  T.hinh = facts([
    t => t === 'match' && match('Nối hình với đặc điểm', [['Hình tam giác', '3 cạnh, 3 đỉnh'], ['Hình vuông', '4 cạnh bằng nhau, 4 góc vuông'], ['Hình chữ nhật', '2 chiều dài bằng nhau, 2 chiều rộng bằng nhau, 4 góc vuông'], ['Hình tứ giác', '4 cạnh, 4 đỉnh']]),
    t => t === 'multi' && multi('Chọn tất cả các đặc điểm của hình chữ nhật', ['Có 4 góc vuông', 'Có hai chiều dài bằng nhau', 'Có hai chiều rộng bằng nhau'], ['Có 3 cạnh', 'Có 5 đỉnh', 'Không có góc vuông nào']),
    t => t === 'tf' && tf('Hình vuông có 4 cạnh bằng nhau.', true),
    t => t === 'tf' && tf('Hình tam giác có 4 đỉnh.', false),
    t => t === 'mc' && mc('Hình nào có 4 cạnh bằng nhau và 4 góc vuông?', 'Hình vuông', ['Hình tam giác', 'Hình tròn', 'Hình tứ giác bất kì']),
    t => t === 'mc' && mc('Hình chữ nhật ABCD có mấy góc vuông?', 4, [2, 3, 0]),
    t => t === 'fill' && (n => fill(`Hình vuông ABCD có cạnh AB dài ${n} cm. Cạnh CD dài ___ cm.`, n, [n * 2, n * 4, n + 1]))(R(2, 15)),
    t => t === 'fill' && ((a, b) => fill(`Hình chữ nhật ABCD có chiều dài AB = ${a} cm, chiều rộng BC = ${b} cm. Cạnh CD dài ___ cm.`, a, [b, a + b, a * 2]))(R(6, 15), R(2, 5)),
    t => t === 'mc' && mc('Hình nào có 3 đỉnh, 3 cạnh?', 'Hình tam giác', ['Hình vuông', 'Hình chữ nhật', 'Hình tứ giác']),
    t => t === 'tf' && tf('Hình chữ nhật có hai cạnh dài bằng nhau và hai cạnh ngắn bằng nhau.', true),
  ]);
  T.ve = facts([
    t => t === 'match' && match('Nối dụng cụ với việc dùng để vẽ', [['Ê ke', 'vẽ góc vuông'], ['Com-pa', 'vẽ đường tròn'], ['Thước thẳng', 'vẽ đoạn thẳng']]),
    t => t === 'mc' && mc('Muốn vẽ đường tròn có bán kính 3 cm, ta mở com-pa một khoảng:', '3 cm', ['6 cm', '1 cm', '9 cm']),
    t => t === 'tf' && tf('Có thể dùng ê ke để vẽ góc vuông.', true),
    t => t === 'mc' && mc('Để vẽ hình vuông, ta cần vẽ mấy góc vuông?', 4, [1, 2, 3]),
    t => t === 'order' && order('Sắp xếp các bước vẽ góc vuông đỉnh O bằng ê ke', ['Đặt đỉnh góc vuông của ê ke trùng với điểm O', 'Đặt một cạnh ê ke trùng với cạnh đã cho', 'Vẽ cạnh còn lại theo cạnh kia của ê ke']),
  ]);
  T.khoi = facts([
    t => t === 'mc' && mc('Khối lập phương có mấy mặt?', 6, [4, 8, 12]),
    t => t === 'mc' && mc('Khối hộp chữ nhật có mấy đỉnh?', 8, [6, 4, 12]),
    t => t === 'fill' && fill('Khối lập phương có ___ cạnh.', 12, [6, 8, 10]),
    t => t === 'tf' && tf('Các mặt của khối lập phương đều là hình vuông.', true),
    t => t === 'tf' && tf('Khối hộp chữ nhật có 4 mặt.', false),
    t => t === 'multi' && multi('Chọn các đồ vật có dạng khối lập phương', ['Con xúc xắc', 'Khối ru-bích'], ['Quả bóng', 'Cái bút chì', 'Lon nước ngọt']),
    t => t === 'match' && match('Nối cho đúng (khối lập phương)', [['Số mặt', 6], ['Số đỉnh', 8], ['Số cạnh', 12]]),
    t => t === 'multi' && multi('Chọn các đồ vật có dạng khối hộp chữ nhật', ['Viên gạch', 'Hộp sữa giấy', 'Bao diêm'], ['Quả bóng', 'Lon nước ngọt', 'Quả trứng']),
    t => t === 'mc' && mc('Các mặt của khối hộp chữ nhật là hình gì?', 'Hình chữ nhật', ['Hình tròn', 'Hình tam giác', 'Hình tứ giác bất kì']),
    t => t === 'fill' && fill('Khối hộp chữ nhật có ___ mặt.', 6, [4, 8, 12]),
  ]);
  T.nhan2x1 = calc(() => { const b = R(2, 9), a = R(11, Math.min(99, Math.floor(999 / b))); return { a, op: '×', b }; });
  T.chia2x1 = calc(() => { const b = R(2, 9), q = R(Math.ceil(10 / b), Math.floor(99 / b)); return { a: q * b, op: ':', b }; });
  T.nhan3x1 = calc(() => { const b = R(2, 5), a = R(101, Math.floor(999 / b)); return { a, op: '×', b }; });
  T.chia3x1 = calc(() => { const b = R(2, 9), q = R(Math.ceil(100 / b), Math.floor(999 / b)); return { a: q * b, op: ':', b }; });
  T.nhan4x1 = calc(() => { const b = R(2, 5), a = R(1001, Math.floor(9999 / b)); return { a, op: '×', b }; });
  T.chia4x1 = calc(() => { const b = R(2, 9), q = R(Math.ceil(1000 / b), Math.floor(9999 / b)); return { a: q * b, op: ':', b }; });
  T.nhan5x1 = calc(() => { const b = R(2, 5), a = R(10001, Math.floor(99999 / b)); return { a, op: '×', b }; });
  T.chia5x1 = calc(() => { const b = R(2, 9), q = R(Math.ceil(10000 / b), Math.floor(99999 / b)); return { a: q * b, op: ':', b }; });
  T.gap = facts([
    t => t === 'mc' && ((a, k) => mc(`Gấp ${a} lên ${k} lần được:`, a * k, [a + k, a * k + a, a * (k - 1)].filter(x => x !== a * k)))(R(2, 12), R(2, 6)),
    t => t === 'fill' && ((a, k) => fill(`Lan có ${a} bông hoa. Mai có số hoa gấp ${k} lần số hoa của Lan. Mai có ___ bông hoa.`, a * k, [a + k, a * k + k, a * k - 1]))(R(3, 9), R(2, 5)),
    t => t === 'tf' && ((a, k) => { const ok = Math.random() < .5; return tf(`Gấp ${a} lên ${k} lần được ${ok ? a * k : a + k}.`, ok); })(R(3, 9), R(2, 5)),
    t => t === 'match' && match('Nối cho đúng', sh([[4, 3], [5, 2], [6, 4], [7, 3]]).slice(0, 3).map(([a, k]) => [`Gấp ${a} lên ${k} lần`, a * k])),
    t => t === 'tf' && tf('Muốn gấp một số lên nhiều lần, ta lấy số đó nhân với số lần.', true),
  ]);
  T.giam = facts([
    t => t === 'mc' && ((q, k) => mc(`Giảm ${q * k} đi ${k} lần được:`, q, [q * k - k, q + 1, q * k + k].filter(x => x > 0 && x !== q)))(R(2, 9), R(2, 6)),
    t => t === 'fill' && ((q, k) => fill(`Mẹ có ${q * k} quả cam. Số cam của Lan bằng số cam của mẹ giảm đi ${k} lần. Lan có ___ quả cam.`, q, [q * k - k, q + k, q * k]))(R(2, 8), R(2, 5)),
    t => t === 'tf' && ((q, k) => { const ok = Math.random() < .5; return tf(`Giảm ${q * k} đi ${k} lần được ${ok ? q : q * k - k}.`, ok); })(R(2, 9), R(2, 5)),
    t => t === 'tf' && tf('Muốn giảm một số đi nhiều lần, ta lấy số đó chia cho số lần.', true),
    t => t === 'match' && match('Nối cho đúng', [['Giảm 24 đi 4 lần', 6], ['Giảm 24 đi 4 đơn vị', 20], ['Gấp 24 lên 2 lần', 48]]),
  ]);
  T.chiadu = facts([
    t => t === 'mc' && ((b, q, r) => mc(`${q * b + r} : ${b} = ?`, `${q} (dư ${r})`, [`${q} (dư ${r + b})`, `${q + 1} (dư ${r})`, `${q - 1} (dư ${r + 1})`]))(R(3, 9), R(2, 9), 0 + R(1, 2)),
    t => t === 'fill' && (b => fill(`Trong phép chia có dư với số chia là ${b}, số dư lớn nhất là ___`, b - 1, [b, b + 1, b - 2]))(R(3, 9)),
    t => t === 'tf' && tf('Trong phép chia có dư, số dư luôn bé hơn số chia.', true),
    t => t === 'tf' && ((b, q) => tf(`${q * b} : ${b} là phép chia hết.`, true))(R(2, 9), R(2, 9)),
    t => t === 'tf' && ((b, q) => tf(`${q * b + 1} : ${b} là phép chia hết.`, false))(R(3, 9), R(2, 9)),
    t => t === 'multi' && multi('Chọn các phép chia hết', ['18 : 3', '20 : 5', '42 : 6'], ['19 : 3', '23 : 5', '44 : 6']),
  ]);
  const ITEMS = [['quyển vở', 'quyển'], ['quả cam', 'quả'], ['cái bánh', 'cái'], ['bông hoa', 'bông'], ['cây bút', 'cây']];
  T.haipt = facts([
    t => (t === 'mc' || t === 'fill') && ((a, b) => (t === 'mc' ? mc : fill)(`Thùng thứ nhất có ${a} l dầu, thùng thứ hai nhiều hơn thùng thứ nhất ${b} l. Cả hai thùng có ${t === 'fill' ? '___ l dầu.' : 'bao nhiêu lít dầu?'}`, t === 'mc' ? `${2 * a + b} l` : 2 * a + b, t === 'mc' ? [`${a + b} l`, `${2 * a} l`, `${2 * a + 2 * b} l`] : [a + b, 2 * a, 2 * a + 2 * b]))(R(12, 40), R(3, 15)),
    t => t === 'mc' && ((a, b) => mc(`Lớp 3A có ${a} bạn nam, số bạn nữ ít hơn số bạn nam ${b} bạn. Lớp 3A có tất cả bao nhiêu bạn?`, `${2 * a - b} bạn`, [`${a - b} bạn`, `${2 * a + b} bạn`, `${a + b} bạn`]))(R(14, 20), R(1, 5)),
    t => t === 'mc' && ((a, k) => mc(`Bao thứ nhất có ${a} kg ngô, bao thứ hai có số ngô gấp ${k} lần bao thứ nhất. Cả hai bao có bao nhiêu ki-lô-gam ngô?`, `${a + a * k} kg`, [`${a * k} kg`, `${a + k} kg`, `${a * k + k} kg`]))(R(5, 20), R(2, 4)),
    t => t === 'fill' && ((a, b, c) => { const [it, u] = pk(ITEMS); return fill(`Mỗi hộp có ${a} ${it}. Mẹ mua ${b} hộp rồi cho em ${c} ${u}. Mẹ còn lại ___ ${u}.`, a * b - c, [a * b, a * b + c, a + b - c].filter(x => x > 0)); })(R(4, 9), R(2, 5), R(2, 6)),
    t => t === 'tf' && ((a, b, c) => { const ok = Math.random() < .5; return tf(`Cửa hàng có ${a} kg gạo, đã bán ${b} kg rồi nhập thêm ${c} kg. Cửa hàng có ${ok ? a - b + c : a - b - c} kg gạo.`, ok); })(R(60, 99), R(10, 40), R(5, 30)),
    t => t === 'order' && order('Sắp xếp các bước giải bài toán: “Hộp xanh có 12 bút, hộp đỏ nhiều hơn hộp xanh 5 bút. Cả hai hộp có bao nhiêu bút?”', ['Tìm số bút hộp đỏ: 12 + 5 = 17', 'Tìm số bút cả hai hộp: 12 + 17 = 29', 'Đáp số: 29 bút']),
  ]);
  T.mm = facts([
    t => t === 'mc' && (n => mc(`${n} cm = ___ mm`, n * 10, [n * 100, n + 10, n]))(R(2, 9)),
    t => t === 'fill' && (n => fill(`${n * 10} mm = ___ cm`, n, [n * 10, n * 100, n + 10]))(R(2, 9)),
    t => t === 'fill' && ((a, b) => fill(`${a} cm ${b} mm = ___ mm`, a * 10 + b, [a + b, a * 100 + b, a * 10]))(R(1, 9), R(1, 9)),
    t => t === 'tf' && tf('1 m = 1000 mm', true), t => t === 'tf' && tf('1 cm = 100 mm', false),
    t => t === 'match' && match('Nối cho đúng', [['1 cm', '10 mm'], ['1 dm', '100 mm'], ['1 m', '1000 mm']]),
    t => t === 'order' && order('Sắp xếp các độ dài từ bé đến lớn', ['8 mm', '1 cm', '15 mm', '2 cm']),
    t => t === 'mc' && mc('Chiều dày của một quyển vở khoảng:', '5 mm', ['5 m', '5 dm', '5 km']),
  ]);
  T.gam = facts([
    t => t === 'mc' && (n => mc(`${n} kg = ___ g`, n * 1000, [n * 100, n * 10, n + 1000]))(R(2, 9)),
    t => t === 'fill' && ((a, b) => fill(`${a} g + ${b} g = ___ g`, a + b, [a + b + 100, a - b > 0 ? a - b : a + b + 10, a + b - 10]))(R(1, 6) * 100, R(1, 3) * 100),
    t => t === 'mc' && mc('Một quả trứng gà nặng khoảng:', '50 g', ['50 kg', '5 kg', '500 kg']),
    t => t === 'tf' && tf('1 kg = 1000 g', true), t => t === 'tf' && tf('500 g nặng hơn 1 kg.', false),
    t => t === 'order' && order('Sắp xếp các khối lượng từ nhẹ đến nặng', ['200 g', '700 g', '1 kg', '2 kg']),
    t => t === 'multi' && multi('Chọn các vật nặng dưới 1 kg', ['Một quả táo', 'Một cái bút chì', 'Một quyển vở'], ['Một bao gạo 10 kg', 'Một con lợn', 'Một chiếc xe đạp']),
  ]);
  T.ml = facts([
    t => t === 'mc' && (n => mc(`${n} l = ___ ml`, n * 1000, [n * 100, n * 10, n + 1000]))(R(2, 9)),
    t => t === 'fill' && ((a, b) => fill(`${a} ml + ${b} ml = ___ ml`, a + b, [a + b + 100, a + b - 50, a * b / 100]))(R(1, 6) * 100, R(1, 3) * 100),
    t => t === 'mc' && mc('Một cốc nước uống thường chứa khoảng:', '200 ml', ['200 l', '2 ml', '20 l']),
    t => t === 'tf' && tf('1 l = 1000 ml', true), t => t === 'tf' && tf('Một chai nước mắm nhỏ chứa khoảng 500 l.', false),
    t => t === 'order' && order('Sắp xếp các lượng nước từ ít đến nhiều', ['100 ml', '250 ml', '500 ml', '1 l']),
  ]);
  T.nhietdo = facts([
    t => t === 'mc' && mc('Nhiệt độ cơ thể của người khoẻ mạnh khoảng:', '37 °C', ['20 °C', '50 °C', '100 °C']),
    t => t === 'mc' && mc('Nước sôi ở nhiệt độ:', '100 °C', ['37 °C', '0 °C', '50 °C']),
    t => t === 'fill' && fill('Nước đóng băng ở ___ °C.', 0, [10, 37, 100]),
    t => t === 'fill' && ((a, d) => fill(`Hôm qua nhiệt độ là ${a} °C, hôm nay là ${a + d} °C. Hôm nay nóng hơn hôm qua ___ độ.`, d, [a + d, d + 2, a]))(R(20, 28), R(2, 6)),
    t => t === 'tf' && tf('35 °C nóng hơn 25 °C.', true), t => t === 'tf' && tf('Đơn vị đo nhiệt độ là ki-lô-gam.', false),
    t => t === 'order' && order('Sắp xếp các nhiệt độ từ thấp đến cao', ['0 °C', '18 °C', '37 °C', '100 °C']),
    t => t === 'mc' && mc('Dụng cụ dùng để đo nhiệt độ là:', 'Nhiệt kế', ['Cân', 'Thước kẻ', 'Đồng hồ']),
  ]);
  const evalE = (s) => { const t = s.replace(/×/g, '*').replace(/:/g, '/').replace(/−/g, '-'); return Function('return (' + t + ')')(); };
  const BT = [
    () => { const a = R(10, 60), b = R(2, 9), c = R(2, 9); return { e: `${a} + ${b} × ${c}`, mis: (a + b) * c }; },
    () => { const a = R(60, 99), b = R(2, 9), c = R(2, 5); return { e: `${a} − ${b} × ${c}`, mis: (a - b) * c }; },
    () => { const a = R(2, 9), b = R(2, 9), c = R(2, 6); return { e: `(${a} + ${b}) × ${c}`, mis: a + b * c }; },
    () => { const b = R(2, 9), q = R(2, 9), c = R(10, 50); return { e: `${c} + ${b * q} : ${b}`, mis: (c + b * q) / b }; },
    () => { const a = R(100, 300), b = R(10, 60), c = R(10, 60); return { e: `${a} − ${b} + ${c}`, mis: a - (b + c) }; },
    () => { const b = R(2, 5), x = R(2, 9), y = R(2, 9); return { e: `(${b * x + b * y} − ${b * y}) : ${b}`, mis: b * x + b * y - y }; },
    () => { const a = R(2, 9), b = R(2, 9), c = R(5, 40); return { e: `${a} × ${b} + ${c}`, mis: a * (b + c) }; },
  ];
  const btMany = n => { const out = [], seen = new Set(); for (let i = 0; i < 60 && out.length < n; i++) { const { e } = pk(BT)(), v = evalE(e); if (Number.isInteger(v) && v >= 0 && !seen.has(v)) { seen.add(v); out.push([e, v]); } } return out; };
  T.bieuthuc = list([
    t => (t === 'mc' || t === 'fill') && (() => {
      const { e, mis } = pk(BT)(), v = evalE(e); if (!Number.isInteger(v) || v < 0) return null;
      const w = uniq([mis, ...near(v, 3)]).filter(x => Number.isInteger(x) && x >= 0 && x !== v);
      return (t === 'mc' ? mc : fill)(t === 'mc' ? `Giá trị của biểu thức ${e} là:` : `${e} = ___`, v, w);
    })(),
    t => t === 'tf' && tf('Trong biểu thức có phép cộng và phép nhân, ta thực hiện phép nhân trước.', true),
    t => t === 'tf' && tf('Biểu thức có dấu ngoặc thì ta thực hiện các phép tính ngoài ngoặc trước.', false),
    t => t === 'tf' && (() => { const a = R(10, 50), b = R(2, 9), c = R(2, 9), ok = Math.random() < .5; return tf(`${a} + ${b} × ${c} = ${ok ? a + b * c : (a + b) * c}`, ok); })(),
    t => t === 'match' && (p => p.length < 3 ? null : match('Nối biểu thức với giá trị của nó', p))(btMany(4)),
    t => t === 'order' && (p => p.length < 4 ? null : order('Sắp xếp các biểu thức theo giá trị từ bé đến lớn', p.sort((a, b) => a[1] - b[1]).map(x => x[0])))(btMany(4)),
    t => t === 'multi' && multi('Chọn các biểu thức có giá trị bằng 20', ['4 × 5', '(2 + 3) × 4', '40 : 2'], ['2 + 3 × 4', '30 − 5 × 3', '24 : 4 + 2']),
  ]);
  T.gapmay = facts([
    t => t === 'mc' && ((b, k) => mc(`Số lớn là ${b * k}, số bé là ${b}. Số lớn gấp số bé mấy lần?`, `${k} lần`, [`${b * k - b} lần`, `${k + 1} lần`, `${b} lần`]))(R(2, 9), R(2, 9)),
    t => t === 'fill' && ((b, k) => fill(`Con lợn cân nặng ${b * k} kg, con chó cân nặng ${b} kg. Con lợn nặng gấp ___ lần con chó.`, k, [b * k - b, k + 1, b]))(R(5, 15), R(2, 6)),
    t => t === 'tf' && tf('Muốn tìm số lớn gấp mấy lần số bé, ta lấy số lớn chia cho số bé.', true),
    t => t === 'tf' && ((b, k) => tf(`${b * k} gấp ${b} là ${b * k - b} lần.`, false))(R(3, 9), R(3, 6)),
    t => t === 'match' && match('Nối cho đúng', [['36 gấp 4 mấy lần?', '9 lần'], ['30 gấp 5 mấy lần?', '6 lần'], ['56 gấp 7 mấy lần?', '8 lần']]),
  ]);
  const ROMAN = n => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, c] of m) while (n >= v) { s += c; n -= v; } return s; };
  T.lama = facts([
    t => t === 'mc' && (n => mc(`Số ${ROMAN(n)} viết bằng chữ số thông thường là:`, n, uniq([n + 1, n - 1, n + 2, n === 9 ? 11 : n === 4 ? 6 : n + 10]).filter(x => x > 0 && x !== n)))(R(2, 20)),
    t => t === 'fill' && (n => fill(`Số ${n} viết bằng chữ số La Mã là ___`, ROMAN(n), uniq([ROMAN(n + 1), ROMAN(Math.max(1, n - 1)), n === 9 ? 'VIIII' : n === 4 ? 'IIII' : ROMAN(n + 2)]).filter(x => x !== ROMAN(n))))(R(2, 20)),
    t => t === 'tf' && tf('IX là số 9.', true), t => t === 'tf' && tf('XI là số 9.', false),
    t => t === 'match' && (() => { const xs = sh([4, 6, 9, 11, 12, 19, 20]).slice(0, 4); return match('Nối số La Mã với số tương ứng', xs.map(n => [ROMAN(n), n])); })(),
    t => t === 'order' && (() => { const xs = sh([2, 5, 8, 10, 13, 17, 20]).slice(0, 4).sort((a, b) => a - b); return order('Sắp xếp các số La Mã từ bé đến lớn', xs.map(ROMAN)); })(),
  ]);
  const round = (n, g) => Math.floor((n + g / 2) / g) * g;
  const lamtron = (lo, hi, gs, names) => facts([
    t => t === 'mc' && (() => { const n = R(lo, hi), i = R(0, gs.length - 1), g = gs[i], v = round(n, g), w = uniq([v - g, v + g, n - n % g, n - n % g + g, round(n, g / 10 || 1)]).filter(x => x !== v && x > 0); return mc(`Làm tròn số ${F(n)} đến hàng ${names[i]} ta được:`, v, w); })(),
    t => t === 'fill' && (() => { const i = R(0, gs.length - 1), g = gs[i], n = R(lo, hi), v = round(n, g); return fill(`Số ${F(n)} làm tròn đến hàng ${names[i]} là ___`, v, uniq([v - g, v + g, n - n % (g / 10 || 1)]).filter(x => x !== v)); })(),
    t => t === 'tf' && tf('Khi làm tròn, nếu chữ số ở hàng ngay sau bé hơn 5 thì ta làm tròn xuống.', true),
    t => t === 'match' && (() => { const i = R(0, gs.length - 1), g = gs[i], xs = []; for (let j = 0; j < 30 && xs.length < 4; j++) { const n = R(lo, hi); if (!xs.some(x => round(x, g) === round(n, g))) xs.push(n); } return match(`Nối mỗi số với số làm tròn đến hàng ${names[i]}`, xs.map(n => [F(n), F(round(n, g))])); })(),
    t => t === 'multi' && (() => { const i = R(0, gs.length - 1), g = gs[i], c = round(R(lo + g, hi - g), g), ins = uniq([c - g / 2 + R(0, g / 2 - 1), c + R(0, g / 2 - 1), c - R(1, g / 2)]).filter(x => round(x, g) === c), outs = uniq([c + g / 2 + R(0, g / 3), c - g / 2 - R(1, g / 3), c + g]).filter(x => round(x, g) !== c); return multi(`Chọn các số khi làm tròn đến hàng ${names[i]} được ${F(c)}`, ins, outs, 5); })(),
    t => t === 'tf' && (() => { const i = R(0, gs.length - 1), g = gs[i], n = R(lo, hi), v = round(n, g), ok = Math.random() < .5; return tf(`Làm tròn số ${F(n)} đến hàng ${names[i]} được ${F(ok ? v : (v === n - n % g ? v + g : v - g))}.`, ok); })(),
  ]);
  T.lamtron100 = lamtron(1001, 9999, [10, 100], ['chục', 'trăm']);
  T.lamtron1000 = lamtron(10001, 99999, [1000, 10000], ['nghìn', 'chục nghìn']);
  T.chuvi = facts([
    t => t === 'mc' && (a => mc(`Chu vi hình vuông có cạnh ${a} cm là:`, `${4 * a} cm`, [`${a * a} cm`, `${2 * a} cm`, `${4 * a + 4} cm`]))(R(2, 12)),
    t => t === 'fill' && ((a, b) => fill(`Hình chữ nhật có chiều dài ${a} cm, chiều rộng ${b} cm. Chu vi hình chữ nhật là ___ cm.`, (a + b) * 2, [a + b, a * b, a * 2 + b]))(R(6, 15), R(2, 5)),
    t => t === 'mc' && ((a, b, c) => mc(`Hình tam giác có độ dài các cạnh là ${a} cm, ${b} cm, ${c} cm. Chu vi hình tam giác là:`, `${a + b + c} cm`, [`${a + b} cm`, `${a * 3} cm`, `${a + b + c + 1} cm`]))(R(3, 9), R(3, 9), R(3, 9)),
    t => t === 'tf' && tf('Muốn tính chu vi hình vuông, ta lấy độ dài một cạnh nhân với 4.', true),
    t => t === 'tf' && tf('Muốn tính chu vi hình chữ nhật, ta lấy chiều dài nhân với chiều rộng.', false),
    t => t === 'match' && match('Nối hình với chu vi của hình đó', [['Hình vuông cạnh 5 cm', '20 cm'], ['Hình chữ nhật dài 7 cm, rộng 4 cm', '22 cm'], ['Hình vuông cạnh 3 cm', '12 cm'], ['Hình tam giác có các cạnh 4 cm, 5 cm, 6 cm', '15 cm']]),
  ]);
  T.dientich = facts([
    t => t === 'mc' && (a => mc(`Diện tích hình vuông có cạnh ${a} cm là:`, `${a * a} cm²`, [`${4 * a} cm²`, `${2 * a} cm²`, `${a * a + a} cm²`].filter(x => x !== `${a * a} cm²`)))(R(3, 9)),
    t => t === 'fill' && ((a, b) => fill(`Hình chữ nhật có chiều dài ${a} cm, chiều rộng ${b} cm. Diện tích hình chữ nhật là ___ cm².`, a * b, [(a + b) * 2, a + b, a * b + b]))(R(5, 12), R(2, 4)),
    t => t === 'tf' && tf('Xăng-ti-mét vuông là diện tích của hình vuông có cạnh dài 1 cm.', true),
    t => t === 'tf' && tf('Muốn tính diện tích hình chữ nhật, ta lấy chiều dài cộng chiều rộng rồi nhân với 2.', false),
    t => t === 'mc' && mc('Cách viết đúng của “mười lăm xăng-ti-mét vuông” là:', '15 cm²', ['15 cm', '15² cm', '150 cm²']),
    t => t === 'order' && order('Sắp xếp các diện tích từ bé đến lớn', ['9 cm²', '16 cm²', '24 cm²', '50 cm²']),
  ]);
  const TIMES = [['8 giờ 30 phút', '8 giờ rưỡi'], ['7 giờ 45 phút', '8 giờ kém 15 phút'], ['9 giờ 50 phút', '10 giờ kém 10 phút'], ['15 giờ', '3 giờ chiều'], ['20 giờ', '8 giờ tối'], ['13 giờ', '1 giờ chiều']];
  T.dongho = facts([
    t => t === 'mc' && (([a, b]) => mc(`${a} còn gọi là:`, b, TIMES.map(x => x[1]).filter(x => x !== b)))(pk(TIMES)),
    t => t === 'match' && match('Nối hai cách đọc giờ giống nhau', sh(TIMES).slice(0, 4)),
    t => t === 'fill' && (([n, m]) => fill(`Kim phút chỉ vào số ${n} nghĩa là ___ phút.`, m, [n, m + 5, n * 10].filter(x => x !== m)))(pk([[3, 15], [6, 30], [9, 45], [4, 20], [8, 40]])),
    t => t === 'mc' && (h => mc(`Kim giờ chỉ số ${h}, kim phút chỉ số 12. Đồng hồ chỉ:`, `${h} giờ`, [`12 giờ ${h * 5} phút`, `${h} giờ 12 phút`, `${h + 1} giờ`]))(R(1, 11)),
    t => t === 'fill' && ((h, m) => fill(`Bạn An bắt đầu làm bài lúc ${h} giờ, làm xong lúc ${h} giờ ${m} phút. Bạn An làm bài trong ___ phút.`, m, [m + 10, 60 - m, h + m]))(R(7, 9), pk([15, 20, 25, 30, 40])),
    t => t === 'tf' && tf('1 giờ = 60 phút', true), t => t === 'tf' && tf('17 giờ còn gọi là 7 giờ chiều.', false),
  ]);
  T.thangnam = facts([
    t => t === 'mc' && mc('Một năm có bao nhiêu tháng?', 12, [10, 30, 52]),
    t => t === 'fill' && fill('Tháng 2 của năm thường có ___ ngày.', 28, [30, 31, 29]),
    t => t === 'multi' && multi('Chọn các tháng có 30 ngày', ['Tháng 4', 'Tháng 6', 'Tháng 9', 'Tháng 11'], ['Tháng 1', 'Tháng 3', 'Tháng 7', 'Tháng 12']),
    t => t === 'mc' && mc('Tháng 12 có bao nhiêu ngày?', 31, [30, 28, 29]),
    t => t === 'fill' && (d => fill(`Thứ Hai tuần này là ngày ${d}. Thứ Hai tuần sau là ngày ___`, d + 7, [d + 1, d + 6, d + 8]))(R(1, 20)),
    t => t === 'tf' && tf('Một tuần lễ có 7 ngày.', true), t => t === 'tf' && tf('Tháng 6 có 31 ngày.', false),
    t => t === 'order' && order('Sắp xếp các tháng theo thứ tự trong năm', ['Tháng Một', 'Tháng Năm', 'Tháng Tám', 'Tháng Mười Hai']),
  ]);
  const NOTES = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  T.tien = facts([
    t => t === 'mc' && ((a, n, b) => mc(`Có 1 tờ ${F(a)} đồng và ${n} tờ ${F(b)} đồng. Có tất cả bao nhiêu tiền?`, `${F(a + n * b)} đồng`, [`${F(a + b)} đồng`, `${F(a * n + b)} đồng`, `${F(a + n * b + 1000)} đồng`].filter(x => x !== `${F(a + n * b)} đồng`)))(pk([10000, 20000, 50000]), R(2, 3), pk([1000, 2000, 5000])),
    t => t === 'fill' && ((p, g) => fill(`Mua một cái bút hết ${F(p)} đồng, đưa cho cô bán hàng ${F(g)} đồng. Cô trả lại ___ đồng.`, F(g - p), [F(g + p), F(p), F(g - p + 1000)]))(pk([3000, 4000, 6000, 7000, 8000]), 10000),
    t => t === 'mc' && mc('Tờ tiền nào có mệnh giá lớn nhất?', '100 000 đồng', ['50 000 đồng', '20 000 đồng', '10 000 đồng']),
    t => t === 'order' && order('Sắp xếp các tờ tiền theo mệnh giá từ bé đến lớn', sh(NOTES).slice(0, 4).sort((a, b) => a - b).map(n => `${F(n)} đồng`)),
    t => t === 'tf' && tf('2 tờ 5 000 đồng bằng 1 tờ 10 000 đồng.', true), t => t === 'tf' && tf('3 tờ 2 000 đồng bằng 1 tờ 5 000 đồng.', false),
    t => t === 'match' && match('Nối cho bằng nhau', [['2 tờ 1 000 đồng', '2 000 đồng'], ['2 tờ 10 000 đồng', '20 000 đồng'], ['5 tờ 10 000 đồng', '50 000 đồng']]),
  ]);
  const TK = [['Số cây các tổ trồng được', 'cây', ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'], 'Tổ'], ['Số bạn thích mỗi môn thể thao', 'bạn', ['Bóng đá', 'Cầu lông', 'Bơi', 'Đá cầu'], 'Môn'], ['Số quả mỗi loại trong giỏ', 'quả', ['Cam', 'Xoài', 'Táo', 'Lê'], 'Loại quả']];
  const tkData = () => { const [title, u, ks, hoi] = pk(TK); let vs; do { vs = ks.map(() => R(4, 20)); } while (uniq(vs).length < 4); return { title, u, ks, vs, hoi, txt: `Bảng “${title}”: ${ks.map((k, i) => `${k}: ${vs[i]} ${u}`).join('; ')}.` }; };
  T.thongke = facts([
    t => t === 'mc' && (d => { const big = Math.random() < .5, v = big ? Math.max(...d.vs) : Math.min(...d.vs), i = d.vs.indexOf(v); return mc(`${d.txt} ${d.hoi} nào có ${big ? 'nhiều' : 'ít'} ${d.u} nhất?`, d.ks[i], d.ks.filter((_, j) => j !== i)); })(tkData()),
    t => t === 'fill' && (d => { const s = d.vs.reduce((a, b) => a + b, 0); return fill(`${d.txt} Tất cả có ___ ${d.u}.`, s, [s - d.vs[0], s + 10, Math.max(...d.vs)]); })(tkData()),
    t => t === 'mc' && (d => { const df = d.vs[0] - d.vs[2]; return mc(`${d.txt} ${d.ks[0]} ${df >= 0 ? 'nhiều' : 'ít'} hơn ${d.ks[2]} bao nhiêu ${d.u}?`, Math.abs(df), uniq([d.vs[0] + d.vs[2], Math.abs(df) + 1, Math.abs(df) + 2, d.vs[0]]).filter(x => x !== Math.abs(df))); })(tkData()),
    t => t === 'order' && (d => order(`${d.txt} Sắp xếp theo số ${d.u} từ ít đến nhiều.`, d.ks.map((k, i) => [k, d.vs[i]]).sort((a, b) => a[1] - b[1]).map(x => x[0])))(tkData()),
    t => t === 'tf' && (d => { const ok = Math.random() < .5, v = ok ? d.vs[1] : d.vs[1] + 1; return tf(`${d.txt} ${d.ks[1]} có ${v} ${d.u}.`, ok); })(tkData()),
  ]);
  const KN = ['chắc chắn', 'có thể', 'không thể'];
  T.khanang = facts([
    t => t === 'mc' && (n => mc(`Trong hộp có ${n} quả bóng đỏ. Lấy ra 1 quả bóng, ___ lấy được quả bóng đỏ.`, KN[0], KN.slice(1)))(R(3, 8)),
    t => t === 'mc' && ((a, b) => mc(`Trong hộp có ${a} bóng đỏ và ${b} bóng xanh. Lấy ra 1 quả bóng, ___ lấy được quả bóng xanh.`, KN[1], [KN[0], KN[2]]))(R(2, 5), R(2, 5)),
    t => t === 'fill' && ((a, b) => fill(`Trong túi có ${a} viên bi xanh và ${b} viên bi trắng. Lấy ra 1 viên bi, ___ lấy được viên bi vàng.`, KN[2], [KN[0], KN[1]]))(R(2, 5), R(2, 5)),
    t => t === 'match' && match('Hộp có 3 bóng đỏ, 2 bóng vàng. Lấy 1 quả bóng. Nối cho đúng', [['Lấy được bóng đỏ', 'có thể'], ['Lấy được bóng xanh', 'không thể'], ['Lấy được bóng đỏ hoặc vàng', 'chắc chắn']]),
    t => t === 'tf' && tf('Gieo một con xúc xắc thường, chắc chắn xuất hiện mặt có 7 chấm.', false),
    t => t === 'tf' && tf('Tung một đồng xu, có thể xuất hiện mặt sấp.', true),
  ]);

  /* =================== TIẾNG VIỆT =================== */
  const W = {
    sv: ['bàn học', 'cặp sách', 'bút chì', 'quyển vở', 'cây bàng', 'con mèo', 'quả cam', 'bông hoa', 'dòng sông', 'ngọn núi', 'cô giáo', 'học sinh', 'bác nông dân', 'xe đạp', 'ngôi nhà', 'cánh đồng', 'mặt trời', 'đám mây', 'con đường', 'cái bảng'],
    hd: ['chạy', 'nhảy dây', 'đọc sách', 'viết bài', 'quét nhà', 'tưới cây', 'hát', 'múa', 'bơi', 'nấu cơm', 'rửa bát', 'học bài', 'đá bóng', 'gấp quần áo', 'vẽ tranh', 'trò chuyện', 'lắng nghe', 'đi học', 'giúp đỡ', 'chăm sóc'],
    dd: ['xanh biếc', 'đỏ thắm', 'cao lớn', 'nhỏ xíu', 'chăm chỉ', 'ngoan ngoãn', 'hiền lành', 'thông minh', 'nhanh nhẹn', 'xinh xắn', 'tròn xoe', 'mềm mại', 'thơm ngát', 'ngọt lịm', 'rộng rãi', 'sạch sẽ', 'vàng óng', 'dịu dàng', 'siêng năng', 'cần cù'],
  };
  const WN = { sv: 'sự vật', hd: 'hoạt động', dd: 'đặc điểm' };
  const SENT = {
    hd: [['Mỗi sáng, ông em ___ cho cây trong vườn.', 'tưới nước'], ['Các bạn nam đang ___ ngoài sân.', 'đá bóng'], ['Mẹ ___ cơm cho cả nhà.', 'nấu'], ['Em ___ truyện tranh trong thư viện.', 'đọc'], ['Bé ___ quần áo gọn gàng.', 'gấp'], ['Chú chim ___ líu lo trên cành cây.', 'hót']],
    dd: [['Bầu trời mùa thu ___.', 'xanh biếc'], ['Bạn Lan rất ___, ngày nào cũng giúp mẹ việc nhà.', 'chăm chỉ'], ['Chú mèo có bộ lông ___.', 'mềm mại'], ['Lớp học của em lúc nào cũng ___.', 'sạch sẽ'], ['Đôi mắt của bé ___ như hai hạt nhãn.', 'tròn xoe'], ['Cánh đồng lúa chín ___.', 'vàng óng']],
    sv: [['Em xếp ___ vào cặp sách.', 'quyển vở'], ['Trên cành cây có một ___ đang hót.', 'chú chim'], ['Trong lớp, ___ đang giảng bài.', 'cô giáo'], ['Buổi sáng, ___ mọc ở đằng đông.', 'mặt trời']],
  };
  const otherW = k => Object.keys(W).filter(x => x !== k).flatMap(x => W[x]);
  function tuloai(keys) {
    return list([
      t => t === 'mc' && (k => mc(`Từ nào là từ chỉ ${WN[k]}?`, pk(W[k]), sh(otherW(k)).slice(0, 5)))(pk(keys)),
      t => t === 'mc' && (k => { const o = pk(Object.keys(W).filter(x => x !== k)); return mc('Tìm từ không cùng nhóm với các từ còn lại:', pk(W[o]), sh(W[k]).slice(0, 3)); })(pk(keys)),
      t => t === 'multi' && (k => multi(`Chọn tất cả các từ chỉ ${WN[k]}`, sh(W[k]).slice(0, 3), sh(otherW(k)).slice(0, 3), 6))(pk(keys)),
      t => t === 'fill' && (k => { const [s, a] = pk(SENT[k]); return fill(s, a, sh(otherW(k)).slice(0, 3)); })(pk(keys)),
      t => t === 'tf' && (() => { const k = pk(['sv', 'hd', 'dd']), w = pk(W[k]), ok = Math.random() < .5, kk = ok ? k : pk(Object.keys(W).filter(x => x !== k)); return tf(`“${w}” là từ chỉ ${WN[kk]}.`, ok); })(),
      t => t === 'match' && match('Nối mỗi từ với nhóm của nó', ['sv', 'hd', 'dd'].map(k => [pk(W[k]), 'từ chỉ ' + WN[k]])),
    ]);
  }
  ['sv', 'hd', 'dd'].forEach(k => { T[k] = tuloai([k]); }); T.tuloai = tuloai(['sv', 'hd', 'dd']);

  const VOC = {
    muahe: { ten: 'mùa hè', in: ['nắng chói chang', 'tiếng ve kêu', 'hoa phượng đỏ', 'tắm biển', 'thả diều', 'nghỉ hè', 'cắm trại', 'que kem mát lạnh', 'học bơi', 'bãi cát'], out: ['tuyết rơi', 'áo bông', 'lò sưởi', 'gió mùa đông bắc', 'mưa phùn', 'chăn ấm'] },
    truong: { ten: 'nhà trường', in: ['lớp học', 'sân trường', 'thầy cô', 'bảng đen', 'phấn trắng', 'giờ ra chơi', 'lễ khai giảng', 'bạn học', 'bàn ghế', 'trống trường'], out: ['cánh đồng', 'nồi cơm', 'chợ cá', 'bệnh viện', 'chuồng gà', 'bến xe'] },
    thuvien: { ten: 'thư viện', in: ['giá sách', 'thẻ thư viện', 'thủ thư', 'mượn sách', 'trả sách', 'phòng đọc', 'truyện tranh', 'tạp chí', 'mục lục', 'đọc sách'], out: ['sân bóng', 'bể bơi', 'nhà bếp', 'xe buýt', 'vườn rau', 'chợ'] },
    nguoithan: { ten: 'người thân trong gia đình', in: ['ông', 'bà', 'bố', 'mẹ', 'anh', 'chị', 'em', 'cô', 'chú', 'dì', 'cậu', 'bác'], out: ['thầy giáo', 'bạn học', 'bác sĩ', 'người bán hàng', 'chú bảo vệ', 'hàng xóm'],
      pairs: [['bố của bố', 'ông nội'], ['mẹ của bố', 'bà nội'], ['bố của mẹ', 'ông ngoại'], ['mẹ của mẹ', 'bà ngoại'], ['em trai của bố', 'chú'], ['em gái của mẹ', 'dì'], ['em trai của mẹ', 'cậu']] },
    dovat: { ten: 'đồ vật và con vật thân thuộc trong nhà', in: ['tủ lạnh', 'quạt điện', 'ti vi', 'nồi cơm điện', 'bàn học', 'đồng hồ', 'con mèo', 'con chó', 'chú gà trống', 'bể cá'], out: ['ngọn núi', 'con hổ', 'dòng sông', 'máy bay', 'cánh rừng', 'con cá voi'],
      pairs: [['đồng hồ', 'báo giờ'], ['quạt điện', 'làm mát'], ['con chó', 'trông nhà'], ['con mèo', 'bắt chuột'], ['tủ lạnh', 'giữ thức ăn tươi lâu']] },
    nghe: { ten: 'nghề nghiệp', in: ['bác sĩ', 'giáo viên', 'nông dân', 'công nhân', 'phi công', 'đầu bếp', 'thợ may', 'bưu tá', 'lính cứu hỏa', 'ngư dân'], out: ['con mèo', 'cái bàn', 'cây bàng', 'quả cam', 'dòng sông', 'bông hoa'],
      pairs: [['bác sĩ', 'khám chữa bệnh'], ['giáo viên', 'dạy học'], ['nông dân', 'trồng lúa'], ['phi công', 'lái máy bay'], ['thợ may', 'may quần áo'], ['lính cứu hỏa', 'chữa cháy'], ['ngư dân', 'đánh bắt cá'], ['bưu tá', 'đưa thư']] },
    thanhthi: { ten: 'thành thị', in: ['nhà cao tầng', 'đường phố đông đúc', 'siêu thị', 'xe buýt', 'đèn giao thông', 'trung tâm thương mại'], out: ['cánh đồng lúa', 'lũy tre làng', 'con trâu', 'ao cá', 'cây đa đầu làng', 'đồng cỏ'], cat: ['thành thị', 'nông thôn'] },
    thiennhien: { ten: 'hiện tượng thiên nhiên', in: ['mưa', 'gió', 'sấm', 'chớp', 'bão', 'cầu vồng', 'sương mù', 'nắng', 'mưa đá', 'lũ lụt'], out: ['cái bàn', 'ô tô', 'quyển sách', 'ngôi nhà', 'bút chì', 'cái ghế'] },
    datnuoc: { ten: 'đất nước', in: ['Tổ quốc', 'non sông', 'giang sơn', 'đất nước', 'quê hương'], out: ['lớp học', 'cái bàn', 'quả bóng', 'xe đạp'], extra: [['Thủ đô của nước Việt Nam là:', 'Hà Nội', ['Huế', 'Đà Nẵng', 'Cần Thơ']], ['Quốc kì Việt Nam là lá cờ:', 'nền đỏ, ngôi sao vàng năm cánh', ['nền xanh, ngôi sao trắng', 'nền vàng, ngôi sao đỏ', 'nền trắng, hình tròn đỏ']]] },
    lehoi: { ten: 'lễ hội', in: ['đua thuyền', 'kéo co', 'rước đèn', 'múa lân', 'thả diều', 'đấu vật', 'ném còn', 'hát quan họ', 'chọi trâu', 'đánh đu'], out: ['học bài', 'quét nhà', 'đi ngủ', 'rửa bát', 'làm toán'],
      pairs: [['Tết Trung thu', 'rước đèn, phá cỗ'], ['Tết Nguyên đán', 'gói bánh chưng'], ['Hội làng ven sông', 'đua thuyền']] },
    traidat: { ten: 'bảo vệ Trái Đất', in: ['trồng cây xanh', 'nhặt rác', 'tiết kiệm nước', 'tắt điện khi ra khỏi phòng', 'phân loại rác', 'đi xe đạp thay xe máy'], out: ['vứt rác bừa bãi', 'chặt phá rừng', 'xả nước thải ra sông', 'bẻ cành cây', 'để vòi nước chảy mãi', 'đốt rác ngoài đồng'] },
  };
  for (const [k, v] of Object.entries(VOC)) {
    const good = v.cat ? `thuộc về ${v.cat[0]}` : `nói về ${v.ten}`, bad = k === 'traidat';
    T['v:' + k] = list([
      t => t === 'mc' && mc(bad ? 'Việc làm nào giúp bảo vệ Trái Đất?' : `Từ ngữ nào ${good}?`, pk(v.in), sh(v.out).slice(0, 3)),
      t => t === 'multi' && multi(bad ? 'Chọn tất cả các việc làm bảo vệ môi trường' : `Chọn tất cả các từ ngữ ${good}`, sh(v.in).slice(0, 3), sh(v.out).slice(0, 3), 6),
      t => t === 'mc' && mc(bad ? 'Việc làm nào gây hại cho môi trường?' : 'Tìm từ ngữ không cùng nhóm với các từ còn lại:', pk(v.out), sh(v.in).slice(0, 3)),
      t => t === 'tf' && (() => { const ok = Math.random() < .5; return tf(bad ? `“${ok ? pk(v.in) : pk(v.out)}” là việc làm bảo vệ môi trường.` : `“${ok ? pk(v.in) : pk(v.out)}” là từ ngữ ${good}.`, ok); })(),
      t => t === 'match' && v.pairs && match(k === 'nguoithan' ? 'Nối để biết đó là ai' : k === 'nghe' ? 'Nối nghề với công việc' : 'Nối cho đúng', sh(v.pairs).slice(0, 4)),
      t => t === 'mc' && v.extra && (([q, a, w]) => mc(q, a, w))(pk(v.extra)),
      t => t === 'fill' && k === 'nguoithan' && (([a, b]) => fill(`${a.charAt(0).toUpperCase() + a.slice(1)}, em gọi là ___ .`, b, v.pairs.map(p => p[1]).filter(x => x !== b)))(pk(v.pairs)),
      t => t === 'fill' && k === 'nghe' && (([a, b]) => fill(`Người ${b} là ___ .`, a, v.pairs.map(p => p[0]).filter(x => x !== a)))(pk(v.pairs)),
      t => t === 'fill' && k === 'muahe' && fill('Mùa hè, hoa ___ nở đỏ rực trên sân trường.', 'phượng', ['đào', 'mai', 'cúc']),
      t => t === 'fill' && k === 'thuvien' && fill('Người trông coi và cho mượn sách ở thư viện gọi là ___ .', 'thủ thư', ['thủ môn', 'thủ quỹ', 'thợ may']),
      t => t === 'fill' && k === 'thiennhien' && fill('Sau cơn mưa, trên bầu trời xuất hiện ___ bảy sắc.', 'cầu vồng', ['sương mù', 'mưa đá', 'sấm sét']),
      t => t === 'fill' && k === 'lehoi' && fill('Đêm Trung thu, các bạn nhỏ đi ___ rất vui.', 'rước đèn', ['đua thuyền', 'chọi trâu', 'gói bánh chưng']),
      t => t === 'fill' && k === 'traidat' && fill('Khi rời khỏi phòng, em nhớ ___ để tiết kiệm điện.', 'tắt đèn và quạt', ['bật ti vi', 'mở tủ lạnh', 'bật thêm đèn']),
      t => t === 'fill' && k === 'truong' && fill('Tiếng ___ báo hiệu giờ ra chơi.', 'trống trường', ['còi xe', 'chuông nhà thờ', 'gà gáy']),
      t => t === 'fill' && k === 'dovat' && fill('Chiếc ___ kêu tích tắc, nhắc em dậy đúng giờ.', 'đồng hồ báo thức', ['quạt điện', 'nồi cơm điện', 'tủ lạnh']),
      t => t === 'fill' && k === 'thanhthi' && fill('Ở ___ có nhiều nhà cao tầng và đường phố đông đúc.', 'thành phố', ['làng quê', 'cánh đồng', 'rừng núi']),
      t => t === 'fill' && k === 'datnuoc' && fill('“Tổ quốc” có nghĩa giống với từ ___ .', 'đất nước', ['lớp học', 'gia đình', 'trường học']),
      t => t === 'order' && order('Sắp xếp các từ ngữ thành câu đúng', pk(ORDERS[k] || ORDERS.chung)),
    ]);
  }

  const CAU = {
    ke: ['Em học lớp Ba.', 'Sáng nay, mẹ đưa em đi học.', 'Ngôi trường của em có nhiều cây xanh.', 'Bạn Minh thích đọc truyện cổ tích.', 'Mùa hè, em được về quê thăm bà.', 'Chú mèo đang nằm sưởi nắng.'],
    hoi: ['Bạn tên là gì?', 'Khi nào lớp mình đi tham quan?', 'Bạn có thích đọc sách không?', 'Nhà bạn ở đâu?', 'Vì sao bầu trời có màu xanh?', 'Ai là người vẽ bức tranh này?'],
    cam: ['Ôi, bông hoa đẹp quá!', 'Chà, chiếc cặp mới đẹp thật!', 'Ồ, mưa to quá!', 'Bạn Lan hát hay quá!', 'Ôi, biển rộng mênh mông!', 'A, mẹ về rồi!'],
    khien: ['Em hãy giữ trật tự!', 'Các em hãy xếp hàng ngay ngắn.', 'Bạn đừng hái hoa nơi công cộng!', 'Con hãy ăn sáng rồi đi học.', 'Chúng mình cùng nhặt rác nhé!', 'Hãy tắt đèn khi ra khỏi phòng!'],
  };
  const CN = { ke: 'câu kể', hoi: 'câu hỏi', cam: 'câu cảm', khien: 'câu khiến' };
  const DAU = { ke: '.', hoi: '?', cam: '!' };
  for (const k of Object.keys(CAU)) {
    T['c:' + k] = list([
      t => t === 'mc' && (s => mc(`Câu “${s}” thuộc kiểu câu nào?`, CN[k], Object.values(CN).filter(x => x !== CN[k])))(pk(CAU[k])),
      t => t === 'multi' && multi(`Chọn tất cả các ${CN[k]}`, sh(CAU[k]).slice(0, 3), Object.keys(CAU).filter(x => x !== k).flatMap(x => sh(CAU[x]).slice(0, 1)), 6),
      t => t === 'match' && match('Nối câu với kiểu câu', sh(Object.keys(CAU)).slice(0, 4).map(x => [pk(CAU[x]), CN[x]])),
      t => t === 'tf' && (() => { const ok = Math.random() < .5, x = ok ? k : pk(Object.keys(CAU).filter(y => y !== k)); return tf(`“${pk(CAU[x])}” là ${CN[k]}.`, ok); })(),
      t => t === 'fill' && DAU[k] && (s => fill(`Chọn dấu câu thích hợp: ${s.slice(0, -1)} ___`, DAU[k], Object.values(DAU).filter(x => x !== DAU[k]).concat([','])))(pk(CAU[k])),
      t => t === 'mc' && mc({ ke: 'Câu kể dùng để làm gì?', hoi: 'Câu hỏi dùng để làm gì?', cam: 'Câu cảm dùng để làm gì?', khien: 'Câu khiến dùng để làm gì?' }[k],
        { ke: 'Kể, tả hoặc giới thiệu về sự vật, sự việc', hoi: 'Hỏi về điều mình chưa biết', cam: 'Bộc lộ cảm xúc', khien: 'Đề nghị, yêu cầu, ra lệnh' }[k],
        ['Kể, tả hoặc giới thiệu về sự vật, sự việc', 'Hỏi về điều mình chưa biết', 'Bộc lộ cảm xúc', 'Đề nghị, yêu cầu, ra lệnh'].filter((x, i) => i !== ['ke', 'hoi', 'cam', 'khien'].indexOf(k))),
      t => t === 'order' && order(`Sắp xếp các từ ngữ thành ${CN[k]}`, pk(ORDERS['c:' + k])),
    ]);
  }
  T['d:cau'] = list([
    t => t === 'fill' && (k => { const s = pk(CAU[k]); return fill(`Chọn dấu câu thích hợp: ${s.slice(0, -1)} ___`, DAU[k], ['.', '?', '!', ','].filter(x => x !== DAU[k])); })(pk(['ke', 'hoi', 'cam'])),
    t => t === 'match' && match('Nối câu với dấu câu cuối câu', ['ke', 'hoi', 'cam'].map(k => [pk(CAU[k]).slice(0, -1) + ' …', DAU[k]])),
    t => t === 'mc' && mc('Cuối câu hỏi ta dùng dấu gì?', 'dấu chấm hỏi (?)', ['dấu chấm (.)', 'dấu chấm than (!)', 'dấu phẩy (,)']),
    t => t === 'mc' && mc('Cuối câu kể ta thường dùng dấu gì?', 'dấu chấm (.)', ['dấu chấm hỏi (?)', 'dấu hai chấm (:)', 'dấu phẩy (,)']),
    t => t === 'tf' && tf('Câu “Bạn đã làm xong bài tập chưa?” cần dùng dấu chấm hỏi.', true),
    t => t === 'tf' && tf('Câu cảm thường kết thúc bằng dấu chấm hỏi.', false),
    t => t === 'multi' && multi('Chọn các câu cần dùng dấu chấm hỏi ở cuối câu', CAU.hoi.slice(0, 4).map(s => s.slice(0, -1) + ' …'), CAU.ke.slice(0, 3).map(s => s.slice(0, -1) + ' …'), 6),
  ]);
  T['d:haicham'] = list([
    t => t === 'mc' && mc('Dấu hai chấm trong câu “Trong vườn có nhiều loài hoa: hoa hồng, hoa cúc, hoa lan.” dùng để làm gì?', 'Báo hiệu phần liệt kê', ['Báo hiệu lời nói của nhân vật', 'Kết thúc câu', 'Ngăn cách hai từ']),
    t => t === 'mc' && mc('Dấu hai chấm trong câu “Mẹ dặn: “Con nhớ mặc áo ấm nhé!”” dùng để làm gì?', 'Báo hiệu lời nói của nhân vật', ['Báo hiệu phần liệt kê', 'Kết thúc câu hỏi', 'Ngăn cách các từ cùng loại']),
    t => t === 'fill' && fill('Hè này, em làm được nhiều việc ___ đọc sách, học bơi, giúp mẹ trông em.', ':', ['?', '!', '.']),
    t => t === 'fill' && fill('Cô giáo hỏi cả lớp ___ “Ai đã làm xong bài?”', ':', ['.', '!', ',']),
    t => t === 'tf' && tf('Dấu hai chấm có thể dùng để báo hiệu phần liệt kê.', true),
    t => t === 'tf' && tf('Dấu hai chấm luôn đặt ở cuối câu.', false),
    t => t === 'multi' && multi('Chọn các câu dùng dấu hai chấm đúng', ['Bố mua cho em nhiều đồ dùng: bút, thước, vở.', 'Bạn Nam reo lên: “Mình làm được rồi!”'], ['Em: đi học lúc bảy giờ.', 'Bông hoa: rất đẹp.', 'Hôm nay: trời nắng.']),
  ]);
  T['d:gachngang'] = list([
    t => t === 'mc' && mc('Dấu gạch ngang ở đầu dòng trong đoạn đối thoại dùng để làm gì?', 'Đánh dấu lời nói của nhân vật', ['Kết thúc câu', 'Báo hiệu câu hỏi', 'Ngăn cách các từ cùng loại']),
    t => t === 'mc' && mc('Trong đoạn: “Mẹ dặn em: – Học bài xong mới đi chơi. – Ngủ trước mười giờ.” dấu gạch ngang dùng để:', 'Đánh dấu các ý được liệt kê', ['Kết thúc câu', 'Báo hiệu câu cảm', 'Thay cho dấu chấm hỏi']),
    t => t === 'tf' && tf('Dấu gạch ngang có thể dùng để đánh dấu lời nói của nhân vật trong đoạn đối thoại.', true),
    t => t === 'tf' && tf('Dấu gạch ngang luôn đứng ở cuối câu.', false),
    t => t === 'fill' && fill('Trong đoạn đối thoại, lời nói của mỗi nhân vật thường bắt đầu bằng dấu ___ ở đầu dòng.', 'gạch ngang (–)', ['chấm (.)', 'chấm than (!)', 'phẩy (,)']),
    t => t === 'order' && order('Sắp xếp các lời thoại cho hợp lí', ['– Chào bạn, bạn tên là gì?', '– Mình tên là Hà. Còn bạn?', '– Mình tên là Minh. Rất vui được làm quen!']),
  ]);
  T['d:ngoackep'] = list([
    t => t === 'mc' && mc('Dấu ngoặc kép trong câu: Bé reo lên: “Mẹ ơi, hoa nở rồi!” dùng để làm gì?', 'Đánh dấu lời nói trực tiếp của nhân vật', ['Báo hiệu phần liệt kê', 'Kết thúc câu', 'Ngăn cách các vế câu']),
    t => t === 'mc' && mc('Câu nào dùng dấu ngoặc kép đúng?', 'Em rất thích truyện “Cây bút thần”.', ['Em “rất” thích đọc truyện.', 'Em thích “đọc” truyện tranh.', '“Em thích đọc truyện tranh”']),
    t => t === 'tf' && tf('Dấu ngoặc kép có thể dùng để đánh dấu tên của một câu chuyện, bài thơ.', true),
    t => t === 'tf' && tf('Dấu ngoặc kép dùng để kết thúc câu hỏi.', false),
    t => t === 'fill' && fill('Cô giáo nói: ___ Các em hãy giữ gìn sách vở sạch đẹp.”', '“', ['(', '–', '!']),
    t => t === 'multi' && multi('Chọn các câu dùng dấu ngoặc kép đúng', ['Bé reo lên: “Mẹ về rồi!”', 'Em đã đọc truyện “Cây khế”.'], ['Em “đi” học.', 'Trời “mưa” to.', 'Bạn “Lan” hát hay.']),
    t => t === 'match' && match('Nối câu với tác dụng của dấu ngoặc kép', [['Bé reo lên: “Mẹ về rồi!”', 'đánh dấu lời nói trực tiếp'], ['Em thích bài hát “Em yêu trường em”.', 'đánh dấu tên bài hát'], ['Bố khen: “Con giỏi lắm!”', 'đánh dấu lời khen của bố']]),
  ]);
  const SS = [['Mặt trời tròn như quả bóng lửa.', 'Mặt trời', 'quả bóng lửa', 'như'], ['Trăng rằm tròn như cái đĩa bạc.', 'Trăng rằm', 'cái đĩa bạc', 'như'], ['Mái tóc của bà trắng như cước.', 'Mái tóc của bà', 'cước', 'như'], ['Những ngôi sao lấp lánh như những viên kim cương.', 'Những ngôi sao', 'những viên kim cương', 'như'],
    ['Mây trắng bồng bềnh như những cục bông.', 'Mây trắng', 'những cục bông', 'như'], ['Cô giáo dịu dàng như mẹ hiền.', 'Cô giáo', 'mẹ hiền', 'như'], ['Chiếc lá bàng đỏ tựa ngọn lửa.', 'Chiếc lá bàng', 'ngọn lửa', 'tựa'], ['Ông mặt trời là chiếc đèn khổng lồ.', 'Ông mặt trời', 'chiếc đèn khổng lồ', 'là'], ['Cánh đồng lúa chín giống như tấm thảm vàng.', 'Cánh đồng lúa chín', 'tấm thảm vàng', 'giống như']];
  T.sosanh = list([
    t => t === 'mc' && (([s, a, b, w]) => mc(`Trong câu “${s}”, sự vật nào được so sánh với “${b}”?`, a, SS.filter(x => x[1] !== a).map(x => x[1])))(pk(SS)),
    t => t === 'mc' && (([s, a, b, w]) => mc(`Từ dùng để so sánh trong câu “${s}” là:`, w, ['như', 'là', 'tựa', 'giống như', 'và', 'rất'].filter(x => x !== w && !s.includes(' ' + x + ' '))))(pk(SS)),
    t => t === 'match' && match('Nối sự vật với hình ảnh được so sánh', sh(SS).slice(0, 4).map(x => [x[1], x[2]])),
    t => t === 'multi' && multi('Chọn các câu có hình ảnh so sánh', sh(SS).slice(0, 3).map(x => x[0]), sh(CAU.ke).slice(0, 3), 6),
    t => t === 'fill' && (([s, a, b, w]) => fill(s.replace(' ' + w + ' ', ' ___ '), w, ['và', 'rất', 'đang'].filter(x => x !== w)))(pk(SS.filter(x => x[3] !== 'giống như'))),
    t => t === 'tf' && tf('Câu “Mặt trời tròn như quả bóng lửa.” có hình ảnh so sánh.', true),
    t => t === 'tf' && tf('Câu “Em đi học lúc bảy giờ.” có hình ảnh so sánh.', false),
  ]);
  const TN = [['cao', 'thấp'], ['dài', 'ngắn'], ['nóng', 'lạnh'], ['sáng', 'tối'], ['nhanh', 'chậm'], ['vui', 'buồn'], ['khỏe', 'yếu'], ['chăm chỉ', 'lười biếng'], ['mới', 'cũ'], ['ngọt', 'đắng'], ['dũng cảm', 'hèn nhát'], ['rộng', 'hẹp'], ['sạch', 'bẩn'], ['già', 'trẻ'], ['đầy', 'vơi'], ['mở', 'đóng']];
  T.trainghia = list([
    t => t === 'mc' && (([a, b]) => { const sw = Math.random() < .5; const [x, y] = sw ? [b, a] : [a, b]; return mc(`Từ trái nghĩa với “${x}” là:`, y, sh(TN.filter(p => !p.includes(a))).slice(0, 3).map(p => pk(p))); })(pk(TN)),
    t => t === 'match' && match('Nối các cặp từ trái nghĩa', sh(TN).slice(0, 4)),
    t => t === 'tf' && (() => { const ok = Math.random() < .5, [a, b] = pk(TN), c = ok ? b : pk(TN.filter(p => !p.includes(a)))[0]; return tf(`“${a}” và “${c}” là hai từ trái nghĩa.`, ok); })(),
    t => t === 'fill' && fill('Con voi to, con kiến ___ .', 'nhỏ', ['to', 'cao', 'dài']),
    t => t === 'fill' && fill('Mùa hè trời nóng, mùa đông trời ___ .', 'lạnh', ['nóng', 'sáng', 'cao']),
    t => t === 'multi' && multi('Chọn các cặp từ trái nghĩa', sh(TN).slice(0, 3).map(p => p.join(' – ')), ['chăm chỉ – siêng năng', 'to – lớn', 'xinh – đẹp'], 6),
  ]);
  const CNG = [['chăm chỉ', 'siêng năng', 'cần cù'], ['to', 'lớn'], ['bé', 'nhỏ'], ['bố', 'ba', 'cha'], ['mẹ', 'má'], ['hiền', 'hiền lành', 'hiền hậu'], ['vui', 'vui vẻ', 'vui tươi'], ['nhanh', 'mau'], ['ngăn nắp', 'gọn gàng'], ['đất nước', 'Tổ quốc', 'non sông'], ['trẻ em', 'thiếu nhi', 'trẻ con'], ['xinh', 'đẹp', 'xinh đẹp']];
  T.cungnghia = list([
    t => t === 'mc' && (g => { const [a, b] = sh(g); return mc(`Từ nào cùng nghĩa với “${a}”?`, b, sh(CNG.filter(x => x !== g)).slice(0, 3).map(x => pk(x))); })(pk(CNG)),
    t => t === 'match' && match('Nối các từ có nghĩa giống nhau', sh(CNG).slice(0, 4).map(g => sh(g).slice(0, 2))),
    t => t === 'multi' && (g => multi(`Chọn các từ có nghĩa giống “${g[0]}”`, g.slice(1), sh(TN.flat().concat(W.sv).filter(x => !CNG.flat().includes(x))).slice(0, 4), 5))(pk(CNG.filter(g => g.length >= 3))),
    t => t === 'tf' && (() => { const ok = Math.random() < .5, g = pk(CNG), b = ok ? g[1] : pk(pk(CNG.filter(x => x !== g))); return tf(`“${g[0]}” và “${b}” là hai từ có nghĩa giống nhau.`, ok); })(),
    t => t === 'fill' && fill('Bạn Hà rất siêng năng. Từ “siêng năng” có thể thay bằng từ ___ .', 'chăm chỉ', ['lười biếng', 'nhanh nhẹn', 'xinh xắn']),
  ]);
  const QW = {
    khinao: ['[[Sáng mai]], lớp em đi tham quan.', 'Em đi học [[lúc bảy giờ]].', '[[Mùa hè năm ngoái]], em được về quê.', '[[Cuối tuần]], cả nhà em đi công viên.'],
    odau: ['Chim hót líu lo [[trên cành cây]].', '[[Trong vườn]], hoa nở rực rỡ.', 'Các bạn chơi đá cầu [[ở sân trường]].', 'Bà em sống [[ở quê]].'],
    banggi: ['Em đến trường [[bằng xe đạp]].', 'Bạn Lan vẽ tranh [[bằng bút sáp màu]].', 'Ngôi nhà được làm [[bằng gỗ]].', 'Chúng em ăn cơm [[bằng đũa]].'],
    delamgi: ['Em chăm chỉ học bài [[để đạt kết quả tốt]].', 'Mẹ mua len [[để đan áo cho em]].', 'Chúng em trồng cây [[để bảo vệ môi trường]].', 'Bố dậy sớm [[để tập thể dục]].'],
  };
  const QN = { khinao: 'Khi nào?', odau: 'Ở đâu?', banggi: 'Bằng gì?', delamgi: 'Để làm gì?' };
  for (const k of Object.keys(QW)) {
    T['q:' + k] = list([
      t => t === 'mc' && mc(`Bộ phận in đậm trong câu “${pk(QW[k])}” trả lời cho câu hỏi nào?`, QN[k], Object.values(QN).filter(x => x !== QN[k])),
      t => t === 'match' && match('Nối bộ phận in đậm với câu hỏi phù hợp', sh(Object.keys(QW)).slice(0, 4).map(x => [pk(QW[x]), QN[x]])),
      t => t === 'tf' && (() => { const ok = Math.random() < .5, x = ok ? k : pk(Object.keys(QW).filter(y => y !== k)); return tf(`Bộ phận in đậm trong câu “${pk(QW[x])}” trả lời cho câu hỏi ${QN[k]}`, ok); })(),
      t => t === 'multi' && multi(`Chọn các câu có bộ phận in đậm trả lời câu hỏi ${QN[k]}`, sh(QW[k]).slice(0, 3), Object.keys(QW).filter(x => x !== k).map(x => pk(QW[x])), 6),
      t => t === 'fill' && (s => { const lo = x => x.charAt(0).toLowerCase() + x.slice(1), m = /\[\[(.+?)\]\]/.exec(s); return fill(s.replace(/\[\[.+?\]\]/, '___') + ` (bộ phận còn thiếu trả lời câu hỏi ${QN[k]})`, lo(m[1]), Object.keys(QW).filter(x => x !== k).map(x => lo(/\[\[(.+?)\]\]/.exec(pk(QW[x]))[1]))); })(pk(QW[k].filter(x => !x.startsWith('[[')))),
    ]);
  }
  const NAMES = { A: ['An Giang', 'An Khê'], Ă: [], Â: ['Âu Lạc'], B: ['Bắc Ninh', 'Bến Tre', 'Bạc Liêu'], C: ['Cà Mau', 'Cao Bằng', 'Côn Đảo'], D: ['Dương Đông', 'Dầu Tiếng'], Đ: ['Đà Lạt', 'Đồng Nai', 'Điện Biên'], E: ['Ê-đê'], Ê: ['Ê-đê'], G: ['Gia Lai', 'Gò Công'], H: ['Hà Nội', 'Hải Phòng', 'Huế'], I: [], K: ['Kon Tum', 'Kiên Giang'], L: ['Lạng Sơn', 'Lào Cai', 'Long An'],
    M: ['Mộc Châu', 'Móng Cái'], N: ['Nghệ An', 'Ninh Bình', 'Nha Trang'], O: [], Ô: ['Ô Môn'], Ơ: [], P: ['Phú Thọ', 'Phú Quốc'], Q: ['Quảng Ninh', 'Quy Nhơn'], R: ['Rạch Giá'], S: ['Sơn La', 'Sa Pa'], T: ['Tây Ninh', 'Tuyên Quang'], U: ['Uông Bí'], Ư: [], V: ['Vũng Tàu', 'Vĩnh Long'], X: ['Xuân Lộc'], Y: ['Yên Bái', 'Yên Tử'] };
  const wrongCase = n => { const w = n.split(' '), out = new Set(); out.add(w.map(x => x.toLowerCase()).join(' ')); out.add([w[0].toLowerCase(), ...w.slice(1)].join(' ')); if (w.length > 1) out.add([w[0], ...w.slice(1).map(x => x.toLowerCase())].join(' ')); return [...out].filter(x => x !== n); };
  function chuhoa(letters) {
    const pool = letters.flatMap(l => NAMES[l] || []), all = pool.length ? pool : ['Hà Nội', 'Huế', 'Sa Pa'];
    return list([
      t => t === 'mc' && (n => mc('Tên riêng nào được viết hoa đúng?', n, wrongCase(n)))(pk(all)),
      t => t === 'tf' && (n => { const ok = Math.random() < .5; return tf(`Tên riêng “${ok ? n : pk(wrongCase(n))}” được viết đúng.`, ok); })(pk(all)),
      t => t === 'multi' && multi('Chọn các tên riêng được viết hoa đúng', sh(all.concat(['Hà Nội', 'Huế'])).slice(0, 3), sh(all).slice(0, 3).map(n => pk(wrongCase(n))), 6),
      t => t === 'fill' && fill('Chữ cái đầu của mỗi tiếng trong tên riêng Việt Nam phải được ___ .', 'viết hoa', ['viết thường', 'gạch chân', 'viết nghiêng']),
      t => t === 'mc' && (l => mc(`Chữ hoa ${l} được viết như thế nào khi đứng đầu tên riêng?`, `Viết hoa chữ ${l} ở đầu tiếng`, [`Viết thường chữ ${l.toLowerCase()}`, 'Bỏ dấu của chữ cái', 'Viết chữ in nghiêng']))(pk(letters)),
    ]);
  }
  const CT = {
    chtr: { alt: ['tr', 'ch'], lb: 'ch hay tr', w: [['trường học', 'chường học'], ['con trâu', 'con châu'], ['quả chuối', 'quả truối'], ['cái chổi', 'cái trổi'], ['chăm chỉ', 'trăm trỉ'], ['trang sách', 'chang sách'], ['bánh chưng', 'bánh trưng'], ['con chim', 'con trim'], ['trò chơi', 'chò chơi'], ['che chở', 'tre trở'], ['Trung thu', 'Chung thu'], ['trái cây', 'chái cây']] },
    sx: { alt: ['s', 'x'], lb: 's hay x', w: [['xinh xắn', 'sinh sắn'], ['sạch sẽ', 'xạch xẽ'], ['sân trường', 'xân trường'], ['quả xoài', 'quả soài'], ['xe đạp', 'se đạp'], ['con sóc', 'con xóc'], ['xanh biếc', 'sanh biếc'], ['sáng sớm', 'xáng xớm'], ['hoa sen', 'hoa xen'], ['xôi gấc', 'sôi gấc'], ['cây xương rồng', 'cây sương rồng'], ['suối nước', 'xuối nước']] },
    rdgi: { alt: ['gi', 'r', 'd'], lb: 'r, d hay gi', w: [['con dế', 'con rế'], ['cơn gió', 'cơn dó'], ['quả dừa', 'quả rừa'], ['rau muống', 'dau muống'], ['tờ giấy', 'tờ dấy'], ['rực rỡ', 'dực dỡ'], ['dịu dàng', 'rịu ràng'], ['giọt mưa', 'dọt mưa'], ['cái giường', 'cái dường'], ['ríu rít', 'díu dít'], ['da dẻ', 'ra rẻ'], ['rừng cây', 'dừng cây']] },
    ln: { alt: ['l', 'n'], lb: 'l hay n', w: [['lá cây', 'ná cây'], ['nắng vàng', 'lắng vàng'], ['quả na', 'quả la'], ['nước suối', 'lước suối'], ['lung linh', 'nung ninh'], ['nụ cười', 'lụ cười'], ['nồi cơm', 'lồi cơm'], ['lời nói', 'nời lói'], ['long lanh', 'nong nanh'], ['nón lá', 'lón ná'], ['cái lược', 'cái nược'], ['núi non', 'lúi lon']] },
    anang: { lb: 'an hay ang', w: [['lan can', 'lang cang'], ['bạn bè', 'bạng bè'], ['vàng óng', 'vàn óng'], ['ngôi làng', 'ngôi làn'], ['sáng sớm', 'sán sớm'], ['trang sách', 'tran sách'], ['rộn ràng', 'rộn ràn'], ['mang cặp', 'man cặp'], ['cái bàn', 'cái bàng'], ['hoa lan', 'hoa lang'], ['đàn gà', 'đàng gà'], ['bàn tay', 'bàng tay']] },
    hoinga: { lb: 'dấu hỏi hay dấu ngã', w: [['suy nghĩ', 'suy nghỉ'], ['sạch sẽ', 'sạch sẻ'], ['vẽ tranh', 'vẻ tranh'], ['mãi mãi', 'mải mải'], ['kể chuyện', 'kễ chuyện'], ['nghỉ ngơi', 'nghĩ ngơi'], ['củ khoai', 'cũ khoai'], ['vững vàng', 'vửng vàng'], ['giữ gìn', 'giử gìn'], ['bảo vệ', 'bão vệ'], ['cái mũ', 'cái mủ'], ['đỏ thắm', 'đõ thắm']] },
    iuuu: { lb: 'iu hay ưu', w: [['cái rìu', 'cái rừu'], ['bưu điện', 'biu điện'], ['cứu giúp', 'kíu giúp'], ['con cừu', 'con cìu'], ['nhỏ xíu', 'nhỏ xứu'], ['quả lựu', 'quả lịu'], ['con hươu', 'con hiu'], ['trĩu quả', 'trữu quả'], ['dịu dàng', 'dựu dàng'], ['chịu khó', 'chựu khó'], ['về hưu', 'về hiu'], ['cưu mang', 'kiu mang']] },
  };
  for (const [k, v] of Object.entries(CT)) {
    T['ct:' + k] = list([
      t => t === 'mc' && (() => { const ps = sh(v.w).slice(0, 4); return mc(`Từ nào viết đúng chính tả (${v.lb})?`, ps[0][0], ps.slice(1).map(p => p[1])); })(),
      t => t === 'mc' && (() => { const ps = sh(v.w).slice(0, 4); return mc(`Từ nào viết SAI chính tả (${v.lb})?`, ps[0][1], ps.slice(1).map(p => p[0])); })(),
      t => t === 'tf' && (([a, b]) => { const ok = Math.random() < .5; return tf(`Từ “${ok ? a : b}” viết đúng chính tả.`, ok); })(pk(v.w)),
      t => t === 'multi' && (() => { const ps = sh(v.w).slice(0, 6); return multi(`Chọn tất cả các từ viết đúng chính tả (${v.lb})`, ps.slice(0, 3).map(p => p[0]), ps.slice(3).map(p => p[1]), 6); })(),
      t => t === 'match' && match('Nối từ viết sai với cách viết đúng', sh(v.w).slice(0, 4).map(([a, b]) => [b, a])),
      t => t === 'fill' && v.alt && (([a, b]) => { const A = a.split(' '), B = b.split(' '), j = A.findIndex((x, n) => x !== B[n]); if (j < 0 || A[j] !== A[j].toLowerCase()) return null; const al = v.alt.slice().sort((x, y) => y.length - x.length).find(x => A[j].startsWith(x)); if (!al) return null; A[j] = '___' + A[j].slice(al.length); return mc(`Điền ${v.alt.join(' hay ')}: ${A.join(' ')}`, al, v.alt.filter(x => x !== al), 'fill', 1); })(pk(v.w))
    ]);
  }
  const ORDERS = {
    chung: [['Em', 'chăm chỉ', 'học bài', 'mỗi tối.'], ['Mẹ', 'nấu cơm', 'cho', 'cả nhà.'], ['Chú chim', 'hót líu lo', 'trên cành cây.'], ['Các bạn', 'chơi kéo co', 'ở sân trường.'], ['Bà', 'kể chuyện cổ tích', 'cho em nghe.']],
    muahe: [['Mùa hè,', 'hoa phượng', 'nở đỏ rực.'], ['Em', 'được đi tắm biển', 'cùng bố mẹ.'], ['Tiếng ve', 'râm ran', 'khắp sân trường.']],
    truong: [['Ngôi trường', 'của em', 'có nhiều cây xanh.'], ['Cô giáo', 'giảng bài', 'rất dễ hiểu.'], ['Giờ ra chơi,', 'chúng em', 'chơi nhảy dây.']],
    thuvien: [['Em', 'mượn truyện', 'ở thư viện trường.'], ['Thư viện', 'có rất nhiều', 'sách hay.']],
    nguoithan: [['Ông em', 'thích', 'trồng cây cảnh.'], ['Chị', 'giúp em', 'học bài.'], ['Cả nhà em', 'quây quần', 'bên mâm cơm.']],
    dovat: [['Chiếc đồng hồ', 'kêu tích tắc', 'suốt ngày đêm.'], ['Chú mèo', 'nằm sưởi nắng', 'bên hiên nhà.']],
    nghe: [['Bác sĩ', 'khám bệnh', 'cho mọi người.'], ['Bác nông dân', 'cày ruộng', 'ngoài đồng.']],
    thanhthi: [['Thành phố', 'có nhiều', 'nhà cao tầng.'], ['Làng quê', 'có', 'lũy tre xanh.']],
    thiennhien: [['Cầu vồng', 'xuất hiện', 'sau cơn mưa.'], ['Gió', 'thổi', 'mát rượi.']],
    datnuoc: [['Đất nước', 'Việt Nam', 'rất tươi đẹp.'], ['Em', 'yêu', 'quê hương em.']],
    lehoi: [['Đêm Trung thu,', 'các bạn nhỏ', 'đi rước đèn.']],
    traidat: [['Chúng em', 'trồng cây', 'để bảo vệ môi trường.'], ['Em', 'bỏ rác', 'vào thùng rác.']],
    'c:ke': [['Em', 'đang học', 'lớp Ba.'], ['Mẹ', 'đưa em', 'đến trường.']],
    'c:hoi': [['Bạn', 'tên', 'là gì?'], ['Nhà bạn', 'ở', 'đâu?']],
    'c:cam': [['Ôi,', 'bông hoa', 'đẹp quá!'], ['Chà,', 'chiếc cặp', 'mới đẹp thật!']],
    'c:khien': [['Các em', 'hãy giữ', 'trật tự!'], ['Con', 'hãy ăn sáng', 'rồi đi học.']],
  };
  T.sapxep = list([t => t === 'order' && order('Sắp xếp các từ ngữ thành câu đúng', pk(Object.values(ORDERS).flat()))], ['order']);

  /* ---- API ---- */
  const TYPES = ['mc', 'tf', 'fill', 'multi', 'match', 'order'];
  function gen(key, t) {
    let g = T[key];
    if (!g && key.startsWith('ch:')) g = T[key] = chuhoa(key.slice(3).split(','));
    if (!g) return null;
    try { const q = g.f(t); return q && q.t === t ? q : null; } catch (e) { return null; }
  }
  const sig = q => q.t + '|' + q.q + '|' + JSON.stringify(q.o || q.p || q.a);
  function make(keys, n, types = TYPES) {
    const out = [], seen = new Set(); if (!keys.length) return out;
    for (let i = 0; i < n * 25 && out.length < n; i++) {
      const key = keys[i % keys.length], t = types[(i + Math.floor(i / (keys.length * types.length))) % types.length];
      const q = gen(key, t); if (!q) continue; const s = sig(q); if (seen.has(s) || seen.has(q.q) && q.t !== 'tf') continue; seen.add(s); seen.add(q.q); q.k = key; out.push(q);
    }
    return sh(out);
  }
  return { make, gen, TYPES, keys: () => Object.keys(T), doc, F };
})();
if (typeof module !== 'undefined') module.exports = QG;
