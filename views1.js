/* ===== Trang chủ · Học sinh · Gọi tên · Cài đặt ===== */
'use strict';
const SAMPLE_NAMES = ['Nguyễn Gia Bảo', 'Trần Minh Khang', 'Lê Hoàng Anh', 'Phạm Thảo Nguyên', 'Võ Khánh Linh', 'Đặng Quốc Việt', 'Bùi Ngọc Mai', 'Hoàng Đức Huy', 'Phan Bảo Châu', 'Vũ Tuấn Kiệt', 'Đỗ Thanh Hà', 'Ngô Gia Hân', 'Dương Minh Quân', 'Lý Thùy Dương', 'Trịnh Nhật Nam', 'Mai Phương Thảo', 'Cao Anh Thư', 'Đinh Hải Đăng', 'Lương Bảo Ngọc', 'Tạ Khánh An', 'Hà Minh Châu', 'Châu Gia Huy', 'Lâm Tuệ Nhi', 'Kiều Đình Phúc', 'Tô Ngọc Hân', 'Thái Bảo Long', 'Quách Mỹ Linh', 'Văn Thanh Tùng', 'Huỳnh Yến Nhi', 'Nghiêm Gia Phát'];
function loadSampleClass() {
  const now = Date.now();
  S.students = SAMPLE_NAMES.map((name, i) => {
    const trend = (i % 5) - 1;           // vài em đi lên, vài em chững lại
    const log = [], n = rnd(10, 26);
    for (let k = 0; k < n; k++) {
      const age = Math.pow(Math.random(), trend >= 2 ? 1.7 : trend <= -1 ? .8 : 1.25) * 62;
      const good = Math.random() < (trend >= 2 ? .92 : trend <= -1 ? .62 : .8);
      const it = good ? pick(S.rewards) : pick(S.penalties);
      log.push({ ts: now - age * DAY - rnd(0, 8) * 3600000, d: it.d, why: it.t });
    }
    log.sort((a, b) => a.ts - b.ts);
    return { id: uid(), name, team: i % S.teamNames.length, log };
  });
  S.teamLog = []; S.round = []; save();
}

/* ---------- Trang chủ ---------- */
const CLOUD = (x, y, k = 1, o = 1) => `<g transform="translate(${x} ${y}) scale(${k})" opacity="${o}" fill="#fff" stroke="#40337A" stroke-width="2.6" stroke-linejoin="round"><path d="M14 44 a13 13 0 0 1 4-25 a19 19 0 0 1 35-5 a15 15 0 0 1 24 14 a11 11 0 0 1-3 16z"/></g>`;
const SPARK = (x, y, k = 1, c = '#FFCF3D') => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-12 L3.2-3.2 L12 0 L3.2 3.2 L0 12 L-3.2 3.2 L-12 0 L-3.2-3.2Z" fill="${c}" stroke="#40337A" stroke-width="2" stroke-linejoin="round"/>`;
const HERO_ART = `<div class="art" aria-hidden="true"><svg viewBox="0 0 900 260" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${CLOUD(560, 30, 1.1)}${CLOUD(700, 112, .8, .95)}${CLOUD(60, 150, .7, .9)}${SPARK(480, 60, .9)}${SPARK(840, 60, 1.1, '#FF7EB3')}${SPARK(620, 200, .7, '#fff')}${SPARK(250, 40, .6, '#fff')}
<path d="M-30 232 Q120 196 250 226 T520 222 T800 214 T930 224 V280 H-30Z" fill="#8CE6B0" stroke="#40337A" stroke-width="3"/><path d="M-30 248 Q160 222 330 244 T650 240 T930 246 V280 H-30Z" fill="#5FD39A" stroke="#40337A" stroke-width="3"/></svg></div>`;

V.home = {
  render() {
    const ym = curYM(), rk = rankList(ym).slice(0, 3), tot = sum(S.students.map(s => stuMonth(s, ym)));
    const tiles = NAV.filter(n => !['home', 'settings'].includes(n[0])).map(([k, ic, t, bg]) => {
      const sub = { students: 'Thêm, nhập danh sách, chia tổ', call: 'Ngẫu nhiên hoặc UFO bắt học sinh', review: 'Tạo phiếu ôn tập, in ngay', single: 'Xếp hạng theo tháng', teams: 'Cuộc đua giữa các tổ', clock: 'Hẹn giờ cho hoạt động', progress: 'Biểu đồ + link/QR cho phụ huynh', report: 'Gom khen thưởng, xuất file mẫu GK1/CK1…', games: 'Ghép đôi, đối kháng giữa các tổ' }[k];
      return `<a class="tile" href="#/${k}" style="--tc:${bg}"><span class="ic">${ic}</span><b>${t}</b><span>${sub}</span></a>`;
    }).join('');
    return `
    <div class="hero">${HERO_ART}<div class="mascot">${BESAO(190, 'cheer')}</div>
      <div class="copy"><h1>Cùng em tiến bộ</h1>
      <p>Trợ lí giáo viên tiểu học · ${esc(S.settings.className)} · ${esc(S.settings.school)}</p>
      <div class="row">
        ${S.students.length ? `<a class="btn s lg" href="#/call">🛸 Gọi tên ngay</a>` : `<button class="btn s lg" data-a="sampleClass">✨ Xem thử với lớp mẫu</button><a class="btn lg" href="#/students">➕ Nhập danh sách lớp</a>`}
        <button class="btn lg no-pwa" id="installBtn" data-a="install" style="display:none">📲 Cài như ứng dụng</button>
      </div></div>
    </div>
    ${S.students.length ? `<div class="grid g3" style="margin-bottom:20px">
      <div class="card stat t-sky"><span class="si">🧒</span><b>${S.students.length}</b><span>học sinh trong lớp</span></div>
      <div class="card stat t-sun"><span class="si">⭐</span><b class="star">★ ${tot}</b><span>sao cả lớp trong ${monthLabel(ym).toLowerCase()}</span></div>
      <div class="card t-pink"><h3 style="margin-bottom:6px">Dẫn đầu tháng này</h3>${rk.map((r, i) => `<div class="row" style="margin:4px 0"><span class="medal" style="font-size:20px">${['🥇', '🥈', '🥉'][i]}</span><b style="min-width:0;flex:1 1 0;overflow-wrap:anywhere">${esc(r.s.name)}</b><b class="star" style="white-space:nowrap">★${r.v}</b></div>`).join('')}</div>
    </div>`: ''}
    <div class="grid g3">${tiles}</div>
    <p class="muted small" style="margin-top:26px;text-align:center">Sản phẩm dự thi — Hội thi thiết bị dạy học số và đồ dùng dạy học ứng dụng công nghệ năm học 2026–2027<br>Tác giả: <b>${esc(S.settings.teacher)}</b> · ${esc(S.settings.school)}</p>`;
  },
  mount() { if (window._ip) $('#installBtn').style.display = ''; }
};
A.sampleClass = () => { loadSampleClass(); toast('Đã nạp lớp mẫu 30 học sinh'); route(); };
A.install = async () => { if (!window._ip) return; window._ip.prompt(); await window._ip.userChoice; window._ip = null; refresh(); };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._ip = e; const b = $('#installBtn'); if (b) b.style.display = ''; });

/* ---------- Quản lí học sinh ---------- */
let stuQuery = '';
V.students = {
  render() {
    const list = S.students.slice().sort(viSort).filter(s => !stuQuery || s.name.toLowerCase().includes(stuQuery.toLowerCase()));
    return pageHead('Quản lí học sinh', `${S.students.length} học sinh · ${S.teamNames.length} tổ`,
      `<button class="btn sm" data-a="exportCsv">⬇️ Xuất CSV</button><button class="btn sm" data-a="shuffleTeams">🎲 Chia tổ ngẫu nhiên</button>`) + `
    <div class="grid g2">
      <div class="card">
        <h3>➕ Thêm học sinh</h3>
        <div class="row"><input type="text" id="addName" placeholder="Họ và tên" style="flex:1;min-width:160px"><select id="addTeam" style="width:auto">${S.teamNames.map((t, i) => `<option value="${i}">${esc(t)}</option>`).join('')}</select><button class="btn p" data-a="addStu">Thêm</button></div>
        <hr style="border:0;border-top:2px dashed var(--line);margin:16px 0">
        <h3>📋 Dán cả danh sách từ Excel / Word</h3>
        <p class="muted small" style="margin:0 0 8px">Mỗi dòng một em. Có thể ghi thêm số tổ phía sau (ví dụ: <i>Nguyễn Văn An, 2</i>). Từ Excel, chỉ cần chọn cột họ tên rồi sao chép – dán vào đây.</p>
        <textarea id="bulk" placeholder="Nguyễn Văn An&#10;Trần Thị Bình, 2&#10;…"></textarea>
        <div class="row" style="margin-top:10px"><button class="btn g" data-a="bulkAdd">Nhập danh sách</button><label class="btn sm ghost" style="cursor:pointer">📂 Chọn file .csv / .txt<input type="file" accept=".csv,.txt" hidden data-ch="fileList"></label></div>
      </div>
      <div class="card">
        <div class="row" style="margin-bottom:8px"><h3 style="margin:0">Danh sách lớp</h3><span class="sp"></span><input type="search" placeholder="Tìm tên…" value="${esc(stuQuery)}" data-in="stuSearch" style="max-width:170px"></div>
        <div style="max-height:520px;overflow:auto">
        ${list.length ? list.map(s => `<div class="stu-row">${avatar(s)}<div class="nm">${esc(s.name)}<div class="muted small">★ ${stuTotal(s)} sao</div></div>
          <select data-ch="setTeam" data-id="${s.id}">${S.teamNames.map((t, i) => `<option value="${i}" ${s.team === i ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button class="btn sm ghost" title="Đổi tên" data-a="renameStu" data-id="${s.id}">✏️</button><button class="btn sm ghost" title="Xoá" data-a="delStu" data-id="${s.id}">🗑️</button></div>`).join('') :
        `<div class="empty"><div class="em">🧒</div><p class="muted">Chưa có học sinh nào.<br>Hãy thêm từng em, dán danh sách ở bên trái, hoặc nạp file danh sách lớp trong <a href="#/settings">Cài đặt</a>.</p>${hasRealRoster() ? '<button class="btn p" data-a="loadRoster">📋 Nạp danh sách lớp đã lưu</button> ' : ''}<button class="btn s" data-a="sampleClass">✨ Dùng lớp mẫu để xem thử</button></div>`}
        </div>
      </div>
    </div>`;
  }
};
A.rosterFile = el => {
  const f = el.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => {
    const inc = ($('#incNames') ? $('#incNames').value : '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean), rows = parseRosterCsv(String(r.result), inc, S.teamNames.length);
    if (rows.length < 2) return toast('Không đọc được danh sách — cần cột “Họ và tên” (và “Tổ”)');
    try { localStorage.setItem(ROSTER_LS, JSON.stringify(rows)); } catch (e) { return toast('Không lưu được danh sách'); }
    if (MODE === 'demo') { S = buildDemo(); saveNow(); toast(`Đã nạp ${rows.length} học sinh vào demo`); route(); return; }
    if (S.students.some(s => s.log.length)) { toast(`Đã lưu ${rows.length} em. Lớp hiện có sao nên chưa thay — bấm “Nạp danh sách lớp đã lưu” nếu muốn thay.`); route(); return; }
    S.students = rosterStudents(); S.rosterSeeded = true; S.rosterSig = rosterSig(); saveNow(); toast(`Đã nạp ${rows.length} học sinh (0 sao)`); route();
  };
  r.readAsText(f);
};
A.rosterClear = () => { try { localStorage.removeItem(ROSTER_LS); } catch (e) { } if (MODE === 'demo') { S = buildDemo(); saveNow(); } toast('Đã xoá danh sách đã lưu trên máy này'); route(); };
A.loadRoster = () => { S.students = rosterStudents(); S.rosterSeeded = true; S.rosterSig = rosterSig(); save(); toast('Đã nạp ' + S.students.length + ' học sinh (0 sao)'); refresh(); };
A.toggleInc = el => { const s = S.students.find(x => x.id === el.dataset.id); if (s) { s.inc = !s.inc; save(); refresh(); } };
A.stuSearch = el => { stuQuery = el.value; const pos = el.selectionStart; refresh(); const n = $('[data-in=stuSearch]'); n.focus(); n.setSelectionRange(pos, pos); };
A.addStu = () => {
  const n = $('#addName').value.trim().replace(/\s+/g, ' '); if (!n) return toast('Hãy nhập họ tên');
  S.students.push({ id: uid(), name: n, team: +$('#addTeam').value, log: [] }); save(); toast('Đã thêm ' + n); refresh(); $('#addName').focus();
};
A.bulkAdd = () => {
  const lines = $('#bulk').value.split(/\n/).map(l => l.trim()).filter(Boolean); let c = 0;
  lines.forEach(l => {
    let [name, t] = l.split(/[,;\t]/).map(x => x.trim()); name = (name || '').replace(/^\d+[\.\)]\s*/, '');
    if (!name || /^(họ tên|họ và tên|stt)$/i.test(name)) return;
    let team = S.students.length % S.teamNames.length; const tn = parseInt(t, 10); if (tn >= 1 && tn <= S.teamNames.length) team = tn - 1;
    S.students.push({ id: uid(), name: name.replace(/\s+/g, ' '), team, log: [] }); c++;
  });
  save(); toast(c ? `Đã nhập ${c} học sinh` : 'Không thấy tên hợp lệ'); refresh();
};
A.fileList = el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('#bulk').value = r.result; toast('Đã đọc file — bấm "Nhập danh sách"'); }; r.readAsText(f, 'utf-8'); };
A.setTeam = el => { const s = S.students.find(x => x.id === el.dataset.id); s.team = +el.value; save(); };
A.renameStu = el => {
  const s = S.students.find(x => x.id === el.dataset.id);
  openModal(`<h3>Đổi tên học sinh</h3><input type="text" id="rn" value="${esc(s.name)}" style="margin:12px 0"><div class="row"><button class="btn p" data-a="rnOk" data-id="${s.id}">Lưu</button><button class="btn ghost" data-a="closeModal">Huỷ</button></div>`);
  setTimeout(() => $('#rn').select(), 50);
};
A.rnOk = el => { const s = S.students.find(x => x.id === el.dataset.id), n = $('#rn').value.trim(); if (n) { s.name = n; save(); } closeModal(); refresh(); };
A.delStu = el => {
  const s = S.students.find(x => x.id === el.dataset.id);
  openModal(`<h3>Xoá ${esc(s.name)}?</h3><p class="muted">Toàn bộ điểm sao của em cũng sẽ bị xoá. Không hoàn tác được.</p><div class="row"><button class="btn c" data-a="delOk" data-id="${s.id}">Xoá</button><button class="btn ghost" data-a="closeModal">Giữ lại</button></div>`);
};
A.delOk = el => { S.students = S.students.filter(x => x.id !== el.dataset.id); S.round = S.round.filter(x => x !== el.dataset.id); save(); closeModal(); refresh(); };
A.shuffleTeams = () => {
  if (!S.students.length) return toast('Chưa có học sinh');
  const n = S.teamNames.length; shuffle(S.students).forEach((s, i) => s.team = i % n); save(); toast(`Đã chia ngẫu nhiên vào ${n} tổ`); refresh();
};
A.exportCsv = () => {
  const rows = [['STT', 'Họ và tên', 'Tổ', 'Tổng sao', 'Sao tháng này']];
  S.students.slice().sort(viSort).forEach((s, i) => rows.push([i + 1, s.name, teamName(s.team), stuTotal(s), stuMonth(s, curYM())]));
  download('danh-sach-lop.csv', '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
};

/* ---------- Gọi tên ---------- */
const CS = { mode: 'rnd', team: -1 };
function callPool() {
  const ab = todayAbsent();
  return S.students.filter(s => !S.round.includes(s.id) && !ab.includes(s.id) && (CS.team < 0 || s.team === CS.team));
}
V.call = {
  render() {
    const pool = callPool(), ab = todayAbsent();
    return pageHead('Gọi tên học sinh', `Còn ${pool.length}/${S.students.length} em chưa được gọi trong lượt này`,
      `<button class="btn sm no-present" data-a="present">🖥️ Trình chiếu</button><button class="btn sm" data-a="resetRound">🔄 Bắt đầu lượt mới</button>`) + (!S.students.length ? `<div class="card empty"><div class="em">🧒</div><p>Chưa có danh sách lớp.</p><a class="btn p" href="#/students">Nhập danh sách lớp</a></div>` : `
    <div class="row no-present" style="margin-bottom:14px">
      <span class="chip ${CS.mode === 'rnd' ? 'on' : ''}" data-a="callMode" data-v="rnd">🎲 Ngẫu nhiên</span>
      <span class="chip ${CS.mode === 'ufo' ? 'on' : ''}" data-a="callMode" data-v="ufo">🛸 UFO Abduction</span>
      <span class="sp"></span>
      <label class="small muted" style="font-weight:700">Gọi trong:</label>
      <select data-ch="callTeam" style="width:auto"><option value="-1">Cả lớp</option>${S.teamNames.map((t, i) => `<option value="${i}" ${CS.team === i ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    </div>
    ${CS.mode === 'rnd' ? `
    <div class="stage rnd" id="stage"><div class="rnd-in"><div class="rnd-bs">${BESAO(84, 'cheer')}</div>
      <div class="slot-name" id="slot">${pool.length ? '?' : '🎉'}</div>
      <div class="slot-sub" id="slotSub">${pool.length ? 'Bấm nút để chọn một bạn' : 'Cả lớp đã được gọi hết lượt này!'}</div>
      <div style="margin-top:22px"><button class="btn s lg" data-a="spin" ${pool.length ? '' : 'disabled'}>🎲 Quay!</button></div>
    </div></div>` : `
    <div class="ufo-frame" id="stage"><iframe id="ufoFrame" src="ufo.html?embed=1" title="UFO bắt học sinh" allow="fullscreen; autoplay" loading="eager"></iframe></div>`}
    <div class="card no-present" style="margin-top:18px"><h3>🙋 Hôm nay vắng mặt <span class="muted small" style="font-weight:400">(bấm vào tên để đánh dấu — các em vắng sẽ không bị gọi)</span></h3>
      <div class="row" style="gap:6px">${S.students.slice().sort(viSort).map(s => `<span class="chip ${ab.includes(s.id) ? 'x' : ''}" data-a="absent" data-id="${s.id}">${ab.includes(s.id) ? '🚫 ' : ''}${esc(givenName(s.name))}</span>`).join('')}</div></div>`);
  }
};
A.callMode = el => { CS.mode = el.dataset.v; refresh(); };
A.callTeam = el => { CS.team = +el.value; refresh(); };
A.resetRound = () => { S.round = []; save(); toast('Đã bắt đầu lượt gọi mới'); refresh(); };
A.absent = el => { const ab = todayAbsent(), i = ab.indexOf(el.dataset.id); if (i < 0) ab.push(el.dataset.id); else ab.splice(i, 1); save(); refresh(); };
A.present = () => togglePresent();
function togglePresent(force) {
  const on = force ?? !document.body.classList.contains('present');
  document.body.classList.toggle('present', on);
  try { if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.(); else if (!on && document.fullscreenElement) document.exitFullscreen?.(); } catch (e) { }
  if (on) toast('Chế độ trình chiếu — nhấn Esc để thoát');
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('present'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('present'); });

A.spin = async el => {
  const pool = callPool(); if (!pool.length) return; el.disabled = true;
  const target = pick(pool), slot = $('#slot'), sub = $('#slotSub'); sub.textContent = 'Đang quay…';
  let d = 55; for (let i = 0; i < 26; i++) { slot.textContent = pick(pool).name; sfx('tick'); await sleep(d); d *= 1.09; }
  slot.textContent = target.name; sub.textContent = teamName(target.team); sfx('win'); confetti(60); await sleep(500);
  showPick(target);
};
/* Trò chơi UFO (ufo.html) chạy trong khung riêng và trao đổi với app qua postMessage */
function ufoRoster() {
  const ab = todayAbsent();
  return S.students.filter(s => !ab.includes(s.id) && (CS.team < 0 || s.team === CS.team)).sort(viSort)
    .map(s => ({ id: s.id, name: s.name, gone: S.round.includes(s.id) }));
}
if (!window.__ufogBound) {
  window.__ufogBound = true;
  window.addEventListener('message', e => {
    const m = e.data; if (!m || m.src !== 'ufog') return;
    const fr = document.getElementById('ufoFrame'); if (!fr || e.source !== fr.contentWindow) return;
    if (m.type === 'ready') fr.contentWindow.postMessage({ src: 'app', type: 'init', students: ufoRoster(), sound: S.settings.sound !== false }, '*');
    else if (m.type === 'abducted') { if (S.students.some(x => x.id === m.id) && !S.round.includes(m.id)) { S.round.push(m.id); save(); } }
    else if (m.type === 'reset') { S.round = []; save(); }
    else if (m.type === 'star') {
      const st = S.students.find(x => x.id === m.id); if (!st) return;
      if (m.d > 0) { addStar(m.id, m.d, m.d > 1 ? 'Trả lời xuất sắc khi được gọi' : 'Trả lời tốt khi được gọi'); toast(`+${m.d} sao cho ${givenName(st.name)}!`); }
      else toast('Không sao, lần sau mình làm được nhé!');
    }
  });
}
function showPick(s) {
  if (!S.round.includes(s.id)) S.round.push(s.id); save();
  openModal(`<div class="pick"><div class="pick-bs">${BESAO(78, 'cheer')}</div>${avatar(s)}<div class="muted" style="font-weight:700">${esc(teamName(s.team))} · ★ ${stuTotal(s)}</div>
    <h2>${esc(s.name)}</h2><p class="muted" style="margin:8px 0 0">Mời bạn trả lời nhé!</p>
    <div class="acts"><button class="btn g" data-a="pickStar" data-id="${s.id}" data-d="1">+1 ⭐ Trả lời tốt</button><button class="btn k" data-a="pickStar" data-id="${s.id}" data-d="2">+2 🌟 Xuất sắc</button>
    <button class="btn" data-a="pickStar" data-id="${s.id}" data-d="0">Chưa đúng — cố lên!</button></div>
    <div class="acts"><button class="btn ghost" data-a="closeModal">Gọi bạn khác</button></div></div>`, '', () => { if (cur === 'call') refresh(); });
}
A.pickStar = el => {
  const d = +el.dataset.d; if (d > 0) { addStar(el.dataset.id, d, d > 1 ? 'Trả lời xuất sắc khi được gọi' : 'Trả lời tốt khi được gọi'); confetti(70); toast(`+${d} sao!`); }
  else toast('Không sao, lần sau mình làm được nhé!');
  closeModal();
};

/* ---------- Cài đặt & sao lưu ---------- */
const linesOf = a => a.map(x => `${x.t} | ${x.d > 0 ? '+' : ''}${x.d}`).join('\n');
const parseLines = (txt, sign) => txt.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [t, d] = l.split('|').map(x => x.trim()); let n = parseInt(d, 10); if (isNaN(n)) n = sign; if (sign > 0) n = Math.abs(n); else n = -Math.abs(n); return { t, d: n || sign }; });
V.settings = {
  render() {
    const st = S.settings, bk = S.lastBackup ? new Date(S.lastBackup).toLocaleDateString('vi-VN') : 'chưa lần nào';
    return pageHead('Cài đặt & sao lưu', 'Mọi thứ lưu ngay trên thiết bị này — không cần mạng') + `
    <div class="grid g2">
      <div class="card" style="grid-column:1/-1"><h3>🎛️ Chế độ sử dụng</h3>
        <p class="muted small" style="margin:0 0 10px">Hai chế độ lưu <b>tách biệt</b> trên thiết bị này: đổi qua lại không làm mất hay lẫn dữ liệu.</p>
        <div class="row"><button class="btn ${MODE === 'real' ? 'p' : ''}" data-a="setMode" data-m="real">⭐ Thường — tích sao học sinh thật</button><button class="btn ${MODE === 'demo' ? 'p' : ''}" data-a="setMode" data-m="demo">🎬 Demo — đủ số liệu, nhận xét để trình diễn</button></div></div>
      <div class="card" style="grid-column:1/-1"><h3>👨‍🏫 Danh sách lớp thật & địa chỉ gửi phụ huynh</h3>
        <p class="muted small" style="margin:0 0 10px">Danh sách lớp chỉ lưu <b>trên máy này</b>, không đưa lên mạng — phụ huynh mở link chỉ thấy con mình. Chọn file .csv có cột <i>Họ và tên</i> và <i>Tổ</i> (ví dụ file Bảng đánh giá TT27 của cô).</p>
        <label class="f">Học sinh hòa nhập (không hiện cho ai, cách nhau dấu phẩy)</label><input type="text" id="incNames" value="${esc(((localRoster() || []).filter(r => r[2]).map(r => r[0])).join(', '))}" placeholder="Nguyễn Mạnh Hiếu, Võ Trần Anh Thư"><div style="height:10px"></div>
        <div class="row"><label class="btn p" style="cursor:pointer">📂 Chọn file danh sách (.csv)<input type="file" accept=".csv,.txt" hidden data-ch="rosterFile"></label>${localRoster() ? `<span class="muted small">Đang lưu <b>${localRoster().length}</b> em trên máy này.</span><button class="btn sm ghost" data-a="rosterClear">Xoá danh sách đã lưu</button>` : '<span class="muted small">Chưa nạp — đang dùng tên giả/danh sách trống.</span>'}</div>
        <div style="height:12px"></div><label class="f">Địa chỉ app dùng trong link & QR gửi phụ huynh</label><input type="text" value="${esc(S.settings.appUrl || APP_URL_DEFAULT)}" data-in="setField" data-k="appUrl"><p class="muted small" style="margin:6px 0 0">Mặc định là địa chỉ Netlify của app. Link phụ huynh luôn trỏ về đây dù cô tạo link ở đâu.</p></div>
      <div class="card"><h3>🏫 Thông tin lớp</h3>
        <label class="f">Tên trường</label><input type="text" value="${esc(st.school)}" data-in="setField" data-k="school"><div style="height:10px"></div>
        <label class="f">Giáo viên</label><input type="text" value="${esc(st.teacher)}" data-in="setField" data-k="teacher"><div style="height:10px"></div>
        <div class="row"><div style="flex:1"><label class="f">Lớp</label><input type="text" value="${esc(st.className)}" data-in="setField" data-k="className"></div>
        <div style="width:110px"><label class="f">Khối</label><select data-ch="setGrade">${[1, 2, 3, 4, 5].map(g => `<option ${st.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div></div>
        <div style="height:12px"></div><label class="row" style="cursor:pointer"><input type="checkbox" ${st.sound ? 'checked' : ''} data-ch="setSound" style="width:20px;height:20px"> <b>Bật âm thanh hiệu ứng</b></label></div>
      <div class="card"><h3>🚩 Các tổ</h3><p class="muted small" style="margin:0 0 8px">Mỗi dòng một tổ. Có thể đổi tên (ví dụ: Tổ Sao Mai).</p>
        <textarea id="teamsTxt" data-ch="setTeams" style="min-height:120px">${esc(S.teamNames.join('\n'))}</textarea></div>
      <div class="card"><h3>⭐ Tiêu chí cộng sao</h3><p class="muted small" style="margin:0 0 8px">Dạng: <i>Tên tiêu chí | số sao</i></p><textarea data-ch="setRewards" style="min-height:130px">${esc(linesOf(S.rewards))}</textarea></div>
      <div class="card"><h3>⚠️ Tiêu chí trừ sao</h3><p class="muted small" style="margin:0 0 8px">Dạng: <i>Tên tiêu chí | -1</i></p><textarea data-ch="setPenalties" style="min-height:130px">${esc(linesOf(S.penalties))}</textarea></div>
      <div class="card"><h3>💾 Sao lưu & khôi phục</h3>
        <p class="muted small" style="margin:0 0 10px">Lần sao lưu gần nhất: <b>${bk}</b>. Nên sao lưu mỗi tuần để không mất dữ liệu khi đổi máy.</p>
        <div class="row"><button class="btn p" data-a="backup">⬇️ Tải file sao lưu</button><label class="btn" style="cursor:pointer">⬆️ Khôi phục<input type="file" accept=".json" hidden data-ch="restore"></label></div></div>
      ${MODE === 'demo' ? `<div class="card"><h3>🎬 Dữ liệu demo</h3><div class="row"><button class="btn s" data-a="demoReset">↺ Làm mới demo</button></div><p class="muted small" style="margin:10px 0 0">Đưa dữ liệu demo về như ban đầu. Dữ liệu thật ở chế độ thường không bị ảnh hưởng.</p></div>` : `<div class="card"><h3>🧪 Dữ liệu mẫu & làm lại</h3>
        <div class="row">${hasRealRoster() ? '<button class="btn p" data-a="loadRoster">📋 Nạp danh sách lớp đã lưu</button>' : ''}<button class="btn s" data-a="sampleClass">✨ Nạp lớp mẫu</button><button class="btn c" data-a="wipe">🗑️ Xoá toàn bộ</button></div>
        <p class="muted small" style="margin:10px 0 0">Nạp danh sách lớp sẽ đưa cả lớp về 0 sao và thay danh sách hiện tại.</p></div>`}
    </div>`;
  }
};
A.setField = el => { S.settings[el.dataset.k] = el.value; save(); };
A.setGrade = el => { S.settings.grade = +el.value; save(); };
A.setSound = el => { S.settings.sound = el.checked; save(); };
A.setTeams = el => {
  const arr = el.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8); if (arr.length < 2) return toast('Cần ít nhất 2 tổ');
  S.teamNames = arr; S.students.forEach(s => { if (s.team >= arr.length) s.team = arr.length - 1; }); save(); toast('Đã cập nhật các tổ');
};
A.setRewards = el => { const a = parseLines(el.value, 1); if (a.length) { S.rewards = a; save(); toast('Đã lưu tiêu chí cộng sao'); } };
A.setPenalties = el => { const a = parseLines(el.value, -1); if (a.length) { S.penalties = a; save(); toast('Đã lưu tiêu chí trừ sao'); } };
A.backup = () => { S.lastBackup = Date.now(); saveNow(); download(`sao-luu-cung-em-tien-bo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S), 'application/json'); toast('Đã tải file sao lưu'); refresh(); };
A.restore = el => {
  const f = el.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { try { const o = JSON.parse(r.result); if (!Array.isArray(o.students)) throw 0; S = Object.assign(freshState(), o); saveNow(); toast('Đã khôi phục dữ liệu'); route(); } catch (e) { toast('File sao lưu không hợp lệ'); } };
  r.readAsText(f);
};
A.wipe = () => openModal(`<h3>Xoá toàn bộ dữ liệu?</h3><p class="muted">Danh sách lớp và toàn bộ điểm sao sẽ mất. Hãy tải file sao lưu trước nếu cần.</p><div class="row"><button class="btn c" data-a="wipeOk">Xoá hết</button><button class="btn ghost" data-a="closeModal">Giữ lại</button></div>`);
A.wipeOk = () => { S = MODE === 'demo' ? buildDemo() : freshState(); S.rosterSeeded = true; saveNow(); closeModal(); toast('Đã xoá'); route(); };
