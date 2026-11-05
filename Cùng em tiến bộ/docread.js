/* ===== Đọc chữ trong file Word (.docx) và PDF ngay trên trình duyệt, không gửi file đi đâu =====
   - .docx: giải nén, lấy chữ trong word/document.xml theo từng đoạn.
   - .pdf : bộ đọc gọn nhẹ: giải nén các luồng nội dung, dùng bảng ToUnicode của phông chữ để ra chữ tiếng Việt.
            PDF chụp/scan (chỉ có ảnh) thì không có chữ để đọc.
   - parseMCQ: nhận dạng câu trắc nghiệm có sẵn (Câu 1… A. B. C. D. … Đáp án: B). */
'use strict';
const DOC = (() => {
  const td = new TextDecoder('utf-8');
  const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
  const inflateRaw = u8 => pipe(u8, new DecompressionStream('deflate-raw'));
  async function loose(u8, fmt) {   // giải nén, bỏ qua phần rác phía sau (Chrome báo lỗi nếu cuối luồng thừa byte)
    const ds = new DecompressionStream(fmt), w = ds.writable.getWriter(), r = ds.readable.getReader(), parts = []; let n = 0;
    w.write(u8).catch(() => { }); w.close().catch(() => { });
    try { for (; ;) { const { value, done } = await r.read(); if (done) break; parts.push(value); n += value.length; } } catch (e) { }
    const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
  }
  async function inflateZ(u8) { const a = await loose(u8, 'deflate'); return a.length ? a : loose(u8.subarray(2), 'deflate-raw'); }
  const ent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');

  /* ---------- DOCX ---------- */
  async function docxText(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('File Word bị lỗi hoặc không phải .docx');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true), xml = null;
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
      if (name === 'word/document.xml') { const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), start = off + 30 + lnl + lel, raw = u8.subarray(start, start + csize); xml = td.decode(method === 8 ? await inflateRaw(raw) : raw); break; }
      p += 46 + nl + el + cl;
    }
    if (!xml) throw new Error('Không tìm thấy nội dung trong file Word');
    const body = xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n');
    const paras = body.split(/<\/w:p>/).map(p => { let s = ''; p.replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (_, t) => { s += t; return ''; }); return ent(s).replace(/[  ]+/g, ' ').trim(); });
    return paras.filter(Boolean).join('\n');
  }

  /* ---------- PDF ---------- */
  const latin = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
  function dictEnd(s, i) {   // bỏ qua chuỗi <hex> và (chữ) bên trong từ điển
    let d = 0;
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '<' && s[i + 1] === '<') { d++; i++; }
      else if (c === '>' && s[i + 1] === '>') { d--; i++; if (!d) return i + 1; }
      else if (c === '<') { const e = s.indexOf('>', i); if (e < 0) return s.length; i = e; }
      else if (c === '(') { let p = 1; i++; while (i < s.length && p) { if (s[i] === '\\') i++; else if (s[i] === '(') p++; else if (s[i] === ')') p--; i++; } i--; }
    }
    return s.length;
  }
  async function pdfText(buf) {
    const u8 = new Uint8Array(buf), S = latin(u8); if (!S.startsWith('%PDF')) throw new Error('Không phải file PDF');
    const objs = new Map(), re = /(\d+)\s+(\d+)\s+obj\b/g; let m;
    while ((m = re.exec(S))) {
      const id = +m[1], st = m.index + m[0].length, end = S.indexOf('endobj', st); if (end < 0) break;
      let body = S.slice(st, end), stream = null; const si = body.search(/\bstream\r?\n/);
      if (si >= 0) { const head = body.slice(0, si), dataStart = st + si + body.slice(si).match(/^stream\r?\n/)[0].length, lenM = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(head);
        let dataEnd = lenM ? dataStart + +lenM[1] : S.indexOf('endstream', dataStart); if (lenM && S.slice(dataEnd, dataEnd + 30).indexOf('endstream') < 0) dataEnd = S.indexOf('endstream', dataStart);
        while (dataEnd > dataStart && (u8[dataEnd - 1] === 10 || u8[dataEnd - 1] === 13)) dataEnd--; stream = u8.subarray(dataStart, dataEnd); body = head; }
      objs.set(id, { body: body.trim(), stream }); re.lastIndex = end;
    }
    const cache = new Map();
    async function data(id) { if (cache.has(id)) return cache.get(id); const o = objs.get(id); if (!o || !o.stream) return new Uint8Array(0); const d = /\/FlateDecode/.test(o.body) ? await inflateZ(o.stream) : o.stream; cache.set(id, d); return d; }
    for (const [id, o] of [...objs]) if (/\/Type\s*\/ObjStm/.test(o.body)) {   // đối tượng nén trong ObjStm (PDF từ Word hay dùng)
      const txt = latin(await data(id)), n = +(/\/N\s+(\d+)/.exec(o.body) || [])[1], first = +(/\/First\s+(\d+)/.exec(o.body) || [])[1]; if (!n) continue;
      const nums = txt.slice(0, first).trim().split(/\s+/).map(Number);
      for (let k = 0; k < n; k++) { const oid = nums[2 * k], a = first + nums[2 * k + 1], b = k + 1 < n ? first + nums[2 * k + 3] : txt.length; if (!objs.has(oid)) objs.set(oid, { body: txt.slice(a, b).trim(), stream: null }); }
    }
    const ref = (s, key) => { const r = new RegExp('/' + key + '\\s+(\\d+)\\s+\\d+\\s+R').exec(s); return r ? +r[1] : null; };
    const getDict = (s, key) => { const i = s.search(new RegExp('/' + key + '\\s*<<')); if (i < 0) { const r = ref(s, key); return r != null && objs.get(r) ? objs.get(r).body : ''; } const st = s.indexOf('<<', i); return s.slice(st, dictEnd(s, st)); };
    /* phông chữ → bảng mã */
    const fontMaps = new Map();
    async function fontMap(fid) {
      if (fontMaps.has(fid)) return fontMaps.get(fid); const f = (objs.get(fid) || {}).body || '', type0 = /\/Subtype\s*\/Type0/.test(f), map = new Map(), tu = ref(f, 'ToUnicode'); let bytes = type0 ? 2 : 1;
      if (tu != null) { const cm = latin(await data(tu)); const cs = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(cm); if (cs) bytes = cs[1].length / 2;
        const hex2s = h => { let s = ''; for (let i = 0; i + 4 <= h.length; i += 4) s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return s; };
        cm.replace(/beginbfchar([\s\S]*?)endbfchar/g, (_, b) => { b.replace(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g, (_, c, u) => { map.set(parseInt(c, 16), hex2s(u)); return ''; }); return ''; });
        cm.replace(/beginbfrange([\s\S]*?)endbfrange/g, (_, b) => { b.replace(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g, (_, lo, hi, x, start, arr) => {
          const L = parseInt(lo, 16), H = parseInt(hi, 16);
          if (start != null) { const base = parseInt(start.slice(-4), 16), pre = hex2s(start.slice(0, -4)); for (let c = L; c <= H && c - L < 65536; c++) map.set(c, pre + String.fromCharCode(base + c - L)); }
          else { const items = (arr.match(/<([0-9a-fA-F]+)>/g) || []).map(t => hex2s(t.slice(1, -1))); for (let c = L; c <= H; c++) map.set(c, items[c - L] || ''); }
          return ''; }); return ''; });
      }
      const W = new Map(); let dw = 1000;
      const arrOf = (dict, key) => { const m = new RegExp('/' + key + '\\s*\\[').exec(dict); if (m) { let d = 0, k = m.index + m[0].length - 1, st = k; for (; k < dict.length; k++) { if (dict[k] === '[') d++; else if (dict[k] === ']') { d--; if (!d) break; } } return dict.slice(st + 1, k); } const r = ref(dict, key); return r != null && objs.get(r) ? objs.get(r).body.replace(/^\[|\]$/g, '') : ''; };
      if (type0) { const dm = /\/DescendantFonts\s*\[?\s*(\d+)\s+\d+\s+R/.exec(f), cid = dm && objs.get(+dm[1]) ? objs.get(+dm[1]).body : ''; const dwm = /\/DW\s+(\d+)/.exec(cid); if (dwm) dw = +dwm[1];
        const toks = arrOf(cid, 'W').match(/\[|\]|[-\d.]+/g) || []; for (let k = 0; k < toks.length;) { const c0 = +toks[k]; if (toks[k + 1] === '[') { k += 2; let c = c0; while (k < toks.length && toks[k] !== ']') W.set(c++, +toks[k++]); k++; } else { const c1 = +toks[k + 1], w = +toks[k + 2]; for (let c = c0; c <= c1 && c - c0 < 65536; c++) W.set(c, w); k += 3; } } }
      else { const fc = +((/\/FirstChar\s+(\d+)/.exec(f) || [])[1] || 0); (arrOf(f, 'Widths').match(/[-\d.]+/g) || []).forEach((w, k) => W.set(fc + k, +w)); dw = 500; }
      const r = { map, bytes, simple: !type0 && tu == null, W, dw }; fontMaps.set(fid, r); return r;
    }
    /* trang theo đúng thứ tự */
    const rootM = [...S.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)].pop(); let pages = [];
    async function walk(id, inhRes, depth = 0) { const o = objs.get(id); if (!o || depth > 30) return; const b = o.body, res = /\/Resources/.test(b) ? getDict(b, 'Resources') : inhRes;
      if (/\/Type\s*\/Pages/.test(b)) { const k = /\/Kids\s*\[([^\]]*)\]/.exec(b); if (k) for (const mm of k[1].matchAll(/(\d+)\s+\d+\s+R/g)) await walk(+mm[1], res, depth + 1); }
      else if (/\/Type\s*\/Page\b/.test(b)) pages.push({ id, res }); }
    if (rootM) { const cat = (objs.get(+rootM[1]) || {}).body || '', pr = ref(cat, 'Pages'); if (pr != null) await walk(pr, ''); }
    if (!pages.length) pages = [...objs].filter(([, o]) => /\/Type\s*\/Page\b/.test(o.body)).map(([id, o]) => ({ id, res: getDict(o.body, 'Resources') }));
    const out = [];
    for (const pg of pages) {
      const b = objs.get(pg.id).body, fontsD = getDict(pg.res || '', 'Font'), fonts = {};
      for (const fm of fontsD.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g)) fonts[fm[1]] = await fontMap(+fm[2]);
      let ids = []; const ca = /\/Contents\s*\[([^\]]*)\]/.exec(b); if (ca) ids = [...ca[1].matchAll(/(\d+)\s+\d+\s+R/g)].map(x => +x[1]); else { const c = ref(b, 'Contents'); if (c != null) ids = [c]; }
      let content = ''; for (const id of ids) content += latin(await data(id)) + '\n';
      out.push(runContent(content, fonts));
    }
    return out.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function glyphs(raw, f) {   // trả về [{ch, w}] theo từng mã glyph
    const out = [], by = f && !f.simple ? f.bytes : 1;
    for (let i = 0; i + by <= raw.length; i += by) { let c = 0; for (let k = 0; k < by; k++) c = c * 256 + raw.charCodeAt(i + k);
      const ch = f && f.map.has(c) ? f.map.get(c) : (by === 1 ? (c < 32 ? '' : String.fromCharCode(c)) : ''); out.push({ ch, w: f ? (f.W.has(c) ? f.W.get(c) : f.dw) : 500, sp: by === 1 && c === 32 }); }
    return out;
  }
  const utf16 = s => { if (s.charCodeAt(0) === 0xFE && s.charCodeAt(1) === 0xFF) { let r = ''; for (let i = 2; i + 1 < s.length; i += 2) r += String.fromCharCode(s.charCodeAt(i) * 256 + s.charCodeAt(i + 1)); return r; } return s; };
  const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
  function runContent(c, fonts) {
    let i = 0, font = null, fs = 10, Tc = 0, Tw = 0, Th = 1, TL = 0, tm = [1, 0, 0, 1, 0, 0], lm = tm.slice(), ctm = [1, 0, 0, 1, 0, 0];
    const gs = [], items = [], stack = [], mc = []; let actual = null;
    const show = (raw) => {
      const gl = glyphs(raw, font); let txt = '', x0 = null, y0 = null, size = 0;
      for (const g of gl) {
        const m = mul(tm, ctm); if (x0 === null) { x0 = m[4]; y0 = m[5]; size = Math.abs(fs * Math.hypot(m[0], m[1])) || fs; }
        txt += g.ch; const adv = (g.w / 1000 * fs + Tc + (g.sp ? Tw : 0)) * Th; tm = mul([1, 0, 0, 1, adv, 0], tm);
      }
      if (x0 === null) return; const end = mul(tm, ctm);
      if (actual && actual.used) txt = ''; else if (actual) { txt = actual.text; actual.used = true; }
      if (txt) items.push({ x: x0, y: y0, x2: end[4], s: txt, fs: size });
    };
    const readStr = () => { let d = 1, s = ''; i++; while (i < c.length && d) { const ch = c[i];
        if (ch === '\\') { const nx = c[i + 1]; if (/[0-7]/.test(nx)) { let o = ''; let k = 1; while (k <= 3 && /[0-7]/.test(c[i + k])) o += c[i + k++]; s += String.fromCharCode(parseInt(o, 8) & 255); i += k; continue; }
          const esc = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }; if (nx === '\r' || nx === '\n') { i += nx === '\r' && c[i + 2] === '\n' ? 3 : 2; continue; } s += esc[nx] ?? nx; i += 2; continue; }
        if (ch === '(') d++; else if (ch === ')') { d--; if (!d) { i++; break; } } s += ch; i++; } return { str: s }; };
    const readHex = () => { const e = c.indexOf('>', i); let h = c.slice(i + 1, e).replace(/\s+/g, ''); if (h.length % 2) h += '0'; let s = ''; for (let k = 0; k < h.length; k += 2) s += String.fromCharCode(parseInt(h.substr(k, 2), 16)); i = e + 1; return { str: s }; };
    while (i < c.length) {
      const ch = c[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '%') { while (i < c.length && c[i] !== '\n' && c[i] !== '\r') i++; continue; }
      if (ch === '(') { stack.push(readStr()); continue; }
      if (ch === '<' && c[i + 1] === '<') { const e = dictEnd(c, i); stack.push({ dict: c.slice(i, e) }); i = e; continue; }
      if (ch === '<') { stack.push(readHex()); continue; }
      if (ch === '[') { stack.push('['); i++; continue; }
      if (ch === ']') { const arr = []; while (stack.length && stack[stack.length - 1] !== '[') arr.unshift(stack.pop()); stack.pop(); stack.push({ arr }); i++; continue; }
      if (ch === '/') { let j = i + 1; while (j < c.length && !/[\s/\[\]()<>{}%]/.test(c[j])) j++; stack.push({ name: c.slice(i + 1, j) }); i = j; continue; }
      let j = i; while (j < c.length && !/[\s/\[\]()<>{}%]/.test(c[j])) j++; const tok = c.slice(i, j) || c[i]; i = j > i ? j : i + 1;
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(tok)) { stack.push(+tok); continue; }
      const n = stack.filter(x => typeof x === 'number');
      switch (tok) {
        case 'q': gs.push(ctm.slice()); break;
        case 'Q': ctm = gs.pop() || [1, 0, 0, 1, 0, 0]; break;
        case 'cm': if (n.length >= 6) ctm = mul(n.slice(-6), ctm); break;
        case 'BT': tm = [1, 0, 0, 1, 0, 0]; lm = tm.slice(); break;
        case 'Tf': { const nm = stack.find(x => x && x.name); font = nm ? fonts[nm.name] : null; fs = n[n.length - 1] || fs; break; }
        case 'Tc': Tc = n[0] || 0; break; case 'Tw': Tw = n[0] || 0; break; case 'Tz': Th = (n[0] ?? 100) / 100; break; case 'TL': TL = n[0] || 0; break;
        case 'Td': case 'TD': { const [tx, ty] = n.slice(-2); if (tok === 'TD') TL = -ty; lm = mul([1, 0, 0, 1, tx || 0, ty || 0], lm); tm = lm.slice(); break; }
        case 'Tm': if (n.length >= 6) { lm = n.slice(-6); tm = lm.slice(); } break;
        case 'T*': lm = mul([1, 0, 0, 1, 0, -TL], lm); tm = lm.slice(); break;
        case 'Tj': { const s = stack.find(x => x && x.str != null); if (s) show(s.str); break; }
        case "'": case '"': { lm = mul([1, 0, 0, 1, 0, -TL], lm); tm = lm.slice(); const s = stack.find(x => x && x.str != null); if (s) show(s.str); break; }
        case 'TJ': { const a = stack.find(x => x && x.arr); if (a) for (const it of a.arr) { if (typeof it === 'number') tm = mul([1, 0, 0, 1, -it / 1000 * fs * Th, 0], tm); else if (it && it.str != null) show(it.str); } break; }
        case 'BDC': case 'BMC': { const d = stack.find(x => x && x.dict); const at = d && /\/ActualText\s*(<[0-9A-Fa-f\s]*>|\()/.exec(d.dict); let a = null;
          if (at) { const k = d.dict.indexOf(at[1], at.index); if (at[1][0] === '<') { const e = d.dict.indexOf('>', k); let h = d.dict.slice(k + 1, e).replace(/\s+/g, ''), r = ''; for (let q = 0; q < h.length; q += 2) r += String.fromCharCode(parseInt(h.substr(q, 2), 16)); a = { text: utf16(r), used: false }; } }
          mc.push(actual); if (a) actual = a; break; }
        case 'EMC': actual = mc.length ? mc.pop() : null; break;
        case 'BI': { const e = c.indexOf('EI', i); i = e < 0 ? c.length : e + 2; break; }
      }
      stack.length = 0;
    }
    /* xếp chữ theo vị trí: dòng trên xuống dưới, trái sang phải */
    items.sort((a, b) => b.y - a.y || a.x - b.x); const lines = [];
    for (const it of items) { const L = lines.find(l => Math.abs(l.y - it.y) < Math.max(2, it.fs * .45)); if (L) L.items.push(it); else lines.push({ y: it.y, items: [it] }); }
    lines.sort((a, b) => b.y - a.y);
    return lines.map(L => { L.items.sort((a, b) => a.x - b.x); let s = '', prev = null; for (const it of L.items) { if (prev && it.x - prev.x2 > it.fs * .22 && !/\s$/.test(s) && !/^\s/.test(it.s)) s += ' '; s += it.s; prev = it; } return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean).join('\n');
  }

  async function fileText(file) {
    const buf = await file.arrayBuffer(), name = file.name.toLowerCase();
    if (name.endsWith('.docx')) return docxText(buf);
    if (name.endsWith('.pdf')) return pdfText(buf);
    if (name.endsWith('.txt')) return td.decode(buf);
    if (name.endsWith('.doc')) throw new Error('File .doc đời cũ chưa đọc được. Cô mở bằng Word rồi lưu lại thành .docx nhé.');
    throw new Error('Chỉ đọc được file .docx, .pdf hoặc .txt');
  }

  /* ---------- Nhận dạng câu trắc nghiệm có sẵn ---------- */
  function parseMCQ(text) {
    const lines = String(text).normalize('NFC').split(/\r?\n/).map(s => s.replace(/ /g, ' ').trim()).filter(Boolean), qs = []; let cur = null, ansAll = {};
    const keyLine = /^(?:đáp án|ĐÁP ÁN)\s*[:：]?\s*((?:\d+\s*[-.:)]\s*[A-Da-d][\s,;]*){1,})$/i;
    const push = () => { if (cur && cur.q && cur.o.length >= 2) qs.push(cur); cur = null; };
    for (let L of lines) {
      const km = keyLine.exec(L); if (km) { km[1].replace(/(\d+)\s*[-.:)]\s*([A-Da-d])/g, (_, n, a) => { ansAll[+n] = 'ABCD'.indexOf(a.toUpperCase()); return ''; }); continue; }
      const qm = /^(?:câu|bài)\s*(\d+)\s*[:.)]?\s*(.*)$/i.exec(L) || /^(\d+)\s*[.)]\s+(.*)$/.exec(L);
      if (qm && !/^[A-D][.)]/.test(L)) { push(); cur = { n: +qm[1], q: qm[2].trim(), o: [], a: -1 }; continue; }
      if (!cur) continue;
      const am = /^(?:đáp án|đ\/a|da|đáp số)\s*(?:đúng)?\s*[:：]?\s*([A-Da-d])\b/i.exec(L); if (am) { cur.a = 'ABCD'.indexOf(am[1].toUpperCase()); continue; }
      if (/^\*?\s*[A-D]\s*[.)]/.test(L)) {
        const parts = L.split(/(?=(?:^|\s)\*?\s*[A-D]\s*[.)]\s)/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) { const om = /^(\*)?\s*([A-D])\s*[.)]\s*(.*?)\s*(\*|\(đúng\))?$/i.exec(p); if (!om) continue; const k = 'ABCD'.indexOf(om[2]); cur.o[k] = om[3].trim(); if (om[1] || om[4]) cur.a = k; }
        continue;
      }
      if (!cur.o.length) cur.q += ' ' + L; else cur.o[cur.o.length - 1] += ' ' + L;
    }
    push();
    return qs.map(q => { const o = q.o.filter(x => x != null && x !== ''); let a = q.a >= 0 ? q.a : (ansAll[q.n] ?? -1); if (a >= o.length) a = -1;
      const isTF = o.length === 2 && /^đúng$/i.test(o[0]) && /^sai$/i.test(o[1]);
      return { t: isTF ? 'tf' : 'mc', q: q.q.replace(/\s+/g, ' ').trim(), o, a }; });
  }
  return { fileText, docxText, pdfText, parseMCQ };
})();
