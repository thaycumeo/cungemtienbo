/* ===== Đọc / ghi file .xlsx mà vẫn giữ nguyên toàn bộ định dạng của mẫu =====
   Chỉ sửa đúng các ô cần điền trong XML của sheet; mọi phần khác trong file (kiểu ô, ô gộp,
   độ rộng cột, sheet hướng dẫn…) được sao chép nguyên văn. Không cần thư viện ngoài. */
'use strict';
const XL = (() => {
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const te = new TextEncoder(), td = new TextDecoder('utf-8');

  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
  const inflate = u8 => pipe(u8, new DecompressionStream('deflate-raw'));
  const deflate = u8 => pipe(u8, new CompressionStream('deflate-raw'));

  /* ---- zip ---- */
  function readZip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Không phải file xlsx hợp lệ');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const entries = [];
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('File xlsx bị lỗi cấu trúc');
      const method = dv.getUint16(p + 10, true), time = dv.getUint16(p + 12, true), date = dv.getUint16(p + 14, true), crc = dv.getUint32(p + 16, true);
      const csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
      const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), start = off + 30 + lnl + lel;
      entries.push({ name, method, time, date, crc, csize, usize, raw: u8.slice(start, start + csize), data: null, dirty: false });
      p += 46 + nl + el + cl;
    }
    return entries;
  }
  async function writeZip(entries) {
    const parts = [], cds = []; let off = 0;
    const hdr = (sig, len) => { const b = new Uint8Array(len); new DataView(b.buffer).setUint32(0, sig, true); return b; };
    for (const en of entries) {
      let method = en.method, crc = en.crc, comp = en.raw, usize = en.usize;
      if (en.dirty) { const d = en.data; crc = crc32(d); usize = d.length; comp = await deflate(d); method = 8; }
      const nm = te.encode(en.name), l = hdr(0x04034b50, 30 + nm.length), v = new DataView(l.buffer);
      v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, method, true); v.setUint16(10, en.time, true); v.setUint16(12, en.date, true);
      v.setUint32(14, crc, true); v.setUint32(18, comp.length, true); v.setUint32(22, usize, true); v.setUint16(26, nm.length, true); v.setUint16(28, 0, true); l.set(nm, 30);
      parts.push(l, comp);
      const c = hdr(0x02014b50, 46 + nm.length), w = new DataView(c.buffer);
      w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, method, true); w.setUint16(12, en.time, true); w.setUint16(14, en.date, true);
      w.setUint32(16, crc, true); w.setUint32(20, comp.length, true); w.setUint32(24, usize, true); w.setUint16(28, nm.length, true); w.setUint32(42, off, true); c.set(nm, 46);
      cds.push(c); off += l.length + comp.length;
    }
    const cdSize = cds.reduce((a, b) => a + b.length, 0), end = hdr(0x06054b50, 22), ev = new DataView(end.buffer);
    ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, off, true);
    const out = new Uint8Array(off + cdSize + 22); let p = 0; for (const b of [...parts, ...cds, end]) { out.set(b, p); p += b.length; }
    return out;
  }

  /* ---- ô / cột ---- */
  const colNum = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  const colName = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const splitRef = ref => { const m = /^([A-Z]+)(\d+)$/.exec(ref); return { col: colNum(m[1]), row: +m[2] }; };
  const parseXml = s => { const d = new DOMParser().parseFromString(s.replace(/^﻿/, ''), 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('XML trong file xlsx bị lỗi'); return d; };
  const serial = d => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + new XMLSerializer().serializeToString(d).replace(/^﻿?\s*<\?xml[^>]*\?>\s*/, '');
  const kids = (el, ns, name) => [...el.childNodes].filter(n => n.nodeType === 1 && n.localName === name && n.namespaceURI === ns);
  const tag = (doc, ref, name) => doc.createElementNS(NS, ref.prefix ? ref.prefix + ':' + name : name);

  async function open(buf) {
    const zip = readZip(buf), by = new Map(zip.map(e => [e.name, e]));
    const get = async nm => { const e = by.get(nm); if (!e) return null; if (!e.data) e.data = e.method === 0 ? e.raw : await inflate(e.raw); return e.data; };
    const getText = async nm => { const d = await get(nm); return d ? td.decode(d) : null; };
    const wbDoc = parseXml(await getText('xl/workbook.xml')), relDoc = parseXml(await getText('xl/_rels/workbook.xml.rels'));
    const rels = {}; for (const r of relDoc.getElementsByTagNameNS(PNS, 'Relationship')) { let t = r.getAttribute('Target'); t = t.startsWith('/') ? t.slice(1) : 'xl/' + t; rels[r.getAttribute('Id')] = t; }
    const sheets = []; for (const s of wbDoc.getElementsByTagNameNS(NS, 'sheet')) sheets.push({ name: s.getAttribute('name'), path: rels[s.getAttributeNS(RNS, 'id')], doc: null });
    // sharedStrings
    let ssDoc = null, ss = [], ssSi = null, ssIndex = new Map();
    const ssText = await getText('xl/sharedStrings.xml');
    if (ssText) {
      ssDoc = parseXml(ssText); ssSi = ssDoc.documentElement;
      for (const si of kids(ssSi, NS, 'si')) {
        let t = ''; const walk = n => { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; if (c.localName === 't') t += c.textContent; else if (c.localName === 'r') walk(c); } }; walk(si); ss.push(t);
      }
      ss.forEach((t, i) => { if (!ssIndex.has(t)) ssIndex.set(t, i); });
    }
    let added = 0;
    const sheetDoc = async nm => { const s = sheets.find(x => x.name === nm); if (!s) throw new Error('Không có sheet ' + nm); if (!s.doc) s.doc = parseXml(await getText(s.path)); return s; };
    const addString = text => {
      if (!ssDoc) throw new Error('File thiếu sharedStrings');
      if (ssIndex.has(text)) { added++; return ssIndex.get(text); }
      const si = tag(ssDoc, ssSi, 'si'), t = tag(ssDoc, ssSi, 't'); t.textContent = text; if (/^\s|\s$|\n/.test(text)) t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      si.appendChild(t); ssSi.appendChild(si); ss.push(text); const i = ss.length - 1; ssIndex.set(text, i); added++; return i;
    };
    const cellText = c => {
      const t = c.getAttribute('t'), v = kids(c, NS, 'v')[0];
      if (t === 'inlineStr') return [...c.getElementsByTagNameNS(NS, 't')].map(x => x.textContent).join('');
      if (!v) return ''; return t === 's' ? (ss[+v.textContent] ?? '') : v.textContent;
    };
    const rowsOf = s => kids(s.doc.getElementsByTagNameNS(NS, 'sheetData')[0], NS, 'row');
    return {
      sheetNames: () => sheets.map(s => s.name),
      /** đọc cả sheet thành { 'A1': 'text', ... } */
      async read(nm) { const s = await sheetDoc(nm), out = {}; let maxRow = 0; for (const r of rowsOf(s)) for (const c of kids(r, NS, 'c')) { const v = cellText(c); if (v !== '') out[c.getAttribute('r')] = v; maxRow = Math.max(maxRow, +r.getAttribute('r')); } out.__maxRow = maxRow; return out; },
      /** ghi chuỗi vào ô (giữ nguyên kiểu ô s=…) */
      async set(nm, ref, text) {
        const s = await sheetDoc(nm), { col, row } = splitRef(ref), data = s.doc.getElementsByTagNameNS(NS, 'sheetData')[0], rows = rowsOf(s);
        let r = rows.find(x => +x.getAttribute('r') === row);
        if (!r) { r = tag(s.doc, data, 'row'); r.setAttribute('r', String(row)); const nx = rows.find(x => +x.getAttribute('r') > row); data.insertBefore(r, nx || null); }
        let c = kids(r, NS, 'c').find(x => x.getAttribute('r') === ref);
        if (!c) { c = tag(s.doc, data, 'c'); c.setAttribute('r', ref); const nx = kids(r, NS, 'c').find(x => splitRef(x.getAttribute('r')).col > col); r.insertBefore(c, nx || null); r.removeAttribute('spans'); }
        while (c.firstChild) c.removeChild(c.firstChild);
        c.setAttribute('t', 's'); const v = tag(s.doc, data, 'v'); v.textContent = String(addString(String(text))); c.appendChild(v);
        s.dirty = true;
      },
      async save() {
        for (const s of sheets) if (s.dirty) { const e = by.get(s.path); e.data = te.encode(serial(s.doc)); e.dirty = true; }
        if (added && ssDoc) {
          ssSi.setAttribute('uniqueCount', String(ss.length)); ssSi.setAttribute('count', String((+ssSi.getAttribute('count') || ss.length) + added));
          const e = by.get('xl/sharedStrings.xml'); e.data = te.encode(serial(ssDoc)); e.dirty = true;
        }
        return writeZip(zip);
      }
    };
  }
  async function unzipText(buf, name) { const en = readZip(buf).find(e => e.name === name); if (!en) return null; const d = en.method === 8 ? await inflate(en.raw) : en.raw; return td.decode(d); }
  return { open, colNum, colName, splitRef, unzipText };
})();
