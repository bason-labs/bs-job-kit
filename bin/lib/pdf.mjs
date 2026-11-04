// Dependency-free PDF reading: page count, hash, and plain text in reading order.
// Handles what Chrome and Figma write: classic and object-stream objects, FlateDecode,
// Type0 fonts with ToUnicode CMaps, Form XObjects. It is not a full PDF parser.
import { createHash } from "node:crypto";
import { inflateSync, constants as zc } from "node:zlib";

class Name {
  constructor(name) { this.name = name; }
}
class Ref {
  constructor(num) { this.num = num; }
}
class Op {
  constructor(op) { this.op = op; }
}

const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([...'()<>[]{}/%'].map((c) => c.charCodeAt(0)));
const isRegular = (c) => c !== undefined && !WS.has(c) && !DELIM.has(c);
const isDigit = (c) => c >= 48 && c <= 57;
const HEX = /[0-9a-fA-F]/;
const latin1 = (buf, start, end) => buf.toString("latin1", start, Math.min(end, buf.length));

// Tokeniser and value parser over a byte buffer. Used for files, content streams and CMaps.
class Lexer {
  constructor(buf, pos = 0) {
    this.b = buf;
    this.pos = pos;
  }

  skipWs() {
    const b = this.b;
    for (;;) {
      while (this.pos < b.length && WS.has(b[this.pos])) this.pos++;
      if (b[this.pos] !== 0x25) return; // %
      while (this.pos < b.length && b[this.pos] !== 10 && b[this.pos] !== 13) this.pos++;
    }
  }

  // Next value or operator; undefined at end of input.
  next() {
    this.skipWs();
    const b = this.b;
    if (this.pos >= b.length) return undefined;
    const c = b[this.pos];
    if (c === 0x3c && b[this.pos + 1] === 0x3c) return this.dict();
    if (c === 0x3c) return this.hexString();
    if (c === 0x28) return this.literalString();
    if (c === 0x5b) return this.array();
    if (c === 0x2f) return this.nameToken();
    if (c === 0x5d || c === 0x3e || c === 0x29 || c === 0x7b || c === 0x7d) {
      this.pos += c === 0x3e && b[this.pos + 1] === 0x3e ? 2 : 1;
      return new Op(String.fromCharCode(c));
    }
    const start = this.pos;
    while (isRegular(b[this.pos])) this.pos++;
    const word = latin1(b, start, this.pos);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return this.maybeRef(Number(word), word);
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    return new Op(word);
  }

  // "n g R" is a reference; otherwise rewind to just after the number.
  maybeRef(num, word) {
    if (!/^\d+$/.test(word)) return num;
    const save = this.pos;
    const m = /^\s+(\d+)\s+R(?![^\s()<>[\]{}/%])/.exec(latin1(this.b, this.pos, this.pos + 24));
    if (m) {
      this.pos += m[0].length;
      return new Ref(num);
    }
    this.pos = save;
    return num;
  }

  dict() {
    this.pos += 2;
    const d = new Map();
    for (;;) {
      this.skipWs();
      if (this.pos >= this.b.length) throw new Error("unterminated dictionary");
      if (this.b[this.pos] === 0x3e && this.b[this.pos + 1] === 0x3e) {
        this.pos += 2;
        return d;
      }
      const key = this.next();
      if (!(key instanceof Name)) throw new Error("dictionary key is not a name");
      d.set(key.name, this.next());
    }
  }

  array() {
    this.pos++;
    const a = [];
    for (;;) {
      this.skipWs();
      if (this.pos >= this.b.length) throw new Error("unterminated array");
      if (this.b[this.pos] === 0x5d) {
        this.pos++;
        return a;
      }
      a.push(this.next());
    }
  }

  nameToken() {
    const start = ++this.pos;
    while (isRegular(this.b[this.pos])) this.pos++;
    const raw = latin1(this.b, start, this.pos);
    return new Name(raw.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }

  hexString() {
    const end = this.b.indexOf(0x3e, this.pos);
    if (end < 0) throw new Error("unterminated hex string");
    let hex = [...latin1(this.b, this.pos + 1, end)].filter((ch) => HEX.test(ch)).join("");
    this.pos = end + 1;
    if (hex.length % 2) hex += "0";
    return Buffer.from(hex, "hex");
  }

  literalString() {
    const b = this.b;
    const out = [];
    let depth = 1;
    this.pos++;
    while (this.pos < b.length) {
      const c = b[this.pos++];
      if (c === 0x28) depth++;
      else if (c === 0x29 && --depth === 0) return Buffer.from(out);
      if (c !== 0x5c) {
        out.push(c);
        continue;
      }
      const e = b[this.pos++];
      const simple = { 0x6e: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12 }[e];
      if (simple !== undefined) out.push(simple);
      else if (e >= 0x30 && e <= 0x37) {
        let v = e - 0x30;
        for (let i = 0; i < 2 && b[this.pos] >= 0x30 && b[this.pos] <= 0x37; i++) v = v * 8 + b[this.pos++] - 0x30;
        out.push(v & 0xff);
      } else if (e === 13) {
        if (b[this.pos] === 10) this.pos++;
      } else if (e !== 10) out.push(e);
    }
    throw new Error("unterminated string");
  }
}

const nameOf = (v) => (v instanceof Name ? v.name : undefined);

function streamBytes(buf, dict, lexer) {
  // lexer sits right after the dictionary; expect the "stream" keyword.
  lexer.skipWs();
  if (latin1(buf, lexer.pos, lexer.pos + 6) !== "stream") return null;
  let start = lexer.pos + 6;
  if (buf[start] === 13) start++;
  if (buf[start] === 10) start++;
  const len = dict.get("Length");
  if (typeof len === "number" && len >= 0 && start + len <= buf.length) {
    const after = new Lexer(buf, start + len);
    after.skipWs();
    if (latin1(buf, after.pos, after.pos + 9) === "endstream") {
      lexer.pos = after.pos + 9;
      return buf.subarray(start, start + len);
    }
  }
  const end = buf.indexOf("endstream", start, "latin1");
  if (end < 0) throw new Error("unterminated stream");
  let stop = end;
  if (buf[stop - 1] === 10) stop--;
  if (buf[stop - 1] === 13) stop--;
  lexer.pos = end + 9;
  return buf.subarray(start, Math.max(start, stop));
}

function inflate(bytes) {
  try {
    return inflateSync(bytes);
  } catch {
    return inflateSync(bytes, { finishFlush: zc.Z_SYNC_FLUSH });
  }
}

// Every object in the file, by number: { value, raw? } where raw is the undecoded stream.
function indexObjects(buf) {
  if (latin1(buf, 0, 1024).indexOf("%PDF-") < 0) throw new Error("not a PDF (no %PDF- header)");
  const text = latin1(buf, 0, buf.length);
  const objects = new Map();
  const trailers = [];
  const re = /(\d+)\s+(\d+)\s+obj\b|trailer\b/g;
  let m;
  while ((m = re.exec(text))) {
    const lexer = new Lexer(buf, m.index + m[0].length);
    try {
      const value = lexer.next();
      if (!m[1]) {
        if (value instanceof Map) trailers.push(value);
        re.lastIndex = lexer.pos;
        continue;
      }
      const entry = { value };
      if (value instanceof Map) {
        const raw = streamBytes(buf, value, lexer);
        if (raw) entry.raw = raw;
      }
      objects.set(Number(m[1]), entry);
      re.lastIndex = lexer.pos;
    } catch {
      re.lastIndex = m.index + 1;
    }
  }
  const doc = new Doc(objects, trailers);
  // Unpack object streams; objects written directly in the file take precedence.
  for (const [, entry] of [...objects]) {
    if (!(entry.value instanceof Map) || nameOf(entry.value.get("Type")) !== "ObjStm" || !entry.raw) continue;
    const data = doc.decode(entry);
    if (!data) continue;
    const n = doc.resolve(entry.value.get("N"));
    const first = doc.resolve(entry.value.get("First"));
    const head = new Lexer(data);
    for (let i = 0; i < n; i++) {
      const num = head.next();
      const off = head.next();
      if (typeof num !== "number" || typeof off !== "number") break;
      if (objects.has(num)) continue;
      try {
        objects.set(num, { value: new Lexer(data, first + off).next() });
      } catch {
        // skip a malformed packed object
      }
    }
  }
  return doc;
}

class Doc {
  constructor(objects, trailers) {
    this.objects = objects;
    this.trailers = trailers;
  }

  resolve(v, depth = 0) {
    while (v instanceof Ref && depth++ < 32) v = this.objects.get(v.num)?.value;
    return v instanceof Ref ? undefined : v;
  }

  entry(v) {
    return v instanceof Ref ? this.objects.get(v.num) : undefined;
  }

  // Decoded stream bytes, or null when the filter is not supported.
  decode(entry) {
    if (!entry?.raw) return null;
    if (entry.decoded !== undefined) return entry.decoded;
    let filters = this.resolve(entry.value.get("Filter"));
    filters = filters === undefined ? [] : Array.isArray(filters) ? filters.map((f) => this.resolve(f)) : [filters];
    let data = entry.raw;
    try {
      for (const f of filters) {
        if (nameOf(f) === "FlateDecode" || nameOf(f) === "Fl") data = inflate(data);
        else {
          data = null;
          break;
        }
      }
    } catch {
      data = null;
    }
    entry.decoded = data;
    return data;
  }

  dicts() {
    return [...this.objects.values()].map((e) => e.value).filter((v) => v instanceof Map);
  }

  catalog() {
    for (const t of [...this.trailers].reverse()) {
      const root = this.resolve(t.get("Root"));
      if (root instanceof Map) return root;
    }
    const dicts = this.dicts();
    for (const d of [...dicts].reverse()) {
      if (nameOf(d.get("Type")) !== "XRef") continue;
      const root = this.resolve(d.get("Root"));
      if (root instanceof Map) return root;
    }
    return [...dicts].reverse().find((d) => nameOf(d.get("Type")) === "Catalog");
  }

  // Page dictionaries in /Kids order, each with its inherited /Resources.
  pages() {
    const out = [];
    const seen = new Set();
    const walk = (node, inherited, depth) => {
      if (!(node instanceof Map) || seen.has(node) || depth > 64) return;
      seen.add(node);
      const resources = this.resolve(node.get("Resources")) ?? inherited;
      const kids = this.resolve(node.get("Kids"));
      if (nameOf(node.get("Type")) === "Page" || (!Array.isArray(kids) && node.has("Contents"))) {
        out.push({ page: node, resources });
        return;
      }
      for (const kid of kids ?? []) walk(this.resolve(kid), resources, depth + 1);
    };
    walk(this.resolve(this.catalog()?.get("Pages")), undefined, 0);
    return out;
  }
}

export function pdfFacts(bytes) {
  const doc = indexObjects(bytes);
  const dicts = doc.dicts();
  let pages = dicts.filter((d) => nameOf(d.get("Type")) === "Page").length;
  if (!pages) {
    for (const d of dicts) {
      if (nameOf(d.get("Type")) !== "Pages") continue;
      const count = doc.resolve(d.get("Count"));
      if (typeof count === "number" && count > pages) pages = count;
    }
  }
  return { bytes: bytes.length, pages, sha256: createHash("sha256").update(bytes).digest("hex") };
}

// ToUnicode CMap -> Map<code, string>.
function parseCMap(data) {
  const map = new Map();
  const utf16 = (buf) => {
    let s = "";
    for (let i = 0; i + 1 < buf.length; i += 2) s += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
    if (buf.length % 2) s += String.fromCharCode(buf[buf.length - 1]);
    return s;
  };
  const code = (buf) => buf.reduce((n, byte) => n * 256 + byte, 0);
  const lexer = new Lexer(data);
  let mode = null;
  const pending = [];
  for (let t = lexer.next(); t !== undefined; t = lexer.next()) {
    if (t instanceof Op) {
      if (t.op === "beginbfchar" || t.op === "beginbfrange") mode = t.op;
      else if (t.op === "endbfchar" || t.op === "endbfrange") mode = null;
      pending.length = 0;
      continue;
    }
    if (!mode) continue;
    pending.push(t);
    if (mode === "beginbfchar" && pending.length === 2) {
      const [src, dst] = pending;
      if (Buffer.isBuffer(src) && Buffer.isBuffer(dst)) map.set(code(src), utf16(dst));
      pending.length = 0;
    } else if (mode === "beginbfrange" && pending.length === 3) {
      const [lo, hi, dst] = pending;
      pending.length = 0;
      if (!Buffer.isBuffer(lo) || !Buffer.isBuffer(hi)) continue;
      const from = code(lo);
      const to = Math.min(code(hi), from + 0xffff);
      for (let c = from; c <= to; c++) {
        if (Array.isArray(dst)) {
          const d = dst[c - from];
          if (Buffer.isBuffer(d)) map.set(c, utf16(d));
        } else if (Buffer.isBuffer(dst) && dst.length) {
          const d = Buffer.from(dst);
          d[d.length - 1] += c - from;
          map.set(c, utf16(d));
        }
      }
    }
  }
  return map;
}

// Glyph widths in glyph space: /W + /DW for Type0, /FirstChar + /Widths otherwise.
function fontWidths(doc, font, twoByte) {
  const widths = new Map();
  if (!(font instanceof Map)) return { widths, fallback: twoByte ? 1000 : 500 };
  if (twoByte) {
    const cid = doc.resolve(doc.resolve(font.get("DescendantFonts"))?.[0]);
    const dw = doc.resolve(cid?.get?.("DW"));
    const w = doc.resolve(cid?.get?.("W"));
    for (let i = 0; Array.isArray(w) && i < w.length; ) {
      const first = doc.resolve(w[i]);
      const next = doc.resolve(w[i + 1]);
      if (Array.isArray(next)) {
        next.forEach((v, k) => widths.set(first + k, doc.resolve(v)));
        i += 2;
      } else {
        const width = doc.resolve(w[i + 2]);
        for (let c = first; c <= next && c - first < 0x10000; c++) widths.set(c, width);
        i += 3;
      }
    }
    return { widths, fallback: typeof dw === "number" ? dw : 1000 };
  }
  const first = doc.resolve(font.get("FirstChar"));
  const list = doc.resolve(font.get("Widths"));
  if (typeof first === "number" && Array.isArray(list)) list.forEach((v, k) => widths.set(first + k, doc.resolve(v)));
  return { widths, fallback: widths.size ? 0 : 500 };
}

// For a font resource: split string bytes into codes, map each to text and width.
function fontReader(doc, fontRef, cache) {
  const key = fontRef instanceof Ref ? fontRef.num : fontRef;
  if (cache.has(key)) return cache.get(key);
  const font = doc.resolve(fontRef);
  const twoByte = font instanceof Map && nameOf(font.get("Subtype")) === "Type0";
  const cmapData = font instanceof Map ? doc.decode(doc.entry(font.get("ToUnicode"))) : null;
  const cmap = cmapData ? parseCMap(cmapData) : null;
  const { widths, fallback } = fontWidths(doc, font, twoByte);
  // Widths are in glyph space: thousandths of an em, except Type3 fonts which use their /FontMatrix.
  const matrix = font instanceof Map ? doc.resolve(font.get("FontMatrix")) : undefined;
  const type3 = font instanceof Map && nameOf(font.get("Subtype")) === "Type3";
  const scale = type3 && Array.isArray(matrix) && typeof doc.resolve(matrix[0]) === "number" ? doc.resolve(matrix[0]) : 0.001;
  const reader = {
    twoByte,
    codes(bytes) {
      if (!twoByte) return [...bytes];
      const out = [];
      for (let i = 0; i + 1 < bytes.length; i += 2) out.push((bytes[i] << 8) | bytes[i + 1]);
      return out;
    },
    text(code) {
      const u = cmap?.get(code);
      if (u !== undefined) return u;
      return cmap && twoByte ? "" : String.fromCharCode(code & 0xff);
    },
    width(code) {
      const w = widths.get(code);
      return (typeof w === "number" ? w : fallback) * scale;
    },
  };
  cache.set(key, reader);
  return reader;
}

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const IDENTITY = [1, 0, 0, 1, 0, 0];

// Skip inline image data: from after "ID" to the "EI" that ends it.
function skipInlineImage(lexer) {
  const b = lexer.b;
  let i = lexer.pos + 1;
  while (i < b.length) {
    i = b.indexOf("EI", i, "latin1");
    if (i < 0) break;
    if (WS.has(b[i - 1]) && (i + 2 >= b.length || !isRegular(b[i + 2]))) {
      lexer.pos = i + 2;
      return;
    }
    i += 2;
  }
  lexer.pos = b.length;
}

function readContent(doc, data, resources, ctm, state, stack) {
  const lexer = new Lexer(data);
  const operands = [];
  const gstack = [];
  let tlm = IDENTITY; // text line matrix
  let tm = IDENTITY; // text matrix (advances with each glyph)
  let leading = 0;
  let fontSize = 0;
  let charSpace = 0;
  let wordSpace = 0;
  let hScale = 1;
  let font = fontReader(doc, undefined, state.fontCache);
  const fonts = doc.resolve(resources?.get("Font"));
  const xobjects = doc.resolve(resources?.get("XObject"));

  // Device-space origin of the current text position and the device size of an em.
  const where = () => {
    const m = mul(tm, ctm);
    return { x: m[4], y: m[5], em: Math.abs(fontSize) * Math.hypot(m[2], m[3]) || 1 };
  };
  // A run on a new baseline starts a line; on the same baseline it gets a space
  // only when there is a visible gap after the previous run (Chrome writes one Tj per glyph).
  const show = (bytes) => {
    const start = where();
    const last = state.last;
    if (last) {
      const em = Math.max(start.em, last.em);
      if (Math.abs(start.y - last.y) > Math.max(1, em * 0.5)) state.parts.push("\n");
      else if (Math.abs(start.x - last.x) > em * 0.15) state.parts.push(" ");
    }
    let s = "";
    for (const code of font.codes(bytes)) {
      s += font.text(code);
      const word = !font.twoByte && code === 32 ? wordSpace : 0;
      advance((font.width(code) * fontSize + charSpace + word) * hScale);
    }
    state.parts.push(s);
    state.last = where();
  };
  const advance = (tx) => {
    tm = mul([1, 0, 0, 1, tx, 0], tm);
  };
  const moveLine = (tx, ty) => {
    tlm = mul([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };
  const num = (v, d = 0) => (typeof v === "number" ? v : d);

  for (let t = lexer.next(); t !== undefined; t = lexer.next()) {
    if (!(t instanceof Op)) {
      operands.push(t);
      continue;
    }
    const a = operands.splice(0);
    switch (t.op) {
      case "q": gstack.push(ctm); break;
      case "Q": ctm = gstack.pop() ?? ctm; break;
      case "cm": if (a.length === 6) ctm = mul(a, ctm); break;
      case "BT": tlm = tm = IDENTITY; break;
      case "Tf": {
        const ref = fonts instanceof Map ? fonts.get(nameOf(a[0])) : undefined;
        font = fontReader(doc, ref, state.fontCache);
        fontSize = num(a[1]);
        break;
      }
      case "Tc": charSpace = num(a[0]); break;
      case "Tw": wordSpace = num(a[0]); break;
      case "Tz": hScale = num(a[0], 100) / 100; break;
      case "TL": leading = num(a[0]); break;
      case "Td": moveLine(num(a[0]), num(a[1])); break;
      case "TD": leading = -num(a[1]); moveLine(num(a[0]), num(a[1])); break;
      case "Tm": if (a.length === 6 && a.every((v) => typeof v === "number")) tlm = tm = a; break;
      case "T*": moveLine(0, -leading); break;
      case "Tj": if (Buffer.isBuffer(a[0])) show(a[0]); break;
      case "'": moveLine(0, -leading); if (Buffer.isBuffer(a[0])) show(a[0]); break;
      case '"':
        wordSpace = num(a[0]);
        charSpace = num(a[1]);
        moveLine(0, -leading);
        if (Buffer.isBuffer(a[2])) show(a[2]);
        break;
      case "TJ": {
        if (!Array.isArray(a[0])) break;
        for (const p of a[0]) {
          if (Buffer.isBuffer(p)) show(p);
          else if (typeof p === "number") advance((-p / 1000) * fontSize * hScale);
        }
        break;
      }
      case "Do": {
        const ref = xobjects instanceof Map ? xobjects.get(nameOf(a[0])) : undefined;
        const entry = doc.entry(ref);
        if (!entry || stack.has(entry) || stack.size > 16) break;
        const dict = entry.value;
        if (!(dict instanceof Map) || nameOf(doc.resolve(dict.get("Subtype"))) !== "Form") break;
        const body = doc.decode(entry);
        if (!body) break;
        const matrix = doc.resolve(dict.get("Matrix"));
        const formCtm = Array.isArray(matrix) && matrix.length === 6 ? mul(matrix, ctm) : ctm;
        stack.add(entry);
        readContent(doc, body, doc.resolve(dict.get("Resources")) ?? resources, formCtm, state, stack);
        stack.delete(entry);
        break;
      }
      case "ID": skipInlineImage(lexer); break;
      default: break;
    }
  }
}

function tidy(parts) {
  return parts
    .join("")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function pdfText(bytes) {
  const doc = indexObjects(bytes);
  const fontCache = new Map();
  return doc.pages().map(({ page, resources }) => {
    const contents = page.get("Contents");
    const list = Array.isArray(doc.resolve(contents)) ? doc.resolve(contents) : [contents];
    const chunks = list.map((c) => doc.decode(doc.entry(c))).filter(Boolean);
    const state = { parts: [], last: null, fontCache };
    if (chunks.length) {
      const data = Buffer.concat(chunks.flatMap((c) => [c, Buffer.from("\n")]));
      readContent(doc, data, resources, IDENTITY, state, new Set());
    }
    return tidy(state.parts);
  });
}

const norm = (s) => s.replace(/\s+/g, " ").trim();

export function textOrder(text, expected) {
  const hay = norm(text);
  const missing = [];
  const outOfOrder = [];
  let from = 0;
  for (const item of expected) {
    const needle = norm(item);
    if (!needle) continue;
    const at = hay.indexOf(needle, from);
    if (at >= 0) from = at + needle.length;
    else if (hay.includes(needle)) outOfOrder.push(item);
    else missing.push(item);
  }
  return { inOrder: !missing.length && !outOfOrder.length, missing, outOfOrder };
}
