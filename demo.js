/* ===== Hai chế độ: DEMO (đủ số liệu, nhận xét) và THƯỜNG (tích sao thật) =====
   Nạp TRƯỚC core.js. Chỉ khai báo hàm; core.js gọi khi khởi động.
   Dữ liệu hai chế độ nằm ở hai khoá localStorage khác nhau nên không bao giờ ghi đè lên nhau. */
'use strict';
const DEMO_VER = 7;            // tăng số này khi đổi nội dung demo → demo tự nạp lại bản mới

/* tên dự phòng nếu không có roster.js */
function fallbackRoster() {
  const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Võ', 'Đặng', 'Bùi', 'Hoàng'], dem = ['Gia', 'Minh', 'Ngọc', 'Thanh', 'Bảo'], ten = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Khoa', 'Lan', 'Mai', 'Nam', 'Phúc'];
  return Array.from({ length: 46 }, (_, i) => [ho[i % 8] + ' ' + dem[(i * 3) % 5] + ' ' + ten[(i * 7) % 11], i < 12 ? 0 : i < 24 ? 1 : i < 35 ? 2 : 3, i === 13 || i === 39 ? 1 : 0]);
}
/* Danh sách lớp thật chỉ nằm trên máy cô (localStorage), KHÔNG nằm trong mã nguồn đưa lên mạng → phụ huynh không thể xem tên bạn khác. */
const ROSTER_LS = 'gvth_cet_roster';
function localRoster() { try { const r = JSON.parse(localStorage.getItem(ROSTER_LS) || 'null'); return Array.isArray(r) && r.length ? r : null; } catch (e) { return null; } }
const rosterData = () => localRoster() || ((typeof ROSTER_BA5 !== 'undefined' && ROSTER_BA5.length) ? ROSTER_BA5 : fallbackRoster());
const hasRealRoster = () => !!localRoster() || (typeof ROSTER_BA5 !== 'undefined' && ROSTER_BA5.length > 0);
const rosterSig = () => { let h = 0; const r = rosterData(); for (const [n, t, i] of r) for (const c of n + t + i) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h + ':' + r.length; };
function parseCsvLine(l) { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map(x => x.trim()); }
const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
function parseRosterCsv(text, incNames, nTeams) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim()), inc = new Set(incNames.map(plain).filter(Boolean));
  let ni = 0, ti = 1, ei = -1, start = 0;
  for (let k = 0; k < Math.min(lines.length, 12); k++) { const c = parseCsvLine(lines[k]).map(plain), n = c.findIndex(x => x === 'ho va ten' || x === 'ho ten'); if (n >= 0) { ni = n; const t = c.findIndex(x => x === 'to'); ti = t; ei = c.findIndex(x => /^(email|gmail|e-mail)/.test(x)); start = k + 1; break; } }
  const out = []; lines.slice(start).forEach((l, i) => {
    const c = parseCsvLine(l); let name = (c[ni] || '').replace(/\s+/g, ' ').trim(); if (!name || /^(stt|ho va ten)$/.test(plain(name)) || /^\d+$/.test(name)) return;
    let t = parseInt(ti >= 0 ? c[ti] : c[ni + 1], 10); t = t >= 1 && t <= nTeams ? t - 1 : out.length % nTeams;
    out.push([name, t, inc.has(plain(name)) ? 1 : 0, ei >= 0 ? (c[ei] || '') : '']);
  });
  return out;
}
/* danh sách lớp thật, 0 sao — dùng cho chế độ THƯỜNG */
function rosterStudents() {
  return rosterData().map(([name, team, inc, em]) => { const s = { id: uid(), name, team, log: [] }; if (inc) s.inc = true; if (em) s.em = em; return s; });
}
function seedRoster(st) {
  if (!hasRealRoster()) return false;
  const sig = rosterSig(), untouched = !st.students.some(s => s.log.length);   // chưa tích sao em nào → an toàn để thay danh sách cũ
  if (st.rosterSeeded && st.rosterSig !== sig && untouched) { st.students = []; st.rosterSeeded = false; }
  if (st.students.length || st.rosterSeeded) return false;
  st.students = rosterStudents(); st.rosterSeeded = true; st.rosterSig = sig; return true;
}

/* ---------- DEMO ---------- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function buildDemo() {
  const R = mulberry(20261105), ri = (a, b) => Math.floor(R() * (b - a + 1)) + a, pk = a => a[Math.floor(R() * a.length)];
  const wpick = arr => { let t = arr.reduce((s, x) => s + x[1], 0), r = R() * t; for (const x of arr) { if ((r -= x[1]) <= 0) return x[0]; } return arr[0][0]; };
  const st = freshState(); st.demoVer = DEMO_VER; st.rosterSeeded = true; st.rosterSig = rosterSig();
  const now = Date.now(), A0 = new Date('2026-09-08T00:00:00').getTime(), A1 = new Date('2026-10-30T00:00:00').getTime(), B0 = Math.max(A0, now - 30 * DAY);
  const weekday = ts => { const d = new Date(ts); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); d.setHours(7 + ri(0, 9), ri(0, 59), 0, 0); return d.getTime(); };
  const POS = [['Phát biểu hay', 3, 1], ['Làm bài tốt', 3, 1], ['Giúp đỡ bạn', 2, 2], ['Chăm chỉ, nề nếp tốt', 2, 1], ['Có tiến bộ rõ rệt', 1, 2], ['Cộng nhanh', 2, 1], ['Trả lời tốt khi được gọi', 2, 1], ['Trả lời xuất sắc khi được gọi', 1, 2]];
  const NEG = [['Nói chuyện riêng', 3, -1], ['Quên đồ dùng học tập', 2, -1], ['Chưa hoàn thành bài', 2, -1]];
  const INC = [['Hoàn thành mục tiêu cá nhân', 3, 2], ['Tự tin giơ tay phát biểu', 2, 1], ['Hợp tác cùng bạn trong nhóm', 2, 1], ['Tự giác vào nề nếp', 2, 1], ['Giữ gìn đồ dùng gọn gàng', 1, 1]];
  const entry = (list, ts) => { const w = list.map(x => [x, x[1]]), x = wpick(w); return { ts, d: x[2], why: x[0] }; };

  const roster = rosterData().map(([name, team, inc], i) => { const x = mulberry(i * 7919 + 13)(); return { name, team, inc: !!inc, lv: x < .45 ? .93 : x < .8 ? .6 : .25 }; });

  st.students = roster.map((r, i) => {
    const rising = !r.inc && r.lv < .8 && i % 3 === 0;         // em đang tiến bộ rõ: đầu kì nhiều lỗi, gần đây tốt hơn
    const n = r.inc ? ri(16, 20) : r.lv >= .8 ? ri(22, 32) : r.lv >= .4 ? ri(16, 24) : ri(12, 18), log = [];
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1 || 1);                              // 0 = đầu kì … 1 = gần đây
      const ts = weekday(R() < .6 ? A0 + u * (A1 - A0) + ri(-2, 2) * DAY : B0 + R() * (now - B0));
      if (r.inc) { log.push(entry(INC, ts)); continue; }
      const base = r.lv >= .8 ? .93 : r.lv >= .4 ? .8 : .62, pGood = rising ? .35 + .6 * (ts > now - 35 * DAY ? 1 : 0) : base;
      log.push(R() < pGood ? entry(POS, ts) : entry(NEG, ts));
    }
    /* vài lượt gần đây trong tháng hiện tại → bảng "tháng này", xếp hạng, biểu đồ tuần luôn có số liệu */
    const C0 = Math.max(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime(), now - 12 * DAY), nC = r.inc ? ri(3, 5) : r.lv >= .8 ? ri(4, 7) : r.lv >= .4 ? ri(3, 5) : ri(2, 4);
    for (let k = 0; k < nC; k++) { const ts = weekday(C0 + R() * (now - C0)); log.push(r.inc ? entry(INC, ts) : R() < (r.lv >= .8 ? .93 : rising ? .85 : r.lv >= .4 ? .8 : .7) ? entry(POS, ts) : entry(NEG, ts)); }
    log.sort((a, b) => a.ts - b.ts);
    return { id: uid(), name: r.name, team: r.team, log, inc: !!r.inc, _lv: r.lv, _rise: rising };
  });

  /* thưởng chung theo tổ */
  for (let k = 0; k < 12; k++) st.teamLog.push({ ts: weekday(B0 + R() * (now - B0)), team: ri(0, 3), d: pk([1, 2, 3, 5]), why: 'Thưởng chung' });
  st.teamLog.sort((a, b) => a.ts - b.ts);

  /* ----- nhận xét cho phụ huynh, ghi chú, nhận xét định kì GK1 ----- */
  const topWhy = s => { const m = {}; s.log.forEach(l => { if (l.d > 0 && !/^(Cộng nhanh|Trả lời)/.test(l.why)) m[l.why] = (m[l.why] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(x => x[0]); };
  const lowerFirst = t => t.charAt(0).toLowerCase() + t.slice(1);
  const tier = s => s.inc ? 'inc' : s._lv >= .8 ? 'hi' : s._lv >= .4 ? 'mid' : 'lo';
  const P = {
    comment: {
      hi: ['Em {g} học tập chủ động, hay phát biểu và sẵn sàng giúp đỡ bạn. Gia đình khuyến khích em đọc thêm sách mỗi tối để phát huy thế mạnh.', 'Em {g} nề nếp tốt, bài làm cẩn thận và có trách nhiệm với tổ. Mong gia đình tiếp tục đồng hành, cho em thử sức với những bài toán suy luận thú vị.', 'Em {g} tự giác, hoàn thành bài đầy đủ và luôn lắng nghe cô giảng. Em có thể tự tin hơn khi trình bày trước lớp — gia đình cho em luyện nói ở nhà nhé.'],
      mid: ['Em {g} có nhiều tiến bộ về nề nếp và chữ viết. Em cần giơ tay phát biểu thường xuyên hơn; gia đình hỏi em “hôm nay con học được gì” mỗi tối sẽ giúp em tự tin.', 'Em {g} hiền, hòa đồng, làm bài khá tốt. Thỉnh thoảng em còn nói chuyện riêng; cô sẽ nhắc nhở và mong gia đình cùng khích lệ em tập trung hơn.', 'Em {g} ngày càng chăm chỉ. Em nên luyện đọc to, rõ ràng mỗi ngày 10 phút để đọc lưu loát hơn.'],
      lo: ['Em {g} đang cố gắng từng ngày, gần đây đã hoàn thành bài đúng hạn nhiều hơn. Gia đình dành 10–15 phút mỗi tối ngồi cùng em ôn lại bài sẽ giúp em tiến bộ nhanh hơn.', 'Em {g} cần rèn thêm sự tập trung và việc chuẩn bị đồ dùng học tập. Cô ghi nhận em đã có những buổi học rất tốt; mong gia đình cùng cô động viên em.', 'Em {g} còn chậm ở phần đọc – viết nhưng rất đáng khen vì không bỏ cuộc. Mong gia đình kiên nhẫn đồng hành, cô sẽ hỗ trợ thêm ở lớp.'],
      inc: ['Em {g} đang tiến bộ theo mục tiêu riêng cô và gia đình đã thống nhất: em tự tin hơn khi giao tiếp và hòa nhập cùng các bạn trong nhóm. Cô rất vui khi thấy nụ cười của em mỗi ngày.', 'Em {g} đã hoàn thành nhiều mục tiêu cá nhân trong tháng qua và tự giác hơn trong nề nếp. Mong gia đình tiếp tục khen ngợi những bước tiến nhỏ của em.']
    },
    nlc: {
      hi: ['Em tự chủ, tự học tốt; biết hợp tác cùng bạn, chủ động đề xuất cách giải quyết khi gặp vấn đề. Em đọc – viết thành thạo, tính toán nhanh và chính xác.', 'Em chủ động hoàn thành nhiệm vụ học tập, hay phát biểu xây dựng bài. Em hợp tác nhóm tốt và sáng tạo trong cách trình bày bài làm.'],
      mid: ['Em có ý thức tự học, hoàn thành bài khá đầy đủ. Em hợp tác với bạn tốt, cần mạnh dạn hơn khi trình bày ý kiến trước lớp. Tính toán đúng ở các dạng quen thuộc.', 'Em tự giác làm bài, biết nhờ bạn và cô giúp khi chưa hiểu. Em đọc khá lưu loát, cần luyện thêm kĩ năng giải quyết bài toán có lời văn.'],
      lo: ['Em đang dần hình thành thói quen tự học, hoàn thành bài khi có cô nhắc nhở. Em cần luyện thêm đọc – viết và các phép tính đã học; cô sẽ kèm cặp thêm trong giờ ra chơi.', 'Em có cố gắng trong học tập, bước đầu biết hợp tác với bạn. Em cần được hỗ trợ thêm về đọc hiểu và tính toán để theo kịp các bạn.'],
      inc: ['Em tham gia hoạt động học tập theo kế hoạch giáo dục cá nhân, biết làm việc cùng bạn khi có hướng dẫn. Em đạt các mục tiêu riêng về giao tiếp và tự phục vụ.']
    },
    pc: {
      hi: ['Em yêu nước, nhân ái, luôn giúp đỡ bạn; chăm chỉ, trung thực và có trách nhiệm với công việc của tổ, của lớp.', 'Em lễ phép với thầy cô, hòa nhã với bạn bè, giữ gìn đồ dùng học tập; trung thực, có trách nhiệm trong mọi hoạt động.'],
      mid: ['Em lễ phép, thân thiện với bạn; chăm chỉ, trung thực. Đôi lúc em còn nói chuyện riêng trong giờ, cần rèn thêm sự tập trung.', 'Em biết yêu thương bạn bè, có trách nhiệm với việc được giao. Em cần chuẩn bị đồ dùng học tập đầy đủ hơn mỗi ngày.'],
      lo: ['Em ngoan, biết vâng lời cô; đang rèn tính tự giác và trách nhiệm với bài vở. Em cần cố gắng giữ trật tự và chuẩn bị đồ dùng đầy đủ.', 'Em hiền, hòa đồng với bạn. Em cần chăm chỉ hơn trong học tập và hoàn thành bài đúng thời gian cô giao.'],
      inc: ['Em thân thiện, được các bạn quý mến; biết chào hỏi thầy cô và giữ gìn đồ dùng cá nhân. Em đang tiến bộ về tính tự giác và trách nhiệm.']
    },
    dd: {
      hi: ['Em biết kính trọng thầy cô, yêu thương bạn bè và luôn thực hiện tốt nội quy lớp học.', 'Em có hành vi chuẩn mực, biết chia sẻ và giúp đỡ bạn; thực hiện tốt các quy tắc ứng xử đã học.'],
      mid: ['Em thực hiện được các quy tắc ứng xử đã học, biết xin lỗi và cảm ơn đúng lúc. Em cần chủ động giúp đỡ bạn nhiều hơn.', 'Em có ý thức giữ gìn nề nếp lớp học, cần mạnh dạn hơn khi chia sẻ cảm xúc cùng các bạn.'],
      lo: ['Em bước đầu biết cách ứng xử lịch sự với thầy cô và bạn bè; cần nhắc nhở thêm việc giữ trật tự trong giờ học.', 'Em ngoan, biết vâng lời; cần rèn thêm ý thức tự giác thực hiện nội quy.'],
      inc: ['Em biết chào hỏi, cảm ơn khi được hướng dẫn và thân thiện với các bạn trong lớp.']
    },
    hdtn: {
      hi: ['Em tích cực tham gia các hoạt động của lớp, biết phân công và hợp tác cùng bạn để hoàn thành sản phẩm nhóm.', 'Em nhiệt tình, sáng tạo trong hoạt động tập thể; tự tin giới thiệu sản phẩm của nhóm trước lớp.'],
      mid: ['Em tham gia hoạt động đầy đủ, biết làm việc nhóm. Em cần mạnh dạn hơn khi nêu ý kiến của mình.', 'Em hứng thú với hoạt động trải nghiệm, hoàn thành nhiệm vụ nhóm giao; cần chủ động hơn trong vai trò nhóm trưởng.'],
      lo: ['Em tham gia hoạt động khi được cô và các bạn rủ; cần tự tin hơn để thể hiện bản thân.', 'Em bước đầu biết hợp tác trong nhóm; cần được khích lệ thêm để chủ động tham gia.'],
      inc: ['Em vui vẻ tham gia hoạt động cùng các bạn, hoàn thành phần việc đơn giản được giao với sự hỗ trợ của cô và bạn.']
    },
    note: ['Chữ viết đẹp, trình bày sạch sẽ.', 'Đọc to, rõ ràng — cần luyện thêm ngắt nghỉ.', 'Hay giúp bạn cùng bàn; được cả tổ yêu quý.', 'Tuần này tập trung hơn hẳn, hoàn thành bài đúng hạn.', 'Cần nhắc chuẩn bị đồ dùng học tập; gia đình đã trao đổi với cô.', 'Mạnh dạn hơn khi lên bảng; làm toán nhanh.']
  };
  const fill = (t, g) => t.replace(/\{g\}/g, g);
  const pickT = (k, t) => pk(P[k][t]);
  st.notes.GK1 = {}; st.reports.GK1 = {};
  st.students.forEach((s, i) => {
    const t = tier(s), g = givenName(s.name), wy = topWhy(s);
    let c = fill(pickT('comment', t), g);
    if (wy[0] && t !== 'inc' && R() < .5) c += ' Cô đặc biệt ghi nhận em ở mục “' + wy[0] + '”.';
    st.comments[s.id] = c;
    if (R() < .35 || s._rise) st.notes.GK1[s.id] = s._rise ? 'Tiến bộ rõ trong tháng gần đây: bắt đầu hoàn thành bài đúng hạn và giữ trật tự tốt hơn.' : pk(P.note);
    const extra = wy[0] ? ' Em thường được ghi nhận ở: ' + lowerFirst(wy[0]) + '.' : '';
    st.reports.GK1[s.id] = { nlc: pickT('nlc', t) + (t === 'hi' || t === 'mid' ? extra : ''), pc: pickT('pc', t), subj: { 'Đạo đức': pickT('dd', t), 'Hoạt động trải nghiệm': pickT('hdtn', t) } };
  });
  st.reportCfg = { period: 'GK1', subjects: ['Đạo đức', 'Hoạt động trải nghiệm'] };
  st.students.forEach(s => { delete s._lv; delete s._rise; });
  return st;
}
