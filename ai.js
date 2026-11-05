/* ===== Tính năng AI (chỉ bật khi chạy trên claude.ai, nơi trang được phép gọi Claude) ===== */
'use strict';
let SAMPLE = null; window.AI_OK = false;
(async () => {
  try { if (window.claude && window.claude.use) SAMPLE = await window.claude.use('sample'); } catch (e) { SAMPLE = null; }
  if (SAMPLE) { window.AI_OK = true; if (['review', 'progress', 'games', 'report'].includes(cur) && !document.querySelector('#modal')) refresh(); }
})();
const AI_ERR = {
  not_granted: 'Bạn chưa cho phép trang này dùng Claude. Hãy tải lại trang và bấm “Cho phép”.', rate_limited: 'Đang gọi AI quá nhiều. Chờ một lát rồi bấm lại nhé.',
  sampling_disabled: 'Tài khoản này chưa dùng được Claude.', session_expired: 'Phiên đăng nhập hết hạn, hãy tải lại trang.', invalid_json: 'AI trả lời chưa đúng định dạng. Bấm tạo lại nhé.',
  refused: 'AI không soạn được nội dung này. Hãy đổi cách mô tả bài học.', empty_completion: 'AI chưa trả lời. Bấm tạo lại nhé.', cancelled: ''
};
const aiErrText = e => (e && e.code in AI_ERR) ? AI_ERR[e.code] : 'Chưa kết nối được AI. Kiểm tra mạng rồi thử lại.';
const AIS = { subj: 'Tiếng Việt', book: 'Kết nối tri thức với cuộc sống', topic: '', qtype: 'Điền khuyết / trả lời ngắn', n: 10, level: 'Vừa', busy: false, err: '', ctl: null, toBank: false };
const AI_SUBJECTS = ['Tiếng Việt', 'Toán', 'Tự nhiên và Xã hội', 'Khoa học', 'Lịch sử và Địa lí', 'Tiếng Anh', 'Đạo đức', 'Tin học', 'Công nghệ'];
const AI_BOOKS = ['Kết nối tri thức với cuộc sống', 'Chân trời sáng tạo', 'Cánh diều'];
const AI_QTYPES = ['Điền khuyết / trả lời ngắn', 'Trắc nghiệm 4 lựa chọn', 'Đúng / Sai', 'Tự luận ngắn', 'Hỗn hợp'];

function aiPanelHtml() {
  const opt = (list, v) => list.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  return `<label class="f">Môn học</label><select data-ch="aiField" data-k="subj">${opt(AI_SUBJECTS, AIS.subj)}</select><div style="height:10px"></div>
  <label class="f">Bộ sách</label><select data-ch="aiField" data-k="book">${opt(AI_BOOKS, AIS.book)}</select><div style="height:10px"></div>
  <label class="f">Bài / chủ đề / nội dung cần ôn</label><textarea data-in="aiField" data-k="topic" style="min-height:84px" placeholder="Ví dụ: Bài 12 – Từ chỉ hoạt động, dấu chấm hỏi; hoặc: Phép nhân số có hai chữ số với số có một chữ số">${esc(AIS.topic)}</textarea><div style="height:10px"></div>
  <label class="f">Dạng câu hỏi</label><select data-ch="aiField" data-k="qtype">${opt(AI_QTYPES, AIS.qtype)}</select><div style="height:10px"></div>
  <div class="row"><div style="flex:1"><label class="f">Mức độ</label><select data-ch="aiField" data-k="level">${opt(['Dễ', 'Vừa', 'Khó', 'Có phân hoá'], AIS.level)}</select></div>
  <div style="flex:1"><label class="f">Số câu</label><select data-ch="aiField" data-k="n">${[5, 8, 10, 12, 15, 20].map(n => `<option ${AIS.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
  <label class="row" style="cursor:pointer;margin-top:10px"><input type="checkbox" ${AIS.toBank ? 'checked' : ''} data-ch="aiField" data-k="toBank" style="width:18px;height:18px"> <span class="small">Lưu các câu này vào ngân hàng câu hỏi (dùng cho trò chơi)</span></label>
  ${AIS.err ? `<p class="small" style="color:var(--coral);margin:10px 0 0">${esc(AIS.err)}</p>` : ''}`;
}
A.aiField = el => { const k = el.dataset.k; AIS[k] = el.type === 'checkbox' ? el.checked : (k === 'n' ? +el.value : el.value); };

async function aiAsk(prompt, opts = {}) {
  if (!SAMPLE) throw { code: 'capability_disabled' };
  return SAMPLE.json(prompt, opts);
}
function aiQuestionsPrompt(o) {
  return `Bạn là giáo viên tiểu học Việt Nam giàu kinh nghiệm, soạn phiếu ôn tập theo Chương trình giáo dục phổ thông 2018.
Hãy soạn đúng ${o.n} câu hỏi ôn tập môn ${o.subj}, lớp ${o.grade}, bộ sách "${o.book}".
Nội dung cần ôn: ${o.topic || '(giáo viên không ghi rõ — hãy chọn nội dung trọng tâm phù hợp lớp ' + o.grade + ')'}
Dạng câu hỏi: ${o.qtype}. Mức độ: ${o.level}.
Yêu cầu:
- Ngôn ngữ ngắn gọn, đúng chính tả, phù hợp học sinh lớp ${o.grade}; không dùng kiến thức vượt chương trình.
- Đáp án phải chính xác, ngắn gọn. Với toán, tự kiểm tra lại phép tính.
- Trắc nghiệm: ghi các phương án A. B. C. D. ngay trong "q" (xuống dòng bằng \\n), "a" ghi chữ cái kèm nội dung (ví dụ "B. 36").
- Đúng/Sai: "q" là một nhận định, "a" là "Đúng" hoặc "Sai" kèm giải thích ngắn.
- Mỗi câu độc lập, không cần hình vẽ. Không đánh số thứ tự trong "q".
Chỉ trả về một mảng JSON, mỗi phần tử có dạng {"q":"câu hỏi","a":"đáp án"}.`;
}
async function aiGenerateQuestions(o) {
  const arr = await aiAsk(aiQuestionsPrompt(o));
  const out = (Array.isArray(arr) ? arr : (arr && arr.questions) || []).filter(x => x && x.q && x.a).map(x => ({ q: String(x.q).trim(), a: String(x.a).trim() }));
  if (!out.length) throw { code: 'invalid_json' };
  return out;
}
function aiBusyUI(on, msg) {
  AIS.busy = on; const b = $('#aiRun'), s = $('#aiStatus');
  if (b) b.disabled = on; if (s) { s.hidden = !on; s.innerHTML = on ? `<span>⏳ ${msg || 'AI đang soạn… thường mất 10–40 giây'}</span> <button class="btn sm" data-a="aiStop">Dừng</button>` : ''; }
}
A.aiStop = () => { if (AIS.ctl) AIS.ctl.abort(); };
async function aiGen() {
  if (!AI_OK) return toast('Tính năng AI chỉ có khi mở ứng dụng trên claude.ai');
  if (AIS.busy) return; AIS.err = '';
  const o = { n: AIS.n, subj: AIS.subj, grade: RS.grade, book: AIS.book, topic: AIS.topic.trim(), qtype: AIS.qtype, level: AIS.level };
  aiBusyUI(true);
  try {
    AIS.ctl = new AbortController();
    const arr = await aiAsk(aiQuestionsPrompt(o), { signal: AIS.ctl.signal });
    const items = (Array.isArray(arr) ? arr : (arr && arr.questions) || []).filter(x => x && x.q && x.a).map(x => ({ q: String(x.q).trim(), a: String(x.a).trim(), multi: /\n/.test(String(x.q)) }));
    if (!items.length) throw { code: 'invalid_json' };
    RS.sheet = items; RS.ans = false;
    if (AIS.toBank) { S.bank = S.bank.concat(items.map(x => ({ q: x.q.replace(/\n/g, ' '), a: x.a }))); save(); toast(`Đã lưu ${items.length} câu vào ngân hàng`); }
    aiBusyUI(false); refresh();
  } catch (e) { aiBusyUI(false); AIS.err = aiErrText(e); if (e.code !== 'cancelled') { refresh(); } }
}

/* ---- AI viết nhận xét cho học sinh ---- */
const PT = { tone: 'hocba', busy: false, ctl: null };
function aiCommentBlock() {
  if (!AI_OK) return `<p class="muted small" style="margin:8px 0 0">🤖 Mở ứng dụng trên claude.ai để dùng AI viết nhận xét.</p>`;
  return `<div class="row" style="margin-top:10px;gap:6px"><span class="chip ${PT.tone === 'hocba' ? 'on' : ''}" data-a="ptTone" data-v="hocba">Nhận xét theo Thông tư 27</span><span class="chip ${PT.tone === 'ph' ? 'on' : ''}" data-a="ptTone" data-v="ph">Lời nhắn gửi phụ huynh</span></div>
  <div class="row" style="margin-top:8px"><button class="btn p sm" id="ptRun" data-a="aiComment">🤖 AI viết nhận xét</button><span id="ptStatus" class="small muted" hidden></span></div>`;
}
A.ptTone = el => { PT.tone = el.dataset.v; const y = window.scrollY; refresh(); window.scrollTo(0, y); };
A.aiComment = async () => {
  if (PT.busy || !SAMPLE) return;
  const s = S.students.find(x => x.id === PS.id), ym = curYM(), rk = rankList(ym), me = rk.find(r => r.s.id === s.id), w = weeksSeries(s, 8).map(x => x.v);
  const reasons = {}; s.log.slice(-40).forEach(l => { reasons[l.why] = (reasons[l.why] || 0) + (l.d > 0 ? 1 : -1); });
  const facts = Object.entries(reasons).map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v} lần`).join('; ') || 'chưa có ghi nhận';
  const tr = trendOf(s);
  const prompt = `Bạn là giáo viên chủ nhiệm lớp ${S.settings.grade} ở Việt Nam. Dựa HOÀN TOÀN vào dữ liệu dưới đây (không bịa thêm điểm số hay môn học), hãy viết ${PT.tone === 'hocba' ? 'một nhận xét 2–3 câu về sự tiến bộ của học sinh, theo tinh thần Thông tư 27 (nêu phẩm chất/năng lực biểu hiện và một việc cần cố gắng), giọng khách quan, tích cực' : 'một lời nhắn 3–4 câu gửi phụ huynh, giọng ấm áp, trân trọng, nêu điểm tiến bộ cụ thể và gợi ý một việc gia đình có thể phối hợp'}.
Học sinh: ${s.name} (gọi tên ${givenName(s.name)}), ${teamName(s.team)}, ${S.settings.className}.
Tổng sao: ${stuTotal(s)}; sao tháng này: ${me.v}; hạng ${me.rank}/${rk.length}.
Sao theo 8 tuần gần nhất (cũ → mới): ${w.join(', ')}. Xu hướng: ${tr.t}.
Ghi nhận gần đây (tiêu chí: số lần cộng/trừ): ${facts}.
Chỉ trả về văn bản nhận xét, không tiêu đề, không dấu ngoặc kép. Xưng hô: ${PT.tone === 'hocba' ? 'nhắc tên em, không dùng "con"' : 'gọi học sinh là "con" hoặc "em ' + givenName(s.name) + '", ký tên cô giáo/thầy giáo chung chung, không ghi tên giáo viên'}.`;
  PT.busy = true; const b = $('#ptRun'), st = $('#ptStatus'), ta = $('[data-in=pgComment]'); b.disabled = true; st.hidden = false; st.textContent = '⏳ AI đang viết…';
  try {
    PT.ctl = new AbortController();
    const { text } = await SAMPLE(prompt, { modelTier: 'default', cache: false, signal: PT.ctl.signal, onText: ({ text }) => { ta.value = text; } });
    S.comments[s.id] = text.trim(); ta.value = text.trim(); save(); st.textContent = '✔ Đã viết xong — cô xem và sửa lại nếu cần.';
  } catch (e) { st.textContent = aiErrText(e) || ''; }
  PT.busy = false; b.disabled = false;
};

/* ---- AI soạn câu hỏi cho trò chơi ---- */
A.aiGameBank = () => {
  if (!AI_OK) return toast('Tính năng AI chỉ có khi mở ứng dụng trên claude.ai');
  openModal(`<h3>🤖 AI soạn câu hỏi cho trò chơi</h3><p class="muted small" style="margin:4px 0 12px">Câu hỏi sẽ được thêm vào ngân hàng của lớp và dùng ngay cho trò chơi.</p>${aiPanelHtml().replace(/<label class="row".*?<\/label>/s, '')}
  <div class="row" style="margin-top:14px"><button class="btn p" id="aiRun" data-a="aiGameRun">✨ Soạn câu hỏi</button><button class="btn ghost" data-a="closeModal">Đóng</button></div><div id="aiStatus" class="small" hidden style="margin-top:10px"></div>`);
};
A.aiGameRun = async () => {
  if (AIS.busy) return; AIS.err = '';
  const o = { n: AIS.n, subj: AIS.subj, grade: S.settings.grade, book: AIS.book, topic: AIS.topic.trim(), qtype: 'Điền khuyết / trả lời ngắn (đáp án thật ngắn, 1–4 từ hoặc 1 số)', level: AIS.level };
  aiBusyUI(true);
  try {
    AIS.ctl = new AbortController();
    const arr = await aiAsk(aiQuestionsPrompt(o), { signal: AIS.ctl.signal });
    const items = (Array.isArray(arr) ? arr : []).filter(x => x && x.q && x.a).map(x => ({ q: String(x.q).replace(/\n/g, ' ').trim(), a: String(x.a).trim() }));
    if (!items.length) throw { code: 'invalid_json' };
    S.bank = S.bank.concat(items); save(); GM.src = 'cu'; aiBusyUI(false); closeModal(); toast(`Đã thêm ${items.length} câu vào ngân hàng`); refresh();
  } catch (e) { aiBusyUI(false); const s = $('#aiStatus'); if (s && e.code !== 'cancelled') { s.hidden = false; s.textContent = aiErrText(e); } }
};
