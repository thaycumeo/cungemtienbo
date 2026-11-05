/* ===== Tiến bộ & phụ huynh · Trò chơi ôn tập ===== */
'use strict';

/* ---- biểu đồ SVG (dùng cả cho phụ huynh) ---- */
function chartSvg(vals, labels) {
  const W = 560, H = 230, L = 34, R = 12, T = 22, B = 30, n = vals.length;
  const max = Math.max(3, ...vals), min = Math.min(0, ...vals), span = max - min || 1;
  const y = v => T + (H - T - B) * (1 - (v - min) / span), bw = (W - L - R) / n, x = i => L + bw * i + bw / 2;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Biểu đồ sao theo tuần">`;
  const ticks = 4; for (let i = 0; i <= ticks; i++) { const v = Math.round(min + span * i / ticks), yy = y(v); s += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-dasharray="4 4"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${v}</text>`; }
  s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink2)" stroke-width="1.5"/>`;
  vals.forEach((v, i) => {
    const top = Math.min(y(v), y(0)), hh = Math.max(3, Math.abs(y(v) - y(0)));
    s += `<rect x="${x(i) - bw * .3}" y="${top}" width="${bw * .6}" height="${hh}" rx="7" fill="${v >= 0 ? '#18B7A0' : '#FF6B6B'}" opacity=".85"/>`;
    s += `<text x="${x(i)}" y="${(v >= 0 ? top : top + hh) + (v >= 0 ? -6 : 14)}" text-anchor="middle" style="font-weight:700;fill:var(--ink)">${v}</text>`;
    s += `<text x="${x(i)}" y="${H - 9}" text-anchor="middle">${labels[i]}</text>`;
  });
  s += `<polyline fill="none" stroke="#6C4CF1" stroke-width="3" stroke-linejoin="round" points="${vals.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`;
  vals.forEach((v, i) => s += `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="#fff" stroke="#6C4CF1" stroke-width="3"/>`);
  return s + '</svg>';
}
function trendOf(s) {
  const w = weeksSeries(s, 8).map(x => x.v), a = sum(w.slice(-2)), b = sum(w.slice(-4, -2));
  if (a - b >= 2 && a > 0) return { k: 'up', t: '📈 Đang tiến bộ', txt: `2 tuần gần đây được ${a} sao, nhiều hơn ${a - b} sao so với 2 tuần trước.` };
  if (a <= 0 || b - a >= 3) return { k: 'down', t: '💛 Cần quan tâm', txt: a <= 0 ? 'Hai tuần gần đây em chưa có sao nào. Thầy/cô nên trò chuyện và động viên em.' : `2 tuần gần đây ít hơn ${b - a} sao so với 2 tuần trước.` };
  return { k: 'flat', t: '🙂 Ổn định', txt: 'Kết quả giữ đều qua các tuần.' };
}
const weekLabels = () => weeksSeries({ log: [] }, 8).map(x => fmtDate(x.a));

/* ---- QR ---- */
function qrCanvas(text, size = 300) {
  let q = null;
  for (let t = 3; t <= 40; t++) { try { const c = new QRCodeLib(t, 0); c.addData(text); c.make(); q = c; break; } catch (e) { } }
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); if (!q) return cv;
  const n = q.getModuleCount(), qz = 3, cell = Math.floor(size / (n + qz * 2)), off = Math.floor((size - cell * n) / 2);
  g.fillStyle = '#1E1B4B'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * cell, off + r * cell, cell, cell);
  return cv;
}

/* ---- gói dữ liệu cho phụ huynh (nằm ngay trong link, không lưu trên máy chủ) ---- */
const b64u = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function pipeBytes(u8, stream) { const r = new Blob([u8]).stream().pipeThrough(stream); return new Uint8Array(await new Response(r).arrayBuffer()); }
async function packPayload(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  try { if (window.CompressionStream) return 'z.' + b64u(await pipeBytes(raw, new CompressionStream('deflate-raw'))); } catch (e) { }
  return 'p.' + b64u(raw);
}
async function unpackPayload(s) {
  const k = s.slice(0, 2), u = unb64u(s.slice(2));
  const raw = k === 'z.' ? await pipeBytes(u, new DecompressionStream('deflate-raw')) : u;
  return JSON.parse(new TextDecoder().decode(raw));
}
function parentData(s) {
  const ym = curYM(), rk = rankList(ym), me = rk.find(r => r.s.id === s.id), p = (S.reportCfg && S.reportCfg.period) || 'GK1', rp = (S.reports[p] || {})[s.id] || {};
  const sj = Object.entries(rp.subj || {}).filter(x => x[1] && x[1].trim()).map(x => [x[0], x[1].trim()]);
  const d = { n: s.name, c: S.settings.className, sc: S.settings.school, t: S.settings.teacher, tm: teamName(s.team), m: ym, tot: stuTotal(s), ms: me.v, w: weeksSeries(s, 8).map(x => x.v), wl: weekLabels(), r: s.log.slice(-6).reverse().map(l => [l.ts, l.d, l.why]), cm: S.comments[s.id] || '', ts: Date.now() };
  if ((rp.nlc && rp.nlc.trim()) || (rp.pc && rp.pc.trim()) || sj.length) d.rp = { p: (PERIODS.find(x => x[0] === p) || [p, p])[1], nlc: (rp.nlc || '').trim(), pc: (rp.pc || '').trim(), sj };
  return d;       // chỉ dữ liệu của RIÊNG em này: không có tên bạn khác, không có xếp hạng
}
const APP_URL_DEFAULT = 'https://trolygvcntieuhoc.netlify.app';
const appBase = () => ((S.settings.appUrl || APP_URL_DEFAULT).trim().replace(/[#?].*$/, '').replace(/\/+$/, '')) + '/';
const parentUrl = p => appBase() + '#/pv/' + p;

/* ---- màn hình Tiến bộ ---- */
const PS = { id: null };
V.progress = {
  render() {
    if (!S.students.length) return pageHead('Tiến bộ & phụ huynh', '') + `<div class="card empty"><div class="em">📈</div><p>Chưa có học sinh.</p><a class="btn p" href="#/students">Nhập danh sách lớp</a></div>`;
    const list = S.students.slice().sort(viSort); if (!PS.id || !S.students.find(s => s.id === PS.id)) PS.id = list[0].id;
    const s = S.students.find(x => x.id === PS.id), ym = curYM(), rk = rankList(ym), me = rk.find(r => r.s.id === s.id);
    const prevYm = ymOf(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).getTime()), dm = me.v - stuMonth(s, prevYm), tr = trendOf(s);
    const w = weeksSeries(s, 8).map(x => x.v);
    const watch = S.students.filter(x => trendOf(x).k === 'down').slice(0, 8), best = S.students.map(x => ({ x, d: sum(weeksSeries(x, 4).slice(2).map(a => a.v)) - sum(weeksSeries(x, 4).slice(0, 2).map(a => a.v)) })).filter(a => a.d > 0).sort((a, b) => b.d - a.d).slice(0, 5);
    return pageHead('Tiến bộ & phụ huynh', 'Theo dõi từng em và gửi kết quả cho gia đình bằng link hoặc mã QR',
      `<button class="btn sm" data-a="linkAll">💬 Gửi cả lớp (Zalo / Gmail)</button><button class="btn sm" data-a="qrAll">🖨️ In thẻ QR cả lớp</button>`) + `
    <div class="row" style="margin-bottom:16px"><button class="btn sm" data-a="pgPrev">◀</button><select data-ch="pgSel" style="max-width:320px">${list.map(x => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn sm" data-a="pgNext">▶</button>
      <span class="sp"></span><button class="btn p" data-a="shareParent">📲 Link & QR cho phụ huynh</button></div>
    <div class="grid g2" style="align-items:start"><div>
      <div class="card" style="margin-bottom:16px"><div class="row">${avatar(s, 'width:60px;height:60px;font-size:28px')}<div><h3 style="margin:0;font-size:24px">${esc(s.name)}</h3><span class="tag">${esc(teamName(s.team))}</span> <span class="tag" style="background:${tr.k === 'up' ? 'var(--mint-l)' : tr.k === 'down' ? 'var(--sun-l)' : 'var(--sky-l)'}">${tr.t}</span></div></div>
        <p class="muted" style="margin:10px 0 0">${tr.txt}</p></div>
      <div class="kpi" style="margin-bottom:16px"><div class="card"><b class="star">★${stuTotal(s)}</b><span>tổng số sao</span></div><div class="card"><b>${me.v}</b><span>sao tháng này${dm ? ` (${dm > 0 ? '+' : ''}${dm} so với tháng trước)` : ''}</span></div><div class="card"><b>${me.rank}<small style="font-size:16px">/${rk.length}</small></b><span>hạng trong lớp</span></div></div>
      <div class="card"><h3>Sao theo từng tuần (8 tuần gần nhất)</h3>${chartSvg(w, weekLabels())}</div>
    </div><div>
      <div class="card" style="margin-bottom:16px"><h3>💬 Nhận xét của giáo viên</h3><textarea data-in="pgComment" placeholder="Ví dụ: Em tiến bộ rõ về tính cẩn thận, cần luyện đọc to hơn…">${esc(S.comments[s.id] || '')}</textarea><p class="muted small" style="margin:6px 0 0">Nhận xét này sẽ hiện trong link gửi phụ huynh.</p>${aiCommentBlock()}</div>
      <div class="card" style="margin-bottom:16px"><h3>🕘 Nhật ký gần đây</h3>${s.log.slice(-8).reverse().map(l => `<div class="row" style="padding:5px 0;border-bottom:1px dashed var(--line)"><b class="${l.d > 0 ? 'star' : ''}" style="min-width:34px;color:${l.d > 0 ? '' : 'var(--coral)'}">${l.d > 0 ? '+' : ''}${l.d}</b><span style="flex:1">${esc(l.why)}</span><span class="muted small">${fmtDate(l.ts)}</span></div>`).join('') || '<p class="muted">Chưa có ghi nhận nào.</p>'}</div>
      <div class="card"><h3>👀 Cả lớp: ai cần quan tâm, ai tiến bộ?</h3>
        <b class="small muted">CẦN QUAN TÂM</b><div class="row" style="gap:6px;margin:6px 0 12px">${watch.map(x => `<span class="chip x" data-a="pgGo" data-id="${x.id}">${esc(givenName(x.name))}</span>`).join('') || '<span class="muted small">Chưa có em nào 🎉</span>'}</div>
        <b class="small muted">TIẾN BỘ NHẤT 2 TUẦN QUA</b><div class="row" style="gap:6px;margin-top:6px">${best.map(a => `<span class="chip" style="border-color:var(--mint)" data-a="pgGo" data-id="${a.x.id}">📈 ${esc(givenName(a.x.name))} +${a.d}</span>`).join('') || '<span class="muted small">Chưa đủ dữ liệu</span>'}</div></div>
    </div></div>`;
  }
};
A.pgSel = el => { PS.id = el.value; refresh(); };
A.pgGo = el => { PS.id = el.dataset.id; refresh(); window.scrollTo(0, 0); };
const stepStu = d => { const l = S.students.slice().sort(viSort), i = l.findIndex(s => s.id === PS.id); PS.id = l[(i + d + l.length) % l.length].id; refresh(); };
A.pgPrev = () => stepStu(-1); A.pgNext = () => stepStu(1);
A.pgComment = el => { S.comments[PS.id] = el.value; save(); };
A.shareParent = async () => {
  const s = S.students.find(x => x.id === PS.id), p = await packPayload(parentData(s)), url = parentUrl(p);
  openModal(`<div style="text-align:center"><h3>Gửi cho phụ huynh em ${esc(givenName(s.name))}</h3><p class="muted small" style="margin:4px 0 12px">Phụ huynh mở link (hoặc quét mã) để xem sao, biểu đồ, nhận xét của cô và nhận xét định kì của riêng em.</p>
    <div id="qrBox"></div>
    <input type="text" id="plink" value="${esc(url)}" readonly style="margin:12px 0 8px;font-size:12px">
    <div class="row" style="justify-content:center;margin-bottom:10px"><input type="email" placeholder="Email phụ huynh (chỉ lưu trên máy này)" value="${esc(s.em || '')}" data-in="setEm" data-id="${s.id}" style="max-width:280px"><button class="btn g" data-a="sendMail" data-id="${s.id}">✉️ Gửi Gmail</button></div>
    <div class="row" style="justify-content:center"><button class="btn p" data-a="copyMsg" data-id="${s.id}">💬 Sao chép tin nhắn Zalo</button><button class="btn" data-a="copyLink">📋 Chỉ link</button><button class="btn" data-a="dlQr" data-name="${esc(s.name)}">⬇️ Tải ảnh QR</button>${navigator.share ? `<button class="btn g" data-a="nativeShare">📤 Chia sẻ</button>` : ''}</div>
    <p class="muted small" style="margin:12px 0 0">🔒 Link chỉ chứa kết quả của riêng em này, không có tên hay điểm của bạn khác, không lưu trên máy chủ nào. Chỉ gửi đúng phụ huynh của em. Link là ảnh chụp tại thời điểm gửi — khi có thêm điểm hoặc nhận xét, cô gửi lại link mới.</p><button class="btn ghost" style="margin-top:10px" data-a="closeModal">Đóng</button></div>`);
  const cv = qrCanvas(url, 280); cv.style.cssText = 'width:min(280px,70vw);height:auto;border:3px solid var(--ink);border-radius:18px'; cv.id = 'qrCv'; $('#qrBox').appendChild(cv);
};
A.copyLink = async () => { const v = $('#plink').value; try { await navigator.clipboard.writeText(v); } catch (e) { $('#plink').select(); document.execCommand('copy'); } toast('Đã sao chép link'); };
const parentMsg = async s => `Kính gửi anh/chị phụ huynh em ${s.name} — ${S.settings.className}.\nCô gửi anh/chị kết quả học tập, sao thi đua và nhận xét của em (cập nhật ${new Date().toLocaleDateString('vi-VN')}):\n${parentUrl(await packPayload(parentData(s)))}\nTrân trọng, cô ${S.settings.teacher}.`;
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
A.setEm = el => { const s = S.students.find(x => x.id === el.dataset.id); if (s) { s.em = el.value.trim(); save(); } };
A.sendMail = async el => {
  const s = S.students.find(x => x.id === el.dataset.id); if (!s) return;
  const inp = el.parentElement.querySelector('[data-in=setEm]'); if (inp) s.em = inp.value.trim(); save();
  if (!s.em || !/^\S+@\S+\.\S+$/.test(s.em)) return toast('Hãy nhập email phụ huynh của em ' + givenName(s.name));
  const su = `Kết quả học tập của em ${s.name} — ${S.settings.className}`, body = await parentMsg(s);
  const url = isMobile() ? `mailto:${encodeURIComponent(s.em)}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}` : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(s.em)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`;
  if (isMobile()) location.href = url; else window.open(url, '_blank', 'noopener');
};
A.copyMsg = async el => { const s = S.students.find(x => x.id === el.dataset.id); if (!s) return; const v = await parentMsg(s); try { await navigator.clipboard.writeText(v); } catch (e) { const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } toast('Đã sao chép tin nhắn cho phụ huynh em ' + givenName(s.name)); };
A.linkAll = () => {
  const sorted = S.students.slice().sort(viSort);
  openModal(`<div class="row no-print" style="margin-bottom:10px"><h3 style="margin:0">Gửi cho phụ huynh — từng em</h3><span class="sp"></span><button class="btn ghost" data-a="closeModal">Đóng</button></div><p class="muted small" style="margin:0 0 10px">Gmail: nhập email phụ huynh một lần (lưu trên máy này), bấm “Gmail” để mở thư đã soạn sẵn, cô chỉ cần bấm Gửi. Zalo: trên điện thoại, bấm “Gửi Zalo” rồi chọn Zalo và tên phụ huynh. Trên máy tính, bấm “Sao chép” rồi dán vào tin nhắn riêng của phụ huynh. Mỗi link chỉ có kết quả của đúng em đó.</p><div style="max-height:60vh;overflow:auto">${sorted.map(s => `<div class="stu-row">${avatar(s)}<div class="nm">${esc(s.name)}</div><input type="email" placeholder="email phụ huynh" value="${esc(s.em || '')}" data-in="setEm" data-id="${s.id}" style="width:190px;max-width:100%"><button class="btn sm" data-a="sendMail" data-id="${s.id}">✉️ Gmail</button>${navigator.share ? `<button class="btn sm g" data-a="sendMsg" data-id="${s.id}">💬 Gửi Zalo</button>` : ''}<button class="btn sm p" data-a="copyMsg" data-id="${s.id}">📋 Sao chép</button></div>`).join('')}</div>`, 'big');
};
A.nativeShare = async () => { const s = S.students.find(x => x.id === PS.id); navigator.share({ title: 'Kết quả học tập của con', text: await parentMsg(s) }).catch(() => { }); };
A.sendMsg = async el => { const s = S.students.find(x => x.id === el.dataset.id); if (!s) return; if (navigator.share) { navigator.share({ title: 'Kết quả học tập của con', text: await parentMsg(s) }).catch(() => { }); } else A.copyMsg(el); };
A.dlQr = el => { const a = document.createElement('a'); a.href = $('#qrCv').toDataURL('image/png'); a.download = 'QR-' + el.dataset.name.replace(/\s+/g, '-') + '.png'; a.click(); };
A.qrAll = async () => {
  const sorted = S.students.slice().sort(viSort); toast('Đang tạo mã QR cho cả lớp…');
  const cards = [];
  for (const s of sorted) { const url = parentUrl(await packPayload(parentData(s))), cv = qrCanvas(url, 220); cards.push(`<div class="qrcard"><b>${esc(s.name)}</b><br><img src="${cv.toDataURL()}" width="150" height="150" alt="QR"><br><span style="font-size:11px">${esc(S.settings.className)} · quét để xem kết quả của con</span></div>`); }
  const o = openModal(`<div class="row no-print" style="margin-bottom:12px"><h3 style="margin:0">Thẻ QR phụ huynh — cả lớp</h3><span class="sp"></span><button class="btn g" onclick="window.print()">🖨️ In</button><button class="btn ghost" data-a="closeModal">Đóng</button></div><div class="qrgrid print-area">${cards.join('')}</div>`, 'big');
  o.classList.add('keep');
};

/* ---- trang dành cho phụ huynh ---- */
async function renderParent() {
  const m = $('#main');
  m.innerHTML = `<div class="pv"><div class="card empty"><div class="em">⏳</div><p>Đang mở kết quả của con…</p></div></div>`;
  try { showParent(m, await unpackPayload(parentPayload)); }
  catch (e) { m.innerHTML = `<div class="pv"><div class="card empty"><div class="em">😕</div><p>Link không hợp lệ hoặc bị cắt ngắn.<br>Phụ huynh vui lòng nhờ giáo viên gửi lại link.</p></div></div>`; }
}
function showParent(m, d) {
  const when = new Date(d.ts).toLocaleDateString('vi-VN'), last = d.r || [];
  m.innerHTML = `<div class="pv">
      <div class="hero slim">${HERO_ART}<div class="mascot">${BESAO(120, 'cheer')}</div><div class="copy"><p style="margin:0">${esc(d.sc)} · ${esc(d.c)}</p><h1 style="margin:4px 0">${esc(d.n)}</h1><p style="margin:0">${esc(d.tm)} · Cập nhật ${when}</p></div></div>
      <div class="kpi" style="margin-bottom:14px"><div class="card"><b class="star">★${d.tot}</b><span>tổng số sao</span></div><div class="card"><b>${d.ms}</b><span>sao ${monthLabel(d.m).toLowerCase()}</span></div><div class="card"><b>${(d.w || []).slice(-1)[0] || 0}</b><span>sao tuần này</span></div></div>
      <div class="card" style="margin-bottom:14px"><h3>Sao theo từng tuần</h3>${chartSvg(d.w, d.wl)}</div>
      ${d.cm ? `<div class="card" style="margin-bottom:14px;background:var(--sun-l)"><h3>💬 Lời nhắn của ${esc(d.t)}</h3><p style="margin:0;white-space:pre-wrap">${esc(d.cm)}</p></div>` : ''}
      ${d.rp ? `<div class="card" style="margin-bottom:14px"><h3>📋 Nhận xét định kì — ${esc(d.rp.p)}</h3>${d.rp.nlc ? `<p class="pv-rp"><b>Năng lực.</b> ${esc(d.rp.nlc)}</p>` : ''}${d.rp.pc ? `<p class="pv-rp"><b>Phẩm chất.</b> ${esc(d.rp.pc)}</p>` : ''}${(d.rp.sj || []).map(x => `<p class="pv-rp"><b>${esc(x[0])}.</b> ${esc(x[1])}</p>`).join('')}</div>` : ''}
      <div class="card" style="margin-bottom:14px"><h3>🕘 Ghi nhận gần đây</h3>${last.map(l => `<div class="row" style="padding:5px 0;border-bottom:1px dashed var(--line)"><b style="min-width:34px;color:${l[1] > 0 ? '#C98A00' : 'var(--coral)'}">${l[1] > 0 ? '+' : ''}${l[1]}</b><span style="flex:1">${esc(l[2])}</span><span class="muted small">${fmtDate(l[0])}</span></div>`).join('') || '<p class="muted">Chưa có ghi nhận.</p>'}</div>
      <p class="muted small" style="text-align:center">Kết quả do giáo viên ${esc(d.t)} cập nhật. Trang này chỉ chứa thông tin của riêng em ${esc(givenName(d.n))}.<br><b>Cùng em tiến bộ</b> — Trợ lí giáo viên tiểu học</p></div>`;
}




