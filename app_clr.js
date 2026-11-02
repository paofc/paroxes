/* Καρτέλα «Αποστάσεις ασφαλείας» – Connexion Engineering.
   Μιμικά σχέδια SVG για κάθε περίπτωση αποστάσεων ασφαλείας των δικτύων Διανομής (ΕΤΚΔ σελίδες C-1 … C-23, ΟΔ.38 και εγκύκλιοι
   ΔΕΔΔΗΕ για κολυμβητήρια, ανεμογεννήτριες, βιοαέριο, πρατήρια καυσίμων / υδρογόνου, αγωγούς ΔΕΣΦΑ). Οι τιμές που αναγράφονται στα
   σχέδια διαβάζονται από τα δεδομένα (data.js → typ.clearances / typ.safety_docs) – δεν είναι γραμμένες στο χέρι. Οι πλήρεις πίνακες
   και οι σημειώσεις κάθε σελίδας ανοίγουν με drop-down κάτω από το σχέδιο. Τα σχέδια είναι μιμικά (όχι υπό κλίμακα). */
(function () {
  "use strict";
  const D = window.OD26_DATA;
  const root = document.getElementById("clr_root");
  if (!D || !root || !window.DIAGRAMS || !window.DIAGRAMS.prim) return;
  const CL = D.typ.clearances, SDOCS = D.typ.safety_docs || [], SR = D.typ.safety_sidewalk_road;
  const P = window.DIAGRAMS.prim, { C, txt, line, rect, vdim, hdim, wrap, m2, esc } = P;
  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------- μικρά βοηθήματα σχεδίασης
  const path = (d, o) => { o = o || {}; return `<path d="${d}" fill="${o.fill || "none"}" stroke="${o.stroke || C.line}" stroke-width="${o.w === undefined ? 1.5 : o.w}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.cap ? ` stroke-linecap="${o.cap}"` : ""}/>`; };
  const poly = (pts, o) => { o = o || {}; return `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${o.fill || "none"}" stroke="${o.stroke || C.line}" stroke-width="${o.w === undefined ? 1.5 : o.w}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`; };
  const circ = (x, y, r, o) => { o = o || {}; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill || "none"}" stroke="${o.stroke || C.line}" stroke-width="${o.w === undefined ? 1.5 : o.w}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`; };
  // κείμενο με διακριτικό φόντο (ταμπελάκι) – μένει ευανάγνωστο ακόμη και όταν αγγίζει γραμμές· anchor start / middle / end, y = γραμμή βάσης
  const pill = (x, y, s, o) => {
    o = o || {}; s = String(s);
    const size = o.size || 11, w = s.length * size * 0.56 + 10, h = size + 6;
    const ax = o.anchor === "middle" ? x - w / 2 : o.anchor === "end" ? x - w : x;
    return rect(ax, y - size - 1, w, h, { fill: o.bg || "rgba(11,26,36,0.86)", stroke: o.stroke || "none", w: o.stroke ? 1 : 0, rx: 4 }) + txt(ax + 5, y, s, { size, fill: o.fill || C.text, bold: !!o.bold });
  };
  // έντονο ταμπελάκι με περίγραμμα (τιμές / προειδοποιήσεις)
  const tag = (x, y, s, o) => { o = o || {}; return pill(x, y, s, Object.assign({ stroke: o.fill || C.acc, bold: true, bg: "#0b1a24", size: 11.5 }, o)); };
  const ground = (W, H, G, o) => { o = o || {}; return rect(0, G, W, H - G, { fill: o.fill || C.ground, stroke: "none", w: 0 }) + line(0, G, W, G, { stroke: "#7a6a4a", w: 2 }); };
  const poleG = (x, yTop, yG, o) => { o = o || {}; let s = rect(x - (o.hw || 4), yTop, 2 * (o.hw || 4), yG - yTop, { fill: "#5b6770", stroke: "#8a98a3", w: 1 }); if (o.arm !== false) s += line(x - (o.armw || 22), yTop + 10, x + (o.armw || 22), yTop + 10, { stroke: "#8a98a3", w: 3 }); if (o.label) s += pill(x, yTop - 8, o.label, { anchor: "middle", size: 10, fill: C.muted }); return s; };
  const wire = (x1, y1, x2, y2, sag, o) => { o = o || {}; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 2 * (sag || 0); return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="${o.stroke || C.warn}" stroke-width="${o.w || 2.2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`; };
  // αγωγός κάθετος στο επίπεδο του σχήματος (τομή)
  const condEnd = (x, y, o) => { o = o || {}; const r = o.r || 5; return circ(x, y, r, { fill: o.fill || C.warn, stroke: o.stroke || "#000", w: 1 }) + line(x - r, y, x + r, y, { stroke: "#000", w: 0.8 }) + line(x, y - r, x, y + r, { stroke: "#000", w: 0.8 }); };
  const roadBand = (x1, x2, G, o) => { o = o || {}; let s = rect(x1, G, x2 - x1, 10, { fill: o.fill || "#2b2b2b", stroke: "none", w: 0 }); if (o.center) s += line((x1 + x2) / 2 - 18, G + 5, (x1 + x2) / 2 + 18, G + 5, { stroke: "#d9c36a", w: 1.5, dash: "6 6" }); return s; };
  const sidewalkBand = (x1, x2, G) => rect(x1, G - 5, x2 - x1, 15, { fill: "#4a4036", stroke: "none", w: 0 });
  const grassBand = (x1, x2, G) => rect(x1, G, x2 - x1, 8, { fill: C.grass, stroke: "none", w: 0 });
  const person = (x, yG, o) => { o = o || {}; const h = o.h || 34, col = o.fill || "#9fb3bd"; return circ(x, yG - h + 5, 4.5, { fill: col, stroke: "none", w: 0 }) + line(x, yG - h + 10, x, yG - h * 0.45, { stroke: col, w: 2.5 }) + line(x, yG - h * 0.45, x - 6, yG, { stroke: col, w: 2.5 }) + line(x, yG - h * 0.45, x + 6, yG, { stroke: col, w: 2.5 }) + line(x - 8, yG - h * 0.72, x + 8, yG - h * 0.6, { stroke: col, w: 2.5 }); };
  const car = (x, yG, o) => { o = o || {}; const w = o.w || 46, h = 16, col = o.fill || "#7d8a94"; return path(`M${x - w / 2},${yG - 6} L${x - w / 2},${yG - h} L${x - w / 4},${yG - h} L${x - w / 8},${yG - h - 9} L${x + w / 5},${yG - h - 9} L${x + w / 3},${yG - h} L${x + w / 2},${yG - h} L${x + w / 2},${yG - 6} Z`, { fill: col, stroke: "#aab", w: 1 }) + circ(x - w / 3, yG - 5, 5, { fill: "#222", stroke: "#aaa", w: 1 }) + circ(x + w / 3, yG - 5, 5, { fill: "#222", stroke: "#aaa", w: 1 }); };
  const tree = (x, yG, o) => { o = o || {}; const h = o.h || 40; return rect(x - 2, yG - h * 0.4, 4, h * 0.4, { fill: "#6b4a2a", stroke: "none", w: 0 }) + circ(x, yG - h * 0.65, h * 0.33, { fill: "#2f6b3a", stroke: "#1f4a28", w: 1 }); };
  const building = (x, y, w, h, o) => { o = o || {}; let s = rect(x, y, w, h, { fill: o.fill || C.wall, stroke: "#4b5f6d", w: 1.5 }); if (o.roof === "pitched") s += poly([[x - 8, y], [x + w / 2, y - (o.roofH || 60)], [x + w + 8, y]], { fill: "#33414c", stroke: "#4b5f6d", w: 1.5 }); if (o.windows !== false) { for (let r = 0; r < Math.floor(h / 70); r++) for (let c = 0; c < Math.floor(w / 60); c++) s += rect(x + 18 + c * 60, y + 18 + r * 70, 22, 28, { fill: "#162633", stroke: "#4b5f6d", w: 1 }); } return s; };
  const insulator = (x, y, o) => { o = o || {}; return rect(x - (o.w || 5), y - (o.h || 16), 2 * (o.w || 5), o.h || 16, { fill: "#cfd8dc", stroke: "#8a98a3", w: 1, rx: 2 }); };
  const guyIns = (x, y, o) => { o = o || {}; return rect(x - 9, y - 4, 18, 8, { fill: "#e5eef2", stroke: "#8a98a3", w: 1, rx: 3 }); };
  const ellipsis = (s, n) => String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s);
  const mtxt = v => typeof v === "number" ? m2(v) + " m" : (v === null || v === undefined || v === "" ? "—" : String(v));
  const fmt2 = v => Number(v).toFixed(2).replace(".", ",");
  const grid = (heads, rows, leftCols) => { leftCols = leftCols === undefined ? 1 : leftCols; return `<div style="overflow-x:auto"><table class="grid">${heads ? `<tr>${heads.map(x => `<th>${x}</th>`).join("")}</tr>` : ""}${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i < leftCols ? "l" : ""}">${c === null || c === undefined || c === "" ? "—" : c}</td>`).join("")}</tr>`).join("")}</table></div>`; };
  const notes = lst => lst && lst.length ? `<ul class="notes small">${lst.map(t => `<li>${t}</li>`).join("")}</ul>` : "";
  const itemsTable = c => grid(["Απόσταση", "Ελάχιστο"], (c.items || []).map(x => [esc(x[0]), typeof x[1] === "number" ? m2(x[1]) + " m" : esc(x[1])]));
  const doc = id => SDOCS.find(x => x.id === id) || null;
  const rule = (docId, ruleId) => { const d = doc(docId); return d ? (d.rules || []).find(r => r.id === ruleId) || null : null; };
  const rv = (docId, ruleId, dflt) => { const r = rule(docId, ruleId); return r && r.value ? r.value : dflt; };
  const docTables = d => d ? `${(d.tables || []).map(t => `<div class="small" style="margin-top:8px"><b>${esc(t.title)}</b></div>${grid(t.cols, t.rows, 1)}${t.ref ? `<div class="muted small">${esc(t.ref)}</div>` : ""}`).join("")}` : "";
  const docRules = (d, filter) => d ? grid(["Κανόνας", "Τιμή", "Εφαρμογή", "Τάση / συνθήκη", "Αναφορά"], (d.rules || []).filter(r => !filter || filter(r)).map(r => [esc(r.text), esc(r.value || ""), esc(r.applies_to || ""), esc([r.voltage, r.condition].filter(Boolean).join(" · ")), esc(r.ref || "")]), 1) : "";
  const docHead = d => d ? `<div class="muted small">${esc(d.number || "")} ${esc(d.date || "")}${d.subject ? " · " + esc(d.subject) : ""}${d.scope ? "<br>" + esc(d.scope) : ""}</div>` : "";
  const sel = (id, label, options, value) => `<div class="field"><label>${label}</label><select id="${id}" data-ctl="${id}">${options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(value) ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select></div>`;
  const numIn = (id, label, value, min, max, step) => `<div class="field"><label>${label}</label><input id="${id}" data-ctl="${id}" type="number" value="${value}"${min !== undefined ? ` min="${min}"` : ""}${max !== undefined ? ` max="${max}"` : ""} step="${step || 1}"></div>`;
  const stripSide = s => String(s).replace(/\s*\((πάνω|κάτω)\)\s*$/, "");

  // ---------------------------------------------------------------- πλαίσιο σχεδίου («σκηνή»)
  // Κάθε σχήμα = περιοχή σχεδίου (ύψος Hd) + ζώνη υπομνήματος / σημειώσεων από κάτω. Τα επεξηγηματικά κείμενα ΔΕΝ γράφονται πάνω στο
  // σχέδιο: στο σχέδιο μένουν μόνο οι τιμές (ταμπελάκια δίπλα στις γραμμές διαστάσεων) και αριθμημένες ενδείξεις ①②③ που εξηγούνται
  // στο υπόμνημα. Οι ετικέτες σχεδιάζονται τελευταίες (πάνω από τα αντικείμενα) και τοποθετούνται σε ελεύθερες θέσεις.
  const wrapLines = (t, maxChars) => { const words = String(t).split(/\s+/); const out = []; let cur = ""; words.forEach(w => { if (cur && (cur + " " + w).length > maxChars) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }); if (cur) out.push(cur); return out; };
  function Scene(W, Hd) { this.W = W; this.Hd = Hd; this.body = ""; this.over = ""; this.notes = []; this.legend = []; this.n = 0; }
  Scene.prototype.add = function (s) { this.body += s; return this; };
  Scene.prototype.top = function (s) { this.over += s; return this; };
  Scene.prototype.note = function (t, col) { if (t) this.notes.push([String(t), col || C.muted]); return this; };
  // αριθμημένη ένδειξη: κύκλος με αριθμό στη θέση (x, y) – ή στο άκρο οδηγού (lx, ly) – και καταχώριση στο υπόμνημα· προαιρετικό σύντομο ταμπελάκι δίπλα
  Scene.prototype.key = function (text, o) {
    o = o || {}; const n = ++this.n, col = o.color || C.acc;
    if (o.x !== undefined) {
      const mx = o.lx !== undefined ? o.lx : o.x, my = o.ly !== undefined ? o.ly : o.y;
      if (mx !== o.x || my !== o.y) this.over += line(o.x, o.y, mx, my, { stroke: col, w: 1, dash: "2 3" });
      this.over += circ(mx, my, 8, { fill: col, stroke: "#0b1a24", w: 1.2 }) + txt(mx, my + 3.5, String(n), { anchor: "middle", size: 9.5, fill: "#000", bold: true });
      if (o.label) this.over += pill(o.side === "left" ? mx - 11 : mx + 11, my + 4, o.label, { anchor: o.side === "left" ? "end" : "start", size: 10.5, fill: col, bold: true });
    }
    this.legend.push([n, text, col]);
    return n;
  };
  Scene.prototype.render = function (title) {
    const maxChars = Math.floor((this.W - 56) / 5.45), LH = 14;
    const lines = [];
    this.legend.forEach(([n, t, col]) => wrapLines(t, maxChars).forEach((l, i) => lines.push({ t: l, col: C.text, n: i === 0 ? n : null, ncol: col })));
    this.notes.forEach(([t, col]) => wrapLines(t, maxChars + 4).forEach((l, i) => lines.push({ t: l, col, n: null, cont: i > 0, note: true })));
    const bandH = lines.length ? 14 + lines.length * LH + 4 : 0;
    const H = this.Hd + bandH;
    let s = this.body + this.over;
    if (bandH) {
      s += rect(0, this.Hd, this.W, bandH, { fill: "#0d1d27", stroke: "none", w: 0 }) + line(0, this.Hd, this.W, this.Hd, { stroke: "#27404d", w: 1 });
      lines.forEach((l, i) => {
        const y = this.Hd + 18 + i * LH;
        if (l.n !== null) s += circ(20, y - 4, 7, { fill: l.ncol, stroke: "none", w: 0 }) + txt(20, y - 0.5, String(l.n), { anchor: "middle", size: 9, fill: "#000", bold: true });
        s += txt(l.note ? 14 : 32, y, l.t, { size: 10.5, fill: l.col });
      });
    }
    return wrap(this.W, H, s, title);
  };
  // διαστάσεις με βέλη και ταμπελάκι δίπλα· ext = συντεταγμένη του αντικειμένου για γραμμές προέκτασης (διακεκομμένες) έως τη γραμμή διάστασης
  const arrowV = (x, y, up, col) => `<path d="M${x - 4},${y + (up ? 8 : -8)} L${x},${y} L${x + 4},${y + (up ? 8 : -8)}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
  const arrowH = (x, y, left, col) => `<path d="M${x + (left ? 8 : -8)},${y - 4} L${x},${y} L${x + (left ? 8 : -8)},${y + 4}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
  const vd = (x, y1, y2, label, o) => {
    o = o || {}; const col = o.color || C.acc, top = Math.min(y1, y2), bot = Math.max(y1, y2); let s = "";
    if (o.ext !== undefined) { s += line(o.ext, top, x, top, { stroke: col, w: 0.8, dash: "3 3" }); s += line(o.ext, bot, x, bot, { stroke: col, w: 0.8, dash: "3 3" }); }
    s += line(x, top, x, bot, { stroke: col, w: 1.2 });
    if (bot - top >= 16) s += arrowV(x, top, true, col) + arrowV(x, bot, false, col);
    else s += line(x - 5, top, x + 5, top, { stroke: col, w: 1.2 }) + line(x - 5, bot, x + 5, bot, { stroke: col, w: 1.2 });
    if (label) s += pill(o.left ? x - 7 : x + 7, (o.ly !== undefined ? o.ly : (top + bot) / 2) + 4, label, { anchor: o.left ? "end" : "start", size: o.size || 11.5, fill: col, bold: true });
    return s;
  };
  const hd = (y, x1, x2, label, o) => {
    o = o || {}; const col = o.color || C.acc, l = Math.min(x1, x2), r = Math.max(x1, x2); let s = "";
    if (o.ext !== undefined) { s += line(l, o.ext, l, y, { stroke: col, w: 0.8, dash: "3 3" }); s += line(r, o.ext, r, y, { stroke: col, w: 0.8, dash: "3 3" }); }
    s += line(l, y, r, y, { stroke: col, w: 1.2 });
    if (r - l >= 16) s += arrowH(l, y, true, col) + arrowH(r, y, false, col);
    else s += line(l, y - 5, l, y + 5, { stroke: col, w: 1.2 }) + line(r, y - 5, r, y + 5, { stroke: col, w: 1.2 });
    if (label) s += pill(o.lx !== undefined ? o.lx : (l + r) / 2, o.below ? y + 16 : y - 6, label, { anchor: o.anchor || "middle", size: o.size || 11.5, fill: col, bold: true });
    return s;
  };
  // το σύνολο των σημειώσεων μιας σελίδας του ΕΤΚΔ (από τα δεδομένα) στο υπόμνημα
  const addNotes = (S, lst, col) => { (lst || []).forEach(t => S.note(t, col)); return S; };

  // ---------------------------------------------------------------- 1. Ύψη αγωγών από το έδαφος (C-2 / C-3 / C-3A)
  function drawGround(st) {
    const c = CL.ground, col = +st.col || 0, name = c.cols[col];
    const W = 900, Hd = 330, G = 262, k = 30, yOf = m => G - m * k;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const zones = [
      { x1: 18, x2: 232, row: 0, kind: "cross", lab: "I. Διασταύρωση οδού", surf: "road" },
      { x1: 252, x2: 442, row: 1, kind: "cross", lab: "II. Διασταύρωση πεζοδρομίου", surf: "side" },
      { x1: 462, x2: 672, row: 2, kind: "along", lab: "IV. Κατά μήκος υπεραστικής οδού", surf: "rural" },
      { x1: 692, x2: 886, row: 3, kind: "along", lab: "V. Κατά μήκος οδού – αστική περιοχή", surf: "urban" }];
    zones.forEach(z => {
      const v = c.rows[z.row][1][col], cx = (z.x1 + z.x2) / 2;
      if (z.surf === "road") { S.add(roadBand(z.x1, z.x2, G, { center: true })); S.add(car(cx + 10, G)); }
      if (z.surf === "side") { S.add(sidewalkBand(z.x1, z.x2, G)); S.add(person(cx + 18, G - 5)); }
      if (z.surf === "rural") { S.add(grassBand(z.x1, z.x1 + 40, G) + roadBand(z.x1 + 40, z.x2 - 40, G, { center: true }) + grassBand(z.x2 - 40, z.x2, G)); S.add(car(cx + 36, G)); }
      if (z.surf === "urban") { S.add(sidewalkBand(z.x1, z.x1 + 40, G) + roadBand(z.x1 + 40, z.x2 - 40, G, { center: true }) + sidewalkBand(z.x2 - 40, z.x2, G)); S.add(car(cx + 10, G)); S.add(person(z.x2 - 20, G - 5, { h: 28 })); }
      S.add(rect(z.x1, G + 16, z.x2 - z.x1, 24, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 4 }) + txt(cx, G + 32, z.lab, { anchor: "middle", size: 10.5, fill: C.text }));
      if (v === null || v === undefined) { S.top(pill(cx, 150, "δεν προβλέπεται (—)", { anchor: "middle", size: 10.5, fill: C.muted, bg: C.panel })); return; }
      const yc = yOf(v);
      if (z.kind === "cross") S.add(wire(z.x1 + 8, yc - 12, z.x2 - 8, yc - 12, 6, { stroke: C.warn, w: 2.2 }));
      else S.add(condEnd(cx, yc, {}));
      S.top(vd(cx - 44, yc, G, `≥ ${m2(v)} m`, { color: C.warn, size: 12.5, ext: cx }));
    });
    S.key("I, II: χαμηλότερο σημείο του αγωγού (μέγιστο βέλος, 16 °C) πάνω από το οδόστρωμα / το πεζοδρόμιο – όχι από τα σημεία στηρίξεως. IV, V: αγωγός παράλληλος με την οδό (τομή).", { x: 125, y: yOf(c.rows[0][1][col] || 5.5) - 12, lx: 60, ly: 70 });
    S.note(`Τύπος αγωγού: ${name}.`, C.text);
    addNotes(S, c.notes);
    let out = S.render(`Ελάχιστη κατακόρυφη απόσταση αγωγών από το έδαφος – ${ellipsis(name, 60)} (C-2 / C-3 / C-3A)`);
    // δεύτερο σχήμα: λοιπές αποστάσεις (III, VI, VII, φωτιστικά, χώροι)
    const ex = c.extra || [], exv = i => (ex[i] ? ex[i][1] : null);
    const W2 = 900, Hd2 = 300, G2 = 236, k2 = 26, y2 = m => G2 - m * k2;
    const T = new Scene(W2, Hd2);
    T.add(ground(W2, Hd2, G2));
    // σκηνή Α: Μ/Σ επί στύλου στο κράσπεδο – βάση πάνω από πεζοδρόμιο / δρόμο, στύλος από κράσπεδο, υδροληψία
    T.add(roadBand(16, 170, G2, { center: true }) + sidewalkBand(170, 334, G2));
    const px = 190;
    T.add(poleG(px, y2(7.0), G2, { arm: false }));
    T.add(rect(px - 32, y2(exv(0) + 1.3), 64, 1.3 * k2, { fill: "#2f4858", stroke: "#8fb4c4", w: 1.2 }) + txt(px, y2(exv(0) + 0.6) + 4, "Μ/Σ", { anchor: "middle", size: 11, fill: C.text, bold: true }));
    T.top(vd(px - 56, y2(exv(0)), G2, `≥ ${m2(exv(0))} m`, { color: C.warn, size: 12, ext: px - 32, left: true }));
    T.key("III. Βάση Μ/Σ (γειωμένο δοχείο) πάνω από πεζοδρόμιο", { x: px + 32, y: y2(exv(0)), lx: px + 96, ly: y2(exv(0)) - 10, color: C.warn });
    T.add(line(px - 32, y2(exv(1)), 36, y2(exv(1)), { stroke: C.warn, w: 1.2, dash: "5 4" }));
    T.top(vd(46, y2(exv(1)), G2, `≥ ${m2(exv(1))} m`, { color: C.warn, size: 12, ly: y2(exv(1)) + 22 }));
    T.key("III. Βάση Μ/Σ πάνω από δρόμο", { x: 70, y: y2(exv(1)), lx: 104, ly: y2(exv(1)) - 18, color: C.warn });
    T.add(hd(G2 - 10, 170, px - 4, "", { color: C.dim }));
    T.key(`VI. Στύλος ≥ ${m2(exv(2))} m από το άκρο του πεζοδρομίου (επιθυμητή)`, { x: 178, y: G2 - 10, lx: 176, ly: G2 - 62, color: C.dim });
    const hx = 316; T.add(rect(hx - 5, G2 - 22, 10, 22, { fill: "#b45309", stroke: "#f59e0b", w: 1 }) + circ(hx, G2 - 24, 5, { fill: "#f59e0b", stroke: "none", w: 0 }));
    T.top(hd(G2 - 38, px + 4, hx - 5, `≥ ${m2(exv(3))} m`, { color: C.dim, size: 10.5 }));
    T.key(`VII. Σημείο υδροληψίας ≥ ${m2(exv(3))} m από τον στύλο (συνιστάται > 1,20 m όπου είναι δυνατό)`, { x: hx, y: G2 - 26, lx: hx + 10, ly: G2 - 80, color: C.dim });
    // σκηνή Β: φωτιστικό οδικού φωτισμού
    T.add(roadBand(360, 540, G2, { center: true }));
    const lx = 380; T.add(poleG(lx, y2(exv(4) + 0.3), G2, { arm: false, hw: 3 }) + path(`M${lx},${y2(exv(4) + 0.3)} L${lx + 40},${y2(exv(4)) - 4}`, { stroke: "#8a98a3", w: 3 }) + rect(lx + 36, y2(exv(4)) - 6, 22, 8, { fill: "#ffd166", stroke: "#f59e0b", w: 1, rx: 2 }));
    T.top(vd(lx + 82, y2(exv(4)), G2, `≥ ${m2(exv(4))} m`, { color: C.warn, size: 12, ext: lx + 58 }));
    T.key("Φωτιστικό σώμα οδικού φωτισμού (προτιμητέο ύψος 6,00 m)", { x: lx + 58, y: y2(exv(4)) - 2, lx: lx + 100, ly: y2(exv(4)) - 24, color: C.warn });
    // σκηνή Γ: αγροί προσιτοί σε οχήματα (ΜΤ / ΧΤ) και χώροι απρόσιτοι
    T.add(grassBand(570, 744, G2) + rect(744, G2 - 2, 146, 12, { fill: "#555", stroke: "none", w: 0 }));
    T.add(poly([[754, G2], [776, G2 - 22], [804, G2 - 8], [830, G2 - 30], [856, G2 - 6], [880, G2 - 18], [890, G2]], { fill: "#6b6b6b", stroke: "#8a8a8a", w: 1 }));
    T.add(car(660, G2, { w: 54 }));
    T.add(wire(574, y2(exv(6)) - 6, 740, y2(exv(6)) - 6, 3, { stroke: "#c9d6dc", w: 2 }) + wire(574, y2(exv(7)) - 3, 740, y2(exv(7)) - 3, 3, { stroke: C.warn, w: 2 }));
    T.top(vd(596, y2(exv(6)), G2, `ΜΤ ≥ ${m2(exv(6))} m`, { color: C.dim, size: 11, ly: y2(exv(6)) + 44 }));
    T.top(vd(716, y2(exv(7)), G2, `ΧΤ ≥ ${m2(exv(7))} m`, { color: C.warn, size: 11, left: true, ly: y2(exv(7)) + 90 }));
    T.add(wire(748, y2(exv(5)) - 3, 890, y2(exv(5)) - 3, 2, { stroke: C.warn, w: 2 }));
    T.top(vd(868, y2(exv(5)), G2 - 16, "", { color: C.warn }) + pill(817, y2(exv(5)) - 10, `ΜΤ & ΧΤ ≥ ${m2(exv(5))} m`, { anchor: "middle", size: 11, fill: C.warn, bold: true }));
    T.add(pill(657, G2 + 22, "αγροί προσιτοί σε οχήματα", { anchor: "middle", size: 10, fill: C.muted, bg: C.panel }) + pill(817, G2 + 22, "απρόσιτοι χώροι (βραχώδη)", { anchor: "middle", size: 10, fill: C.muted, bg: C.panel }));
    T.key("Χώροι προσιτοί σε οχήματα (αγροί σε ομαλό έδαφος, γεωργικά μηχανήματα): ΜΤ 6,00 m / ΧΤ 5,50 m", { x: 657, y: G2 - 30, lx: 690, ly: G2 - 100 });
    T.key("Χώροι απρόσιτοι σε οχήματα (απόκρημνα, βραχώδη εδάφη): ΜΤ και ΧΤ 4,50 m", { x: 817, y: G2 - 24, lx: 790, ly: G2 - 60 });
    T.note("Οι «λοιπές» αποστάσεις της σελίδας C-2 / C-3 – το σχήμα είναι μιμικό, όχι υπό κλίμακα.", C.muted);
    out += T.render("Λοιπές αποστάσεις από το έδαφος – Μ/Σ επί στύλου, κράσπεδο, υδροληψία, φωτιστικά, αγροί (C-2 / C-3)");
    return out;
  }

  // ---------------------------------------------------------------- 2. Διασταυρώσεις αγωγών (C-4 / C-5)
  function drawCrossings(st) {
    const c = CL.crossings, up = +st.up || 0, lo = +st.lo || 0;
    const noCirc = t => String(t).replace(/^[①-⑳]\s*/, "");
    const v = c.rows[lo][1][up], upName = noCirc(stripSide(c.cols[up])), loName = noCirc(stripSide(c.rows[lo][0]));
    const W = 900, Hd = 400, G = 330;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const yUp = 84, yc = 140;          // στήριξη / χαμηλότερο σημείο της πάνω γραμμής (η καμπύλη περνά ακριβώς από το yc στο μέσο)
    S.add(poleG(110, 62, G, {}) + poleG(790, 62, G, {}));
    S.add(wire(110, yUp - 10, 790, yUp - 10, (2 * yc - 2 * (yUp - 10)) / 2, { stroke: C.line, w: 2.4 }));
    const undesired = /III/.test(String(v)), none = v === "—" || v === null || v === undefined;
    const num = String(v || "").replace(/\s*\(III\)\s*/, "");
    const dist = none ? 1.2 : parseFloat(num.replace(",", ".")) || 1.2;
    const k = 60, yLo = yc + dist * k, colD = undesired ? C.no : C.warn;
    S.add(condEnd(450, yLo, { fill: colD, r: 6 }));
    S.add(line(300, yLo, 600, yLo, { stroke: colD, w: 1, dash: "3 5" }));
    if (none) S.top(tag(520, (yc + yLo) / 2 + 4, "δεν προβλέπεται συνδυασμός στον πίνακα C-5", { fill: C.muted }));
    else S.top(vd(540, yc, yLo, `≥ ${num} m`, { color: colD, size: 14, ext: 450 }));
    S.key(`Γραμμή που διασταυρώνει από πάνω (I): ${upName}`, { x: 300, y: yUp + 6, lx: 230, ly: 50 });
    S.key("Χαμηλότερο σημείο της πάνω γραμμής (μέγιστο βέλος, 16 °C) – από εδώ μετριέται η απόσταση", { x: 450, y: yc, lx: 380, ly: yc - 30 });
    S.key(`Γραμμή που διασταυρώνεται από πάνω (II): ${loName} – κάθετη στο σχήμα (τομή)`, { x: 450, y: yLo, lx: 380, ly: yLo + 34, color: colD });
    if (undesired) S.top(tag(16, 48, "III – ανεπιθύμητη διασταύρωση: αποφεύγεται· αν είναι αναγκαία τηρείται η απόσταση", { fill: C.no, size: 11 }));
    S.add(person(690, G, { h: 30 }));
    S.key("Ύψη πάνω από το έδαφος: κατά C-2 / C-3", { x: 690, y: G - 34, lx: 740, ly: G - 60, color: C.dim });
    addNotes(S, c.notes);
    S.note("Με το ίδιο σχήμα διαβάζεται και η αντίστροφη περίπτωση (π.χ. η γραμμή ΜΤ από πάνω) – αλλάξτε τις επιλογές. Σχήμα μιμικό.", C.muted);
    return S.render(`Ελάχιστη κατακόρυφη απόσταση σε διασταύρωση: ${ellipsis(upName, 28)} πάνω από ${ellipsis(loName, 34)} (C-4 / C-5)`);
  }

  // ---------------------------------------------------------------- 3. Κτίρια – ΜΤ (C-7) και ΧΤ (C-8 / C-9)
  function drawBuildings(kind) {
    const c = kind === "MT" ? CL.mv_buildings : CL.lv_buildings, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const W = 900, Hd = 440, G = 400, k = 34;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const colC = kind === "MT" ? C.line : C.warn, lab = kind === "MT" ? "γυμνοί αγωγοί ΜΤ" : "γυμνοί αγωγοί ΧΤ";
    // κτίριο Α: επικλινής στέγη με καπνοδόχο
    const ax = 60, aw = 220, ay = 250;
    S.add(building(ax, ay, aw, G - ay, { roof: "pitched", roofH: 70 }));
    S.add(rect(ax + 150, ay - 60, 16, 44, { fill: "#4b3b33", stroke: "#6b5b53", w: 1 }));
    const peakY = ay - 70, yA = peakY - val(0) * k;
    S.add(wire(ax - 40, yA - 4, ax + aw + 40, yA - 4, 4, { stroke: colC, w: 2.4 }));
    S.top(vd(ax + aw / 2 - 40, yA, peakY, `I. ≥ ${m2(val(0))} m`, { color: C.acc, size: 12, ext: ax + aw / 2, left: true }));
    S.key(`${lab} – κατακόρυφα πάνω από στέγη${kind === "MT" ? "" : ", καπνοδόχο ή άλλη προεξοχή"} (I)`, { x: ax - 20, y: yA - 4, lx: ax - 20, ly: yA - 34, color: colC });
    // οριζόντια από κτίριο Α (V ΜΤ / VI ΧΤ)
    const xh = ax + aw + 8, hv = kind === "MT" ? val(4) : val(5);
    S.add(line(xh, ay, xh, ay + 100, { stroke: "#4b5f6d", w: 1, dash: "3 3" }));
    S.add(condEnd(xh + hv * k, ay + 60, { fill: colC }));
    S.top(hd(ay + 86, xh, xh + hv * k, `${kind === "MT" ? "V" : "VI"}. ≥ ${m2(hv)} m`, { color: C.acc, size: 11.5, below: true, ext: ay + 60 }));
    S.key(kind === "MT" ? "Οριζόντια από κτίριο ή εξώστη (V)" : "Οριζόντια από κτίριο με επικλινή στέγη – κεραμίδια ή ελενίτ (VI)", { x: xh + hv * k, y: ay + 60, lx: xh + hv * k + 30, ly: ay + 30, color: colC });
    // κτίριο Β: ταράτσα με στηθαίο και εξώστης
    const bx = 560, bw = 220, by = 170;
    S.add(building(bx, by, bw, G - by, { roof: "flat" }));
    S.add(rect(bx - 2, by - 22, bw + 4, 22, { fill: "#3a4b57", stroke: "#4b5f6d", w: 1.5 }));
    S.key("Στηθαίο ταράτσας – η απόσταση IV μετριέται από το στηθαίο εφόσον μπορεί να σταθεί άνθρωπος όρθιος επάνω του", { x: bx + bw / 2, y: by - 11, lx: bx + bw / 2 + 50, ly: by - 46 });
    const balY = by + 120, balW = 70;
    S.add(rect(bx - balW, balY, balW, 8, { fill: "#3a4b57", stroke: "#4b5f6d", w: 1.5 }) + rect(bx - balW, balY - 34, 3, 34, { fill: "#4b5f6d", stroke: "none", w: 0 }) + line(bx - balW, balY - 34, bx, balY - 34, { stroke: "#4b5f6d", w: 2 }));
    S.add(person(bx - balW / 2 + 10, balY, { h: 30 }));
    S.key("Εξώστης (δάπεδο και κιγκλίδωμα)", { x: bx - balW + 4, y: balY + 4, lx: bx - balW - 60, ly: balY + 30 });
    // IV πάνω από στηθαίο
    const yIV = by - 22 - val(3) * k;
    S.add(wire(bx - 30, yIV - 4, bx + bw + 60, yIV - 4, 3, { stroke: colC, w: 2.4 }));
    S.top(vd(bx + bw + 36, yIV, by - 22, `IV. ≥ ${m2(val(3))} m`, { color: C.acc, size: 12, ext: bx + bw }));
    // III πάνω / II κάτω από δάπεδο εξώστη (υπερκείμενοι / υποκείμενοι αγωγοί)
    const xL = bx - balW - 62, xD = bx - balW - 14, yIII = balY - val(2) * k, yII = balY + 8 + val(1) * k;
    S.add(condEnd(xL, yIII, { fill: colC }) + condEnd(xL, yII, { fill: colC }));
    S.top(vd(xD, yIII, balY, `III. ≥ ${m2(val(2))} m`, { color: C.acc, size: 11.5, left: true, ext: xL }));
    S.top(vd(xD, balY + 8, yII, `II. ≥ ${m2(val(1))} m`, { color: C.acc, size: 11.5, left: true, ext: xL }));
    S.key("Υπερκείμενοι αγωγοί: κατακόρυφα πάνω από το δάπεδο εξώστη / σκάλας υπηρεσίας (III)", { x: xL, y: yIII, lx: xL - 30, ly: yIII - 30, color: colC });
    S.key("Υποκείμενοι αγωγοί: κατακόρυφα κάτω από το δάπεδο του εξώστη (II)", { x: xL, y: yII, lx: xL - 30, ly: yII + 30, color: colC });
    // οριζόντια από κτίριο με ταράτσα (VII ΧΤ / V ΜΤ)
    const hv2 = kind === "MT" ? val(4) : val(6);
    S.add(line(bx + bw + 2, by + 60, bx + bw + 2, by + 150, { stroke: "#4b5f6d", w: 1, dash: "3 3" }));
    S.add(condEnd(bx + bw + 2 + hv2 * k, by + 110, { fill: colC }));
    S.top(hd(by + 136, bx + bw + 2, bx + bw + 2 + hv2 * k, `${kind === "MT" ? "V" : "VII"}. ≥ ${m2(hv2)} m`, { color: C.acc, size: 11.5, below: true, ext: by + 110 }));
    if (kind !== "MT") S.key("Οριζόντια από κτίριο με ταράτσα (VII)", { x: bx + bw + 2 + hv2 * k, y: by + 110, lx: bx + bw + 2 + hv2 * k + 30, ly: by + 80, color: colC });
    if (kind === "MT") {
      S.note("C-7 – Αγωγοί Μέσης Τάσεως: κατακόρυφα πάνω από στέγη / δάπεδο / στηθαίο εξώστη 3,00 m, κάτω από δάπεδο εξώστη 2,50 m, οριζόντια από κτίριο ή εξώστη 2,50 m.", C.text);
      S.note("ΟΔ.38 §1.2: για γραμμές 15 kV κατασκευασμένες πριν από τους ΚΕΣΥΓΗΕ (6.10.67 / 25.7.69) επιτρέπεται οριζόντια απόσταση 2,00 m από κτίρια.");
    } else {
      S.note(`C-8 / C-9 – Γυμνοί αγωγοί ΧΤ: 2,50 m κατακόρυφα (I–IV), οριζόντια 1,25 m (V–VII)· κατά ΚΕΣΥΓΗΕ ελάχιστο ${m2(val(8))} m μόνο όπου δεν είναι τεχνικά δυνατή η 1,25 m (ΟΔ.38 §1.1).`, C.text);
      S.note(`Καλώδιο ΧΤ με γειωμένο μεταλλικό μανδύα ή συγκεντρικό γειωμένο αγωγό: πάνω από την κορυφή επικλινούς στέγης (κεραμίδια / ελενίτ) η απόσταση μπορεί να ελαττωθεί σε ${m2(val(7))} m.`);
    }
    addNotes(S, c.notes);
    return S.render(kind === "MT" ? "Ελάχιστες αποστάσεις αγωγών ΜΤ από κτίρια (C-7)" : "Ελάχιστες αποστάσεις γυμνών αγωγών ΧΤ από κτίρια (C-8 / C-9)");
  }

  // ---------------------------------------------------------------- 4. Επιτοίχια καλώδια (C-12)
  function drawWall() {
    const c = CL.wall_cables, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const W = 900, Hd = 470, G = 430, k = 56;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const bx = 150, bw = 640, by = 44;
    S.add(rect(bx, by, bw, G - by, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 }));
    // παράθυρο στο μέσο, εξώστης δεξιά (χαμηλότερα από το καλώδιο κατά ≥ 0,90 m)
    const wx = 380, wy = 200, ww = 110, wh = 100;
    S.add(rect(wx, wy, ww, wh, { fill: "#162633", stroke: "#8fb4c4", w: 1.5 }) + line(wx + ww / 2, wy, wx + ww / 2, wy + wh, { stroke: "#8fb4c4", w: 1 }) + line(wx, wy + wh / 2, wx + ww, wy + wh / 2, { stroke: "#8fb4c4", w: 1 }));
    const yH = wy - val(1) * k;                              // οριζόντιος κλάδος: ≥ 0,15 m πάνω από το άνοιγμα
    const ex = 600, ew = 150, railTop = yH + val(2) * k, ey = railTop + 44;
    S.add(rect(ex, ey, ew, 10, { fill: "#3a4b57", stroke: "#4b5f6d", w: 1.5 }) + rect(ex, railTop, ew, ey - railTop, { fill: "none", stroke: "#4b5f6d", w: 1.2 }));
    for (let i = 1; i < 6; i++) S.add(line(ex + i * ew / 6, railTop, ex + i * ew / 6, ey, { stroke: "#4b5f6d", w: 1 }));
    S.add(person(ex + ew / 2 + 20, ey, { h: 32 }));
    // στύλος δικτύου αριστερά και καλώδιο προς το κτίριο
    S.add(poleG(60, 120, G, { arm: false }) + wire(60, 140, bx, yH, 8, { stroke: C.warn, w: 2.6 }));
    // οριζόντιος κλάδος κατά μήκος της όψης, κάθοδος αριστερά του παραθύρου, κιβώτιο μετρητή, σωλήνας κάτω από 2,50 m
    const xV = wx - val(3) * k, yBox = G - 1.5 * k, yPipe = G - val(0) * k;
    S.add(line(bx, yH, ex + ew + 20, yH, { stroke: C.warn, w: 3 }));
    S.add(line(xV, yH, xV, yBox, { stroke: C.warn, w: 3 }));
    S.add(rect(xV - 6, yPipe, 12, yBox - yPipe, { fill: "rgba(143,180,196,0.28)", stroke: "#8fb4c4", w: 1.2 }));
    S.add(rect(xV - 14, yBox, 28, 34, { fill: "#1c2c38", stroke: C.ok, w: 1.2 }));
    S.add(person(bx + 80, G, { h: 34 }));
    // διαστάσεις – σε ελεύθερες θέσεις, με γραμμές προέκτασης
    S.top(vd(wx + ww + 26, yH, wy, `≥ ${m2(val(1))} m`, { color: C.acc, size: 11.5, ext: wx + ww, ly: yH - 18 }));
    S.top(hd(wy + wh + 24, xV, wx, `≥ ${m2(val(3))} m`, { color: C.acc, size: 11.5, below: true, ext: wy + wh }));
    S.top(vd(ex + ew + 36, yH, railTop, `≥ ${m2(val(2))} m`, { color: C.acc, size: 11.5, ext: ex + ew }));
    S.top(vd(xV - 50, yPipe, G, `≥ ${m2(val(0))} m`, { color: C.acc, size: 11.5, left: true, ext: xV - 6 }));
    S.key("Καλώδιο παροχής επιτοίχιο: οριζόντιος κλάδος κατά μήκος της όψης, πάνω από τα ανοίγματα", { x: bx + 60, y: yH, lx: bx + 60, ly: yH - 36, color: C.warn });
    S.key(`Διέλευση πάνω από παράθυρο / άνοιγμα: ≥ ${m2(val(1))} m`, { x: wx + ww / 2, y: wy, lx: wx + ww / 2 + 90, ly: wy - 40 });
    S.key(`Κάθοδος (κατακόρυφος κλάδος) πλευρικά από το άνοιγμα: ≥ ${m2(val(3))} m· κάτω / πλευρικά από παράθυρα και εξώστες ≥ ${m2(val(2))} m – αλλιώς μονωτικός προφυλακτήρας (α < 0,90 m)`, { x: xV, y: wy + 60, lx: xV - 70, ly: wy + 36, color: C.warn });
    S.key(`Εξώστης: το καλώδιο ≥ ${m2(val(2))} m από το κιγκλίδωμα / άκρο· με μονωτικό προφυλακτήρα ≥ ${m2(val(4))} m από το άκρο ή κατακόρυφα από το δάπεδο`, { x: ex + ew / 2 - 30, y: ey + 4, lx: ex + ew / 2 - 30, ly: ey + 40 });
    S.key(`Κάτω από ${m2(val(0))} m από το έδαφος: μηχανική προστασία (σωλήνας) έως το κιβώτιο μετρητή`, { x: xV - 6, y: yPipe + 8, lx: xV - 34, ly: yPipe - 16, color: C.dim });
    S.key("Κιβώτιο μετρητή", { x: xV + 14, y: yBox + 17, lx: xV + 56, ly: yBox + 52, color: C.ok });
    S.note(`C-12: ύψος απροστάτευτου επιτοίχιου καλωδίου ≥ ${m2(val(0))} m· πάνω από ανοίγματα ${m2(val(1))} m· κάτω / πλευρικά από παράθυρα και εξώστες ${m2(val(2))} m (αλλιώς μονωτικός προφυλακτήρας)· άκρο εξώστη ${m2(val(4))} m με προφυλακτήρα. Σχήμα μιμικό.`, C.text);
    addNotes(S, c.notes);
    return S.render("Ελάχιστες αποστάσεις επιτοίχιων καλωδίων (C-12)");
  }

  // ---------------------------------------------------------------- 5. Σιδηροδρομικές γραμμές (C-10 / C-11)
  function drawRailways() {
    const c = CL.railways, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const W = 900, Hd = 440, G = 380, k = 28, yOf = m => G - m * k;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    // έρμα και σιδηροτροχιές (τομή κάθετα στη γραμμή)
    const r1 = 400, r2 = 500, railTop = G - 22;
    S.add(poly([[r1 - 30, G], [r1, G - 14], [r2, G - 14], [r2 + 30, G]], { fill: "#5a5248", stroke: "#776d60", w: 1 }));
    for (let i = 0; i < 4; i++) S.add(rect(r1 + 6 + i * 24, G - 20, 16, 6, { fill: "#4b3b2a", stroke: "none", w: 0 }));
    S.add(line(r1, G - 20, r2, G - 20, { stroke: "#c0c6cc", w: 3 }));
    // στύλοι εκατέρωθεν σε απόσταση ≥ 4 m από την πλησιέστερη σιδηροτροχιά, επίτονοι ≥ 4 m
    const pxL = r1 - val(3) * k, pxR = r2 + val(3) * k;
    S.add(poleG(pxL, yOf(10.6), G, {}) + poleG(pxR, yOf(10.6), G, {}));
    S.top(hd(G - 36, pxL + 4, r1, `III. ≥ ${m2(val(3))} m`, { color: C.acc, size: 11.5, ext: G - 20 }));
    const gx = pxL - 4 - val(4) * k;
    S.add(line(pxL - 4, yOf(9.8), gx, G, { stroke: "#8fb4c4", w: 1.5 }));
    S.top(hd(G - 12, gx, pxL - 4, `IV. ≥ ${m2(val(4))} m`, { color: C.dim, size: 10.5, below: true }));
    // αγωγοί ΜΤ (άνω) και ΧΤ (κάτω), επίτονοι / καλώδια σε σύρμα αναρτήσεως
    const yMT = railTop - val(2) * k, yXT = railTop - val(0) * k, yG2 = railTop - val(1) * k;
    S.add(wire(pxL, yMT - 26, pxR, yMT - 26, 13, { stroke: C.line, w: 2.4 }));
    S.add(wire(pxL, yXT - 20, pxR, yXT - 20, 10, { stroke: C.warn, w: 2.4 }));
    S.top(vd(560, yMT, railTop, `II. ≥ ${m2(val(2))} m`, { color: C.acc, size: 12, ext: 450, ly: yMT + 40, left: true }));
    S.top(vd(340, yXT, railTop, `I. ≥ ${m2(val(0))} m`, { color: C.warn, size: 12, ext: 450, ly: yXT + 40 }));
    S.add(line(640, yG2, 760, yG2, { stroke: C.dim, w: 1.2, dash: "5 4" }));
    S.top(vd(760, yG2, railTop, `${m2(val(1))} m`, { color: C.dim, size: 11, ly: yG2 + 30 }));
    S.top(hd(yOf(11.6), pxL, pxR, "άνοιγμα διασταυρώσεως ≤ 50 m (σύσταση)", { color: C.dim, size: 11 }));
    S.key("Αγωγοί ΜΤ: κατακόρυφα πάνω από την άνω επιφάνεια της σιδηροτροχιάς (II)", { x: 450, y: yMT - 26, lx: 380, ly: yMT - 50 });
    S.key("Αγωγοί ΧΤ και σύρματα επιτόνων πάνω από τη σιδηροτροχιά (I)", { x: 520, y: yXT - 16, lx: 600, ly: yXT - 52, color: C.warn });
    S.key(`Επίτονοι και καλώδια αναρτημένα σε σύρμα αναρτήσεως: μπορεί να ελαττωθεί σε ${m2(val(1))} m`, { x: 700, y: yG2, lx: 800, ly: yG2 - 30, color: C.dim });
    S.key("Σιδηροδρομική γραμμή – οι αποστάσεις από την άνω επιφάνεια της σιδηροτροχιάς", { x: 450, y: G - 20, lx: 450, ly: G + 24 });
    S.key("Στύλοι εκατέρωθεν ≥ 4,00 m από την πλησιέστερη σιδηροτροχιά – κατά προτίμηση περισσότερο από το ύψος του στύλου (III)· επίτονοι ≥ 4,00 m (IV)", { x: pxL, y: G - 60, lx: pxL - 46, ly: G - 90 });
    addNotes(S, c.notes);
    S.note("Στη διασταύρωση με σιδηρόδρομο απαιτείται κλάση κατασκευής Α (C-1) – βλ. και C-16 / C-17 (αλλαγή κλάσεως). Σχήμα μιμικό.");
    return S.render("Ελάχιστες αποστάσεις σε διασταυρώσεις σιδηροδρομικών γραμμών (C-10 / C-11)");
  }

  // ---------------------------------------------------------------- 6. Χώρος αναρριχήσεως (C-13) – κάτοψη
  function drawClimbing() {
    const c = CL.climbing, it = c.items;
    const W = 900, Hd = 330;
    const S = new Scene(W, Hd);
    const sq = (cx, cy, size, dims, col, title) => {
      const half = size / 2;
      S.add(rect(cx - half, cy - half, size, size, { fill: "rgba(56,189,248,0.08)", stroke: col, w: 2, dash: "7 5" }));
      S.add(circ(cx, cy, 14, { fill: "#5b6770", stroke: "#8a98a3", w: 1.5 }));
      // βραχίονας και αγωγοί (κάτοψη) έξω από τον χώρο
      S.add(line(cx - half - 30, cy - half - 14, cx + half + 30, cy - half - 14, { stroke: "#8a98a3", w: 4 }));
      [-0.8, 0, 0.8].forEach(f => S.add(circ(cx + f * (half + 10), cy - half - 14, 5, { fill: C.warn, stroke: "#000", w: 1 })));
      S.top(hd(cy + half + 18, cx - half, cx + half, dims, { color: col, size: 12, below: true }));
      S.top(vd(cx - half - 18, cy - half, cy + half, dims.split(" ")[0] + " cm", { color: col, size: 11, left: true }));
      S.add(person(cx + 16, cy + half - 6, { h: 26, fill: "#dfe6ea" }));
      S.top(pill(cx, cy - half - 34, title, { anchor: "middle", size: 12.5, fill: col, bold: true }));
    };
    const mt = it[0] ? it[0][1] : "90 × 90", xt = it[1] ? it[1][1] : "76 × 76";
    sq(240, 175, 150, mt + " cm", C.line, `Μέση Τάση – ${mt} cm`);
    sq(640, 175, 127, xt + " cm", C.warn, `Χαμηλή Τάση – ${xt} cm`);
    S.key("Στύλος (κάτοψη)", { x: 240, y: 175, lx: 300, ly: 120 });
    S.key("Ελεύθερος χώρος αναρριχήσεως – οριζόντιες διαστάσεις (κανένας αγωγός, καλώδιο ή εξάρτημα μέσα στον χώρο)", { x: 240 - 60, y: 175 + 60, lx: 140, ly: 280 });
    S.key("Βραχίονας και αγωγοί έξω από τον χώρο αναρριχήσεως", { x: 640 + 60, y: 175 - 63.5 - 14, lx: 760, ly: 70, color: C.warn });
    S.note("C-13: ο χώρος αναρριχήσεως σε κάθε στύλο πρέπει να μένει ελεύθερος από αγωγούς, καλώδια και εξαρτήματα ώστε ο τεχνίτης να αναρριχάται με ασφάλεια. Σχήμα μιμικό (κάτοψη).", C.text);
    return S.render("Ελάχιστες οριζόντιες διαστάσεις χώρου αναρριχήσεως – κάτοψη στύλου (C-13)");
  }

  // ---------------------------------------------------------------- 7. Επικλινή εδάφη (C-14)
  function drawSlopes(st) {
    const c = CL.slopes, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const veh = st.acc !== "PED", a = veh ? val(0) : val(1), hor = val(2);
    const W = 900, Hd = 430;
    const S = new Scene(W, Hd);
    // πρανές: από (120, 400) ανεβαίνει προς (560, 130) και συνεχίζει επίπεδο
    const slope = [[0, 400], [120, 400], [560, 130], [900, 130]];
    S.add(path(`M${slope.map(p => p.join(",")).join(" L")} L900,${Hd} L0,${Hd} Z`, { fill: C.ground, stroke: "none", w: 0 }) + path(`M${slope.map(p => p.join(",")).join(" L")}`, { stroke: "#7a6a4a", w: 2.5 }));
    S.add(tree(700, 130, { h: 36 }) + tree(820, 130, { h: 30 }));
    if (veh) S.add(car(230, 332, { w: 52 })); else S.add(person(230, 332, { h: 34 }));
    // στύλοι στα δύο άκρα και αγωγός ΜΤ παράλληλος με το πρανές
    S.add(poleG(90, 90, 400, {}) + poleG(820, 20, 130, {}));
    const yA = 102, yB = 32;
    S.add(wire(90, yA, 820, yB, 100, { stroke: C.line, w: 2.4 }));
    // σημείο ελέγχου στο πρανές
    const px = 400, gy = 400 - (px - 120) * (270 / 440);
    const t = (px - 90) / (820 - 90), cy = (1 - t) * (1 - t) * yA + 2 * (1 - t) * t * ((yA + yB) / 2 + 200) + t * t * yB;
    S.add(condEnd(px, cy, { fill: C.line, r: 5 }));
    S.top(vd(px, cy, gy, `α ≥ ${m2(a)} m`, { color: C.warn, size: 13 }));
    const gx = 120 + (400 - cy) * (440 / 270);
    S.top(hd(cy - 24, px, gx, `≥ ${m2(hor)} m`, { color: C.acc, size: 12, ext: cy }));
    S.key(veh ? "Γραμμή προσιτή σε οχήματα: α = 6,00 m κατακόρυφα από το κατώτερο σημείο του αγωγού έως το έδαφος" : "Γραμμή προσιτή μόνο σε πεζούς: α = 4,50 m κατακόρυφα από το κατώτερο σημείο του αγωγού έως το έδαφος", { x: px, y: cy, lx: px - 70, ly: cy - 40, color: C.warn });
    S.key("Εναλλακτικά: οριζόντια απόσταση ≥ 2,50 m από το πρανές (στη στάθμη του αγωγού)", { x: gx, y: cy - 24, lx: gx + 50, ly: cy - 56 });
    S.key("Αγωγοί γραμμής ΜΤ παράλληλα με το πρανές", { x: 600, y: 36, lx: 660, ly: 70 });
    S.note("C-14: η κατασκευή είναι κανονική εφόσον τηρείται η μία από τις δύο αποστάσεις – 2,50 m οριζόντια από το πρανές ή α κατακόρυφα (6,00 m οχήματα / 4,50 m μόνο πεζοί). Ισχύουν οι σημειώσεις της C-2. Σχήμα μιμικό.", C.text);
    addNotes(S, c.notes);
    return S.render("Ελάχιστες αποστάσεις αγωγών γραμμών ΜΤ σε επικλινή εδάφη (C-14)");
  }

  // ---------------------------------------------------------------- 8. Στύλοι από υπεραστικές οδούς (C-15 / C-15A / C-15B)
  function c15calc(st) {
    const c15 = CL.poles_roads.c15b, cv = c15.curves[+st.road || 0] || c15.curves[0];
    const h = Math.max(c15.h_min, Math.min(c15.h_max, parseFloat(String(st.h).replace(",", ".")) || 0));
    const A = cv.A0 - c15.slope * Math.min(h, c15.h_max), AE = cv.AE0 - c15.slope * Math.min(h, c15.h_max);
    return { cv, h, A, AE };
  }
  function drawPolesRoads(st) {
    const c = CL.poles_roads, it = c.items, val = i => (it[i] ? it[i][1] : null), r = c15calc(st);
    const W = 900, Hd = 540, k = 22;
    const S = new Scene(W, Hd);
    // --- Α. με στηθαίο ασφαλείας (αριστερά)
    const G1 = 226, kA = 60;
    S.add(rect(0, G1, 440, 30, { fill: C.ground, stroke: "none", w: 0 }) + line(0, G1, 440, G1, { stroke: "#7a6a4a", w: 2 }));
    S.add(roadBand(20, 250, G1, { center: true }) + car(120, G1, { w: 52 }));
    S.add(line(250, G1 - 2, 250, G1 + 10, { stroke: "#fff", w: 2 }));
    const gx = 250 + val(1) * kA;
    S.add(rect(gx - 3, G1 - 26, 6, 26, { fill: "#8a98a3", stroke: "none", w: 0 }) + rect(gx - 6, G1 - 30, 12, 10, { fill: "#c0c6cc", stroke: "#8a98a3", w: 1 }));
    const px = gx + val(0) * kA;
    S.add(poleG(px, 90, G1, {}));
    S.top(hd(G1 - 48, 250, gx - 3, `≥ ${m2(val(1))} m`, { color: C.dim, size: 11, ext: G1 }));
    S.top(hd(G1 - 72, gx + 3, px - 4, `≥ ${m2(val(0))} m`, { color: C.warn, size: 12, ext: G1 - 30 }));
    S.top(pill(20, 48, "Α. Με στηθαίο ασφαλείας (C-15)", { size: 12.5, fill: C.acc, bold: true }));
    S.key("Οριογραμμή οδοστρώματος", { x: 250, y: G1 + 8, lx: 250, ly: G1 + 24 });
    S.key(`Στηθαίο ασφαλείας ≥ ${m2(val(1))} m από την οριογραμμή· στύλος ≥ ${m2(val(0))} m πίσω από το στηθαίο`, { x: gx, y: G1 - 30, lx: gx - 40, ly: G1 - 100, color: C.warn });
    // --- Β. χωρίς στηθαίο, πρανές (δεξιά): ανάντη 2,00 / κατάντη 7,00
    const G2 = 226;
    S.top(pill(470, 48, "Β. Χωρίς στηθαίο – υψομετρική διαφορά πρανούς (C-15)", { size: 12.5, fill: C.acc, bold: true }));
    const prof = [[460, 150], [540, 150], [600, G2], [760, G2], [860, G2 + 36], [900, G2 + 36]];
    S.add(path(`M${prof.map(p => p.join(",")).join(" L")} L900,266 L460,266 Z`, { fill: C.ground, stroke: "none", w: 0 }) + path(`M${prof.map(p => p.join(",")).join(" L")}`, { stroke: "#7a6a4a", w: 2 }));
    S.add(roadBand(600, 760, G2, { center: true }) + car(680, G2, { w: 50 }));
    const upx = 600 - val(2) * k, upG = upx <= 540 ? 150 : 150 + (upx - 540) * (76 / 60);
    S.add(poleG(upx, 90, upG, {}));
    S.top(hd(G2 - 62, upx + 4, 600, `≥ ${m2(val(2))} m`, { color: C.warn, size: 12, ext: G2 }));
    const dnx = 760 + val(3) * k * 0.8;
    S.add(poleG(dnx, 110, G2 + 36, {}));
    S.top(hd(G2 - 62, 760, dnx - 4, `≥ ${m2(val(3))} m`, { color: C.warn, size: 12, ext: G2 }));
    S.key("Ανάντη πρανές (όρυγμα – έδαφος ψηλότερα από την οδό): στύλος ≥ 2,00 m από την οριογραμμή", { x: upx, y: upG - 20, lx: upx - 24, ly: 190, color: C.warn });
    S.key("Κατάντη πρανές (επίχωμα – έδαφος χαμηλότερα): στύλος ≥ 7,00 m από την οριογραμμή", { x: dnx, y: G2 + 20, lx: dnx - 50, ly: G2 + 60, color: C.warn });
    // --- Γ. χωρίς στηθαίο, ομαλό έδαφος (C-15A / C-15B) – υπολογισμός Α
    const G3 = 470;
    S.top(pill(20, 304, "Γ. Χωρίς στηθαίο – ομαλό έδαφος: κρίσιμη απόσταση Α (C-15A / C-15B)", { size: 12.5, fill: C.acc, bold: true }));
    S.top(pill(20, 322, `${r.cv.label} · h = ${fmt2(r.h)} m (${r.h > 0 ? "εμπόδιο ψηλότερα από την οδό" : r.h < 0 ? "εμπόδιο χαμηλότερα από την οδό" : "ίδιο επίπεδο"})`, { size: 10.5, fill: C.muted }));
    S.add(rect(0, G3, W, 30, { fill: C.ground, stroke: "none", w: 0 }) + line(0, G3, W, G3, { stroke: "#7a6a4a", w: 2 }));
    S.add(roadBand(20, 330, G3, { center: true }) + car(170, G3, { w: 56 }));
    S.add(line(330, G3 - 2, 330, G3 + 10, { stroke: "#fff", w: 2 }));
    const kk = Math.min(36, 520 / Math.max(r.A, r.AE, 1)), pxA = Math.min(330 + r.A * kk, 860), pxE = 330 + r.AE * kk;
    S.add(poleG(pxA, 350, G3, {}));
    S.top(hd(G3 - 42, 330, pxA, `Α ≥ ${fmt2(r.A)} m`, { color: C.warn, size: 13, ext: G3 }));
    if (pxE <= 880) { S.add(rect(pxE - 10, G3 - 34, 20, 34, { fill: "#3b4a55", stroke: "#8fb4c4", w: 1 })); S.top(hd(G3 - 80, 330, pxE - 10, `ΑΕ ≥ ${fmt2(r.AE)} m`, { color: C.dim, size: 12, ext: G3 - 34 })); S.key("Εμπόδιο (τοιχίο, κιβώτιο κ.λπ.): κρίσιμη απόσταση ΑΕ", { x: pxE, y: G3 - 34, lx: pxE + 20, ly: G3 - 110, color: C.dim }); }
    else S.top(tag(560, G3 - 90, `ΑΕ (εμπόδιο) ≥ ${fmt2(r.AE)} m`, { fill: C.dim, size: 11 }));
    S.key("Στύλος: κρίσιμη απόσταση Α από την οριογραμμή κατά την κατηγορία της οδού (C-15B)", { x: pxA, y: 360, lx: pxA - 60, ly: 350, color: C.warn });
    S.note(`C-15B: Α(h) ≈ Α₀ − ${fmt2(c.c15b.slope)}·h για ${c.c15b.h_min} ≤ h ≤ +${c.c15b.h_max} m (σταθερή για h ≥ +3 m)· Α₀ = ${r.cv.A0} m, ΑΕ₀ = ${r.cv.AE0} m για την κατηγορία. Οι στύλοι ποτέ στο κατάστρωμα· αναφορά στο οριστικό πλάτος της οδού (ΔΜΕΟ/612/2011, ΦΕΚ 702/Β/2011). Σχήματα μιμικά.`, C.text);
    return S.render("Ελάχιστες αποστάσεις στύλων από υπεραστικές οδούς (C-15 / C-15A / C-15B)");
  }

  // ---------------------------------------------------------------- 9. Διαχωρισμοί στον στύλο (C-18 / C-19)
  function drawPoleSep(st) {
    const c = CL.pole_separations, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const own = st.tel === "OWN", guy = st.guy === "YES";
    const W = 900, Hd = 490, G = 448, k = 44, sp = 16;       // sp: εξογκωμένη απόσταση ΧΤ – ΧΤ (0,16 m) για να διαβάζεται
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const x = 430, top = 46;
    S.add(rect(x - 7, top, 14, G - top, { fill: "#5b6770", stroke: "#8a98a3", w: 1 }));
    const arm = y => { S.add(line(x - 100, y, x + 100, y, { stroke: "#8a98a3", w: 4 })); [-85, 0, 85].forEach(dx => { S.add(insulator(x + dx, y)); S.add(condEnd(x + dx, y - 20, { fill: C.line, r: 4 })); }); };
    const yMT1 = top + 34, yMT2 = yMT1 + val(0) * k, yCond = yMT2 - 20;     // yCond: στάθμη αγωγών ΜΤ του 2ου βραχίονα
    arm(yMT1); arm(yMT2);
    // ΧΤ: 4 αγωγοί κατακόρυφα σε στηρίγματα δεξιά του στύλου, 1,20 m (ή 2,30 m με επίτονο ΜΤ) κάτω από το κέντρο του βραχίονα ΜΤ
    const gapMTXT = guy ? val(2) : val(1), yXT = yMT2 + gapMTXT * k, yXTlow = yXT + 3 * sp;
    for (let i = 0; i < 4; i++) { const y = yXT + i * sp; S.add(line(x + 7, y, x + 30, y, { stroke: "#8a98a3", w: 3 })); S.add(condEnd(x + 34, y, { fill: C.warn, r: 4 })); }
    // στήλη διαστάσεων δεξιά (ελεύθερη ζώνη) με γραμμές προέκτασης από τα άκρα των βραχιόνων
    const xd = 640;
    S.top(vd(xd, yMT1, yMT2, `I. ≥ ${m2(val(0))} m`, { color: C.acc, size: 12, ext: x + 100 }));
    S.top(vd(xd, yMT2, yXT, `${guy ? "II" : "I"}. ≥ ${m2(gapMTXT)} m`, { color: C.acc, size: 12, ext: x + 100 }));
    S.key("Βραχίονες ΜΤ – απόσταση I μεταξύ των κέντρων των βραχιόνων", { x: x - 100, y: yMT1, lx: x - 150, ly: yMT1 - 20 });
    S.key(guy ? "Κέντρο βραχίονα ΜΤ – ανώτερος αγωγός ΧΤ σε μικτή γραμμή με επίτονο ΜΤ (II)" : "Κέντρο βραχίονα ΜΤ – ανώτερος αγωγός ΧΤ (I)", { x: x + 34, y: yXT, lx: x + 110, ly: yXT - 26, color: C.warn });
    // VI: μικρές αποστάσεις (εξογκωμένες) – ενδείξεις
    S.top(hd(yCond - 14, x + 7, x + 7 + 0.15 * k * 3, "", { color: C.dim }));
    S.key(`VI. Αγωγός ΜΤ – επιφάνεια στύλου ≥ ${m2(val(5))} m (0,32 m για 20 kV με κατασκευή Ρ-3Β)`, { x: x + 20, y: yCond - 14, lx: x + 60, ly: yCond - 44, color: C.dim });
    S.top(vd(x + 70, yXT, yXT + sp, "", { color: C.dim }) + hd(yXT - 12, x + 7, x + 34, "", { color: C.dim }));
    S.key(`VI. Αγωγοί ΧΤ μεταξύ τους (κατακόρυφα) ≥ ${m2(val(6))} m · αγωγός ΧΤ – επιφάνεια στύλου ≥ ${m2(val(7))} m`, { x: x + 70, y: yXT + sp / 2, lx: x + 110, ly: yXT + 2 * sp + 10, color: C.dim });
    // επίτονος: ένας επίτονος από τον στύλο (κάτω από τον 2ο βραχίονα ΜΤ) έως το έδαφος· ο μονωτήρας του ανάμεσα στις δύο στάθμες –
    // ΚΑΤΩ από «αγωγοί ΜΤ − 0,40 m» (IV) και ΠΑΝΩ από «ανώτερος αγωγός ΧΤ + 0,30 m» (V)
    const gy1 = yMT2 + 8, gxEnd = 100;
    S.add(line(x - 7, gy1, gxEnd, G, { stroke: "#8fb4c4", w: 1.6 }));
    const lvlMT = yCond + val(3) * k, lvlXT = yXT - val(4) * k;
    const insY = (lvlMT + lvlXT) / 2, insX = x - 7 - (insY - gy1) / (G - gy1) * (x - 7 - gxEnd);
    S.add(guyIns(insX, insY, {}));
    S.add(line(150, lvlMT, x - 7, lvlMT, { stroke: C.acc, w: 1, dash: "5 4" }) + line(150, lvlXT, x - 7, lvlXT, { stroke: C.warn, w: 1, dash: "5 4" }));
    S.top(vd(236, yCond, lvlMT, `IV. ≥ ${m2(val(3))} m`, { color: C.acc, size: 11.5, left: true, ext: x - 100 }));
    S.top(vd(290, lvlXT, yXT, `V. ≥ ${m2(val(4))} m`, { color: C.warn, size: 11.5, left: true, ext: x - 7 }));
    S.key("Μονωτήρας επιτόνου: ΚΑΤΩ από τη στάθμη «αγωγοί ΜΤ − 0,40 m» (IV) και ΠΑΝΩ από τη στάθμη «ανώτερος αγωγός ΧΤ + 0,30 m» (V) – ώστε σε θραύση του επιτόνου να μείνει κάτω από τους αγωγούς ΜΤ και πάνω από τους ΧΤ", { x: insX, y: insY, lx: insX - 70, ly: insY + 50, color: C.dim });
    S.top(pill(110, G - 10, "επίτονος", { size: 10, fill: C.muted }));
    // τηλεπικοινωνίες (VII Ο.Τ.Ε. / VIII ίδια επιχείρηση) και καλώδιο παροχής
    const telMT = own ? val(11) : val(8), telXT = own ? val(12) : val(9), telSup = own ? val(13) : val(10);
    const yTel = yXTlow + telXT * k;
    S.add(line(x + 7, yTel, x + 230, yTel, { stroke: "#9ca3af", w: 2.5, dash: "9 5" }));
    S.top(vd(560, yXTlow, yTel, `${own ? "VIII" : "VII"}. ≥ ${m2(telXT)} m`, { color: C.acc, size: 11.5, ext: x + 34 }));
    S.key(own ? "Γραμμή τηλεπικοινωνίας της ίδιας επιχείρησης (ΔΕΔΔΗΕ) – VIII: κατώτερος αγωγός ΧΤ – τηλεπικοινωνία" : "Γραμμή τηλεπικοινωνίας άλλης επιχείρησης (Ο.Τ.Ε.) – VII: κατώτερος αγωγός ΧΤ – τηλεπικοινωνία", { x: x + 230, y: yTel, lx: x + 270, ly: yTel + 22 });
    S.add(wire(x + 34, yXT + sp, 880, yXT + 3 * sp + 12, 6, { stroke: C.warn, w: 2 }));
    S.key(`Καλώδιο παροχής (από τους αγωγούς ΧΤ) – από τη γραμμή τηλεπικοινωνίας ≥ ${m2(telSup)} m (${own ? "VIII" : "VII"})`, { x: 800, y: yXT + 3 * sp + 4, lx: 840, ly: yXT - 10, color: C.warn });
    S.top(tag(890, G - 60, `ΜΤ – τηλεπικοινωνία: ≥ ${m2(telMT)} m (${own ? "VIII" : "VII"})`, { fill: C.acc, size: 11, anchor: "end" }));
    S.top(tag(890, G - 34, `καλώδιο παροχής – τηλεπικοινωνία: ≥ ${m2(telSup)} m (${own ? "VIII" : "VII"})`, { fill: C.warn, size: 11, anchor: "end" }));
    addNotes(S, c.notes);
    S.note("Οι μικρές αποστάσεις (VI) είναι σχεδιασμένες μεγεθυμένες για να διαβάζονται – σχήμα μιμικό, όχι υπό κλίμακα.");
    return S.render("Ελάχιστοι διαχωρισμοί αγωγών μεταξύ τους και από άλλα στοιχεία στον στύλο (C-18 / C-19)");
  }

  // ---------------------------------------------------------------- 10. Αγωγοί από στύλους άλλης γραμμής (C-20)
  function drawOtherPoles(st) {
    const c = CL.other_poles, ri = +st.row || 0, ci = +st.col || 0, v = c.rows[ri][1][ci];
    const W = 900, Hd = 370, G = 320;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const x = 580;
    S.add(poleG(x, 70, G, { arm: false }));
    S.add(line(x - 60, 110, x + 60, 110, { stroke: "#8a98a3", w: 4 }));
    [-50, 0, 50].forEach(dx => S.add(insulator(x + dx, 110)));
    S.key(`Στύλος άλλης γραμμής: ${c.rows[ri][0]} – η απόσταση μετριέται από την επιφάνεια του στύλου`, { x: x, y: 80, lx: x + 60, ly: 56 });
    // αγωγοί της δικής μας γραμμής περνούν δίπλα (τομή)
    const yc = 200, xc = 300;
    [0, 36, 72].forEach(dx => S.add(condEnd(xc - dx, yc, { fill: C.warn, r: 5 })));
    S.key(`Αγωγοί της γραμμής μας – ${c.cols[ci]} (τομή)· ο πλησιέστερος προς τον στύλο`, { x: xc - 72, y: yc, lx: xc - 120, ly: yc + 40, color: C.warn });
    const none = !v || v === "—";
    if (none) S.top(tag(xc + 20, yc - 30, "— (ίδια γραμμή / δεν προβλέπεται)", { fill: C.muted, size: 11 }));
    else S.top(hd(yc - 44, xc, x - 4, `≥ ${v} cm`, { color: C.warn, size: 14, ext: yc }));
    S.add(person(760, G, { h: 30 }));
    S.note("C-20: 16 °C, άπνοια· ισχύουν και κατά τις διασταυρώσεις. Σχήμα μιμικό.", C.text);
    addNotes(S, c.legend);
    return S.render(`Ελάχιστη απόσταση αγωγών ${c.cols[ci]} από ${c.rows[ri][0]} άλλης γραμμής (C-20)`);
  }

  // ---------------------------------------------------------------- 11. Αγωγοί άλλης γραμμής σε θέση εμπλοκής (C-21 / C-22)
  function drawOtherLines(st) {
    const c = CL.other_lines, ri = +st.row || 0, ci = +st.col || 0;
    let v = c.rows[ri][1][ci];
    const rowOf = name => c.rows.findIndex(r => r[0] === name), colOf = name => c.cols.indexOf(name);
    if (!v) { const r2 = rowOf(c.cols[ci]), c2 = colOf(c.rows[ri][0]); if (r2 >= 0 && c2 >= 0) v = c.rows[r2][1][c2]; }
    const W = 900, Hd = 380, G = 330;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    // γραμμή Α (ψηλότερη) αριστερά-πάνω, γραμμή Β χαμηλότερη δεξιά-κάτω
    S.add(poleG(120, 60, G, {}) + wire(120, 72, 520, 120, 16, { stroke: C.line, w: 2.4 }));
    S.add(poleG(780, 150, G, {}) + wire(780, 162, 380, 210, 14, { stroke: C.warn, w: 2.4 }));
    const ax = 430, ay = 118, bx = 470, by = 204;
    S.add(condEnd(ax, ay, { fill: C.line, r: 5 }) + condEnd(bx, by, { fill: C.warn, r: 5 }));
    S.add(line(ax, ay, bx, by, { stroke: C.acc, w: 1.6, dash: "6 4" }));
    S.add(line((ax + bx) / 2, (ay + by) / 2, 330, 290, { stroke: C.acc, w: 0.8, dash: "2 3" }));
    S.top(tag(60, 300, v ? `≥ ${v} cm (κατά οποιαδήποτε έννοια)` : "—", { fill: C.acc, size: 12.5 }));
    S.key(`Γραμμή Α: ${c.rows[ri][0]} – αγωγός στην ψηλότερη στάθμη`, { x: 300, y: 100, lx: 300, ly: 60 });
    S.key(`Γραμμή Β: ${c.cols[ci]} – αγωγός στη χαμηλότερη στάθμη`, { x: 620, y: 186, lx: 660, ly: 230, color: C.warn });
    S.key("Ελάχιστη απόσταση μεταξύ των πλησιέστερων αγωγών κατά οποιαδήποτε έννοια (όχι η κατακόρυφη στις διασταυρώσεις – αυτή κατά C-5)", { x: ax, y: ay, lx: ax - 60, ly: ay + 50 });
    S.add(person(230, G, { h: 30 }));
    addNotes(S, c.legend);
    S.note("Σχήμα μιμικό.");
    return S.render(`Ελάχιστη απόσταση αγωγών ${c.rows[ri][0]} – ${c.cols[ci]} σε θέση ενδεχόμενης εμπλοκής (C-21 / C-22)`);
  }

  // ---------------------------------------------------------------- 12. Κλάσεις κατασκευής (C-1)
  function drawClasses(st) {
    const c = CL.c1, ri = +st.row || 0, ci = +st.col || 0, v = c.rows[ri][1][ci];
    const W = 900, Hd = 360, G = 320;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    S.add(poleG(120, 70, G, {}) + poleG(780, 70, G, {}) + wire(120, 82, 780, 82, 30, { stroke: C.line, w: 2.6 }));
    S.key(`Γραμμή ενεργείας: ${c.cols[ci]}`, { x: 300, y: 90, lx: 260, ly: 56 });
    const lower = c.rows[ri][0];
    if (ri === 0) { S.add(poly([[330, G], [360, G - 14], [540, G - 14], [570, G]], { fill: "#5a5248", stroke: "#776d60", w: 1 }) + line(362, G - 20, 538, G - 20, { stroke: "#c0c6cc", w: 3 })); }
    else if (ri === 1) { S.add(roadBand(330, 570, G, { center: true }) + car(450, G, { w: 52 })); }
    else { S.add(line(320, 262, 580, 262, { stroke: ri === 5 ? "#9ca3af" : C.warn, w: 2.4, dash: ri === 5 ? "9 5" : "" }) + condEnd(450, 262, { fill: ri === 5 ? "#9ca3af" : C.warn })); }
    S.key(`Σε χαμηλότερη στάθμη / διασταυρώνεται: ${lower}`, { x: 450, y: ri <= 1 ? G - 14 : 262, lx: 600, ly: ri <= 1 ? G - 46 : 290, color: ri >= 2 ? C.warn : C.acc });
    const cls = String(v).replace(/\(1\)/, "").trim(), note1 = /\(1\)/.test(String(v));
    S.add(rect(290, 136, 320, 76, { fill: cls === "A" ? "rgba(255,92,108,0.18)" : "rgba(56,189,248,0.15)", stroke: cls === "A" ? C.no : C.acc, w: 2, rx: 10 }));
    S.add(txt(450, 170, `Κλάση ${cls}`, { anchor: "middle", size: 24, fill: cls === "A" ? C.no : C.acc, bold: true }));
    S.add(txt(450, 196, cls === "A" ? "ισχυρότερη κατασκευή – μεγαλύτεροι συντελεστές ασφαλείας" : "κανονική κατασκευή", { anchor: "middle", size: 10.5, fill: C.text }));
    if (note1) S.top(tag(16, 48, "(1) Δεν απαιτείται κλάση Α αν η τάση της γραμμής ενεργείας ≤ 5000 V ή αν αποτελείται από καλώδιο", { fill: C.warn, size: 11 }));
    S.note(c.intro, C.text);
    addNotes(S, c.notes);
    S.note("Σχήμα μιμικό.");
    return S.render("Κλάση κατασκευής γραμμής ενεργείας σε διασταυρώσεις / θέσεις εμπλοκής (C-1)");
  }

  // ---------------------------------------------------------------- 13. Αλλαγή κλάσεως κατασκευής (C-16 / C-17)
  function drawClassChange() {
    const c = CL.class_change;
    const W = 900, Hd = 380, G = 320;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    const xs = [60, 230, 400, 570, 740, 870];
    xs.forEach(x => S.add(poleG(x, 120, G, {})));
    for (let i = 0; i < xs.length - 1; i++) S.add(wire(xs[i], 132, xs[i + 1], 132, 10, { stroke: C.line, w: 2.4 }));
    S.top(pill(xs[1], 112, "Μ", { anchor: "middle", size: 12.5, fill: C.no, bold: true }) + pill(xs[4], 112, "Ν", { anchor: "middle", size: 12.5, fill: C.no, bold: true }));
    // σιδηρόδρομος / τηλεπικοινωνία στο μεσαίο άνοιγμα
    S.add(poly([[455, G], [470, G - 12], [500, G - 12], [515, G]], { fill: "#5a5248", stroke: "#776d60", w: 1 }) + line(472, G - 17, 498, G - 17, { stroke: "#c0c6cc", w: 3 }));
    S.key("Διασταυρούμενη γραμμή: σιδηρόδρομος ή γραμμή τηλεπικοινωνίας (κάθετη στο σχήμα)", { x: 485, y: G - 17, lx: 485, ly: G + 24 });
    // τμήμα κλάσεως Α
    S.add(rect(xs[1] - 6, 96, xs[4] - xs[1] + 12, G - 96, { fill: "rgba(255,92,108,0.08)", stroke: C.no, w: 1.5, dash: "8 5", rx: 6 }));
    S.top(pill((xs[1] + xs[4]) / 2, 90, "τμήμα ΜΝ κλάσεως Α", { anchor: "middle", size: 12, fill: C.no, bold: true }));
    S.top(hd(66, xs[1], xs[4], "ΜΝ ≤ 245 m", { color: C.no, size: 12 }));
    S.top(hd(G - 50, xs[1], 485, "≤ 150 m", { color: C.dim, size: 11 }) + hd(G - 50, 485, xs[4], "≤ 150 m", { color: C.dim, size: 11 }));
    S.top(hd(G - 84, xs[2], xs[3], "άνοιγμα διασταυρώσεως ≤ 50 m (σιδηρόδρομος)", { color: C.warn, size: 10.5 }));
    // επίτονοι προς τα έξω στα άκρα του τμήματος Α
    S.add(line(xs[1] - 4, 150, xs[1] - 60, G, { stroke: "#8fb4c4", w: 1.5 }) + line(xs[4] + 4, 150, xs[4] + 60, G, { stroke: "#8fb4c4", w: 1.5 }));
    S.key("Στύλοι Μ, Ν – άκρα του τμήματος κλάσεως Α: ΜΤ διπλή στήριξη ή τερματισμός, ΧΤ τερματισμός προς το τμήμα Α", { x: xs[1], y: 150, lx: xs[1] - 60, ly: 180, color: C.no });
    S.key("Επίτονοι προς τις αντίθετες πλευρές του τμήματος Α (στα Μ και Ν)", { x: xs[4] + 30, y: 236, lx: xs[4] + 70, ly: 210 });
    S.top(hd(G - 118, xs[2], 468, "3 – 5 m (τηλεπ.)", { color: C.dim, size: 10 }));
    S.key("Διασταύρωση ΜΤ με τηλεπικοινωνία: ο ένας στύλος του ανοίγματος 3 έως 5 m από τη διασταυρούμενη γραμμή", { x: 468, y: G - 118, lx: 500, ly: G - 150, color: C.dim });
    addNotes(S, c.notes);
    S.note("Σχήμα μιμικό.");
    return S.render("Αλλαγή κλάσεως κατασκευής σε διασταυρώσεις με σιδηροδρομικές γραμμές και τηλεπικοινωνίες (C-16 / C-17)");
  }

  // ---------------------------------------------------------------- 14. Ανεμόσκαλες πυροσβεστικής (C-23) – κάτοψη
  function drawLadders() {
    const c = CL.ladders, it = c.items, val = i => (it[i] ? it[i][1] : null);
    const W = 900, Hd = 380, k = 70;
    const S = new Scene(W, Hd);
    // κάτοψη: οικοδομική γραμμή στα x = 620 (κτίριο δεξιά), δρόμος αριστερά
    S.add(rect(0, 34, 620, 320, { fill: "#2b2b2b", stroke: "none", w: 0 }));
    S.add(rect(620, 34, 280, 320, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 }));
    S.add(line(620, 30, 620, 360, { stroke: "#c9d6dc", w: 1.5, dash: "6 4" }));
    S.key("Κτίριο με περισσότερους από 3 ορόφους ή ύψος > 15 m (κάτοψη)", { x: 760, y: 120, lx: 760, ly: 80 });
    S.key("Οικοδομική γραμμή", { x: 620, y: 300, lx: 660, ly: 330 });
    // ζώνη Α: αρχίζει σε απόσταση Γ ≤ 2,40 m από την οικοδομική γραμμή, πλάτος ≥ 1,80 m
    const xa2 = 620 - val(1) * k, xa1 = xa2 - val(0) * k;
    S.add(rect(xa1, 34, xa2 - xa1, 320, { fill: "rgba(74,222,128,0.14)", stroke: C.ok, w: 2, dash: "7 5" }));
    S.add(txt((xa1 + xa2) / 2, 150, "ΖΩΝΗ Α", { anchor: "middle", size: 16, fill: C.ok, bold: true }));
    S.top(hd(300, xa1, xa2, `Α ≥ ${m2(val(0))} m`, { color: C.ok, size: 12, below: true }));
    S.top(hd(262, xa2, 620, `Γ ≤ ${m2(val(1))} m`, { color: C.acc, size: 12, below: true }));
    // ζώνη Β: εναλλακτική ζώνη πιο έξω (π.χ. στο δρόμο)
    const xb2 = xa1 - 50, xb1 = xb2 - val(0) * k;
    S.add(rect(xb1, 34, xb2 - xb1, 320, { fill: "rgba(56,189,248,0.10)", stroke: C.acc, w: 1.5, dash: "4 4" }));
    S.add(txt((xb1 + xb2) / 2, 150, "ΖΩΝΗ Β", { anchor: "middle", size: 14, fill: C.acc, bold: true }));
    S.top(hd(300, xb1, xb2, `Β ≥ ${m2(val(0))} m`, { color: C.acc, size: 12, below: true }));
    S.key("Ζώνη Α: ελεύθερη από αγωγούς, πλάτους ≥ 1,80 m, αρχίζει σε απόσταση Γ ≤ 2,40 m από την οικοδομική γραμμή", { x: (xa1 + xa2) / 2, y: 170, lx: (xa1 + xa2) / 2, ly: 200, color: C.ok });
    S.key("Ζώνη Β: εναλλακτική ελεύθερη ζώνη πιο έξω (πλάτους ≥ 1,80 m)", { x: (xb1 + xb2) / 2, y: 170, lx: (xb1 + xb2) / 2, ly: 200 });
    // γραμμή ΧΤ/ΜΤ (κάτοψη) έξω από τη ζώνη, με στύλους
    const xl = xb1 - 60;
    S.add(line(xl, 34, xl, 354, { stroke: C.warn, w: 2.4 }));
    [90, 210, 330].forEach(y => S.add(circ(xl, y, 6, { fill: "#5b6770", stroke: "#8a98a3", w: 1 })));
    S.key("Γραμμή ΔΕΔΔΗΕ (στύλοι, κάτοψη) έξω από την ελεύθερη ζώνη", { x: xl, y: 150, lx: xl - 40, ly: 110, color: C.warn });
    // ανεμόσκαλα (σύμβολο) μέσα στη ζώνη Α
    S.add(rect((xa1 + xa2) / 2 - 22, 232, 44, 26, { fill: "#b91c1c", stroke: "#fca5a5", w: 1, rx: 3 }));
    S.key("Πυροσβεστικό όχημα – ανύψωση ανεμόσκαλας μέσα στην ελεύθερη ζώνη", { x: (xa1 + xa2) / 2, y: 245, lx: (xa1 + xa2) / 2 + 60, ly: 245, color: C.no });
    S.note("C-23: σε κτίρια με περισσότερους από 3 ορόφους ή ύψος > 15 m πρέπει να μένει ελεύθερη ζώνη (Α ή Β) πλάτους τουλάχιστον 1,80 m για την ανύψωση ανεμοσκαλών της πυροσβεστικής. Κάτοψη – μιμικό.", C.text);
    addNotes(S, c.notes);
    return S.render("Ελεύθερη ζώνη για ανεμόσκαλες πυροσβεστικής – κάτοψη (C-23)");
  }

  // ---------------------------------------------------------------- 15. Κολυμβητήρια (εγκύκλιος 1994)
  function drawPools(st) {
    const d = doc("egk_1994_1736"), tb = d && d.tables && d.tables[0], ci = +st.col || 0;
    const A = tb ? tb.rows[0][1 + ci] : "—", B = tb ? tb.rows[1][1 + ci] : "—", colName = tb ? tb.cols[1 + ci] : "";
    const Af = parseFloat(String(A).replace(",", ".")) || 5.5, Bf = parseFloat(String(B).replace(",", ".").replace(/\s*\(.*$/, "")) || 4.3;
    const W = 900, Hd = 470, G = 400, k = 30;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    // πισίνα (τομή)
    const px1 = 300, px2 = 620, depth = 56;
    S.add(rect(px1, G, px2 - px1, depth, { fill: "#0ea5e9", stroke: "#38bdf8", w: 1.5 }) + line(px1, G, px2, G, { stroke: "#7dd3fc", w: 2.5 }));
    S.add(person((px1 + px2) / 2 + 40, G - 2, { h: 26, fill: "#dfe6ea" }));
    // εξέδρα καταδύσεων
    const ex = px2 - 40, eh = 3.0 * k;
    S.add(rect(ex - 6, G - eh, 12, eh, { fill: "#5b6770", stroke: "#8a98a3", w: 1 }) + rect(ex - 50, G - eh - 6, 60, 6, { fill: "#8a98a3", stroke: "none", w: 0 }));
    // τόξα: Α από το χείλος / την επιφάνεια του νερού και Β από την εξέδρα
    const rA = Af * k, rB = Bf * k;
    S.add(path(`M${px1 - rA},${G} A${rA},${rA} 0 0 1 ${px1},${G - rA} L${px2},${G - rA} A${rA},${rA} 0 0 1 ${px2 + rA},${G}`, { stroke: C.warn, w: 1.6, dash: "7 5" }));
    const by = G - eh - 6;
    S.add(path(`M${ex - 50 - rB},${by} A${rB},${rB} 0 0 1 ${ex - 50},${by - rB} L${ex + 10},${by - rB} A${rB},${rB} 0 0 1 ${ex + 10 + rB},${by}`, { stroke: C.ok, w: 1.4, dash: "4 4" }));
    S.top(vd(px1 - 34, G - rA, G, `Α ≥ ${A} m`, { color: C.warn, size: 13, left: true, ext: px1 }));
    S.top(vd(ex + 10 + rB + 20, by - rB, by, `Β ≥ ${String(B).replace(/\s*\(1\)/, "")} m`, { color: C.ok, size: 12, ext: ex + 10 }));
    // η γραμμή: περνά έξω από τα τόξα
    const yline = Math.min(G - rA, by - rB) - 18;
    S.add(poleG(60, yline - 30, G, {}) + poleG(860, yline - 30, G, {}) + wire(60, yline - 18, 860, yline - 18, 8, { stroke: C.line, w: 2.4 }));
    S.key(`Εναέρια γραμμή: ${colName}`, { x: 450, y: yline - 12, lx: 450, ly: yline - 40 });
    S.key("Επιφάνεια νερού / χείλος κολυμβητηρίου – η απόσταση Α προς κάθε κατεύθυνση από το νερό, το χείλος και τη βάση της εξέδρας", { x: px1 + 40, y: G, lx: px1 + 40, ly: G + 32, color: C.warn });
    S.key("Εξέδρα / σανίδα καταδύσεων – η απόσταση Β προς κάθε κατεύθυνση από την εξέδρα", { x: ex + 10, y: by, lx: ex + 60, ly: by + 40, color: C.ok });
    S.key("Γ: ύψος από το περιβάλλον έδαφος κατά C-2 / C-3 / C-3A", { x: 160, y: yline - 12, lx: 160, ly: yline + 40, color: C.dim });
    S.note("Εγκύκλιος ΔΜΚΛΔ/Φ.288.6/1736/19.7.1994 (βάσει NESC 1984): Α – προς κάθε κατεύθυνση από την επιφάνεια του νερού, το χείλος και τη βάση της εξέδρας· Β – από την εξέδρα και τη σανίδα καταδύσεων· Γ – από το περιβάλλον έδαφος.", C.text);
    S.note("Τελικά αφόρτιστα βέλη στους 16 °C· για μεγάλα ανοίγματα προσαύξηση κατά C-2 σημ. 2. ΣΚ ΜΤ χωρίς αποτελεσματική γείωση θωράκισης (ΟΔ 46) → τιμές γυμνών αγωγών (7,6 / 4,9 m).");
    S.note("Νέες γραμμές: να μη διέρχονται πάνω από υπαίθρια κολυμβητήρια, εφόσον δεν προκύπτει υπέρμετρη δαπάνη· υφιστάμενες: παραλλαγές με δαπάνη ΔΕΗ, εκτός τουριστικής περιόδου. Σχήμα μιμικό – όχι υπό κλίμακα.");
    return S.render(`Αποστάσεις από υπαίθρια κολυμβητήρια – ${ellipsis(colName, 70)} (1994)`);
  }

  // ---------------------------------------------------------------- 16. Ανεμογεννήτριες (2015)
  function windCalc(st) {
    const Hm = Math.max(1, parseFloat(String(st.hm).replace(",", ".")) || 100);
    const dMT = CL.mv_buildings.items[4] ? CL.mv_buildings.items[4][1] : 2.5;          // C-7 V οριζόντια ΜΤ από κτίρια
    const dXT = CL.lv_buildings.items[8] ? CL.lv_buildings.items[8][1] : 0.9;           // ΚΕΣΥΓΗΕ ΧΤ 0,90 m
    const dB = st.volt === "XT" ? dXT : dMT;
    const Hn = Math.max(0.1 * Hm, dB);
    return { Hm, dB, Hn, L: Hm + Hn };
  }
  function drawWind(st) {
    const r = windCalc(st);
    const W = 900, Hd = 450, G = 400;
    const S = new Scene(W, Hd);
    S.add(ground(W, Hd, G));
    // Α/Γ: βάθρο + πύργος + ρότορας (πτερύγιο κατακόρυφα πάνω) – ύψος σχεδίου 300 px = Hm
    const bx = 170, hpx = 300, hub = G - hpx * 0.7;
    S.add(rect(bx - 40, G - 12, 80, 12, { fill: "#6b7280", stroke: "#9ca3af", w: 1 }));
    S.add(poly([[bx - 10, G - 12], [bx + 10, G - 12], [bx + 5, hub], [bx - 5, hub]], { fill: "#cbd5e1", stroke: "#94a3b8", w: 1 }) + circ(bx, hub, 9, { fill: "#e2e8f0", stroke: "#94a3b8", w: 1 }));
    const blade = hpx * 0.3;
    S.add(path(`M${bx},${hub} L${bx},${hub - blade}`, { stroke: "#e2e8f0", w: 5, cap: "round" }) + path(`M${bx},${hub} L${bx + blade * 0.87},${hub + blade * 0.5}`, { stroke: "#e2e8f0", w: 5, cap: "round" }) + path(`M${bx},${hub} L${bx - blade * 0.87},${hub + blade * 0.5}`, { stroke: "#e2e8f0", w: 5, cap: "round" }));
    S.top(vd(44, G - hpx, G, `Hm = ${fmt2(r.Hm)} m`, { color: C.acc, size: 12, ext: bx, ly: G - hpx + 60 }));
    S.key("Μέγιστο ύψος Hm της Α/Γ – με το πτερύγιο στην άνω κατακόρυφη θέση", { x: bx, y: G - hpx, lx: bx + 60, ly: G - hpx + 10 });
    S.key("Δυσμενέστερο ακραίο σημείο του βάθρου – γύρω από αυτό μπορεί να περιστραφεί η Α/Γ κατά την πτώση", { x: bx + 40, y: G - 6, lx: bx + 40, ly: G + 24 });
    // τόξο πτώσης ακτίνας Hm από το άκρο του βάθρου + Hn
    const k = hpx / r.Hm, Lpx = Math.min(r.L * k, 620);
    S.add(path(`M${bx + 40},${G - hpx} A${hpx},${hpx} 0 0 1 ${bx + 40 + hpx},${G}`, { stroke: C.no, w: 1.4, dash: "7 5" }));
    S.key("Ακτίνα πτώσης Hm (τόξο)", { x: bx + 40 + hpx * 0.72, y: G - hpx * 0.7, lx: bx + 40 + hpx * 0.72 + 40, ly: G - hpx * 0.7 - 30, color: C.no });
    const lx = bx + 40 + Lpx, hx = bx + 40 + Math.min(r.Hm * k, 580);
    S.top(hd(G - 30, bx + 40, hx, `Hm = ${fmt2(r.Hm)} m`, { color: C.dim, size: 11 }));
    S.top(hd(G - 56, hx, lx, `Hn = ${fmt2(r.Hn)} m`, { color: C.dim, size: 11, lx: lx + 60, anchor: "start" }));
    S.top(hd(G - 86, bx + 40, lx, `L = Hm + Hn = ${fmt2(r.L)} m`, { color: C.warn, size: 14 }));
    S.add(poleG(lx, G - 140, G, {}) + wire(lx, G - 128, 900, G - 120, 6, { stroke: C.line, w: 2.4 }));
    S.key("Πλησιέστερο υπό τάση στοιχείο της γραμμής Διανομής (στύλος / αγωγοί)", { x: lx, y: G - 140, lx: lx + 50, ly: G - 170 });
    S.top(tag(16, 50, `Hn = max(0,10·Hm = ${fmt2(0.1 * r.Hm)} m ; απόσταση από κτίρια ΚΕΣΥΓΗΕ ${fmt2(r.dB)} m) = ${fmt2(r.Hn)} m`, { fill: C.acc, size: 11 }));
    S.note("Εγκύκλιος 2999/18.5.2015: ελάχιστη οριζόντια απόσταση L από το δυσμενέστερο ακραίο σημείο του βάθρου έως το πλησιέστερο υπό τάση στοιχείο = Hm + Hn. Hn: το μεγαλύτερο από 10 % του Hm και την ελάχιστη οριζόντια απόσταση γραμμής από κτίρια κατά ΚΕΣΥΓΗΕ (ΜΤ 2,50 m κατά C-7 · ΧΤ 0,90 m).", C.text);
    S.note("Παραλλαγές δικτύου με δαπάνη ΔΕΔΔΗΕ εφόσον ο παραγωγός έχει νόμιμη άδεια και εφάρμοσε το εγκεκριμένο σχέδιο. Ισχύει μέχρι νεότερο σημείωμα ή νομοθετική διάταξη. Σχήμα μιμικό.");
    return S.render("Ελάχιστη απόσταση ανεμογεννήτριας από εναέρια γραμμή Διανομής (εγκύκλιος 2999/2015)");
  }

  // ---------------------------------------------------------------- 17. Μονάδα βιοαερίου (2015) – κάτοψη
  function drawBiogas() {
    const v = rv("egk_2015_3442", "egk2015_3442-30m", "30 m"), vn = parseFloat(v) || 30;
    const W = 900, Hd = 350, k = 3;
    const S = new Scene(W, Hd);
    S.add(rect(0, 32, W, Hd - 32, { fill: "#13261a", stroke: "none", w: 0 }));
    // μονάδα: δύο χωνευτές (κύκλοι) μέσα σε περίφραξη (κάτοψη)
    const px = 330, py = 140, pw = 200, ph = 100;
    S.add(rect(px, py, pw, ph, { fill: "none", stroke: "#8a98a3", w: 1.5, dash: "4 3" }));
    S.add(circ(px + 55, py + ph / 2, 32, { fill: "#2f4858", stroke: "#8fb4c4", w: 1.5 }) + circ(px + 145, py + ph / 2, 32, { fill: "#2f4858", stroke: "#8fb4c4", w: 1.5 }));
    S.add(txt(px + 55, py + ph / 2 + 4, "χωνευτής", { anchor: "middle", size: 9.5, fill: C.text }) + txt(px + 145, py + ph / 2 + 4, "αέριο", { anchor: "middle", size: 9.5, fill: C.text }));
    S.key("Μονάδα παραγωγής / αποθήκευσης βιοαερίου – περίβλημα (περίφραξη) της μονάδας", { x: px + pw / 2, y: py, lx: px + pw / 2, ly: py - 36 });
    // ζώνη 30 m γύρω από το περίβλημα
    const r = vn * k;
    S.add(rect(px - r, py - r, pw + 2 * r, ph + 2 * r, { fill: "rgba(255,92,108,0.08)", stroke: C.no, w: 2, dash: "9 6", rx: r }));
    S.top(hd(py + ph / 2, px + pw, px + pw + r, `≥ ${v}`, { color: C.no, size: 14, ext: py + ph / 2 - 20 }));
    S.key("Ζώνη 30 m γύρω από το περίβλημα: καμία εναέρια γραμμή ΜΤ / ΧΤ", { x: px + pw + r, y: py - 20, lx: px + pw + r + 40, ly: py - 40, color: C.no });
    // εναέρια γραμμή ΜΤ/ΧΤ έξω από τη ζώνη (κάτοψη)
    const xl = px + pw + r + 30;
    S.add(line(xl, 44, xl, Hd - 10, { stroke: C.warn, w: 2.6 }));
    [80, 190, 300].forEach(y => S.add(circ(xl, y, 6, { fill: "#5b6770", stroke: "#8a98a3", w: 1 })));
    S.key("Εναέρια γραμμή ΜΤ / ΧΤ (στύλοι, κάτοψη) έξω από τη ζώνη", { x: xl, y: 240, lx: xl + 40, ly: 240, color: C.warn });
    S.note("Εγκύκλιος 3442/27.5.2015: οι αποστάσεις γραμμών Διανομής ΜΤ και ΧΤ από μονάδες βιοαερίου = αυτές των περιβλημάτων δεξαμενών υγραερίου της ΟΔ.38 (Πίνακας Ι, γραμμή Α) → 30 m για εναέριες γραμμές.", C.text);
    S.note("Υφιστάμενες γραμμές που δεν τηρούν την απόσταση: παραλλαγή με δαπάνη ΔΕΔΔΗΕ εφόσον ο παραγωγός έχει νόμιμη άδεια εγκατάστασης / λειτουργίας και εφάρμοσε το εγκεκριμένο σχέδιο. Ισχύει μέχρι νεότερο υπηρεσιακό σημείωμα ή νομοθετική διάταξη. Κάτοψη – μιμικό.");
    return S.render("Απόσταση εναερίων γραμμών ΜΤ / ΧΤ από μονάδα βιοαερίου (εγκύκλιος 3442/2015)");
  }

  // ---------------------------------------------------------------- 18. Πρατήρια καυσίμων / υδρογόνου (2023) – κάτοψη
  function drawFuel(st) {
    const h2 = st.fuel === "H2";
    const vOH = h2 ? rv("egk_2023_1", "egk2023-H2-overhead", "> 45 m") : rv("egk_2023_1", "egk2023-other-overhead", "> 10 m");
    const vUG = rv("egk_2023_1", "egk2023-underground", "> 3 m");
    const vMD = h2 ? rv("egk_2023_1", "egk2023-meter-H2", "> 22 m") : rv("egk_2023_1", "egk2023-meter-other", "> 10 m");
    const pf = s => parseFloat(String(s).replace(/[^\d.,]/g, "").replace(",", "."));
    const nOH = pf(vOH) || 10, nMD = pf(vMD) || 10, nUG = pf(vUG) || 3;
    const W = 900, Hd = 420, k = h2 ? 3.2 : 11;
    const S = new Scene(W, Hd);
    S.add(rect(0, 32, W, Hd - 32, { fill: "#1b2026", stroke: "none", w: 0 }));
    // πρατήριο (κάτοψη): στέγαστρο, αντλίες, δεξαμενές
    const sx = 300, sy = 150, sw = 180, sh = 110;
    S.add(rect(sx, sy, sw, sh, { fill: "#2a3440", stroke: "#8a98a3", w: 1.5 }));
    [0, 1, 2].forEach(i => S.add(rect(sx + 20 + i * 50, sy + 36, 24, 30, { fill: "#475569", stroke: "#94a3b8", w: 1 })));
    S.add(rect(sx + 20, sy + sh - 28, 140, 16, { fill: "#334155", stroke: "#94a3b8", w: 1, dash: "3 2" }));
    S.key(h2 ? "Πρατήριο υδρογόνου – χαρακτηριστικά στοιχεία (δεξαμενές, συμπιεστές, αντλίες)" : "Πρατήριο υγρών καυσίμων / LPG / CNG – αντλίες και υπόγειες δεξαμενές (προβολή στο οριζόντιο επίπεδο)", { x: sx + sw / 2, y: sy, lx: sx + sw / 2, ly: sy - 40 });
    // ζώνες (προβολές σε οριζόντιο επίπεδο) – οι τιμές ως ταμπελάκια δεξιά, σε διαφορετικά ύψη
    const zone = (r, col, lab, yl) => { S.add(rect(sx - r, sy - r, sw + 2 * r, sh + 2 * r, { fill: "none", stroke: col, w: 1.8, dash: "8 5", rx: Math.min(r, 40) })); S.top(hd(yl, sx + sw, sx + sw + r, lab, { color: col, size: 11.5, lx: sx + sw + r + 8, anchor: "start" })); };
    zone(nOH * k, C.no, `εναέριο δίκτυο ΧΤ / ΜΤ ${vOH}`, sy + 16);
    zone(Math.abs(nMD - nOH) * k < 8 ? nMD * k - 7 : nMD * k, C.warn, `μετρητικές διατάξεις ${vMD}`, sy + 56);   // ίδια τιμή με το εναέριο → ελαφρά μέσα για να διακρίνεται
    zone(nUG * k, C.ok, `υπόγεια καλώδια ${vUG}`, sy + 96);
    // εναέρια γραμμή έξω από τη ζώνη
    const xl = Math.min(sx + sw + nOH * k + 26, 880);
    S.add(line(xl, 44, xl, Hd - 10, { stroke: C.no, w: 2.4 }));
    [60, 160, 260, 360].forEach(y => S.add(circ(xl, y, 5, { fill: "#5b6770", stroke: "#8a98a3", w: 1 })));
    S.key("Εναέρια γραμμή ΜΤ / ΧΤ έξω από τη ζώνη – ποτέ πάνω από το πρατήριο", { x: xl, y: 60, lx: xl - 40, ly: 60, color: C.no });
    // μετρητής και υπόγειο καλώδιο
    const xm = sx + sw + nMD * k + 8; S.add(rect(xm - 8, sy + sh + 30, 16, 16, { fill: "#1c2c38", stroke: C.warn, w: 1.2 }));
    S.key("Μετρητική διάταξη του πρατηρίου – θέση με πρόσβαση τεχνικού προσωπικού όλο το 24ωρο", { x: xm, y: sy + sh + 38, lx: xm + 40, ly: sy + sh + 60, color: C.warn });
    const xu = sx + sw + nUG * k + 6; S.add(line(xu, sy - 40, xu, sy + sh + 60, { stroke: C.ok, w: 2, dash: "10 5" }));
    S.key("Υπόγειο καλώδιο εντός του πρατηρίου: σωλήνας PVC Φ160 στο έδαφος (U-2Β1 / U-2Γ1) + εφεδρικός· χάνδακας από τον ιδιοκτήτη", { x: xu, y: sy - 30, lx: xu - 50, ly: sy - 60, color: C.ok });
    S.top(tag(16, Hd - 12, h2 ? "Υδρογόνο: > 45 m ακτινικά (ΥΑ 118664/2023 άρθ. 5 §5 – για ΥΤ, ο ΔΕΔΔΗΕ το εφαρμόζει και στη ΧΤ)" : "Υγρά καύσιμα / LPG / CNG: > 10 m μεταξύ προβολών σε οριζόντιο επίπεδο (ΥΑ 188543/2022)", { fill: h2 ? C.no : C.warn, size: 11 }));
    S.note("ΔΔ/406082/31.10.2023 (καταργεί τον Πίνακα Ι §6 της ΟΔ.38 για πρατήρια): δεν μελετώνται ούτε κατασκευάζονται εναέριες γραμμές ΜΤ / ΧΤ πάνω από πρατήρια καυσίμων. Πριν από τη μελέτη ελέγχεται το είδος καυσίμου (άδεια λειτουργίας).", C.text);
    S.note("Υδρογόνο: κρίσιμα στοιχεία – ηλεκτρολογική μονάδα / καμπίνα ελέγχου 22 m (ΥΑ 118664/2023 άρθ. 5 §2γ). Παραλλαγές υφιστάμενων γραμμών: ίδιες αποστάσεις, δαπάνη ΔΕΔΔΗΕ εφόσον ο ιδιοκτήτης έχει νόμιμη άδεια και εφάρμοσε το εγκεκριμένο σχέδιο. Κάτοψη – μιμικό.");
    return S.render(`Αποστάσεις από πρατήρια καυσίμων – ${h2 ? "υδρογόνο" : "υγρά καύσιμα, LPG, CNG"} (ΔΔ/406082/2023)`);
  }

  // ---------------------------------------------------------------- 19. Αγωγοί φυσικού αερίου ΔΕΣΦΑ (2024) – κάτοψη
  function drawGas() {
    const vUG = rv("egk_2024_283278", "egk2024-ug-50m", "50 m"), vOH = "300 m", vP = rv("egk_2024_283278", "egk2024-poles-20m", "> 20 m"), vZ = "4 m";
    const W = 900, Hd = 380, k = 1.3;
    const S = new Scene(W, Hd);
    S.add(rect(0, 32, W, Hd - 32, { fill: "#1b2620", stroke: "none", w: 0 }));
    // αγωγός ΔΕΣΦΑ: οριζόντια γραμμή
    const yp = 300;
    S.add(rect(0, yp - 16, W, 32, { fill: "rgba(245,158,11,0.12)", stroke: "none", w: 0 }) + line(0, yp - 16, W, yp - 16, { stroke: "#fbbf24", w: 1, dash: "4 4" }) + line(0, yp + 16, W, yp + 16, { stroke: "#fbbf24", w: 1, dash: "4 4" }));
    S.add(line(0, yp, W, yp, { stroke: "#f59e0b", w: 5 }));
    S.key("Άξονας σωληναγωγού φυσικού αερίου υψηλής πίεσης (ΔΕΣΦΑ)", { x: 120, y: yp, lx: 120, ly: yp + 46, color: "#fbbf24" });
    S.key(`Ζώνη δουλείας ${vZ} εκατέρωθεν του άξονα – εργασίες υπό επίβλεψη ΔΕΣΦΑ`, { x: 700, y: yp + 16, lx: 700, ly: yp + 46, color: "#fbbf24" });
    // υπόγειο καλώδιο ΜΤ παράλληλο σε 50 m
    const yu = yp - 50 * k;
    S.add(line(60, yu, 840, yu, { stroke: C.ok, w: 2.2, dash: "10 5" }));
    S.top(vd(760, yu, yp, `≥ ${vUG}`, { color: C.ok, size: 13 }));
    S.key("Υπόγειο καλώδιο ΜΤ παράλληλο με τον αγωγό: ≥ 50 m (ELOT EN 50443 – ηλεκτρομαγνητικές επιδράσεις)", { x: 200, y: yu, lx: 200, ly: yu - 30, color: C.ok });
    // εναέρια γραμμή ΜΤ σε 300 m (συμπιεσμένη κλίμακα)
    const yo = 56;
    S.add(line(60, yo, 840, yo, { stroke: C.line, w: 2.4 }));
    [120, 360, 600].forEach(x => S.add(circ(x, yo, 6, { fill: "#5b6770", stroke: "#8a98a3", w: 1 })));
    S.top(vd(480, yo, yu - 6, `≥ ${vOH} (όλες οι περιοχές)`, { color: C.acc, size: 13 }));
    S.key("Εναέρια γραμμή ΜΤ (στύλοι, κάτοψη): ≥ 300 m από τον άξονα – αρχικά 300 m αστικές / 3.000 m αγροτικές περιοχές", { x: 300, y: yo, lx: 300, ly: yo + 34 });
    S.key(`Στύλοι ΜΤ: ${vP} από τον άξονα (σύσταση)`, { x: 600, y: yo, lx: 660, ly: yo + 34, color: C.dim });
    S.note("ΔΔ/283278/22.7.2024: νέα έργα δικτύων ΜΤ (εναέρια και υπόγεια) κοντά σε αγωγούς φυσικού αερίου υψηλής πίεσης ΔΕΣΦΑ – υπόγειο καλώδιο ΜΤ ≥ 50 m, εναέρια γραμμή ΜΤ ≥ 300 m (παντού). Μικρότερες αποστάσεις → συνεννόηση με ΔΕΣΦΑ (desfa@desfa.gr) και μελέτη ηλεκτρομαγνητικών επιδράσεων.", C.text);
    S.note("Ελέγχονται: νέες γραμμές ΜΤ, παραλλαγές, αλλαγή αγωγών / υπογειοποίηση (αύξηση Ιβρ). Δαπάνες: αίτημα πελάτη / παραγωγού → ο ενδιαφερόμενος· έργο ΔΕΔΔΗΕ → ΔΕΔΔΗΕ. Το έγγραφο αφορά μόνο δίκτυα ΜΤ. Κάτοψη – μιμικό (κλίμακες διαφορετικές ανά τμήμα).");
    return S.render("Αποστάσεις δικτύων ΜΤ από αγωγούς φυσικού αερίου ΔΕΣΦΑ (ΔΔ/283278/2024)");
  }

  // ---------------------------------------------------------------- 20. ΟΔ.38 – λοιπές εγκαταστάσεις (μεταλλεία, εκρηκτικά, εργοτάξια, αεροδρόμια, υπόγεια ΥΤ, άλλη γραμμή)
  function drawOD38() {
    const W = 900, Hd = 590;
    const S = new Scene(W, Hd);
    const cw = 285, ch = 262, gx = [10, 307, 604], gy = [36, 314];
    const cell = (x, y, title) => { S.add(rect(x, y, cw, ch, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 8 })); S.top(pill(x + 8, y + 20, title, { size: 11.5, fill: C.acc, bold: true, bg: "none" })); };
    const gnd = (x, G) => S.add(rect(x + 10, G, cw - 20, 14, { fill: C.ground, stroke: "none", w: 0 }));
    // 1. μεταλλεία / λατομεία: 70 / 150 m από το κατακόρυφο επίπεδο των αγωγών
    let x = gx[0], y = gy[0], G = y + ch - 44;
    cell(x, y, "Μεταλλεία / λατομεία (ΟΔ.38 §2.3–2.4)"); gnd(x, G);
    S.add(poleG(x + 50, y + 64, G, {}) + line(x + 50, y + 76, x + 50, G, { stroke: C.acc, w: 1, dash: "3 4" }) + wire(x + 10, y + 76, x + 50, y + 76, 2, { stroke: C.line, w: 2 }));
    S.add(poly([[x + 190, G], [x + 210, G - 40], [x + 250, G - 46], [x + 270, G]], { fill: "#6b6b6b", stroke: "#8a8a8a", w: 1 }));
    S.top(hd(G - 86, x + 50, x + 190, `≥ ${rv("od38", "od38-2.3a", "70 m")}`, { color: C.warn, size: 11 }) + hd(G - 116, x + 50, x + 190, `≥ ${rv("od38", "od38-2.3b", "150 m")}`, { color: C.no, size: 11 }));
    S.key(`Λατομείο / μεταλλείο από το κατακόρυφο επίπεδο των αγωγών: ≥ ${rv("od38", "od38-2.3a", "70 m")} χωρίς εκρηκτικά (κίτρινο) · ≥ ${rv("od38", "od38-2.3b", "150 m")} με εκρηκτικά (κόκκινο) · πύργος γεωτρύπανου ≥ ${rv("od38", "od38-2.4", "25 m")} (ΚΜΛΕ άρθ. 88)`, { x: x + 230, y: G - 46, lx: x + 230, ly: G - 140, color: C.warn });
    // 2. εκρηκτικά
    x = gx[1]; y = gy[0]; G = y + ch - 44;
    cell(x, y, "Εκρηκτικές ύλες (ΟΔ.38 §2.2, Πίν. Ι–ΙΙ)"); gnd(x, G);
    S.add(poleG(x + 40, y + 64, G, {}) + wire(x + 10, y + 76, x + 40, y + 76, 2, { stroke: C.line, w: 2 }));
    S.add(rect(x + 180, G - 50, 80, 50, { fill: "#4a1d1d", stroke: "#f87171", w: 1.5 }) + txt(x + 220, G - 20, "εκρηκτικά", { anchor: "middle", size: 9.5, fill: "#fecaca" }));
    S.top(hd(G - 70, x + 40, x + 180, "15 – 1200 m", { color: C.no, size: 11 }));
    S.key(`Αποθήκη εκρηκτικών: 15 – 1200 m κατά τον Πίν. ΙΙ της ΟΔ.38 (ανάλογα με την ποσότητα)· × 0,5 με αναχώματα (ΚΜΛΕ άρθ. 50). Εργοστάσια / αποθήκες εκρηκτικών & πυρομαχικών (Πίν. Ι Δ): εναέριες ${(String(rv("od38", "od38-6-D", "20 m")).match(/^\s*([\d,]+\s*m)/) || [])[1] || "20 m"} · υπόγειες 1 m από περίβολο / περίγραμμα κτιρίων`, { x: x + 220, y: G - 50, lx: x + 220, ly: G - 110, color: C.no });
    // 3. εργοτάξια / γερανοί
    x = gx[2]; y = gy[0]; G = y + ch - 44;
    cell(x, y, "Εργοτάξια – γερανοί (ΟΔ.38 §3.2)"); gnd(x, G);
    S.add(poleG(x + 40, y + 54, G, {}) + poleG(x + 250, y + 54, G, {}) + wire(x + 40, y + 66, x + 250, y + 66, 10, { stroke: C.line, w: 2.2 }));
    S.add(rect(x + 120, G - 30, 60, 30, { fill: "#b45309", stroke: "#f59e0b", w: 1 }) + line(x + 150, G - 30, x + 150, y + 114, { stroke: "#f59e0b", w: 3 }) + line(x + 150, y + 114, x + 215, y + 100, { stroke: "#f59e0b", w: 3 }));
    S.top(vd(x + 236, y + 76, y + 100, "≥ 2,0 m", { color: C.warn, size: 11, ext: x + 215 }));
    S.key("Γερανός / μεταφερόμενα υλικά (ανώτατο σημείο): ≥ 2,0 m από τους αγωγούς + προσαυξήσεις C-4 · 16 °C · μετακίνηση γερανών με χαμηλωμένη μπούμα (§3.3)", { x: x + 215, y: y + 100, lx: x + 190, ly: y + 150, color: C.warn });
    // 4. αεροδρόμια
    x = gx[0]; y = gy[1];
    cell(x, y, "Αεροδρόμια (ΟΔ.38 §5)");
    S.add(rect(x + 50, y + 74, 100, 110, { fill: "#1f2937", stroke: "#9ca3af", w: 1.2 }) + line(x + 70, y + 84, x + 70, y + 174, { stroke: "#e5e7eb", w: 3 }));
    S.add(rect(x + 50 - 34, y + 74 - 30, 100 + 68, 110 + 60, { fill: "none", stroke: C.warn, w: 1.5, dash: "6 4", rx: 20 }));
    S.top(hd(y + 60, x + 150, x + 184, `${rv("od38", "od38-5.1", "5 km")}`, { color: C.warn, size: 11, lx: x + 196, anchor: "start" }));
    S.key(`Αεροδρόμιο (περίφραξη, διάδρομος) – ζώνη αδειοδότησης ${rv("od38", "od38-5.1", "5 km")}: στρατιωτικά → Πολεμική Αεροπορία (ΠΔ 6-7/1977), πολιτικά → ΥΠΑ· θέσεις στύλων σε χάρτες 1:5000 με υψόμετρα – τα δίκτυα εξομοιώνονται με οικοδομές (ΓΕΑ 1979)`, { x: x + 100, y: y + 130, lx: x + 200, ly: y + 140, color: C.warn });
    // 5. υπόγεια καλώδια διανομής – καλώδια Μεταφοράς
    x = gx[1]; y = gy[1]; G = y + 74;
    cell(x, y, "Υπόγεια καλώδια (ΟΔ.38 §7)");
    S.add(rect(x + 10, G, cw - 20, ch - 114, { fill: C.ground, stroke: "none", w: 0 }) + line(x + 10, G, x + cw - 10, G, { stroke: "#7a6a4a", w: 2 }));
    S.add(condEnd(x + 70, G + 64, { fill: C.warn, r: 7 }) + condEnd(x + 210, G + 64, { fill: "#a78bfa", r: 9 }));
    S.top(hd(G + 36, x + 70, x + 210, `≥ ${rv("od38", "od38-7.2", "2 m")}`, { color: C.warn, size: 12, ext: G + 64 }));
    S.key("Καλώδιο Διανομής ΜΤ / ΧΤ (κίτρινο) – καλώδιο Μεταφοράς 150 / 380 kV (μωβ): ≥ 2 m· γειτνίαση με άλλα υπόγεια δίκτυα / ΟΚΩ: ΕΤΚΔ Κεφ. U (§7.1)", { x: x + 210, y: G + 64, lx: x + 160, ly: G + 110, color: "#a78bfa" });
    // 6. αγωγός γης ΜΤ – στύλοι άλλης γραμμής & λοιπά
    x = gx[2]; y = gy[1]; G = y + ch - 44;
    cell(x, y, "Αγωγός γης ΜΤ – άλλη γραμμή (ΟΔ.38 §1.5)"); gnd(x, G);
    S.add(poleG(x + 200, y + 54, G, { arm: false }) + line(x + 150, y + 94, x + 250, y + 94, { stroke: "#8a98a3", w: 3 }));
    S.add(condEnd(x + 70, y + 124, { fill: C.line, r: 5 }));
    S.top(hd(y + 150, x + 70, x + 196, "≥ max(90 cm ; μ + ν)", { color: C.warn, size: 10.5, below: true, ext: y + 124 }));
    S.key("Αγωγός γης γραμμής ΜΤ από στύλο άλλης γραμμής: ≥ max(90 cm ; μ + ν) με μ = max(30 cm ; 9·√(S/6)), ν = (2,5/0,6)·Α, S: βέλος (cm) στους 16 °C (παράδειγμα 124 cm)", { x: x + 70, y: y + 124, lx: x + 40, ly: y + 90, color: C.warn });
    S.key(`Στύλοι / επίτονοι από τα άκρα πεζοδρομίων ≥ ${rv("od38", "od38-1.3a", "15 cm")} · ποτέ στο κατάστρωμα της οδού (ΟΔ.38 §1.3)`, { x: x + 200, y: G, lx: x + 140, ly: G - 30, color: C.dim });
    S.note("ΟΔ.38 (2η έκδ. 1980, αναθ. 1984/85): ύψη αγωγών από έδαφος / κτίρια κατά ΚΕΣΥΓΗΕ Τμ. 23 και ΕΤΚΔ Κεφ. C (βλ. τις άλλες περιπτώσεις της καρτέλας). Οι αποστάσεις από πρατήρια καυσίμων (Πίν. Ι §6) ΚΑΤΑΡΓΗΘΗΚΑΝ με το ΔΔ/406082/2023 – βλ. «Πρατήρια καυσίμων». Σχήματα μιμικά.");
    return S.render("ΟΔ.38 – Αποστάσεις από λατομεία, εκρηκτικά, εργοτάξια, αεροδρόμια, υπόγεια καλώδια Μεταφοράς, άλλες γραμμές");
  }

  // ---------------------------------------------------------------- 21. Πεζοδρόμιο & δρόμος – ΜΔ / καλώδιο παροχής (κοινό σχήμα με τη μετρητική διάταξη)
  function drawSidewalk() {
    const SC = D.typ.service_clearances || {}, co = SC.crossing_options || [];
    return window.DIAGRAMS.mdDistances({ rules: { sidewalk: co[0] ? co[0][2] : 3.0, road: co[1] ? co[1][2] : 5.5, guy_sidewalk: SC.guy_sidewalk || 2.5, guy_road: SC.guy_road || 5.5, rows: 2 } });
  }

  // ================================================================ ΥΠΟΓΕΙΑ ΚΑΛΩΔΙΑ – ΕΤΚΔ Κεφάλαιο U (U-2 … U-5A)
  // Τομές χανδάκων και γειτνιάσεων / διασταυρώσεων υπόγειων καλωδίων ΜΤ–ΧΤ. Οι τιμές από data.js → typ.clearances.ug_* (geom + items).
  const UGC = { soil: "#4a3f2c", sand: "#8a7340", gravel: "#5c5547", asphalt: "#2b2b2b", concrete: "#8b939c", mortar: "#7c7a6a", tile: "#d6b370", mesh: "#f97316", pipe: "#cbd5e1",
    cable: C.warn, cableMT: "#fb923c", hv: "#a78bfa", tel: "#60a5fa", water: "#22d3ee", gas: "#f59e0b", third: "#f472b6", steel: "#e2e8f0", hdpe: "#334155" };
  const UG = CL.ug_install, UGR = CL.ug_road, UGS = CL.ug_slope, UGP = CL.ug_proximity, UGX = CL.ug_crossing, UGW = CL.ug_passages;
  const voltOpts = g => Object.keys(g.volt_labels || { XT: "ΧΤ", MT: "ΜΤ 6,6 έως και 20 kV", MT22: "22 kV" }).map(k => [k, (g.volt_labels || {})[k] || k]);
  const cm = v => `${String(Math.round(v))} cm`;
  // πλάκα προστασίας (επικάλυψης) – διαγραμμισμένη
  const tileRect = (x, y, w, h) => rect(x, y, w, h, { fill: UGC.tile, stroke: "#8a6a2a", w: 1 }) + line(x + 4, y + h, x + 4 + h, y, { stroke: "#8a6a2a", w: 0.8 }) + line(x + w / 2, y + h, x + w / 2 + h, y, { stroke: "#8a6a2a", w: 0.8 }) + line(x + w - 4 - h, y + h, x + w - 4, y, { stroke: "#8a6a2a", w: 0.8 });
  // καλώδιο σε τομή (κύκλος με σταυρό)
  const cableDot = (x, y, col, r) => condEnd(x, y, { fill: col || UGC.cable, r: r || 6 });
  // σωλήνας σε τομή
  const pipeDot = (x, y, r, o) => { o = o || {}; return circ(x, y, r, { fill: o.fill || "#0b1a24", stroke: o.stroke || UGC.pipe, w: o.w || 2 }) + (o.cable ? cableDot(x, y, o.cable, Math.max(3, r * 0.45)) : ""); };
  // διακεκομμένη στάθμη επιφάνειας εδάφους / πεζοδρομίου
  const surfaceLine = (x1, x2, G, o) => { o = o || {}; return line(x1, G, x2, G, { stroke: o.stroke || "#9a8a6a", w: o.w || 2 }); };

  // ---------------------------------------------------------------- 22. Εγκατάσταση σε χάνδακα (U-2 / U-2A / U-2I / U-2AI)
  function drawUgInstall(st) {
    const g = UG.geom, volt = st.volt || "MT", nc = Math.max(1, Math.min(3, +st.n || 1)), lv = Math.max(1, Math.min(3, +st.levels || 1)), side = st.loc === "SIDEWALK";
    const L = lv > 1 ? g.multi[String(lv)].depth : g.depth_cm[volt];
    const width = lv > 1 ? g.multi.width : g.levels[String(nc)].width, tile = lv > 1 ? g.multi.tile : g.levels[String(nc)].tile, sp = g.sand_cm;
    const W = 900, k = 2.1, G = 96, Hd = G + L * k + 64;
    const S = new Scene(W, Hd);
    const x0 = 330, x1 = x0 + width * k, yB = G + L * k;
    S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }));
    // περιβάλλον έδαφος με «πέτρες»
    for (let i = 0; i < 40; i++) { const px = (i * 97) % W, py = G + 12 + ((i * 53) % Math.max(20, Hd - G - 30)); if (px < x0 - 10 || px > x1 + 10) S.add(circ(px, py, 3 + (i % 3), { fill: "#5a4d36", stroke: "none", w: 0 })); }
    // χάνδακας: προϊόντα εκσκαφής / αμμοχάλικο επάνω, κοσκινισμένα προϊόντα ή άμμος κάτω
    const nCab = lv > 1 ? 3 : nc;
    const sandTop = L - (10 + sp.cable_to_tile + 10 + (lv - 1) * (sp.cable_to_next_tile + sp.cable_to_tile + 10));   // άνω όριο ζώνης άμμου (cm από την επιφάνεια)
    S.add(rect(x0, G, width * k, L * k, { fill: UGC.gravel, stroke: "#2c2620", w: 1.5 }));
    S.add(rect(x0, G + sandTop * k, width * k, (L - sandTop) * k, { fill: UGC.sand, stroke: "none", w: 0 }));
    // πεζοδρόμιο: πλάκα + σκυρόδεμα C 8/10
    if (side) {
      S.add(rect(x0 - 70, G - 2, width * k + 140, g.sidewalk.tile_cm * k, { fill: "#6b7280", stroke: "#4b5563", w: 1 }));
      S.add(rect(x0, G + g.sidewalk.tile_cm * k, width * k, g.sidewalk.concrete_cm * k, { fill: UGC.concrete, stroke: "#4b5563", w: 1 }));
      S.top(vd(x0 - 44, G, G + (g.sidewalk.tile_cm + g.sidewalk.concrete_cm) * k, `${g.sidewalk.concrete_cm} cm ${g.sidewalk.concrete}`, { color: C.dim, size: 10.5, left: true }));
    } else {
      S.add(surfaceLine(0, W, G));
      // κτίριο αριστερά – Α > 50 cm
      S.add(rect(40, 20, 120, Hd - 20, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 }));
      S.top(hd(yB + 22, 160, x0, `A > ${cm(g.building_gap_cm)} (εάν είναι δυνατό)`, { color: C.dim, size: 10.5, below: true }));
    }
    // πλέγμα σήμανσης
    const yMesh = G + g.mesh_cm * k;
    S.add(line(x0 + 8, yMesh, x1 - 8, yMesh, { stroke: UGC.mesh, w: 3 }));
    S.top(vd(x0 - 14, G, yMesh, cm(g.mesh_cm), { color: UGC.mesh, size: 11, left: true }));
    // στάθμες καλωδίων (από κάτω προς τα πάνω)
    const yCab = [];
    for (let j = 0; j < lv; j++) {
      const yc = L - 10 - j * (sp.cable_to_tile + 10 + sp.cable_to_next_tile);           // άξονας καλωδίων στάθμης j (cm από την επιφάνεια)
      yCab.push(yc);
      const yt = yc - sp.cable_to_tile - 3;                                               // πλάκα προστασίας 3 cm πάνω από το καλώδιο+10
      S.add(tileRect((x0 + x1) / 2 - tile * k / 2, G + yt * k, tile * k, 3 * k));
      const xs = nCab === 1 ? [(x0 + x1) / 2] : nCab === 2 ? [(x0 + x1) / 2 - 10 * k, (x0 + x1) / 2 + 10 * k] : [(x0 + x1) / 2 - 20 * k, (x0 + x1) / 2, (x0 + x1) / 2 + 20 * k];
      const col = lv > 1 ? (j === lv - 1 ? UGC.cable : UGC.cableMT) : (volt === "XT" ? UGC.cable : UGC.cableMT);   // U-2I: ΧΤ στην ανώτερη στάθμη
      xs.forEach(x => S.add(cableDot(x, G + yc * k, col, 6)));
      if (nCab > 1) S.top(hd(G + yc * k - 16, xs[0], xs[1], cm(20), { color: C.acc, size: 10.5 }));
      if (j === 0) S.top(vd(x1 + 14, G + (yt - 10) * k, yB, "10 / 10 / 10 cm", { color: C.dim, size: 10, ly: G + yc * k - 4 }));
      else S.top(vd(x1 + 14, G + (yt - 10) * k, G + yc * k, "10 / 10 cm", { color: C.dim, size: 10 }));
    }
    for (let j = 1; j < lv; j++) { const ya = G + yCab[j] * k, yb = G + (yCab[j - 1] - sp.cable_to_tile - 3) * k; S.top(vd(x0 - 14, ya, yb, cm(sp.cable_to_next_tile), { color: C.dim, size: 10, left: true })); }
    // διαστάσεις: βάθος ℓ, πλάτος, πλάκα
    S.top(vd(x1 + 56, G, yB, `ℓ = ${cm(L)}`, { color: C.acc, size: 12.5, ext: x1 }));
    S.top(hd(yB + 22, x0, x1, cm(width), { color: C.acc, size: 11.5, below: true, ext: yB }));
    S.top(hd(G + (yCab[yCab.length - 1] - sp.cable_to_tile - 3) * k - 14, (x0 + x1) / 2 - tile * k / 2, (x0 + x1) / 2 + tile * k / 2, cm(tile), { color: C.warn, size: 10.5 }));
    // υπόμνημα
    S.key("Προϊόντα εκσκαφής ή αμμοχάλικο Π.Τ.Π. Ο-150 (επίχωση)", { x: x0 + 20, y: G + 14 * k, lx: x0 - 90, ly: G + 60, color: C.muted });
    S.key(`Πλέγμα σήμανσης σε βάθος ${cm(g.mesh_cm)} από την επιφάνεια${side ? " της πλάκας πεζοδρομίου" : ""}`, { x: x1 - 12, y: yMesh, lx: x1 + 170, ly: yMesh - 6, color: UGC.mesh });
    S.key(`Πλάκα προστασίας (επικάλυψης) υπόγειων καλωδίων – πλάτος ${cm(tile)}`, { x: (x0 + x1) / 2 + tile * k / 2, y: G + (yCab[0] - sp.cable_to_tile - 2) * k, lx: x1 + 170, ly: G + (yCab[0] - sp.cable_to_tile - 2) * k + 4, color: C.warn });
    S.key(`Υπόγειο καλώδιο ${lv > 1 ? "ΧΤ (ανώτερη στάθμη) / ΜΤ ή ΧΤ (κατώτερες)" : (volt === "XT" ? "ΧΤ" : "ΜΤ")} – ${nCab} στην ίδια στάθμη${lv > 1 ? `, ${lv} στάθμες` : ""}, αξονική απόσταση 20 cm`, { x: (x0 + x1) / 2 - (nCab > 1 ? 10 * k : 0), y: G + yCab[0] * k, lx: x0 - 90, ly: G + yCab[0] * k - 12, color: C.warn });
    S.key("Κοσκινισμένα προϊόντα εκσκαφής ή άμμος (10 cm κάτω / 10 cm πάνω από το καλώδιο)", { x: x1 - 12, y: yB - 6, lx: x1 + 170, ly: yB + 30, color: "#d9c27a" });
    if (side) S.key(`Πλάκα πεζοδρομίου πάνω σε σκυρόδεμα ${g.sidewalk.concrete} πάχους ${g.sidewalk.concrete_cm} cm (${g.sidewalk.cement_kg_m3} kg/m³ min)`, { x: x0 - 30, y: G + 2, lx: x0 - 120, ly: G - 30, color: C.dim });
    S.note(`${lv > 1 ? "U-2I / U-2AI" : (side ? "U-2A" : "U-2")}: βάθος χάνδακα ℓ = ${cm(L)} ${lv > 1 ? `(${lv} στάθμες – στην ίδια στάθμη μέχρι 3 καλώδια της ίδιας τάσης λειτουργίας)` : `για ${(g.volt_labels || {})[volt] || volt}`}· πλάτος ${cm(width)}· πλάκα ${cm(tile)}· άμμος 10/10/10 cm· πλέγμα σήμανσης ${cm(g.mesh_cm)}. Στην ίδια στάθμη τοποθετούνται καλώδια της ίδιας τάσης λειτουργίας. Τομή – μιμικό (κλίμακα ενδεικτική).`, C.text);
    addNotes(S, UG.notes.slice(lv > 1 ? 2 : (side ? 1 : 0), lv > 1 ? 3 : (side ? 2 : 1)));
    return S.render(`Εγκατάσταση υπόγειων καλωδίων ΜΤ / ΧΤ σε χάνδακα – ${lv > 1 ? "U-2I / U-2AI" : (side ? "U-2A (κάτω από πεζοδρόμιο)" : "U-2 (ανοιχτό έδαφος)")}`);
  }

  // ---------------------------------------------------------------- 23. Διαβάσεις κάτω από οδοστρώματα (U-2Β1 / U-2Γ1)
  function drawUgRoad(st) {
    const g = UGR.geom, mode = st.mode || "N1";
    const normal = mode.charAt(0) === "N", rows = normal ? +mode.charAt(1) : 1, pipes = normal ? 3 : +mode.charAt(1), a = normal ? 0 : Math.max(20, Math.min(80, +st.a || 40));
    const W = 900, k = 2.1, G = 90;
    const width = normal ? g.normal.width : g.shallow.widths[String(pipes)];
    const blockTop = normal ? g.normal[String(rows)].to_pipe_top - g.normal.concrete_above : a;                 // άνω επιφάνεια σκυροδέματος (cm)
    const blockH = normal ? g.normal.concrete_above + rows * g.pipe_cm + (rows - 1) * g.normal.row_gap + g.normal.concrete_below : g.shallow.slab + g.pipe_cm + g.shallow.slab;
    const L = normal ? g.normal[String(rows)].depth : blockTop + blockH;
    const Hd = Math.max(300, G + L * k + 60);
    const S = new Scene(W, Hd);
    const x0 = 300, x1 = x0 + width * k, yB = G + L * k;
    S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }));
    // οδόστρωμα: άσφαλτος 10 cm σε όλο το πλάτος, χάνδακας με αμμοχάλικο
    S.add(rect(x0, G, width * k, L * k, { fill: UGC.gravel, stroke: "#2c2620", w: 1.5 }));
    S.add(rect(0, G - 4, W, g.asphalt_cm * k + 4, { fill: UGC.asphalt, stroke: "#111", w: 1 }));
    S.add(car(150, G - 4, { w: 60 }));
    S.top(vd(x0 - 14, G, G + g.asphalt_cm * k, cm(g.asphalt_cm), { color: C.dim, size: 10, left: true }));
    // πλέγμα σήμανσης
    const meshOn = normal || a > g.shallow.mesh_if_a_over;
    if (meshOn) { const ym = G + g.mesh_cm * k; S.add(line(x0 + 8, ym, x1 - 8, ym, { stroke: UGC.mesh, w: 3 })); S.top(vd(x0 - 14, G + g.asphalt_cm * k, ym, cm(g.mesh_cm - g.asphalt_cm), { color: UGC.mesh, size: 10, left: true })); S.key(`Πλέγμα σήμανσης σε βάθος ${cm(g.mesh_cm)}${normal ? "" : " (τοποθετείται μόνο για α > 60 cm)"}`, { x: x1 - 12, y: ym, lx: x1 + 120, ly: ym - 20, color: UGC.mesh }); }
    // σκυρόδεμα C12/15 με σωλήνες PVC Φ16
    const yT = G + blockTop * k;
    S.add(rect(x0, yT, width * k, blockH * k, { fill: UGC.concrete, stroke: "#4b5563", w: 1 }));
    for (let i = 0; i < Math.ceil(width / 6); i++) S.add(line(x0 + i * 12, yT + blockH * k, x0 + i * 12 + 10, yT, { stroke: "#6b7280", w: 0.6 }));
    const r = g.pipe_cm * k / 2;
    for (let rr = 0; rr < rows; rr++) {
      const yc = yT + (normal ? g.normal.concrete_above : g.shallow.slab) * k + r + rr * (g.pipe_cm + g.normal.row_gap) * k;
      for (let p = 0; p < pipes; p++) { const xc = x0 + (g.gap_cm + g.pipe_cm / 2 + p * (g.pipe_cm + g.gap_cm)) * k; S.add(pipeDot(xc, yc, r, { fill: "#0b1a24", stroke: UGC.pipe, cable: UGC.cable })); }
      if (rr === 0) S.top(vd(x1 + 14, yc - r, yc + r, cm(g.pipe_cm), { color: C.dim, size: 10 }));
    }
    // δομικό πλέγμα Τ196
    const ymB = yT + blockH * k - g.normal.mesh_from_bottom * k;
    S.add(line(x0 + 4, ymB, x1 - 4, ymB, { stroke: "#f8fafc", w: 2, dash: "6 3" }));
    if (!normal) { const ymT = yT + g.shallow.mesh_cover * k; S.add(line(x0 + 4, ymT, x1 - 4, ymT, { stroke: "#f8fafc", w: 2, dash: "6 3" })); S.key(`Δομικό πλέγμα Τ196 στις δύο πλάκες (3 cm από τις επιφάνειες)${a > g.shallow.no_top_reinf_if_a_over ? " – για α > 60 cm παραλείπεται ο οπλισμός της πάνω πλάκας" : ""}`, { x: x1 - 8, y: ymB, lx: x1 + 120, ly: ymB + 24, color: "#f8fafc" }); }
    else S.key("Δομικό πλέγμα Τ196 στο κάτω σκυρόδεμα (3 cm από τον πυθμένα)", { x: x1 - 8, y: ymB, lx: x1 + 120, ly: ymB + 24, color: "#f8fafc" });
    // διαστάσεις
    S.top(vd(x1 + 56, G, yB, cm(L), { color: C.acc, size: 12.5, ext: x1 }));
    if (normal) { S.top(vd(x1 + 96, G, yT + g.normal.concrete_above * k, cm(g.normal[String(rows)].to_pipe_top), { color: C.dim, size: 10.5 })); S.top(vd(x1 + 14, yT, yT + g.normal.concrete_above * k, cm(g.normal.concrete_above), { color: C.dim, size: 10 }) + vd(x1 + 14, yT + blockH * k - g.normal.concrete_below * k, yT + blockH * k, cm(g.normal.concrete_below), { color: C.dim, size: 10 })); }
    else { S.top(vd(x1 + 96, G, yT, `α = ${cm(a)}`, { color: C.warn, size: 12 })); S.top(vd(x1 + 14, yT, yT + g.shallow.slab * k, cm(g.shallow.slab), { color: C.dim, size: 10 }) + vd(x1 + 14, yT + blockH * k - g.shallow.slab * k, yT + blockH * k, cm(g.shallow.slab), { color: C.dim, size: 10 })); }
    S.top(hd(yB + 22, x0, x1, cm(width), { color: C.acc, size: 11.5, below: true, ext: yB }));
    S.top(hd(yT - 10, x0, x0 + g.gap_cm * k, "5", { color: C.dim, size: 9.5 }) + hd(yT - 10, x0 + g.gap_cm * k, x0 + (g.gap_cm + g.pipe_cm) * k, "16", { color: C.dim, size: 9.5 }));
    S.key(`Σωλήνες PVC Φ16 (Φ160) εγκιβωτισμένοι σε σκυρόδεμα ${g.concrete} (${g.cement_kg_m3} kg/m³ min) – ${pipes} σωλήνες${rows > 1 ? ` × ${rows} σειρές` : ""}, 5 cm μεταξύ τους και από τα τοιχώματα`, { x: x0 + (g.gap_cm + g.pipe_cm / 2) * k, y: yT + (normal ? g.normal.concrete_above : g.shallow.slab) * k + r, lx: x0 - 110, ly: yT + 40, color: UGC.pipe });
    S.key(normal ? "Αμμοχάλικο Π.Τ.Π. Ο-150 από την άσφαλτο έως το σκυρόδεμα" : "Αμμοχάλικο Π.Τ.Π. Ο-150 – βάθος α έως την άνω πλάκα (ανεπαρκές βάθος)", { x: x0 + 16, y: G + 24 * k, lx: x0 - 110, ly: G + 40 * k, color: C.muted });
    S.key("Άσφαλτος οδοστρώματος 10 cm", { x: 60, y: G + 4, lx: 60, ly: G - 30, color: C.dim });
    if (normal) S.note(`U-2Β1 (κανονικά βάθη): ${rows} σειρά${rows > 1 ? "ές" : ""} σωλήνων – βάθος χάνδακα ${cm(L)}, άνω επιφάνεια σωλήνων στα ${cm(g.normal[String(rows)].to_pipe_top)}, πλάτος ${cm(width)}· τρίτη σειρά κάτω από τις δύο → βάθος ~ ${cm(g.normal.third_row_depth)}. Ελάχιστο πλάτος 40 cm για 1 σωλήνα.`, C.text);
    else S.note(`U-2Γ1 (ανεπαρκή βάθη): πλάκες ${g.concrete} πάχους ${cm(g.shallow.slab)} πάνω και κάτω από τους σωλήνες με δομικό πλέγμα Τ196 (κάλυψη 3 cm)· α = ${cm(a)} ${a > g.shallow.no_top_reinf_if_a_over ? "> 60 cm → χωρίς οπλισμό στην πάνω πλάκα, με πλέγμα σήμανσης" : "≤ 60 cm → οπλισμένη πάνω πλάκα, χωρίς πλέγμα σήμανσης"}· πλάτος ${cm(width)} για ${pipes} σωλήνες. Στη μετάβαση προς το πεζοδρόμιο τοποθετούνται 2 πλάκες μέχρι τα καλώδια να αποκτήσουν κανονικό βάθος.`, C.text);
    S.note("Όταν τα καλώδια τοποθετούνται μέσα σε σωλήνες παραλείπονται οι πλάκες προστασίας από σκυρόδεμα (U-1). Τομή κάθετα στη διάβαση – μιμικό.");
    return S.render(`Διάβαση υπόγειων καλωδίων κάτω από οδόστρωμα – ${normal ? "U-2Β1 (κανονικά βάθη)" : "U-2Γ1 (ανεπαρκή βάθη)"}`);
  }

  // ---------------------------------------------------------------- 24. Εδάφη με κλίση > 10 % (U-2Δ)
  function drawUgSlope(st) {
    const g = UGS.geom, volt = st.volt || "MT", bv = g.by_volt[volt], L = bv.depth, am = bv.mesh;
    const W = 900, k = 2.1, G = 110, Hd = Math.max(400, G + L * k + 50);
    const S = new Scene(W, Hd);
    // αριστερά: τομή κατά μήκος της κλίσης (σχηματικά)
    const sx0 = 40, sx1 = 300, sy0 = 60, sy1 = 160;
    S.add(poly([[sx0, sy0 + 40], [sx1, sy0], [sx1, Hd - 10], [sx0, Hd - 10]], { fill: UGC.soil, stroke: "none", w: 0 }));
    const band = (dy, h, col) => poly([[sx0, sy0 + 40 + dy], [sx1, sy0 + dy], [sx1, sy0 + dy + h], [sx0, sy0 + 40 + dy + h]], { fill: col, stroke: "none", w: 0 });
    S.add(band(0, 50, UGC.gravel) + band(50, 10, UGC.tile) + band(60, 30, UGC.mortar) + band(90, 50, UGC.sand));
    S.add(line(sx0, sy0 + 40 + 115, sx1, sy0 + 115, { stroke: UGC.cable, w: 5 }));
    S.add(line(sx0, sy0 + 40 + 30, sx1, sy0 + 30, { stroke: UGC.mesh, w: 2.5 }));
    S.top(pill(sx0 + 4, sy0 + 20, "κλίση > 10 %", { size: 10.5, fill: C.warn, bold: true }));
    S.key("Τομή κατά μήκος της κλίσης: το τσιμεντοκονίαμα (15 cm) πάνω από την άμμο συγκρατεί άμμο και πλάκες στο επικλινές έδαφος", { x: sx0 + 120, y: sy0 + 40 + 75 - 16 * 120 / 260, lx: sx0 + 120, ly: sy1 + 90, color: UGC.mortar });
    // δεξιά: ΤΟΜΗ Α-Α'
    const x0 = 470, width = g.width_cm, x1 = x0 + width * k, yB = G + L * k;
    S.add(rect(x0 - 60, G, W - x0 + 60, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }));
    S.add(rect(x0, G, width * k, L * k, { fill: UGC.gravel, stroke: "#2c2620", w: 1.5 }));
    const yCab = L - g.sand_below_cm, ySandTop = yCab - g.sand_above_cm, yMortTop = ySandTop - g.mortar_cm, yTile = yMortTop - 3;
    S.add(rect(x0, G + ySandTop * k, width * k, (L - ySandTop) * k, { fill: UGC.sand, stroke: "none", w: 0 }));
    S.add(rect(x0, G + yMortTop * k, width * k, g.mortar_cm * k, { fill: UGC.mortar, stroke: "none", w: 0 }));
    S.add(tileRect((x0 + x1) / 2 - g.tile_cm * k / 2, G + yTile * k, g.tile_cm * k, 3 * k));
    const ym = G + am * k; S.add(line(x0 + 8, ym, x1 - 8, ym, { stroke: UGC.mesh, w: 3 }));
    [-10, 10].forEach(d => S.add(cableDot((x0 + x1) / 2 + d * k, G + yCab * k, volt === "XT" ? UGC.cable : UGC.cableMT, 6)));
    S.add(surfaceLine(x0 - 60, W, G));
    S.top(pill(x0 + 10, G - 10, "ΤΟΜΗ Α – Α'", { size: 11, fill: C.text, bold: true }));
    S.top(vd(x0 - 14, G, ym, `a = ${cm(am)}`, { color: UGC.mesh, size: 11, left: true }));
    S.top(vd(x1 + 56, G, yB, `ℓ = ${cm(L)}`, { color: C.acc, size: 12.5, ext: x1 }));
    S.top(vd(x1 + 14, G + yMortTop * k, G + ySandTop * k, cm(g.mortar_cm), { color: UGC.mortar, size: 10 }) + vd(x1 + 14, G + ySandTop * k, G + yCab * k, cm(g.sand_above_cm), { color: C.dim, size: 10 }) + vd(x1 + 14, G + yCab * k, yB, cm(g.sand_below_cm), { color: C.dim, size: 10 }));
    S.top(hd(G + yCab * k - 16, (x0 + x1) / 2 - 10 * k, (x0 + x1) / 2 + 10 * k, cm(g.spacing_cm), { color: C.acc, size: 10.5 }));
    S.top(hd(G + yTile * k - 12, (x0 + x1) / 2 - g.tile_cm * k / 2, (x0 + x1) / 2 + g.tile_cm * k / 2, cm(g.tile_cm), { color: C.warn, size: 10.5 }));
    S.top(hd(yB + 22, x0, x1, cm(width), { color: C.acc, size: 11.5, below: true, ext: yB }));
    S.key(`Πλέγμα σήμανσης σε βάθος a = ${cm(am)} (${(g.volt_labels || {})[volt] || volt})`, { x: x1 - 12, y: ym, lx: x1 + 110, ly: ym - 22, color: UGC.mesh });
    S.key("Πλάκα προστασίας (επικάλυψης) 35 cm", { x: (x0 + x1) / 2 + g.tile_cm * k / 2, y: G + yTile * k + 3, lx: x1 + 110, ly: G + yTile * k + 44, color: C.warn });
    S.key("Τσιμεντοκονίαμα 15 cm – 100 kg τσιμέντου ανά 1 m³ άμμου λατομείου", { x: x1 - 10, y: G + (yMortTop + 7) * k, lx: x1 + 110, ly: G + (yMortTop + 7) * k + 24, color: UGC.mortar });
    S.key(`Υπόγεια καλώδια ${volt === "XT" ? "ΧΤ" : "ΜΤ"} σε κοσκινισμένα προϊόντα εκσκαφής ή άμμο (10 cm κάτω / 10 cm πάνω)`, { x: (x0 + x1) / 2 - 10 * k, y: G + yCab * k, lx: x0 - 50, ly: G + yCab * k + 30, color: C.warn });
    addNotes(S, UGS.notes);
    return S.render("Εγκατάσταση καλωδίων ΜΤ / ΧΤ σε εδάφη με κλίση > 10 % (U-2Δ)");
  }

  // ---------------------------------------------------------------- 25. Γειτνιάσεις – παράλληλη όδευση (U-3 / U-3I / U-3A)
  function drawUgProximity(st) {
    const g = UGP.geom, type = st.type || "HV", volt = st.volt || "MT", L = g.depth[volt], bar = st.bar === "19" ? "19" : "4";
    const W = 900, k = 210, G = 80;                       // k px / m
    if (type === "GAS") {
      // κάτοψη U-3A: καλώδιο ΜΤ/ΧΤ κατακόρυφο, αγωγός αερίου που πλησιάζει· a ≥ D χωρίς μέτρα, a < D πλάκα θερμικής προστασίας στο a/2
      const D = bar === "19" ? g.gas.D19 : g.gas.D4, a = Math.max(0.05, Math.min(1.5, +st.a || 0.2)), need = a < D, Hd = 430, kg = 140;
      const S = new Scene(W, Hd);
      S.add(rect(0, 30, W, Hd - 30, { fill: "#1b2620", stroke: "none", w: 0 }));
      const xc = 260, xg = xc + a * kg;
      S.add(line(xc, 40, xc, Hd - 10, { stroke: volt === "XT" ? UGC.cable : UGC.cableMT, w: 6 }));
      // αγωγός αερίου: ευθύ τμήμα κοντά στο καλώδιο μεταξύ y 150 – 290, καμπύλες απομάκρυνσης εκατέρωθεν
      S.add(path(`M${xg + 160},40 C${xg + 60},90 ${xg},110 ${xg},150 L${xg},290 C${xg},330 ${xg + 60},360 ${xg + 160},${Hd - 10}`, { stroke: UGC.gas, w: 9, cap: "round" }));
      S.top(hd(220, xc, xg, `a = ${m2(a)} m ${need ? "<" : "≥"} D = ${m2(D)} m`, { color: need ? C.no : C.ok, size: 12 }));
      if (need) {
        const xp = xc + a * kg / 2, pe = g.gas.plate_ext * kg;
        S.add(rect(xp - 5, 150 - pe, 10, 140 + 2 * pe, { fill: UGC.concrete, stroke: "#e5e7eb", w: 1 }));
        S.top(hd(150 - pe - 12, xc, xp, "a/2", { color: C.warn, size: 11 }));
        S.top(vd(xc - 30, 150 - pe, 150, `${m2(g.gas.plate_ext)} m`, { color: C.warn, size: 11, left: true }) + vd(xc - 30, 290, 290 + pe, `${m2(g.gas.plate_ext)} m`, { color: C.warn, size: 11, left: true }));
        S.key(`Πλάκα θερμικής προστασίας ${g.gas.plate.w * 100} × ${g.gas.plate.h * 100} cm, πάχους ${g.gas.plate.t * 100} cm (σχάρα ${g.gas.grid}), σε απόσταση a/2 από το καλώδιο – προεκτείνεται ${m2(g.gas.plate_ext)} m πέρα από τη ζώνη όπου a < D`, { x: xp, y: 250, lx: xc - 150, ly: 262, color: C.warn });
      } else S.key("a ≥ D: δεν λαμβάνεται κανένα προστατευτικό μέτρο (Σχήμα 1)", { x: (xc + xg) / 2, y: 240, lx: (xc + xg) / 2 - 60, ly: 330, color: C.ok });
      S.key(`Υπόγειο καλώδιο ${volt === "XT" ? "ΧΤ" : "ΜΤ"} του ΔΕΔΔΗΕ (κάτοψη)`, { x: xc, y: 70, lx: xc - 90, ly: 70, color: C.warn, side: "left" });
      S.key(`Αγωγός φυσικού αερίου – μέγιστη πίεση λειτουργίας ${bar} bar → D = ${m2(D)} m`, { x: xg + 120, y: 60, lx: xg + 200, ly: 100, color: UGC.gas });
      S.top(tag(16, Hd - 12, need ? `a < D → ΑΠΑΙΤΕΙΤΑΙ πλάκα θερμικής προστασίας (U-3A Σχήμα 2)` : `a ≥ D → χωρίς προστατευτικά μέτρα (U-3A Σχήμα 1)`, { fill: need ? C.no : C.ok, size: 11 }));
      addNotes(S, [UGP.notes[3], UGP.notes[4]]);
      S.note("Κάτοψη – μιμικό (όχι υπό κλίμακα).");
      return S.render("Γειτνίαση υπόγειου καλωδίου ΜΤ / ΧΤ με αγωγό φυσικού αερίου (U-3A)");
    }
    const yB0 = G + L * k, Hd = type === "HV" ? yB0 - 0.10 * k + g.A.a1 * k + 100 : type === "MV3" ? yB0 + 100 : yB0 + 170;
    const S = new Scene(W, Hd);
    S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }));
    S.add(surfaceLine(0, W, G));
    const x0 = 300, width = g.width, x1 = x0 + width * k, yB = yB0, yc = yB - 0.10 * k, xcab = (x0 + x1) / 2, col = volt === "XT" ? UGC.cable : UGC.cableMT;
    const trench = (xa, wa, La, tileW, cabCol, labelCab) => {
      S.add(rect(xa, G, wa * k, La * k, { fill: UGC.gravel, stroke: "#2c2620", w: 1.5 }));
      S.add(rect(xa, G + (La - 0.30) * k, wa * k, 0.30 * k, { fill: UGC.sand, stroke: "none", w: 0 }));
      S.add(line(xa + 8, G + 0.30 * k, xa + wa * k - 8, G + 0.30 * k, { stroke: UGC.mesh, w: 3 }));
      S.add(tileRect(xa + wa * k / 2 - tileW * k / 2, G + (La - 0.23) * k, tileW * k, 0.03 * k));
    };
    trench(x0, width, L, g.tile, col);
    if (type === "MV3") S.top(vd(x0 - 14, G, yB, `ℓ = ${m2(L)} m`, { color: C.acc, size: 12, ext: x0, ly: G + 26, left: true }));
    else S.top(vd(x1 + 14, G, yB, `ℓ = ${m2(L)} m`, { color: C.acc, size: 12, ext: x1, ly: G + 26 }));
    S.top(hd(G - 10, x0, x1, `${m2(width)} m`, { color: C.acc, size: 11 }));
    if (type === "MV3") {
      // U-3I: δεύτερος χάνδακας τρίτων δεξιά· a μεταξύ των πλησιέστερων καλωδίων
      const a = Math.max(0.1, Math.min(1.2, +st.a || g.third.usual)), diff = st.loss === "DIFF", amin = diff ? g.third.different : g.third.usual, ok = diff ? a > amin : a >= amin - 1e-9;
      const x2 = x1 + 0.12 * k, w2 = 0.5;
      S.add(rect(x2, G, w2 * k, (L + 0.12) * k, { fill: "#56503f", stroke: "#2c2620", w: 1.5 }));
      S.add(line(x2 + 8, G + 0.3 * k, x2 + w2 * k - 8, G + 0.3 * k, { stroke: "#e879f9", w: 3 }));
      S.add(tileRect(x2 + w2 * k / 2 - 0.175 * k, G + (L + 0.12 - 0.23) * k, 0.35 * k, 0.03 * k));
      const xn1 = xcab - 0.10 * k, xn2 = xcab + 0.10 * k, xt1 = xn2 + a * k, xt2 = xt1 + 0.20 * k;
      S.add(cableDot(xn1, yc, col, 6) + cableDot(xn2, yc, col, 6) + cableDot(xt1, yc + 0.12 * k, UGC.third, 6) + cableDot(xt2, yc + 0.12 * k, UGC.third, 6));
      S.top(hd(yB + 24, xn2, xt1, `a = ${m2(a)} m ${ok ? "✓" : "✗"} (απαιτείται ${diff ? ">" : "≥"} ${m2(amin)} m)`, { color: ok ? C.ok : C.no, size: 12, below: true, ext: yc + 0.12 * k }));
      if (diff) { const xp = xn2 + a * k / 2; S.add(rect(xp - 4, G + 0.35 * k, 8, (L - 0.25) * k, { fill: UGC.concrete, stroke: "#e5e7eb", w: 1 })); S.key("Θερμική απομόνωση μεταξύ των δύο καλωδίων κατά U-3A (πλάκα θερμικής προστασίας)", { x: xp, y: G + 0.6 * k, lx: xp, ly: G + 0.2 * k, color: C.warn }); }
      S.key("Υπόγεια καλώδια ΜΤ ή ΧΤ του ΔΕΔΔΗΕ (χάνδακας b × ℓ κατά U-2 / U-2A)", { x: xn1, y: yc, lx: x0 - 110, ly: yc + 30, color: C.warn });
      S.key("Υπόγεια καλώδια ΜΤ τρίτων (ιδιωτικά δίκτυα σταθμών ΑΠΕ, άλλων φορέων κτλ.) με δικό τους πλέγμα και πλάκα", { x: xt2, y: yc + 0.12 * k, lx: xt2 + 60, ly: yc + 60, color: UGC.third });
      S.top(tag(16, Hd - 12, ok ? `a ${diff ? ">" : "≥"} ${m2(amin)} m – ΕΝΤΑΞΕΙ${diff ? " (με θερμική απομόνωση U-3A)" : ""}` : `a < ${m2(amin)} m – ΑΝΕΠΑΡΚΗΣ απόσταση παράλληλης όδευσης`, { fill: ok ? C.ok : C.no, size: 11 }));
      addNotes(S, [UGP.notes[2]]);
      S.note("Τομή – μιμικό (όχι υπό κλίμακα).");
      return S.render("Παράλληλη όδευση καλωδίων ΜΤ / ΧΤ ΔΕΔΔΗΕ με υπόγεια καλώδια ΜΤ τρίτων (U-3I)");
    }
    S.add(cableDot(xcab, yc, col, 7));
    if (type === "HV") {
      const a1 = g.A.a1, a2 = g.A.a2, xh = xcab + a2 * k, yh = yc + a1 * k;
      S.add(rect(xh - 26, yh - 26, 52, 52, { fill: "#3d3250", stroke: "#2c2620", w: 1 }) + cableDot(xh, yh, UGC.hv, 9));
      S.top(vd(xh + 40, yc, yh, `a1 ≥ ${m2(a1)} m`, { color: UGC.hv, size: 12, ext: xh }));
      S.top(hd(yh + 40, xcab, xh, `a2 ≥ ${m2(a2)} m`, { color: UGC.hv, size: 12, below: true, ext: yh }));
      S.key("Υπόγειο καλώδιο ΥΤ (150 kV) – Σχήμα Α: πρέπει α1 ≥ 0,90 m ΚΑΙ α2 ≥ 0,60 m", { x: xh, y: yh, lx: xh + 90, ly: yh - 50, color: UGC.hv });
    } else if (type === "TEL" || type === "FO") {
      const fo = type === "FO", a1 = fo ? g.B_FO[volt === "XT" ? "XT" : "MT"].a1 : g.B.a1, a2 = fo ? g.B_FO[volt === "XT" ? "XT" : "MT"].a2 : g.B.a2;
      const xt = x1 + 0.25 * k, yt = yc - 0.25 * k;
      S.add(cableDot(xt, yt, UGC.tel, 6));
      S.add(pipeDot(xcab, yc, 14, { fill: "none", stroke: fo ? "#94a3b8" : UGC.steel, w: 2.5 }));
      S.top(vd(xt + 26, yt, yc, `α1 ≥ ${m2(a1)} m`, { color: UGC.tel, size: 11.5, ext: xt }));
      S.top(hd(yc + 36, xcab, xt, `α2 ≥ ${m2(a2)} m`, { color: UGC.tel, size: 11.5, below: true, ext: yc }));
      S.key(fo ? "Καλώδιο οπτικών ινών χωρίς αγώγιμο εξάρτημα – Σχήμα Β: δεν θεωρείται γειτνίαση όταν α1 ≥ ή α2 ≥ τις τιμές (ΧΤ 0,05 m · ΜΤ 0,30 m)" : "Υπόγειο καλώδιο τηλεπικοινωνίας – Σχήμα Β: δεν θεωρείται γειτνίαση όταν α1 ≥ 0,30 m ή α2 ≥ 0,30 m", { x: xt, y: yt, lx: xt + 80, ly: yt - 40, color: UGC.tel });
      S.key(fo ? "Σε γειτνίαση: ΜΗ αγώγιμος σωλήνας προστασίας του καλωδίου ΜΤ / ΧΤ (οπτικές ίνες), προέκταση 0,60 m εκατέρωθεν" : "Σε γειτνίαση: γαλβανισμένος σιδηροσωλήνας προστασίας του καλωδίου ΜΤ / ΧΤ, προέκταση 0,60 m εκατέρωθεν", { x: xcab - 14, y: yc, lx: x0 - 110, ly: yc + 40, color: UGC.steel });
    } else {   // WATER
      const a2 = g.G.a2, xw = x1 + 0.22 * k;
      S.add(pipeDot(xw, yc, 13, { fill: "#0e3a44", stroke: UGC.water, w: 2.5 }) + line(xw - 7, yc + 2, xw + 7, yc + 2, { stroke: UGC.water, w: 1 }));
      S.add(pipeDot(xcab, yc, 14, { fill: "none", stroke: UGC.steel, w: 2.5 }));
      S.top(hd(yc - 30, xcab, xw, `α2 ≥ ${m2(a2)} m`, { color: UGC.water, size: 12, ext: yc }));
      S.key("Υπόγειος σωλήνας ύδατος κ.λπ. – Σχήμα Γ: δεν θεωρείται γειτνίαση όταν α2 ≥ 0,30 m", { x: xw, y: yc, lx: xw + 80, ly: yc + 50, color: UGC.water });
      S.key("Σε γειτνίαση: γαλβανισμένος σιδηροσωλήνας προστασίας του καλωδίου ΜΤ / ΧΤ, προέκταση 0,60 m εκατέρωθεν της γειτνίασης", { x: xcab - 14, y: yc, lx: x0 - 110, ly: yc + 40, color: UGC.steel });
    }
    S.key(`Υπόγειο καλώδιο ${(g.volt_labels || {})[volt] || volt} του ΔΕΔΔΗΕ σε χάνδακα κατά U-2 (πλάτος 0,50 m, πλάκα 0,35 m, πλέγμα σήμανσης 0,30 m)`, { x: xcab, y: yc - 8, lx: x0 - 110, ly: G + 40, color: C.warn });
    // κάτοψη σωλήνα προστασίας (μικρό ένθετο) για Β / Γ
    if (type !== "HV") {
      const ix = 560, iy = Hd - 120;
      S.add(rect(ix - 10, iy - 44, 330, 114, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 6 }));
      S.add(line(ix, iy, ix + 310, iy, { stroke: col, w: 3 }));
      S.add(rect(ix + 70, iy - 8, 170, 16, { fill: "none", stroke: UGC.steel, w: 2 }));
      S.add(line(ix + 70 + g.pipe_ext * 100, iy - 30, ix + 240 - g.pipe_ext * 100, iy - 30, { stroke: UGC.tel, w: 2, dash: "6 4" }));
      S.top(hd(iy + 26, ix + 70, ix + 70 + g.pipe_ext * 100, `${m2(g.pipe_ext)} m`, { color: UGC.steel, size: 10, below: true }) + hd(iy + 26, ix + 240 - g.pipe_ext * 100, ix + 240, `${m2(g.pipe_ext)} m`, { color: UGC.steel, size: 10, below: true }));
      S.top(pill(ix - 4, iy + 62, "κάτοψη: σωλήνας προστασίας εκατέρωθεν της γειτνίασης", { size: 10, fill: C.muted }));
    }
    S.top(tag(16, Hd - 12, `Σχήμα ${type === "HV" ? "Α" : (type === "WATER" ? "Γ" : "Β")} – ${(g.volt_labels || {})[volt] || volt}: ℓ = ${m2(L)} m`, { fill: C.acc, size: 11 }));
    addNotes(S, [UGP.notes[0], type === "TEL" || type === "FO" ? UGP.notes[1] : UGP.notes[4]]);
    S.note("Τομή – μιμικό (όχι υπό κλίμακα).");
    return S.render(`Γειτνιάσεις υπόγειων καλωδίων ΜΤ / ΧΤ – ${type === "HV" ? "με υπόγειο καλώδιο ΥΤ (U-3 Σχήμα Α)" : type === "WATER" ? "με υπόγειο σωλήνα ύδατος (U-3 Σχήμα Γ)" : type === "FO" ? "με καλώδιο οπτικών ινών (U-3 Σχήμα Β)" : "με καλώδιο τηλεπικοινωνίας (U-3 Σχήμα Β)"}`);
  }

  // ---------------------------------------------------------------- 26. Διασταυρώσεις (U-4I / U-4II / U-4III / U-4IV / U-4A)
  function ugCrossCalc(st) {
    const g = UGX.geom, type = st.type || "TEL", bar = st.bar === "19" ? "19" : "4";
    const lim = type === "HV" ? g.HV.a : type === "TEL" ? g.TEL.a : type === "WATER" ? g.WATER.a : type === "NEW3RD" ? g.NEW3RD.a : type === "OLD3RD" ? g.OLD3RD.a : (bar === "19" ? g.gas.D19 : g.gas.D4);
    const a = Math.max(0.05, Math.min(2, +st.a || lim));
    const ok = a >= lim - 1e-9;
    let measure = "";
    if (type === "HV") measure = ok ? "χωρίς πρόσθετο μέτρο" : "ΔΕΝ επιτρέπεται – απαιτείται α ≥ 0,80 m (ιδιαίτερη μελέτη)";
    else if (type === "TEL") measure = ok ? "σωλήνας HDPE Φ160 στο καλώδιο ΜΤ/ΧΤ ± 0,60 m· μη αγώγιμος σωλήνας στο τηλεπικοινωνιακό" : "ΔΕΝ επιτρέπεται α < 0,30 m – αλλαγή στάθμης (ΜΤ/ΧΤ βαθύτερα)";
    else if (type === "WATER") measure = ok ? "χωρίς σωλήνα (α ≥ 0,30 m)" : "γαλβανισμένος χαλυβδοσωλήνας 6″ πάχους 4,5 mm στο καλώδιο ΜΤ/ΧΤ ± 0,60 m";
    else if (type === "NEW3RD") measure = ok ? "χωρίς σωλήνα (α ≥ 0,40 m)" : "γαλβανισμένος χαλυβδοσωλήνας 6″ πάχους 4,5 mm στο νέο καλώδιο τρίτων ± 0,60 m";
    else if (type === "OLD3RD") measure = ok ? "χωρίς πρόσθετο μέτρο (α ≥ 0,40 m μεταξύ αξόνων)" : "αβαθής διάβαση κατά U-2Γ1 σε μήκος 0,60 m ανάντη και κατάντη";
    else measure = ok ? "α ≥ D: χωρίς προστατευτικό μέτρο (Σχήμα 1)" : "α < D: πλάκα θερμικής προστασίας στο α/2, ± 0,50 m (Σχήμα 2)";
    const pipeNeeded = (type === "TEL") || (type === "WATER" && !ok) || (type === "NEW3RD" && !ok);
    return { type, a, lim, ok, measure, pipeNeeded, bar };
  }
  function drawUgCrossing(st) {
    const g = UGX.geom, r = ugCrossCalc(st), type = r.type, volt = st.volt || "MT", L = g.depth[volt];
    const W = 900, k = 280, G = 70;
    const col = volt === "XT" ? UGC.cable : UGC.cableMT;
    // το καλώδιο ΔΕΔΔΗΕ (οριζόντιο, κατά μήκος – εγκάρσια τομή του διασταυρούμενου στοιχείου)
    const below = type === "HV" || type === "NEW3RD" || type === "OLD3RD";          // το διασταυρούμενο στοιχείο κάτω από το καλώδιο ΔΕΔΔΗΕ
    const ad = Math.min(r.a, 1.0);                                                   // σχεδιαζόμενη απόσταση (η ετικέτα δείχνει την πραγματική)
    const yD = G + (below ? 0.55 : 0.9) * Math.max(0.7, Math.min(L, 1.0)) * k;      // στάθμη καλωδίου ΔΕΔΔΗΕ
    const xc = 450, yO = below ? yD + ad * k : yD - ad * k;                          // στάθμη του άλλου στοιχείου
    const Hd = below ? yO + 90 : yD + 110;
    const S = new Scene(W, Hd);
    S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }) + surfaceLine(0, W, G));
    // πλέγμα + πλάκα ΔΕΔΔΗΕ (στη διασταύρωση με αγωγό αερίου και a < D η πλάκα επικάλυψης διακόπτεται ± 0,50 m – U-4A Σχήμα 2)
    S.add(line(120, G + 0.30 * k * 0.6, 780, G + 0.30 * k * 0.6, { stroke: UGC.mesh, w: 3 }));
    if (type === "GAS" && !r.ok) { const pe = g.gas.plate_ext * k; S.add(tileRect(120, yD - 0.10 * k, xc - pe - 120, 0.03 * k) + tileRect(xc + pe, yD - 0.10 * k, 780 - xc - pe, 0.03 * k)); }
    else S.add(tileRect(120, yD - 0.10 * k, 660, 0.03 * k));   // πλάκα προστασίας (επικάλυψης) 0,10 m πάνω από το καλώδιο (και στις διασταυρώσεις – U-4II / U-4A)
    // σωλήνας προστασίας ± 0,60 m
    if (r.pipeNeeded) {
      const ext = (type === "TEL" ? g.TEL.ext : type === "WATER" ? g.WATER.ext : g.NEW3RD.ext) * k, yP = type === "NEW3RD" ? yO : yD;
      S.add(rect(xc - ext, yP - 14, 2 * ext, 28, { fill: type === "TEL" ? UGC.hdpe : "#1f2937", stroke: UGC.steel, w: 2.5, rx: 14 }));
      S.top(hd(yP + 34, xc - ext, xc, `${m2(ext / k)} m`, { color: UGC.steel, size: 11, below: true }) + hd(yP + 34, xc, xc + ext, `${m2(ext / k)} m`, { color: UGC.steel, size: 11, below: true }));
      S.key(type === "TEL" ? "Σωλήνας HDPE Φ160 προστασίας του καλωδίου ΜΤ / ΧΤ – 0,60 m εκατέρωθεν της διασταύρωσης" : type === "WATER" ? "Γαλβανισμένος χαλυβδοσωλήνας 6″ πάχους 4,5 mm στο καλώδιο ΜΤ / ΧΤ (τοποθετείται εάν α < 0,30 m) – 0,60 m εκατέρωθεν" : "Γαλβανισμένος χαλυβδοσωλήνας 6″ πάχους 4,5 mm στο νέο καλώδιο ΜΤ τρίτων (εάν α < 0,40 m) – 0,60 m εκατέρωθεν", { x: xc - ext + 10, y: yP - 14, lx: 120, ly: yP - 60, color: UGC.steel });
    }
    S.add(line(100, yD, 800, yD, { stroke: col, w: 7 }));
    S.key(`${type === "OLD3RD" ? "ΝΕΟ" : type === "NEW3RD" ? "Υφιστάμενο" : "Υπόγειο"} καλώδιο ${(g.volt_labels || {})[volt] || volt} του ΔΕΔΔΗΕ (κατά μήκος) με πλέγμα σήμανσης 0,30 m και πλάκα προστασίας 0,10 m πάνω από το καλώδιο`, { x: 160, y: yD, lx: 160, ly: yD + (below ? -36 : 40), color: C.warn });
    // το άλλο στοιχείο
    if (type === "HV") { S.add(rect(xc - 120, yO - 14, 240, 28, { fill: "#3d3250", stroke: UGC.hv, w: 2 })); S.key("Υπόγειο καλώδιο ΥΤ (150 kV) – το καλώδιο ΜΤ / ΧΤ διασταυρώνει από πάνω", { x: xc + 120, y: yO, lx: xc + 200, ly: yO + 40, color: UGC.hv }); }
    else if (type === "TEL") { S.add(pipeDot(xc, yO, 15, { fill: "#0b1a24", stroke: "#94a3b8", w: 2.5, cable: UGC.tel })); S.key("Υπόγειο καλώδιο τηλεπικοινωνίας σε ΜΗ αγώγιμο σωλήνα προστασίας – το καλώδιο ΜΤ / ΧΤ διασταυρώνει από κάτω", { x: xc + 15, y: yO, lx: xc + 160, ly: yO - 30, color: UGC.tel }); }
    else if (type === "WATER") { S.add(pipeDot(xc, yO, 18, { fill: "#0e3a44", stroke: UGC.water, w: 2.5 })); S.key("Υπόγειος σωλήνας ύδατος κτλ. – το καλώδιο ΜΤ / ΧΤ διασταυρώνει από κάτω", { x: xc + 18, y: yO, lx: xc + 160, ly: yO - 30, color: UGC.water }); }
    else if (type === "GAS") { S.add(pipeDot(xc, yO, 18, { fill: "#3d2a08", stroke: UGC.gas, w: 3 })); S.key(`Αγωγός φυσικού αερίου (${r.bar} bar → D = ${m2(r.lim)} m) – το καλώδιο ΜΤ / ΧΤ διασταυρώνει από κάτω`, { x: xc + 18, y: yO, lx: xc + 160, ly: yO - 30, color: UGC.gas }); if (!r.ok) { const yp = yD - ad * k / 2; S.add(rect(xc - g.gas.plate_ext * k, yp - 5, 2 * g.gas.plate_ext * k, 10, { fill: UGC.concrete, stroke: "#e5e7eb", w: 1 })); S.top(hd(yp - 12, xc - g.gas.plate_ext * k, xc, `${m2(g.gas.plate_ext)} m`, { color: C.warn, size: 10.5 }) + hd(yp - 12, xc, xc + g.gas.plate_ext * k, `${m2(g.gas.plate_ext)} m`, { color: C.warn, size: 10.5 })); S.key("Πλάκα θερμικής προστασίας σε απόσταση α/2 από το καλώδιο, 0,50 m εκατέρωθεν της διασταύρωσης· η πλάκα προστασίας (επικάλυψης) 0,10 m πάνω από το καλώδιο", { x: xc - g.gas.plate_ext * k, y: yp, lx: 120, ly: yp - 30, color: C.warn }); } }
    else { S.add(line(xc - 120, yO, xc + 120, yO, { stroke: UGC.third, w: 7 })); S.add(line(xc - 110, yO - 0.3 * k * 0.5, xc + 110, yO - 0.3 * k * 0.5, { stroke: "#e879f9", w: 2.5 })); S.add(tileRect(xc - 100, yO - 0.13 * k, 200, 0.03 * k)); S.key(type === "NEW3RD" ? "ΝΕΟ υπόγειο καλώδιο ΜΤ τρίτων (ΑΠΕ, άλλοι φορείς) κάτω από το υφιστάμενο του ΔΕΔΔΗΕ, με δικό του πλέγμα και πλάκα" : "ΥΦΙΣΤΑΜΕΝΟ υπόγειο καλώδιο ΜΤ τρίτων – το νέο καλώδιο ΔΕΔΔΗΕ διασταυρώνει από πάνω (α μεταξύ αξόνων)", { x: xc + 120, y: yO, lx: xc + 200, ly: yO + 40, color: UGC.third }); }
    S.top(vd(xc + (below ? -150 : 60), yD, yO, `α = ${m2(r.a)} m ${r.ok ? "≥" : "<"} ${m2(r.lim)} m`, { color: r.ok ? C.ok : C.no, size: 12.5, ext: xc, left: type === "GAS" && !r.ok, ly: (yD + yO) / 2 + (type === "GAS" && !r.ok ? -22 : 0) }));
    S.top(tag(16, Hd - 12, `${r.ok ? "ΕΝΤΑΞΕΙ" : "ΠΡΟΣΟΧΗ"}: ${r.measure}`, { fill: r.ok ? C.ok : C.no, size: 11 }));
    const noteIdx = { HV: 0, TEL: 1, WATER: 1, NEW3RD: 2, OLD3RD: 3, GAS: 4 }[type];
    addNotes(S, [UGX.notes[noteIdx], UGX.notes[5]]);
    S.note("Τομή κατά μήκος του καλωδίου ΔΕΔΔΗΕ – μιμικό (όχι υπό κλίμακα).");
    const ttl = { HV: "με υπόγειο καλώδιο ΥΤ 150 kV (U-4I)", TEL: "με καλώδιο τηλεπικοινωνίας (U-4II Σχήμα Α)", WATER: "με σωλήνα ύδατος (U-4II Σχήμα Β)", NEW3RD: "υφιστάμενου ΔΕΔΔΗΕ με νέο καλώδιο ΜΤ τρίτων (U-4III)", OLD3RD: "νέου ΔΕΔΔΗΕ με υφιστάμενο καλώδιο ΜΤ τρίτων (U-4IV)", GAS: "με αγωγό φυσικού αερίου (U-4A)" }[type];
    return S.render(`Διασταύρωση υπόγειου καλωδίου ΜΤ / ΧΤ ${ttl}`);
  }

  // ---------------------------------------------------------------- 27. Διαβάσεις – σιδηρόδρομος, γέφυρα, υπόνομος, κλειστός αυτοκινητόδρομος (U-5 / U-5I / U-5II / U-5A)
  function drawUgPassages(st) {
    const g = UGW.geom, type = st.type || "RAIL";
    const W = 900, Hd = 400, k = 120;
    const S = new Scene(W, Hd);
    if (type === "RAIL") {
      const G = 150, cement = st.pipe === "CEMENT", d = cement ? g.rail.concrete_pipe_depth : g.rail.depth_min;
      S.add(rect(0, G + 40, W, Hd - G - 40, { fill: UGC.soil, stroke: "none", w: 0 }));
      // έρμα + σιδηροτροχιές
      S.add(poly([[250, G + 40], [330, G], [570, G], [650, G + 40]], { fill: "#5a5248", stroke: "#776d60", w: 1 }));
      for (let i = 0; i < 9; i++) S.add(rect(340 + i * 26, G - 8, 18, 6, { fill: "#4b3b2a", stroke: "none", w: 0 }));
      S.add(line(330, G - 8, 570, G - 8, { stroke: "#c0c6cc", w: 3 }));
      const yP = G - 8 + d * k * 0.9;
      const ext = g.rail.ext * k;
      S.add(rect(250 - ext, yP - 10, 400 + 2 * ext, 20, { fill: cement ? UGC.concrete : "#1f2937", stroke: UGC.steel, w: 2.5, rx: cement ? 2 : 10 }));
      if (cement) S.add(rect(250 - ext, yP + 10, 400 + 2 * ext, 10, { fill: "#6b7280", stroke: "#e5e7eb", w: 1 }));
      S.add(line(60, yP, 840, yP, { stroke: UGC.cableMT, w: 5 }));
      S.top(vd(700, G - 8, yP, `≥ ${m2(d)} m`, { color: C.acc, size: 12.5, ext: 570 }));
      S.top(hd(yP + 36, 650, 650 + ext, `${m2(g.rail.ext)} m`, { color: UGC.steel, size: 11, below: true }) + hd(yP + 36, 250 - ext, 250, `${m2(g.rail.ext)} m`, { color: UGC.steel, size: 11, below: true }));
      S.key(cement ? "Τσιμεντοσωλήνες ή σωλήνας αμιαντοτσιμέντου σε στρώμα οπλισμένου σκυροδέματος (U-2B): βάθος από τις σιδηροτροχιές ≥ 1,50 m" : "Σιδηροσωλήνας με αντιδιαβρωτική εξωτερική επικάλυψη σε βάθος ≥ 1,00 m από τις σιδηροτροχιές, χώμα καλώς συμπιεσμένο", { x: 450, y: yP - 10, lx: 450, ly: yP - 46, color: UGC.steel });
      S.key("Προέκταση του σωλήνα 0,60 m πέρα από το άκρο του έρματος της γραμμής", { x: 650 + ext, y: yP, lx: 760, ly: yP + 70, color: C.dim });
      S.key("Σιδηροδρομική ή τροχιοδρομική γραμμή (έρμα, στρωτήρες, σιδηροτροχιές)", { x: 450, y: G - 8, lx: 450, ly: G - 44 });
      addNotes(S, [UGW.notes[0]]);
      S.note("Τομή κατά μήκος του καλωδίου – μιμικό.");
      return S.render("Διάβαση υπόγειου καλωδίου κάτω από σιδηροδρομικές / τροχιοδρομικές γραμμές (U-5)");
    }
    if (type === "BRIDGE") {
      const G = 170;
      S.add(rect(0, G + 20, 160, Hd - G - 20, { fill: UGC.soil, stroke: "none", w: 0 }) + rect(740, G + 20, 160, Hd - G - 20, { fill: UGC.soil, stroke: "none", w: 0 }));
      S.add(rect(160, G + 60, 580, Hd - G - 60, { fill: "#0e3a44", stroke: "none", w: 0 }));
      S.add(rect(140, G - 10, 620, 30, { fill: "#33414c", stroke: "#4b5f6d", w: 1.5 }));
      S.add(path(`M160,${G + 20} Q450,${G + 110} 740,${G + 20}`, { stroke: "#4b5f6d", w: 4 }));
      S.add(rect(140, G + 20, 30, 120, { fill: C.wall, stroke: "#4b5f6d", w: 1 }) + rect(730, G + 20, 30, 120, { fill: C.wall, stroke: "#4b5f6d", w: 1 }));
      const yP = G + 32, ext = g.bridge.ext * k;
      S.add(rect(140 - ext, yP - 7, 620 + 2 * ext, 14, { fill: "#1f2937", stroke: UGC.steel, w: 2.5, rx: 7 }));
      for (let x = 200; x < 720; x += 90) S.add(line(x, yP - 7, x, G + 20, { stroke: "#cbd5e1", w: 2 }) + circ(x, yP - 7, 3, { fill: "#cbd5e1", stroke: "none", w: 0 }));
      S.top(hd(yP + 30, 200, 290, `${g.bridge.hooks}`, { color: C.acc, size: 11, below: true }));
      S.top(hd(yP + 30, 760, 760 + ext, `${m2(g.bridge.ext)} m`, { color: UGC.steel, size: 11, below: true }));
      S.key("Σιδηροσωλήνας γαλβανισμένος ή εύκαμπτος χαλυβδοσωλήνας κάτω από το κατάστρωμα της γέφυρας, στερεωμένος με άγκιστρα ανά 0,70 – 1,00 m", { x: 450, y: yP - 7, lx: 450, ly: G - 50, color: UGC.steel });
      S.key("Προέκταση 0,20 m πέρα από το ακρόβαθρο, στο έδαφος", { x: 760 + ext, y: yP, lx: 820, ly: yP + 70, color: C.dim });
      addNotes(S, [UGW.notes[1]]);
      S.note("Γέφυρα χωρίς οχετό διέλευσης καλωδίων – μιμικό.");
      return S.render("Διάβαση υπόγειου καλωδίου διά γέφυρας (U-5I)");
    }
    if (type === "SEWER") {
      const G = 110;
      S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }) + roadBand(0, W, G - 10, { center: true }));
      S.add(path(`M450,${G + 50} m-90,0 a90,90 0 1,0 180,0 l0,150 a90,70 0 0,1 -180,0 z`, { fill: "#1b2a33", stroke: "#8a98a3", w: 6 }));
      S.add(rect(360, G + 160, 180, 90, { fill: "#0e3a44", stroke: "none", w: 0 }));
      const yP = G + 80, ext = g.sewer.ext * k;
      S.add(rect(360 - ext - 10, yP - 8, 180 + 2 * ext + 20, 16, { fill: UGC.concrete, stroke: "#e5e7eb", w: 2 }));
      S.add(line(60, yP, 840, yP, { stroke: UGC.cableMT, w: 5 }));
      S.top(hd(yP - 20, 360 - ext - 10, 360 - 10, `${m2(g.sewer.ext)} m`, { color: C.acc, size: 11 }));
      S.key("Σωλήνας από ερνίτη (αμιαντοτσιμέντο) ή τσιμεντοσωλήνας μέσα από το άνω τμήμα του υπονόμου – προέκταση 0,20 m εκατέρωθεν του τοιχώματος, χώμα καλώς συμπιεσμένο", { x: 540 + ext + 10, y: yP, lx: 700, ly: yP - 40, color: UGC.steel });
      S.key("Υπόνομος (οχετός) κάτω από την οδό", { x: 450, y: G + 200, lx: 620, ly: G + 220 });
      S.top(tag(16, Hd - 12, "Να εφαρμόζεται ΜΟΝΟΝ σε λίαν εξαιρετικές περιπτώσεις (U-5II)", { fill: C.no, size: 11 }));
      addNotes(S, [UGW.notes[2]]);
      return S.render("Διάβαση υπόγειου καλωδίου δι' υπονόμου (U-5II)");
    }
    // HIGHWAY – U-5A
    const G = 300;
    S.add(rect(0, G, W, Hd - G, { fill: UGC.soil, stroke: "none", w: 0 }));
    S.add(poly([[80, G], [330, 120], [570, 120], [820, G]], { fill: "#4a4a4a", stroke: "#6b6b6b", w: 1 }));
    S.add(rect(330, 100, 240, 24, { fill: UGC.asphalt, stroke: "#111", w: 1 }) + rect(330, 124, 240, 110, { fill: "#2a3b47", stroke: "#4b5f6d", w: 1 }));
    S.add(car(380, 100, { w: 44 }) + car(520, 100, { w: 44 }));
    // σιδηροσωλήνας 6″ κατά μήκος των πρανών και της οροφής του τεχνικού
    const pts = [[90, G + 0.9 * 60], [120, G], [330, 136], [570, 136], [780, G], [810, G + 0.9 * 60]];
    S.add(path(`M${pts.map(p => p.join(",")).join(" L")}`, { stroke: UGC.steel, w: 9, cap: "round" }) + path(`M${pts.map(p => p.join(",")).join(" L")}`, { stroke: UGC.cableMT, w: 3, cap: "round" }));
    for (let i = 1; i < 6; i++) { const x = 120 + i * 36, y = G - (x - 120) * (G - 136) / 210; S.add(line(x, y + 4, x - 6, y + 16, { stroke: "#cbd5e1", w: 2 })); }
    S.top(vd(60, G, G + 0.9 * 60, `${m2(g.highway.end_depth)} m`, { color: C.acc, size: 11, left: true }));
    S.top(vd(300, 136 - g.highway.cover_min * 60, 136, `≥ ${m2(g.highway.cover_min)} m`, { color: C.warn, size: 11, left: true }));
    // γειώσεις στα άκρα
    [[100, G + 30], [800, G + 30]].forEach(([x, y]) => { S.add(circ(x, y - 12, 7, { fill: "none", stroke: "#4ade80", w: 2 }) + line(x, y - 5, x, y + 60, { stroke: "#4ade80", w: 2 }) + rect(x - 2, y + 60, 4, 30, { fill: "#4ade80", stroke: "none", w: 0 })); });
    S.key(`Κολλάρο γείωσης σιδηροσωλήνα 6″ ανοξείδωτο (${m2(g.highway.collar)} m από το άκρο) – αγωγός χαλκού γείωσης ${g.highway.earth_conductor} και ηλεκτρόδιο (ράβδος) γείωσης ${m2(g.highway.rod)} m`, { x: 100, y: G + 18, lx: 160, ly: G + 60, color: "#4ade80" });
    S.key("Γαλβανισμένος σιδηροσωλήνας 6″ με σπείρωμα σε γαλβανισμένα χαλύβδινα στηρίγματα – σύνδεσμος (μούφα) με σπείρωμα στην ευθυγραμμία, αυτοκόλλητη ταινία αλουμινίου στις γωνίες", { x: 450, y: 136, lx: 450, ly: 60, color: UGC.steel });
    S.key("Κλειστός δρόμος ταχείας κυκλοφορίας – τεχνικό (οροφή ύψους Η), πρανή εκατέρωθεν· το καλώδιο ΜΤ οδεύει μέσα στον σωλήνα", { x: 330, y: 120, lx: 200, ly: 160, color: C.dim });
    addNotes(S, [UGW.notes[3]]);
    S.note("Μιμικό (όχι υπό κλίμακα).");
    return S.render("Όδευση καλωδίου ΜΤ από κλειστό δρόμο ταχείας κυκλοφορίας (U-5A)");
  }
  const ugItems = c => grid(["Απόσταση / στοιχείο", "Τιμή"], (c.items || []).map(x => [esc(x[0]), typeof x[1] === "number" ? m2(x[1]) + " m" : esc(x[1])]));

  // ---------------------------------------------------------------- κατάλογος περιπτώσεων
  const groundCols = CL.ground.cols.map((c, i) => [i, c]);
  const CASES = [
    { id: "ground", kw: "ύψος αγωγών έδαφος οδός δρόμος πεζοδρόμιο κράσπεδο επίτονος καλώδιο παροχής ΧΤ ΜΤ συνεστραμμένο Μ/Σ στύλος υδροληψία φωτιστικό αγροί οχήματα", group: "Αγωγοί – έδαφος & οδοί", icon: "🛣️", code: CL.ground.code, short: "Ύψη αγωγών από το έδαφος", title: CL.ground.title, date: CL.ground.date,
      controls: st => sel("clr_ground_col", "Τύπος αγωγού / καλωδίου", groundCols, st.col), init: { col: 1 }, draw: drawGround,
      details: () => grid(["Θέση"].concat(CL.ground.cols), CL.ground.rows.map(r => [r[0]].concat(r[1].map(v => v === null ? "—" : m2(v))))) + grid(["Λοιπές αποστάσεις", "m"], CL.ground.extra.map(x => [esc(x[0]), m2(x[1])])) + notes(CL.ground.notes) + (SR ? `<h3 class="tt">${esc(SR.title)}</h3>` + grid(SR.cols, SR.rows.map(r => r.map(esc)), 1) : "") },
    { id: "sidewalk", kw: "πεζοδρόμιο δρόμος μετρητική διάταξη καμπίνα στυλίσκος προσωρινή ΣΚ-ΠΠ 3,00 5,50", group: "Αγωγοί – έδαφος & οδοί", icon: "🏙️", code: "C-3 · ΜΔ-77/79/81 · ΣΚ-ΠΠ", short: "Πεζοδρόμιο & δρόμος – μετρητική διάταξη / παροχή", title: "Ελάχιστες αποστάσεις μετρητικής διάταξης και καλωδίου παροχής από πεζοδρόμιο και δρόμο", date: "ΟΔ.45 · C-3 · ΟΔ.38",
      draw: drawSidewalk, details: () => (SR ? grid(SR.cols, SR.rows.map(r => r.map(esc)), 1) : "") + grid(["Στοιχείο", "Ελάχιστο", "Πηγή"], (D.typ.service_clearances.crossing_options || []).map(o => [esc(o[1]), m2(o[2]) + " m", esc(o[3])])) + notes([D.typ.service_clearances.span_increase_note]) },
    { id: "slopes", kw: "πρανές επικλινές έδαφος πλαγιά ΜΤ οχήματα πεζοί", group: "Αγωγοί – έδαφος & οδοί", icon: "⛰️", code: CL.slopes.code, short: "Επικλινή εδάφη – γραμμές ΜΤ", title: CL.slopes.title, date: CL.slopes.date,
      controls: st => sel("clr_slopes_acc", "Προσβασιμότητα της γραμμής", [["VEH", "προσιτή σε οχήματα (α = 6,00 m)"], ["PED", "προσιτή μόνο σε πεζούς (α = 4,50 m)"]], st.acc), init: { acc: "VEH" }, draw: drawSlopes,
      details: () => itemsTable(CL.slopes) + notes(CL.slopes.notes) },
    { id: "poles_roads", kw: "στύλοι υπεραστική οδός εθνική επαρχιακή στηθαίο ασφαλείας οριογραμμή πρανές κατηγορία οδού ταχύτητα ΔΜΕΟ", group: "Αγωγοί – έδαφος & οδοί", icon: "🚧", code: CL.poles_roads.code, short: "Στύλοι από υπεραστικές οδούς", title: CL.poles_roads.title, date: CL.poles_roads.date,
      controls: st => sel("clr_c15_road", "Κατηγορία οδού (C-15B)", CL.poles_roads.c15b.curves.map((c, i) => [i, c.label]), st.road) + numIn("clr_c15_h", "Υψομετρική διαφορά h (m) – θετική: εμπόδιο ψηλότερα από την οδό", st.h, CL.poles_roads.c15b.h_min, CL.poles_roads.c15b.h_max, 0.5), init: { road: 0, h: 0 }, draw: drawPolesRoads,
      facts: st => { const r = c15calc(st); return [["Απόσταση Α στύλου (m)", fmt2(r.A), "χωρίς στηθαίο ασφαλείας – ομαλό έδαφος", "res"], ["Απόσταση ΑΕ εμποδίου (m)", fmt2(r.AE), "με στηθαίο: 1,50 m από το στηθαίο", ""]]; },
      details: () => itemsTable(CL.poles_roads) + `<div class="muted small">${esc(CL.poles_roads.c15b.title)}</div>` + grid(["Κατηγορία οδού", "Α (h = 0)", "ΑΕ (h = 0)", "Α (h = +3)", "ΑΕ (h = +3)", "Α (h = −10)", "ΑΕ (h = −10)"], CL.poles_roads.c15b.curves.map(c => [esc(c.label), c.A0, c.AE0, (c.A0 - 3 * CL.poles_roads.c15b.slope).toFixed(1), (c.AE0 - 3 * CL.poles_roads.c15b.slope).toFixed(1), (c.A0 + 10 * CL.poles_roads.c15b.slope).toFixed(1), (c.AE0 + 10 * CL.poles_roads.c15b.slope).toFixed(1)])) + notes([CL.poles_roads.c15b.note]) },
    { id: "railways", kw: "σιδηρόδρομος τρένο ΟΣΕ σιδηροδρομική γραμμή διασταύρωση σιδηροτροχιά", group: "Αγωγοί – έδαφος & οδοί", icon: "🚆", code: CL.railways.code, short: "Διασταυρώσεις σιδηροδρομικών γραμμών", title: CL.railways.title, date: CL.railways.date, draw: drawRailways, details: () => itemsTable(CL.railways) + notes(CL.railways.notes) },
    { id: "lv_buildings", kw: "κτίριο στέγη εξώστης μπαλκόνι ταράτσα στηθαίο παράθυρο γυμνοί αγωγοί ΧΤ οριζόντια κατακόρυφη", group: "Κτίρια", icon: "🏠", code: CL.lv_buildings.code, short: "Γυμνοί αγωγοί ΧΤ – κτίρια", title: CL.lv_buildings.title, date: CL.lv_buildings.date, draw: () => drawBuildings("XT"), details: () => itemsTable(CL.lv_buildings) + notes(CL.lv_buildings.notes) },
    { id: "mv_buildings", kw: "κτίριο στέγη εξώστης μπαλκόνι ταράτσα αγωγοί ΜΤ οριζόντια κατακόρυφη", group: "Κτίρια", icon: "🏢", code: CL.mv_buildings.code, short: "Αγωγοί ΜΤ – κτίρια", title: CL.mv_buildings.title, date: CL.mv_buildings.date, draw: () => drawBuildings("MT"), details: () => itemsTable(CL.mv_buildings) + notes(CL.mv_buildings.notes || []) },
    { id: "wall_cables", kw: "επιτοίχιο καλώδιο τοίχος παράθυρο άνοιγμα εξώστης προφυλακτήρας κάθοδος", group: "Κτίρια", icon: "🧱", code: CL.wall_cables.code, short: "Επιτοίχια καλώδια παροχής", title: CL.wall_cables.title, date: CL.wall_cables.date, draw: drawWall, details: () => itemsTable(CL.wall_cables) + notes(CL.wall_cables.notes) },
    { id: "ladders", kw: "ανεμόσκαλα πυροσβεστική πυρόσβεση ζώνη κτίρια όροφοι", group: "Κτίρια", icon: "🚒", code: CL.ladders.code, short: "Ανεμόσκαλες πυροσβεστικής – ελεύθερη ζώνη", title: CL.ladders.title, date: CL.ladders.date, draw: drawLadders, details: () => itemsTable(CL.ladders) + notes(CL.ladders.notes) },
    { id: "climbing", kw: "αναρρίχηση χώρος αναρριχήσεως στύλος τεχνίτης", group: "Κτίρια", icon: "🪜", code: CL.climbing.code, short: "Χώρος αναρριχήσεως στον στύλο", title: CL.climbing.title, date: CL.climbing.date, draw: drawClimbing, details: () => itemsTable(CL.climbing) },
    { id: "crossings", kw: "διασταύρωση γραμμών αγωγών ΜΤ ΧΤ τηλεπικοινωνία ΟΤΕ επίτονος καλώδιο κατακόρυφη απόσταση ανεπιθύμητη Μεταφοράς", group: "Γραμμές μεταξύ τους", icon: "✖️", code: CL.crossings.code, short: "Διασταυρώσεις αγωγών – κατακόρυφη απόσταση", title: "Ελάχιστες κατακόρυφες αποστάσεις σε διασταυρώσεις αγωγών", date: CL.crossings.date,
      controls: st => sel("clr_cross_up", "Γραμμή που διασταυρώνει από πάνω (I)", CL.crossings.cols.map((c, i) => [i, stripSide(c)]), st.up) + sel("clr_cross_lo", "Γραμμή που διασταυρώνεται από πάνω (II)", CL.crossings.rows.map((r, i) => [i, stripSide(r[0])]), st.lo), init: { up: 1, lo: 4 }, draw: drawCrossings,
      details: () => notes(CL.crossings.legend) + grid(["Κάτω \\ πάνω"].concat(CL.crossings.cols), CL.crossings.rows.map(r => [r[0]].concat(r[1]))) + notes(CL.crossings.notes) + `<div class="muted small">${esc(CL.crossings.factors.title)}</div>` + grid(["%"].concat(CL.crossings.factors.pct.map(p => p + " %")), [["1,20 m"].concat(CL.crossings.factors.f120.map(v => v.toFixed(2))), ["1,80 m"].concat(CL.crossings.factors.f180.map(v => v.toFixed(2)))]) + `<div class="muted small">${esc(CL.crossings.factors.note)}</div>` + `<div class="muted small" style="margin-top:8px">${esc(CL.crossings.transmission.title)}</div>` + grid(CL.crossings.transmission.cols, CL.crossings.transmission.rows, 3) + `<div class="muted small">${esc(CL.crossings.transmission.note)}</div>` },
    { id: "pole_separations", kw: "στύλος βραχίονας διαχωρισμός αγωγών ΜΤ ΧΤ επίτονος μονωτήρας τηλεπικοινωνία ΟΤΕ μικτή γραμμή", group: "Γραμμές μεταξύ τους", icon: "🗼", code: CL.pole_separations.code, short: "Διαχωρισμοί στον ίδιο στύλο (ΜΤ, ΧΤ, επίτονοι, τηλεπ.)", title: CL.pole_separations.title, date: CL.pole_separations.date,
      controls: st => sel("clr_sep_tel", "Γραμμή τηλεπικοινωνίας", [["OTE", "άλλης επιχείρησης (Ο.Τ.Ε.) – VII"], ["OWN", "της ίδιας επιχείρησης (ΔΕΔΔΗΕ) – VIII"]], st.tel) + sel("clr_sep_guy", "Επίτονος ΜΤ στη μικτή γραμμή", [["NO", "όχι – ΜΤ/ΧΤ 1,20 m (I)"], ["YES", "ναι – ΜΤ/ΧΤ 2,30 m (II)"]], st.guy), init: { tel: "OTE", guy: "NO" }, draw: drawPoleSep,
      details: () => itemsTable(CL.pole_separations) + notes(CL.pole_separations.notes) },
    { id: "other_poles", kw: "στύλος άλλης γραμμής αγωγοί απόσταση cm ΟΤΕ 400 V 20 kV 66 150 400 kV", group: "Γραμμές μεταξύ τους", icon: "↔️", code: CL.other_poles.code, short: "Αγωγοί από στύλους άλλης γραμμής", title: CL.other_poles.title, date: CL.other_poles.date,
      controls: st => sel("clr_op_row", "Στύλος άλλης γραμμής", CL.other_poles.rows.map((r, i) => [i, r[0]]), st.row) + sel("clr_op_col", "Αγωγοί της γραμμής μας", CL.other_poles.cols.map((c, i) => [i, c]), st.col), init: { row: 0, col: 1 }, draw: drawOtherPoles,
      details: () => grid(["Στύλος \\ αγωγοί"].concat(CL.other_poles.cols), CL.other_poles.rows.map(r => [r[0]].concat(r[1]))) + notes(CL.other_poles.legend) },
    { id: "other_lines", kw: "εμπλοκή αγωγοί άλλης γραμμής πτώση αγωγού ανατροπή στύλου βέλος", group: "Γραμμές μεταξύ τους", icon: "🔀", code: CL.other_lines.code, short: "Αγωγοί άλλης γραμμής – θέση εμπλοκής", title: CL.other_lines.title, date: CL.other_lines.date,
      controls: st => sel("clr_ol_row", "Γραμμή Α", CL.other_lines.rows.map((r, i) => [i, r[0]]), st.row) + sel("clr_ol_col", "Γραμμή Β", CL.other_lines.cols.map((c, i) => [i, c]), st.col), init: { row: 1, col: 1 }, draw: drawOtherLines,
      details: () => grid(["Κατηγορία"].concat(CL.other_lines.cols), CL.other_lines.rows.map(r => [r[0]].concat(r[1]))) + notes(CL.other_lines.legend) },
    { id: "c1", kw: "κλάση κατασκευής Α Β συντελεστές ασφαλείας διασταύρωση σιδηρόδρομος οδός τηλεπικοινωνία", group: "Γραμμές μεταξύ τους", icon: "🅰️", code: CL.c1.code, short: "Κλάσεις κατασκευής Α / Β", title: CL.c1.title, date: CL.c1.date,
      controls: st => sel("clr_c1_row", "Τι βρίσκεται σε χαμηλότερη στάθμη / διασταυρώνεται", CL.c1.rows.map((r, i) => [i, r[0]]), st.row) + sel("clr_c1_col", "Γραμμή ενεργείας", CL.c1.cols.map((c, i) => [i, c]), st.col), init: { row: 1, col: 0 }, draw: drawClasses,
      details: () => `<div class="muted small">${esc(CL.c1.intro)}</div>` + grid(["Χαμηλότερη στάθμη \\ γραμμή ενεργείας"].concat(CL.c1.cols), CL.c1.rows.map(r => [r[0]].concat(r[1]))) + notes(CL.c1.notes) },
    { id: "class_change", kw: "αλλαγή κλάσεως κλάση Α τμήμα ΜΝ 245 m διπλή στήριξη επίτονοι", group: "Γραμμές μεταξύ τους", icon: "🔁", code: CL.class_change.code, short: "Αλλαγή κλάσεως – τμήμα κλάσεως Α", title: CL.class_change.title, date: CL.class_change.date, draw: drawClassChange, details: () => notes(CL.class_change.notes) },
    { id: "pools", kw: "πισίνα κολυμβητήριο υπαίθριο νερό εξέδρα σανίδα καταδύσεων ξενοδοχείο NESC", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "🏊", code: "Εγκύκλιος 1736/1994", short: "Υπαίθρια κολυμβητήρια", title: (doc("egk_1994_1736") || {}).title || "Κολυμβητήρια", date: (doc("egk_1994_1736") || {}).date || "",
      controls: st => { const tb = doc("egk_1994_1736") && doc("egk_1994_1736").tables[0]; return tb ? sel("clr_pool_col", "Τύπος αγωγού / καλωδίου", tb.cols.slice(1).map((c, i) => [i, c]), st.col) : ""; }, init: { col: 0 }, draw: drawPools,
      details: () => docHead(doc("egk_1994_1736")) + docTables(doc("egk_1994_1736")) + docRules(doc("egk_1994_1736")) + notes(((doc("egk_1994_1736") || {}).notes || []).map(esc)) },
    { id: "wind", kw: "ανεμογεννήτρια Α/Γ αιολικό πάρκο πτερύγιο Hm Hn απόσταση L", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "🌬️", code: "Εγκύκλιος 2999/2015", short: "Ανεμογεννήτριες", title: (doc("egk_2015_2999") || {}).title || "Ανεμογεννήτριες", date: (doc("egk_2015_2999") || {}).date || "",
      controls: st => numIn("clr_wind_hm", "Μέγιστο ύψος Α/Γ Hm (m) – πτερύγιο στην άνω κατακόρυφη θέση", st.hm, 1, 400, 1) + sel("clr_wind_volt", "Εναέρια γραμμή Διανομής", [["MT", "ΜΤ (οριζόντια από κτίρια 2,50 m – C-7)"], ["XT", "ΧΤ (οριζόντια από κτίρια 0,90 m – ΚΕΣΥΓΗΕ)"]], st.volt), init: { hm: 100, volt: "MT" }, draw: drawWind,
      facts: st => { const r = windCalc(st); return [["Ελάχιστη οριζόντια απόσταση L (m)", fmt2(r.L), "βάθρο Α/Γ – πλησιέστερο υπό τάση στοιχείο", "res"], ["Hn (m)", fmt2(r.Hn), `max(0,10·Hm = ${fmt2(0.1 * r.Hm)} ; ${fmt2(r.dB)})`, ""]]; },
      details: () => docHead(doc("egk_2015_2999")) + docRules(doc("egk_2015_2999")) + notes(((doc("egk_2015_2999") || {}).notes || []).map(esc)) },
    { id: "biogas", kw: "βιοαέριο μονάδα παραγωγής χωνευτής 30 m υγραέριο", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "🧪", code: "Εγκύκλιος 3442/2015", short: "Μονάδες βιοαερίου", title: (doc("egk_2015_3442") || {}).title || "Βιοαέριο", date: (doc("egk_2015_3442") || {}).date || "", draw: drawBiogas,
      details: () => docHead(doc("egk_2015_3442")) + docRules(doc("egk_2015_3442")) + notes(((doc("egk_2015_3442") || {}).notes || []).map(esc)) },
    { id: "fuel", kw: "πρατήριο καυσίμων βενζινάδικο βενζίνη πετρέλαιο υγραέριο LPG CNG LNG υδρογόνο αντλίες δεξαμενές μετρητής", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "⛽", code: "ΔΔ/406082/2023", short: "Πρατήρια καυσίμων, LPG, CNG, υδρογόνου", title: (doc("egk_2023_1") || {}).title || "Πρατήρια καυσίμων", date: (doc("egk_2023_1") || {}).date || "",
      controls: st => sel("clr_fuel_fuel", "Είδος καυσίμου του πρατηρίου", [["OTHER", "υγρά καύσιμα / LPG / CNG"], ["H2", "υδρογόνο (αμιγές ή μικτό πρατήριο)"]], st.fuel), init: { fuel: "OTHER" }, draw: drawFuel,
      details: () => docHead(doc("egk_2023_1")) + docTables(doc("egk_2023_1")) + docRules(doc("egk_2023_1")) + notes(((doc("egk_2023_1") || {}).notes || []).map(esc)) },
    { id: "gas", kw: "φυσικό αέριο ΔΕΣΦΑ αγωγός υψηλής πίεσης σωληναγωγός ζώνη δουλείας 50 m 300 m", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "🔥", code: "ΔΔ/283278/2024", short: "Αγωγοί φυσικού αερίου ΔΕΣΦΑ", title: (doc("egk_2024_283278") || {}).title || "Αγωγοί ΔΕΣΦΑ", date: (doc("egk_2024_283278") || {}).date || "", draw: drawGas,
      details: () => docHead(doc("egk_2024_283278")) + docTables(doc("egk_2024_283278")) + docRules(doc("egk_2024_283278")) + notes(((doc("egk_2024_283278") || {}).notes || []).map(esc)) },
    { id: "od38", kw: "ΟΔ.38 λατομείο μεταλλείο εκρηκτικά αποθήκη εργοτάξιο γερανός αεροδρόμιο ραδιοφάρος υπόγεια καλώδια Μεταφοράς 150 kV αγωγός γης", group: "Ειδικές εγκαταστάσεις (ΟΔ.38 & εγκύκλιοι)", icon: "📘", code: "ΟΔ.38", short: "Λατομεία, εκρηκτικά, εργοτάξια, αεροδρόμια, υπόγεια ΥΤ", title: (doc("od38") || {}).title || "ΟΔ.38", date: (doc("od38") || {}).date || "", draw: drawOD38,
      details: () => docHead(doc("od38")) + docTables(doc("od38")) + docRules(doc("od38")) + notes(((doc("od38") || {}).notes || []).map(esc)) },
    { id: "ug_install", kw: "υπόγεια καλώδια χάνδακας βάθος πλάτος άμμος πλάκα προστασίας πλέγμα σήμανσης πεζοδρόμιο U-2 U-2A U-2I U-2AI στάθμες ΜΤ ΧΤ 22 kV", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "⛏️", code: UG.code, short: "Χάνδακας υπόγειων καλωδίων – βάθη & πλάκες", title: UG.title, date: UG.date,
      controls: st => sel("clr_ugi_volt", "Τάση καλωδίων", voltOpts(UG.geom), st.volt) + sel("clr_ugi_n", "Καλώδια στην ίδια στάθμη", [["1", "1 καλώδιο (πλάτος 50, πλάκα 35)"], ["2", "2 καλώδια (πλάτος 50, πλάκα 35)"], ["3", "3 καλώδια (πλάτος 60, πλάκα 50)"]], st.n) + sel("clr_ugi_loc", "Θέση", [["OPEN", "ανοιχτό έδαφος (U-2 / U-2I)"], ["SIDEWALK", "κάτω από πεζοδρόμιο (U-2A / U-2AI)"]], st.loc) + sel("clr_ugi_levels", "Στάθμες καλωδίων (πλήθος > 3 → U-2I / U-2AI)", [["1", "1 στάθμη (έως 3 καλώδια)"], ["2", "2 στάθμες – βάθος 100 cm"], ["3", "3 στάθμες – βάθος 130 cm"]], st.levels), init: { volt: "MT", n: "1", loc: "OPEN", levels: "1" }, draw: drawUgInstall,
      details: () => ugItems(UG) + notes(UG.notes) },
    { id: "ug_road", kw: "υπόγεια καλώδια διάβαση οδόστρωμα σωλήνες PVC Φ16 Φ160 σκυρόδεμα C12/15 δομικό πλέγμα Τ196 ανεπαρκές βάθος U-2Β1 U-2Γ1", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "🚗", code: UGR.code, short: "Διαβάσεις κάτω από οδοστρώματα (σωλήνες PVC)", title: UGR.title, date: UGR.date,
      controls: st => sel("clr_ugr_mode", "Διάβαση", [["N1", "U-2Β1 κανονικά βάθη – 1 σειρά (3 σωλήνες), βάθος 120 cm"], ["N2", "U-2Β1 κανονικά βάθη – 2 σειρές (6 σωλήνες), βάθος 140 cm"], ["S2", "U-2Γ1 ανεπαρκή βάθη – 2 σωλήνες (πλάτος 47 cm)"], ["S3", "U-2Γ1 ανεπαρκή βάθη – 3 σωλήνες (πλάτος 68 cm)"], ["S4", "U-2Γ1 ανεπαρκή βάθη – 4 σωλήνες (πλάτος 89 cm)"]], st.mode) + numIn("clr_ugr_a", "U-2Γ1: βάθος α (cm) από την επιφάνεια έως την άνω πλάκα (20 – 80)", st.a, 20, 80, 5), init: { mode: "N1", a: 40 }, draw: drawUgRoad,
      details: () => ugItems(UGR) + notes(UGR.notes) },
    { id: "ug_slope", kw: "υπόγεια καλώδια κλίση 10% επικλινές έδαφος τσιμεντοκονίαμα U-2Δ", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "📐", code: UGS.code, short: "Εδάφη με κλίση > 10 %", title: UGS.title, date: UGS.date,
      controls: st => sel("clr_ugs_volt", "Τάση καλωδίων", voltOpts(UGS.geom), st.volt), init: { volt: "MT" }, draw: drawUgSlope, details: () => ugItems(UGS) + notes(UGS.notes) },
    { id: "ug_proximity", kw: "γειτνίαση παράλληλη όδευση υπόγεια καλώδια ΥΤ 150 kV τηλεπικοινωνία ΟΤΕ οπτικές ίνες σωλήνας ύδατος νερό φυσικό αέριο 4 bar 19 bar πλάκα θερμικής προστασίας τρίτων ΑΠΕ U-3 U-3I U-3A", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "🔌", code: UGP.code, short: "Γειτνιάσεις – παράλληλη όδευση", title: UGP.title, date: UGP.date,
      controls: st => sel("clr_ugp_type", "Γειτνίαση με", [["HV", "υπόγειο καλώδιο ΥΤ 150 kV (U-3 Σχήμα Α)"], ["TEL", "καλώδιο τηλεπικοινωνίας (U-3 Σχήμα Β)"], ["FO", "καλώδιο οπτικών ινών χωρίς αγώγιμο εξάρτημα (U-3 Σχήμα Β)"], ["WATER", "σωλήνα ύδατος κ.λπ. (U-3 Σχήμα Γ)"], ["MV3", "υπόγεια καλώδια ΜΤ τρίτων – ΑΠΕ, άλλοι φορείς (U-3I)"], ["GAS", "αγωγό φυσικού αερίου (U-3A)"]], st.type) + sel("clr_ugp_volt", "Τάση καλωδίου ΔΕΔΔΗΕ", voltOpts(UGP.geom), st.volt) + sel("clr_ugp_bar", "Αγωγός αερίου – μέγιστη πίεση λειτουργίας (U-3A)", [["4", "4 bar → D = 0,30 m"], ["19", "19 bar → D = 0,50 m"]], st.bar) + sel("clr_ugp_loss", "Καλώδια ΜΤ τρίτων – θερμικές απώλειες ανά km (U-3I)", [["USUAL", "συνήθεις (όπως του ΔΕΔΔΗΕ) → a ≥ 0,30 m"], ["DIFF", "διαφορετικές → a > 0,50 m + θερμική απομόνωση U-3A"]], st.loss) + numIn("clr_ugp_a", "Απόσταση a (m) – για U-3I / U-3A", st.a, 0.05, 1.5, 0.05), init: { type: "HV", volt: "MT", bar: "4", loss: "USUAL", a: 0.3 }, draw: drawUgProximity,
      details: () => ugItems(UGP) + notes(UGP.notes) },
    { id: "ug_crossing", kw: "διασταύρωση υπόγεια καλώδια ΥΤ 150 kV τηλεπικοινωνία σωλήνας ύδατος φυσικό αέριο τρίτων ΑΠΕ HDPE Φ160 χαλυβδοσωλήνας 6 U-4I U-4II U-4III U-4IV U-4A", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "➕", code: UGX.code, short: "Διασταυρώσεις υπόγειων καλωδίων", title: UGX.title, date: UGX.date,
      controls: st => sel("clr_ugx_type", "Διασταύρωση με", [["HV", "υπόγειο καλώδιο ΥΤ 150 kV (U-4I)"], ["TEL", "καλώδιο τηλεπικοινωνίας (U-4II Σχήμα Α)"], ["WATER", "σωλήνα ύδατος κτλ. (U-4II Σχήμα Β)"], ["NEW3RD", "νέο καλώδιο ΜΤ τρίτων κάτω από υφιστάμενο ΔΕΔΔΗΕ (U-4III)"], ["OLD3RD", "υφιστάμενο καλώδιο ΜΤ τρίτων – νέο ΔΕΔΔΗΕ από πάνω (U-4IV)"], ["GAS", "αγωγό φυσικού αερίου (U-4A)"]], st.type) + sel("clr_ugx_volt", "Τάση καλωδίου ΔΕΔΔΗΕ", voltOpts(UGX.geom), st.volt) + sel("clr_ugx_bar", "Αγωγός αερίου – μέγιστη πίεση λειτουργίας (U-4A)", [["4", "4 bar → D = 0,30 m"], ["19", "19 bar → D = 0,50 m"]], st.bar) + numIn("clr_ugx_a", "Κατακόρυφη απόσταση α (m) στη διασταύρωση", st.a, 0.05, 2, 0.05), init: { type: "TEL", volt: "MT", bar: "4", a: 0.3 }, draw: drawUgCrossing,
      facts: st => { const r = ugCrossCalc(st); return [["Απόσταση α (m)", fmt2(r.a), `ελάχιστο ${fmt2(r.lim)} m – ${r.ok ? "ικανοποιείται" : "ΔΕΝ ικανοποιείται"}`, r.ok ? "ok" : "no"], ["Μέτρο προστασίας", r.pipeNeeded ? "σωλήνας ± 0,60 m" : (r.ok ? "—" : "βλ. σημείωση"), r.measure, r.ok ? "" : "warn"]]; },
      details: () => ugItems(UGX) + notes(UGX.notes) },
    { id: "ug_passages", kw: "διάβαση σιδηρόδρομος τροχιόδρομος γέφυρα υπόνομος κλειστός αυτοκινητόδρομος ταχείας κυκλοφορίας σιδηροσωλήνας 6 γείωση U-5 U-5I U-5II U-5A", group: "Υπόγεια καλώδια (ΕΤΚΔ Κεφ. U)", icon: "🌉", code: UGW.code, short: "Διαβάσεις – σιδηρόδρομος, γέφυρα, υπόνομος, αυτοκινητόδρομος", title: UGW.title, date: UGW.date,
      controls: st => sel("clr_ugw_type", "Διάβαση", [["RAIL", "κάτω από σιδηροδρομικές / τροχιοδρομικές γραμμές (U-5)"], ["BRIDGE", "διά γέφυρας χωρίς οχετό καλωδίων (U-5I)"], ["SEWER", "δι' υπονόμου – λίαν εξαιρετικά (U-5II)"], ["HIGHWAY", "κλειστός δρόμος ταχείας κυκλοφορίας – καλώδιο ΜΤ (U-5A)"]], st.type) + sel("clr_ugw_pipe", "U-5: είδος σωλήνα", [["STEEL", "σιδηροσωλήνας με αντιδιαβρωτική επικάλυψη (≥ 1,00 m)"], ["CEMENT", "τσιμεντοσωλήνες / αμιαντοτσιμέντο σε οπλισμένο σκυρόδεμα (≥ 1,50 m)"]], st.pipe), init: { type: "RAIL", pipe: "STEEL" }, draw: drawUgPassages,
      details: () => ugItems(UGW) + notes(UGW.notes) },
  ];

  // ---------------------------------------------------------------- κατάσταση & απόδοση
  const LS = "clr_state_v1";
  let ST = { cur: "ground", s: {} };
  try { const o = JSON.parse(localStorage.getItem(LS) || "null"); if (o && o.cur) ST = o; } catch (e) { /* ignore */ }
  CASES.forEach(c => { ST.s[c.id] = Object.assign({}, c.init || {}, ST.s[c.id] || {}); });
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(ST)); } catch (e) { /* ignore */ } };
  const byId = id => CASES.find(c => c.id === id) || CASES[0];

  function renderTiles() {
    const groups = [];
    CASES.forEach(c => { let g = groups.find(x => x.name === c.group); if (!g) { g = { name: c.group, items: [] }; groups.push(g); } g.items.push(c); });
    $("clr_tiles").innerHTML = groups.map(g => `<div class="clr-grp">${esc(g.name)}</div><div class="clr-tilerow">${g.items.map(c => `<button class="clr-tile${c.id === ST.cur ? " active" : ""}" data-id="${c.id}" title="${esc(c.title)}"><span class="ic">${c.icon}</span><span class="sh">${esc(c.short)}</span><span class="cd">${esc(c.code)}</span></button>`).join("")}</div>`).join("");
    $("clr_pick").innerHTML = CASES.map(c => `<option value="${c.id}"${c.id === ST.cur ? " selected" : ""}>${esc(c.short)} – ${esc(c.code)}</option>`).join("");
    document.querySelectorAll("#clr_tiles .clr-tile").forEach(b => b.addEventListener("click", () => open(b.dataset.id)));
  }
  function renderCase(full) {
    const c = byId(ST.cur), st = ST.s[c.id] || {};
    if (full) {
      document.querySelectorAll("#clr_tiles .clr-tile").forEach(b => b.classList.toggle("active", b.dataset.id === c.id));
      if ($("clr_pick").value !== c.id) $("clr_pick").value = c.id;
      $("clr_code").textContent = c.code; $("clr_title").textContent = c.title; $("clr_date").textContent = c.date || "";
      const ctl = c.controls ? c.controls(st) : "";
      $("clr_ctl").innerHTML = ctl; $("clr_ctl").classList.toggle("hidden", !ctl);
      // τα controls δένονται μία φορά – στις αλλαγές ανανεώνονται μόνο σχήμα, τιμές και πίνακες (το πεδίο κρατά το focus)
      $("clr_ctl").querySelectorAll("[data-ctl]").forEach(el => {
        const key = el.id.replace(/^clr_[a-z0-9]+_/, "");
        const h = () => { ST.s[c.id][key] = el.value; save(); renderCase(false); };
        el.addEventListener("change", h); if (el.type === "number") el.addEventListener("input", h);
      });
      $("clr_det_sum").textContent = `Πίνακας τιμών, κανόνες & σημειώσεις – ${c.code}`;
      let det = ""; try { det = c.details ? c.details(st) : ""; } catch (e) { det = `<div class="muted">${esc(e.message)}</div>`; }
      $("clr_det_body").innerHTML = det;
    }
    const facts = c.facts ? c.facts(st) : null;
    $("clr_facts").innerHTML = facts ? facts.map(f => `<div class="factor ${f[3] || ""}"><div class="k">${esc(f[0])}</div><div class="v">${esc(f[1])}</div><div class="s">${esc(f[2])}</div></div>`).join("") : "";
    $("clr_facts").classList.toggle("hidden", !facts);
    let svg = "";
    try { svg = c.draw(st); } catch (e) { svg = `<div class="muted">Σφάλμα σχεδίου: ${esc(e.message)}</div>`; }
    $("clr_svg").innerHTML = svg;
  }
  function open(id) { if (!byId(id)) return; ST.cur = byId(id).id; save(); renderCase(true); const v = $("clr_view"); if (v && window.innerWidth < 1100) v.scrollIntoView({ behavior: "smooth", block: "start" }); }
  $("clr_pick").addEventListener("change", () => open($("clr_pick").value));
  $("clr_full").addEventListener("click", () => {
    const svg = $("clr_svg").querySelector("svg"); if (!svg) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="el"><head><meta charset="utf-8"><title>${esc(byId(ST.cur).title)}</title><style>body{margin:0;background:#0b1a24;display:flex;flex-direction:column;gap:12px;align-items:center;padding:12px}svg{max-width:100%;height:auto;border-radius:8px}</style></head><body>${$("clr_svg").innerHTML}</body></html>`);
    w.document.close();
  });
  $("clr_print").addEventListener("click", () => { try { if (window.AndroidApp && typeof AndroidApp.print === "function") { AndroidApp.print(); return; } } catch (e) { /* ignore */ } window.print(); });
  // πλήρης οθόνη με τον κοινό προβολέα εικόνων (fsv), ως data-URL του SVG
  $("clr_fsv").addEventListener("click", () => {
    const svgs = Array.from($("clr_svg").querySelectorAll("svg")); if (!svgs.length) return;
    const fs = window.FSV_SHOW; if (!fs) { $("clr_full").click(); return; }
    let i = 0;
    const src = n => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgs[n].outerHTML);
    const show = () => fs({ src: src(i), title: byId(ST.cur).code, ttl: byId(ST.cur).title, sub: `σχήμα ${i + 1} / ${svgs.length}`, href: null, onPrev: i > 0 ? () => { i--; show(); } : null, onNext: i < svgs.length - 1 ? () => { i++; show(); } : null });
    show();
  });
  if (window.AndroidApp || window.ARTIFACT_MODE) $("clr_full").classList.add("hidden");
  renderTiles(); renderCase(true);
  window.CLR = { open, cases: CASES.map(c => c.id), list: CASES.map(c => ({ id: c.id, short: c.short, title: c.title, code: c.code, group: c.group, kw: c.kw || "" })) };
})();
