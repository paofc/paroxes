/* Σχήματα SVG (Connexion Engineering): αποστάσεις ασφαλείας (C-2/C-3, C-8/C-9/C-12, C-19), έλεγχος ανοίγματος L (στυλίσκος / γάντζος),
   μετρητική διάταξη (εσοχή που προσαρμόζεται στους μετρητές). Χρησιμοποιούνται στην εφαρμογή (inline) και αποτυπώνονται σε PNG για το Excel. */
(function (root) {
  "use strict";
  const F = "Cambria, 'CambriaFallback', 'Liberation Serif', 'Times New Roman', serif";
  const C = { bg: "#0b1a24", panel: "#10232f", line: "#c9d6dc", dim: "#8fb4c4", acc: "#38bdf8", warn: "#fbbf24", ok: "#4ade80", no: "#f87171", ground: "#3b2f1a", grass: "#2d5a27", wall: "#2a3b47", box1: "#1d4ed8", box3: "#0e7490", boxct: "#6d28d9", boxd: "#b45309", text: "#eef3f5", muted: "#9fb3bd" };
  const esc = s => String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const m2 = v => Number(v).toFixed(2).replace(".", ",");
  const txt = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-family="${F}" font-size="${o.size || 12}" fill="${o.fill || C.text}" text-anchor="${o.anchor || "start"}" font-weight="${o.bold ? "bold" : "normal"}"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${esc(s)}</text>`; };
  const line = (x1, y1, x2, y2, o) => { o = o || {}; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || C.line}" stroke-width="${o.w || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.cap ? ` stroke-linecap="${o.cap}"` : ""}/>`; };
  const rect = (x, y, w, h, o) => { o = o || {}; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || "none"}" stroke="${o.stroke || C.line}" stroke-width="${o.w === undefined ? 1.5 : o.w}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.rx ? ` rx="${o.rx}"` : ""}/>`; };
  // vertical dimension with arrows
  function vdim(x, y1, y2, label, o) {
    o = o || {};
    const col = o.color || C.acc;
    const top = Math.min(y1, y2), bot = Math.max(y1, y2);
    let s = line(x, top, x, bot, { stroke: col, w: 1.2 });
    s += `<path d="M${x - 4},${top + 8} L${x},${top} L${x + 4},${top + 8}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
    s += `<path d="M${x - 4},${bot - 8} L${x},${bot} L${x + 4},${bot - 8}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
    s += txt(x + (o.left ? -6 : 6), (top + bot) / 2 + 4, label, { fill: col, bold: true, size: o.size || 12, anchor: o.left ? "end" : "start" });
    return s;
  }
  function hdim(y, x1, x2, label, o) {
    o = o || {};
    const col = o.color || C.acc;
    const l = Math.min(x1, x2), r = Math.max(x1, x2);
    let s = line(l, y, r, y, { stroke: col, w: 1.2 });
    s += `<path d="M${l + 8},${y - 4} L${l},${y} L${l + 8},${y + 4}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
    s += `<path d="M${r - 8},${y - 4} L${r},${y} L${r - 8},${y + 4}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
    s += txt((l + r) / 2, y + (o.below ? 14 : -5), label, { fill: col, bold: true, size: o.size || 12, anchor: "middle" });
    return s;
  }
  const wrap = (w, h, inner, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${F}"><rect width="${w}" height="${h}" fill="${C.bg}"/>${title ? txt(12, 20, title, { size: 14, bold: true, fill: C.acc }) : ""}${inner}</svg>`;
  const pole = (x, yTop, yGround, o) => { o = o || {}; return rect(x - 4, yTop, 8, yGround - yTop, { fill: "#5b6770", stroke: "#8a98a3", w: 1 }) + line(x - 22, yTop + 10, x + 22, yTop + 10, { stroke: "#8a98a3", w: 3 }) + (o.label ? txt(x, yTop - 6, o.label, { anchor: "middle", size: 11, fill: C.muted }) : ""); };
  const sagPath = (x1, y1, x2, y2, sag) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 2 * sag; return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="${C.warn}" stroke-width="2.2"/>`; };

  /* ---------------------------------------------------------------- 1. Αποστάσεις από το έδαφος (C-2 / C-3) */
  function groundClearances(sel, sc) {
    sc = sc || {};
    const W = 900, H = 430, G = 330;         // ground y
    const yOf = m => G - m * 40;
    let s = "";
    // ground zones
    s += rect(0, G, W, H - G, { fill: C.ground, stroke: "none", w: 0 });
    s += line(0, G, W, G, { stroke: "#7a6a4a", w: 2 });
    const zones = [["SIDEWALK", 60, 250, "Πεζοδρόμιο / χώρος μόνο για πεζούς", 3.0, "C-3 II"], ["ROAD", 290, 540, "Διασταύρωση οδού / χώρος προσιτός σε οχήματα", 5.5, "C-3 I · C-2 σημ. 4"], ["NOVEH", 580, 800, "Χώρος απρόσιτος σε οχήματα (απόκρημνος / βραχώδης)", 4.5, "C-2 σημ. 3"]];
    zones.forEach(([code, x1, x2, lab, h, src]) => {
      const hi = sel === code || (sel === "VEHICLES" && code === "ROAD");
      s += rect(x1, G + 4, x2 - x1, 30, { fill: hi ? "#1f3a52" : C.panel, stroke: hi ? C.acc : "#3a4a55", w: hi ? 2 : 1, rx: 4 });
      s += txt((x1 + x2) / 2, G + 23, lab, { anchor: "middle", size: 11, fill: hi ? C.acc : C.muted });
      // cable lowest point marker
      const yc = yOf(h);
      s += line(x1 + 10, yc, x2 - 10, yc, { stroke: hi ? C.warn : "#6b7d88", w: 2, dash: "8 5" });
      s += vdim((x1 + x2) / 2, yc, G, `≥ ${m2(h)} m`, { color: hi ? C.warn : C.dim, size: 13 });
      s += txt((x1 + x2) / 2, yc - 8, "κατώτατο σημείο καλωδίου παροχής", { anchor: "middle", size: 10, fill: C.muted });
      s += txt(x2 - 12, G + 48, src, { anchor: "end", size: 10, fill: C.muted });
    });
    // poles & cable sketch
    s += pole(30, yOf(6.6), G, {});
    s += txt(40, yOf(6.6) + 4, "στύλος ΧΤ", { size: 11, fill: C.muted });
    s += pole(860, yOf(6.0), G, {});
    s += txt(850, yOf(6.0) - 6, "στυλίσκος παροχής", { size: 11, fill: C.muted, anchor: "end" });
    s += sagPath(30, yOf(6.4), 860, yOf(5.8), 55);
    // guy clearance & notes (bottom)
    s += txt(12, G + 72, "Επίτονος στυλίσκου: ≥ 2,50 m πάνω από πεζοδρόμιο · ≥ 5,50 m πάνω από οδό (C-3 II / I).", { size: 11, fill: C.text });
    s += txt(12, G + 90, "Για ανοίγματα > 100 / 75 / 50 m (ελαφριά / μέση / βαριά επιφόρτιση) οι αποστάσεις αυξάνονται κατά 1 cm ανά m ανοίγματος (C-2 σημ. 2).", { size: 10, fill: C.muted });
    return wrap(W, H, s, "Ελάχιστο ύψος καλωδίου παροχής από το έδαφος – ΔΕΗ C-2 / C-3");
  }

  /* ---------------------------------------------------------------- 2. Κτίριο: επιτοίχιο καλώδιο, ανοίγματα, στέγη (C-12 / C-8 / C-9) */
  function buildingClearances() {
    const W = 900, H = 420, G = 380;
    let s = "";
    s += rect(0, G, W, H - G, { fill: C.ground, stroke: "none", w: 0 });
    // building 1: wall with window and balcony (C-12)
    const bx = 60, bw = 360, by = 60;
    s += rect(bx, by, bw, G - by, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 });
    s += txt(bx + 8, by - 8, "Επιτοίχιο καλώδιο παροχής (C-12)", { size: 12, bold: true, fill: C.acc });
    // window
    const wx = bx + 150, wy = by + 90, ww = 90, wh = 80;
    s += rect(wx, wy, ww, wh, { fill: "#162633", stroke: "#8fb4c4", w: 1.5 });
    s += txt(wx + ww / 2, wy + wh / 2 + 4, "παράθυρο / εξώστης", { anchor: "middle", size: 10, fill: C.muted });
    // cable path: vertical on wall 40 px left of window → goes above window
    const cx = wx - 36;
    s += line(cx, by + 20, cx, G - 100, { stroke: C.warn, w: 2.5 });
    s += line(cx, wy - 6, wx + ww + 36, wy - 6, { stroke: C.warn, w: 2.5 });
    s += txt(cx - 6, by + 36, "καλώδιο", { anchor: "end", size: 10, fill: C.warn });
    s += hdim(wy + wh + 22, wx - 36, wx, "≥ 0,90 m", { color: C.acc, size: 11, below: true });
    s += vdim(wx + ww + 10, wy - 6, wy, "≥ 0,15 m πάνω από άνοιγμα", { color: C.acc, size: 11 });
    s += txt(wx + ww + 14, wy + 40, "κάτω / πλευρικά από άνοιγμα: ≥ 0,90 m", { size: 10, fill: C.muted });
    s += txt(wx + ww + 14, wy + 54, "(αλλιώς μονωτικός προφυλακτήρας)", { size: 10, fill: C.muted });
    // ground clearance of wall cable
    s += vdim(bx + 30, G - 100, G, "≥ 2,50 m από το έδαφος", { color: C.acc, size: 11 });
    s += line(bx + 20, G - 100, cx, G - 100, { stroke: C.warn, w: 2.5 });
    // building 2: sloped roof (C-8) and bare conductors (C-9)
    const rx = 480, rw = 240;
    s += rect(rx, 210, rw, G - 210, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 });
    s += `<path d="M${rx - 10},210 L${rx + rw / 2},140 L${rx + rw + 10},210 Z" fill="#33414c" stroke="#4b5f6d" stroke-width="1.5"/>`;
    s += txt(rx, 52, "Στέγη / εξώστης (C-8, C-9)", { size: 12, bold: true, fill: C.acc });
    s += sagPath(rx - 60, 96, rx + rw + 60, 110, 6);
    s += txt(rx - 56, 90, "συγκεντρικό καλώδιο παροχής", { size: 10, fill: C.warn });
    s += vdim(rx + rw / 2, 104, 140, "≥ 0,90 m", { color: C.acc, size: 11 });
    s += txt(rx + rw / 2 + 50, 118, "πάνω από την κορυφή", { size: 10, fill: C.acc });
    s += txt(rx + rw / 2 + 50, 131, "επικλινούς στέγης (C-8)", { size: 10, fill: C.acc });
    s += line(rx - 60, 66, rx + rw + 60, 66, { stroke: "#c9d6dc", w: 1.5, dash: "6 4" });
    s += txt(rx - 56, 62, "γυμνοί αγωγοί ΧΤ", { size: 10, fill: C.text });
    s += vdim(rx + 30, 66, 190, "≥ 2,50 m", { color: C.dim, size: 11, left: true });
    s += txt(rx + 36, 160, "γυμνοί αγωγοί ΧΤ πάνω από", { size: 9.5, fill: C.muted });
    s += txt(rx + 36, 172, "στέγη / εξώστη / στηθαίο (C-9)", { size: 9.5, fill: C.muted });
    s += line(rx + rw + 10, 210, rx + rw + 10, 300, { stroke: "#4b5f6d", w: 1, dash: "3 3" });
    s += hdim(300, rx + rw + 10, rx + rw + 60, "≥ 1,25 m", { color: C.dim, size: 10 });
    s += txt(rx + rw + 64, 292, "γυμνοί αγωγοί ΧΤ", { size: 9.5, fill: C.muted });
    s += txt(rx + rw + 64, 304, "οριζόντια από κτίριο", { size: 9.5, fill: C.muted });
    s += txt(rx + rw + 64, 316, "(0,90 m μόνο όπου δεν", { size: 9.5, fill: C.muted });
    s += txt(rx + rw + 64, 328, "είναι τεχνικά δυνατή)", { size: 9.5, fill: C.muted });
    return wrap(W, H, s, "Αποστάσεις καλωδίου παροχής από κτίρια – ΔΕΗ C-8 / C-9 / C-12");
  }

  /* ---------------------------------------------------------------- 3. Στύλος: τηλεπικοινωνίες, επίτονος (C-19) */
  function poleClearances() {
    const W = 900, H = 400, G = 360;
    let s = "";
    s += rect(0, G, W, H - G, { fill: C.ground, stroke: "none", w: 0 });
    const x = 450;
    s += rect(x - 6, 50, 12, G - 50, { fill: "#5b6770", stroke: "#8a98a3", w: 1 });
    s += txt(x, 44, "στύλος ΧΤ", { anchor: "middle", size: 11, fill: C.muted });
    // LV conductors at y=80
    s += line(80, 80, 820, 80, { stroke: "#c9d6dc", w: 2.5 });
    s += txt(90, 74, "αγωγοί ΧΤ", { size: 11, fill: C.text });
    // service cable attachment at y=110 → to the right
    s += sagPath(x + 6, 112, 860, 150, 18);
    s += txt(x + 60, 104, "καλώδιο παροχής (συγκεντρικό)", { size: 11, fill: C.warn });
    // telecom OTE at 160, DEDDIE telecom at 136
    s += line(80, 196, 820, 196, { stroke: "#9ca3af", w: 2, dash: "10 6" });
    s += txt(90, 190, "γραμμή τηλεπικοινωνίας Ο.Τ.Ε.", { size: 11, fill: C.text });
    s += vdim(x - 60, 112, 196, "≥ 1,20 m καλώδιο παροχής – Ο.Τ.Ε. (C-19 VII)", { color: C.acc, size: 11, left: true });
    s += vdim(x + 150, 80, 196, "≥ 1,20 m αγωγοί ΧΤ – Ο.Τ.Ε.", { color: C.dim, size: 11 });
    s += line(80, 240, 820, 240, { stroke: "#9ca3af", w: 2, dash: "4 4" });
    s += txt(90, 234, "γραμμή τηλεπικοινωνίας ΔΕΔΔΗΕ", { size: 11, fill: C.text });
    s += vdim(x + 300, 196, 240, "≥ 0,60 m παροχή – τηλεπ. ΔΕΔΔΗΕ (C-19 VIII)", { color: C.acc, size: 11, left: true });
    // guy wire
    s += line(x + 6, 100, 760, G, { stroke: "#8fb4c4", w: 1.5 });
    s += txt(700, G - 12, "επίτονος", { size: 11, fill: C.muted });
    s += vdim(x + 40, 80, 100, "≥ 0,30 m επίτονος – αγωγοί ΧΤ (C-19 V)", { color: C.dim, size: 11 });
    return wrap(W, H, s, "Αποστάσεις στον στύλο – τηλεπικοινωνίες & επίτονος – ΔΕΗ C-19");
  }

  /* ---------------------------------------------------------------- 4. Έλεγχος ανοίγματος L: στυλίσκος παροχής / γάντζος */
  function spanCheck(span, inp, rules) {
    const W = 900, H = 500, G = 300;
    const sp = span || {}, L = Number(inp && inp.L_m || 0);
    const PR = rules.pole_rules, MB = rules.messenger_by_cable_m;
    let s = "";
    s += rect(0, G, W, 40, { fill: C.ground, stroke: "none", w: 0 });
    // left: network pole
    s += pole(70, 60, G, { label: "στύλος δικτύου ΧΤ" });
    // right: building with στυλίσκος & γάντζος
    const bx = 560;
    s += rect(bx, 170, 300, G - 170, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 });
    s += txt(bx + 150, 195, "κτίριο / όριο οικοπέδου", { anchor: "middle", size: 11, fill: C.muted });
    // pole on building: 6 m pipe (3''/4'')
    const okPole = sp.applicable && sp.pole_ok;
    const px = bx + 40;
    s += rect(px - 4, 62, 8, G - 62, { fill: okPole ? "#2b6f3a" : (sp.applicable ? "#6b2b2b" : "#5b6770"), stroke: "#8a98a3", w: 1 });
    s += txt(px, 54, `στυλίσκος ${sp.pole_pipe || PR.pipe_min} / ${PR.height_m} m`, { anchor: "middle", size: 11, fill: okPole ? C.ok : (sp.applicable ? C.no : C.muted), bold: true });
    s += vdim(px - 24, 62, G, `${Number(PR.height_m).toFixed(1).replace(".", ",")} m`, { color: C.dim, size: 10, left: true });
    // hook on wall
    const hx = bx + 200, hy = 180;
    s += `<path d="M${hx - 10},${hy} q10,-14 20,0" fill="none" stroke="${C.line}" stroke-width="3"/>`;
    s += txt(hx, hy - 16, "γάντζος τοίχου" + (sp.hook_heavy ? " (βαρέως τύπου)" : ""), { anchor: "middle", size: 11, fill: sp.hook_messenger || sp.hook_heavy ? C.warn : C.ok, bold: true });
    // cable: pole → στυλίσκος top (if ok) else to hook
    const toPole = sp.is_pole && okPole;
    s += sagPath(70, 70, toPole ? px : hx, toPole ? 64 : hy, 30 + Math.min(60, L));
    if (sp.messenger || sp.hook_messenger && !sp.is_pole) s += txt(330, 150, "συρματόσχοινο ανάρτησης", { size: 11, fill: C.warn, anchor: "middle" });
    s += hdim(G + 24, 70, toPole ? px : hx, `L = ${L} m`, { color: C.acc, size: 13, below: true });
    // results box
    s += rect(12, 338, 876, 50, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 6 });
    s += txt(24, 357, "Σε στυλίσκο:", { size: 12, bold: true, fill: C.text });
    s += txt(120, 357, sp.applicable ? sp.pole_text : "—", { size: 12, fill: sp.applicable ? (sp.pole_ok ? C.ok : C.no) : C.muted });
    s += txt(24, 379, "Σε γάντζο:", { size: 12, bold: true, fill: C.text });
    s += txt(120, 379, sp.applicable ? sp.hook_text : "—", { size: 12, fill: sp.applicable ? (sp.hook_messenger ? C.warn : C.ok) : C.muted });
    // threshold scale 0..35 m
    const sx0 = 120, sx1 = 860, sy = 452, mpx = (sx1 - sx0) / 35;
    s += line(sx0, sy, sx1, sy, { stroke: C.dim, w: 1.5 });
    for (let m = 0; m <= 35; m += 5) { s += line(sx0 + m * mpx, sy - 4, sx0 + m * mpx, sy + 4, { stroke: C.dim, w: 1 }); s += txt(sx0 + m * mpx, sy + 15, m + " m", { anchor: "middle", size: 9, fill: C.muted }); }
    s += txt(24, sy + 4, "όρια (m):", { size: 11, bold: true, fill: C.text });
    const mark = (m, col, lab, lvl) => { if (m === null || m === undefined) return; const x = sx0 + Math.min(35, m) * mpx; s += line(x, sy - 8, x, sy + 8, { stroke: col, w: 2.5 }); const yy = lvl === 1 ? sy - 24 : lvl === 2 ? sy - 12 : lvl === 3 ? sy + 27 : sy + 38; s += txt(x, yy, lab, { anchor: "middle", size: 9.5, fill: col }); };
    if (sp.applicable && sp.std_span !== null) {
      mark(sp.pole_limit, C.ok, `στυλίσκος ≤ ${sp.pole_limit} m`, 1);
      mark(sp.std_span, C.dim, `CS-3 τυποπ. ${sp.std_span} m`, 2);
      if (PR.big_cables.indexOf((inp.chosen_short || "")) >= 0) mark(PR.pipe_big_from_m, C.acc, `4" από ${PR.pipe_big_from_m} m`, 3);
      mark(sp.messenger_limit, C.warn, `συρματόσχοινο > ${sp.messenger_limit} m`, 4);
      const xl = sx0 + Math.min(35, L) * mpx;
      s += `<path d="M${xl - 6},${sy - 40} L${xl},${sy - 30} L${xl + 6},${sy - 40} Z" fill="${C.no}"/>`;
      s += txt(xl, sy - 44, `L = ${L} m`, { anchor: "middle", size: 10, fill: C.no, bold: true });
    }
    return wrap(W, H, s, "Άνοιγμα L – στυλίσκος παροχής (3\"/4\" – 6 m) ή γάντζος · C-3 όρια στυλίσκου / γάντζου: 2x6 30/35, 2x16 25/30, 4x6 25/30, 4x16 20/25, 4x25 20/25, 4x35 & 4x50 15/20 m (πάνω από το όριο γάντζου: συρματόσχοινο)");
  }

  /* ---------------------------------------------------------------- 5. Μετρητική διάταξη – σχέδιο εσοχής που προσαρμόζεται στους μετρητές */
  function board(b, opts) {
    opts = opts || {};
    const boxes = b.boxes || [], niche = b.niche || { x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0 };
    const supply = opts.supply || "OH";
    const R = Object.assign({ sidewalk: 3.0, road: 5.5, guy_sidewalk: 2.5, guy_road: 5.5, pole_edge: 0.15, cabinet_base: 0.30 }, opts.rules || {});
    if (!boxes.length) return wrap(600, 160, txt(300, 90, "Συμπληρώστε το πλήθος των παροχών.", { anchor: "middle", size: 14, fill: C.muted }), "Μετρητική διάταξη – σχέδιο");
    // vertical axis: the ground gap below the niche is compressed (break marks) so the drawing stays compact
    const gapCm = 45, baseCm = Math.max(0, niche.y0 - gapCm);          // drawn ground sits baseCm below the real zero
    const Wcm = Math.max(niche.width, 140), topCm = niche.y1 + 35;
    const scale = Math.min(2.6, 820 / Wcm);                             // px per cm
    const ML = 210, MR = 190, MT = 40, MB = b.pit ? 118 + Math.min(b.pit.h_cm * Math.min(2.6, 820 / Wcm), 58) + 30 : 118;   // χώρος για το φρεάτιο πελάτη κάτω από το δάπεδο
    const W = Math.round(ML + Wcm * scale + MR), H = Math.round(MT + (topCm - baseCm) * scale + MB);
    const X = cm => ML + cm * scale, Y = cm => MT + (topCm - cm) * scale;      // Y of a real height (cm); ground drawn at Y(baseCm)
    const Yg = Y(baseCm);
    let s = "";
    s += rect(X(-30), Y(topCm), (Wcm + 60) * scale, (topCm - baseCm) * scale, { fill: "#182a36", stroke: "none", w: 0 });
    s += rect(0, Yg, W, H - Yg, { fill: C.ground, stroke: "none", w: 0 });
    s += line(0, Yg, W, Yg, { stroke: "#7a6a4a", w: 2.5 });
    s += txt(W - 8, Yg + 16, "έδαφος / πεζοδρόμιο", { anchor: "end", size: 11, fill: C.muted });
    // niche (υπόγεια παροχή: ανοιχτή μέχρι το δάπεδο – χωρίς κάτω πλευρά) + φρεάτιο πελάτη ΜΔ-51/Ι κάτω από το δάπεδο
    if (b.ug_open) {
      s += rect(X(niche.x0), Y(niche.y1), niche.width * scale, niche.height * scale, { fill: "#0f1e28", stroke: "none", w: 0 });
      s += `<path d="M${X(niche.x0)},${Yg} L${X(niche.x0)},${Y(niche.y1)} L${X(niche.x1)},${Y(niche.y1)} L${X(niche.x1)},${Yg}" fill="none" stroke="${C.acc}" stroke-width="2" stroke-dasharray="7 4"/>`;
      if (b.pit) {
        // φρεάτια ΜΔ-51/Ι: ένα ανά στήλη, σε ευθεία κάτω από τον διανομέα / την κυψέλη (κανόνας γραφείου)
        const pd = Math.min(b.pit.h_cm * scale, 58), pits = (b.pit.pits && b.pit.pits.length) ? b.pit.pits : [b.pit];
        pits.forEach(pt => {
          const px0 = X(pt.x0), pw = (pt.x1 - pt.x0) * scale;
          s += rect(px0, Yg, pw, pd, { fill: "#2a2418", stroke: C.warn, w: 1.5, dash: "4 3" });
          s += line(px0 - 4, Yg + pd, px0 + pw + 4, Yg + pd, { stroke: C.warn, w: 1 });
          if (pits.length > 1) s += txt(px0 + pw / 2, Yg + pd - 5, pt.under === "CT" ? "κάτω από την κυψέλη" : (pt.under === "D" ? "κάτω από τον διανομέα" : "κάτω από τα κιβώτια"), { anchor: "middle", size: 8.5, fill: C.warn });
        });
        const lx = pits.length > 1 ? X((niche.x0 + niche.x1) / 2) : X(pits[0].x0) + (pits[0].x1 - pits[0].x0) * scale / 2;
        s += txt(lx, Yg + pd + 13, `${pits.length > 1 ? pits.length + " φρεάτια" : "φρεάτιο"} ${b.pit.type} ${Math.round(b.pit.w_cm)}×${Math.round(b.pit.d_cm)}, βάθος ${Math.round(b.pit.h_cm)} cm – πελάτης${pits.length > 1 ? " (ένα ανά στήλη, σε ευθεία κάτω από τον διανομέα / την κυψέλη)" : " (σε ευθεία κάτω από τον διανομέα / την κυψέλη)"}`, { anchor: "middle", size: 9.5, fill: C.warn, bold: true });
      }
    } else s += rect(X(niche.x0), Y(niche.y1), niche.width * scale, niche.height * scale, { fill: "#0f1e28", stroke: C.acc, w: 2, dash: "7 4" });
    // supply cable into each distributor / standalone cell (drawn behind the boxes) (or into the single box) – υπόγεια: ένα (ή περισσότερα παράλληλα) καλώδια ανά διάταξη (opts.ug = ug_cables)
    const cellArr = new Set((b.arrangements || []).filter(a => a.cell).map(a => a.idx));
    const dists = boxes.filter(x => x.kind === "D").concat(boxes.filter(x => x.kind === "CT" && cellArr.has(x.arr)));   // διανομείς + κυψέλες Νο 5–7 μόνες τους (κάθε μία με δικό της καλώδιο)
    const ugp = (supply !== "OH" && opts.ug && opts.ug.per_arr) ? opts.ug.per_arr : null;
    const feeds = dists.length ? dists : [boxes[0]];
    const byX = {};
    feeds.forEach(d => { const cx = Math.round(X((d.x0 + d.x1) / 2)); (byX[cx] = byX[cx] || []).push(d); });
    Object.keys(byX).forEach(k => {
      const cx = Number(k), group = byX[k].slice().sort((p, q) => p.y0 - q.y0);
      group.forEach((d, gi) => {
        const pa = ugp ? ugp.find(p => p.idx === d.arr) : null;
        const n = pa ? Math.min(4, Math.max(1, pa.parallel)) : 1;
        const gdx = (gi - (group.length - 1) / 2) * (n > 1 ? 14 : 7);
        if (supply === "OH") s += line(cx + gdx, Y(topCm) + 2, cx + gdx, Y(d.y1), { stroke: C.warn, w: 2.5 });
        else for (let i = 0; i < n; i++) { const dx = gdx + (i - (n - 1) / 2) * 4; s += line(cx + dx, Yg + (b.pit ? Math.min(b.pit.h_cm * scale, 58) : 0), cx + dx, Y(d.y0), { stroke: C.warn, w: 2 }); }
      });
      if (ugp) {
        const labs = group.map(d => { const pa = ugp.find(p => p.idx === d.arr); const lb = pa ? (pa.label || `Δ${pa.idx}`) : ""; return pa && pa.cable ? `${lb}: ${pa.parallel > 1 && !/^\d+\(/.test(pa.cable.short) ? pa.parallel + " × " : ""}${pa.cable.short}` : (pa ? `${lb}: —` : ""); }).filter(Boolean);
        const yl = Yg + 30 + (b.pit ? Math.min(b.pit.h_cm * scale, 58) + 26 : 0);
        labs.forEach((lab, i) => s += txt(cx, yl + i * 12, lab, { anchor: "middle", size: 9, fill: C.warn, bold: true }));
      }
    });
    s += txt(X(niche.x0), supply === "OH" ? Y(topCm) + 14 : Yg + 16 + (b.pit ? Math.min(b.pit.h_cm * scale, 58) + 26 : 0), supply === "OH" ? "καλώδιο εναέριας παροχής (κάθοδος στον διανομέα)" : (ugp && ugp.length > 1 ? `υπόγεια καλώδια: ${opts.ug.n_cables} – ένα (ή παράλληλα) ανά διάταξη (διανομέας / κυψέλη Νο 5–7), από το φορτίο κάθε διάταξης` : "υπόγειο καλώδιο παροχής (άνοδος στον διανομέα)"), { size: 10, fill: C.warn });
    // boxes
    const fillOf = { "1F": C.box1, "3F": C.box3, "CT": C.boxct, "D": C.boxd };
    boxes.forEach(bx => {
      const w = (bx.x1 - bx.x0) * scale, h = (bx.y1 - bx.y0) * scale;
      s += rect(X(bx.x0) + 1, Y(bx.y1) + 1, Math.max(1, w - 2), Math.max(1, h - 2), { fill: fillOf[bx.kind] || C.box3, stroke: "#dbe7ee", w: 1, rx: 2 });
      const fs = Math.max(8, Math.min(13, w / 2.4));
      s += txt(X(bx.x0) + w / 2, Y(bx.y1) + h / 2 + fs / 3, bx.label, { anchor: "middle", size: fs, bold: true, fill: "#fff" });
    });
    // dimensions: width / height / niche bottom / row heights (with break marks on the compressed ground gap)
    s += hdim(Y(niche.y1) - 14, X(niche.x0), X(niche.x1), `πλάτος εσοχής ${Math.round(niche.width)} cm`, { color: C.acc, size: 12 });
    s += vdim(X(niche.x1) + 18, Y(niche.y1), Y(niche.y0), `ύψος εσοχής ${Math.round(niche.height)} cm`, { color: C.acc, size: 12 });
    const rowsY = [...new Set(boxes.map(x => x.y0))].sort((a, c) => a - c);
    const marks = [[niche.y0, C.acc, `εσοχή ${m2(niche.y0 / 100)} m`]].concat(rowsY.map((y0, i) => [y0, i === 0 ? C.ok : C.warn, `${m2(y0 / 100)} m`]));
    marks.forEach(([y0, col, lab], i) => {
      const xd = X(niche.x0) - 28 - i * 66;
      s += vdim(xd, Y(y0), Yg, lab, { color: col, size: 11, left: true });
      s += line(xd, Y(y0), X(niche.x0), Y(y0), { stroke: C.dim, w: 1, dash: "3 3" });
      if (baseCm > 0) { const yb = Yg - 14; s += `<path d="M${xd - 6},${yb + 4} L${xd + 6},${yb - 4} M${xd - 6},${yb + 10} L${xd + 6},${yb + 2}" fill="none" stroke="${C.bg}" stroke-width="6"/><path d="M${xd - 6},${yb + 4} L${xd + 6},${yb - 4} M${xd - 6},${yb + 10} L${xd + 6},${yb + 2}" fill="none" stroke="${col}" stroke-width="1.5"/>`; }
    });
    if (baseCm > 0) s += txt(X(niche.x0) - 28, Yg + 16, "(κάτω τμήμα σε σύμπτυξη)", { anchor: "end", size: 9, fill: C.muted });
    // margins inside the niche (20 cm below the lowest box / above the highest), row gap, column gap
    const lowY0 = Math.min(...boxes.map(x => x.y0)), highY1 = Math.max(...boxes.map(x => x.y1));
    const xm = X(niche.x1) - 10;
    if (niche.y0 < lowY0) s += vdim(xm, Y(lowY0), Y(niche.y0), `${Math.round(lowY0 - niche.y0)}`, { color: C.dim, size: 10, left: true });
    if (niche.y1 > highY1) s += vdim(xm, Y(niche.y1), Y(highY1), `${Math.round(niche.y1 - highY1)}`, { color: C.dim, size: 10, left: true });
    const arrs = b.arrangements || [];
    if ((b.rows || 1) >= 2 && b.row_gap_cm) {
      const row2top = Math.max(...boxes.filter(x => arrs.some(a => a.idx === x.arr && a.row === 2)).map(x => x.y1).concat([lowY0]));
      if (b.mount_upper_cm > row2top) s += vdim(X(niche.x0) + 10, Y(b.mount_upper_cm), Y(row2top), `${Math.round(b.mount_upper_cm - row2top)}`, { color: C.dim, size: 10 });
    }
    const cols = [...new Set(arrs.map(a => a.col))].sort((a, c) => a - c);
    for (let i = 0; i + 1 < cols.length; i++) {
      const a1 = arrs.find(a => a.col === cols[i]), a2 = arrs.find(a => a.col === cols[i + 1]);
      if (a1 && a2) s += hdim(Y(highY1) - 10, X(a1.x + a1.col_w), X(a2.x), `${Math.round(a2.x - a1.x - a1.col_w)}`, { color: C.dim, size: 10 });
    }
    // per-arrangement labels
    arrs.forEach(a => { const y0 = a.y !== undefined ? a.y : (a.row === 1 ? b.mount_upper_cm : b.mount_lower_cm); s += txt(X(a.x + a.width / 2), Y(y0) + 14, `διάταξη ${a.idx}: ${a.n} μετρ. / ${a.slots} θέσεις`, { anchor: "middle", size: 10, fill: C.muted }); });
    // legend
    const lg = [["1F", "1Φ 20×30"], ["3F", "3Φ 30×50"], ["CT", "Νο5–7 κυψέλη 60×80"], ["D", "διανομέας 30×50"]];
    let lx = 12;
    const yl = H - 62;
    lg.forEach(([k, lab]) => { s += rect(lx, yl - 10, 14, 12, { fill: fillOf[k], stroke: "none", w: 0 }); s += txt(lx + 18, yl, lab, { size: 10, fill: C.muted }); lx += 20 + lab.length * 6.2; });
    s += txt(W - 8, yl, `${b.md_code || ""} · ${b.n_distr || 0} διανομείς · ${b.N} μετρητές`, { anchor: "end", size: 11, fill: C.acc, bold: true });
    // minimum distances from sidewalk & road (footer)
    s += rect(8, H - 48, W - 16, 42, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 5 });
    s += txt(16, H - 33, `Ελάχιστες αποστάσεις: κάτω άκρο εσοχής ${m2(niche.y0 / 100)} m από πεζοδρόμιο / έδαφος · καλώδιο παροχής ≥ ${m2(R.sidewalk)} m πάνω από πεζοδρόμιο (C-3 II, ΜΔ-81) · ≥ ${m2(R.road)} m πάνω από οδόστρωμα (C-3 I, ΜΔ-79)`, { size: 10, fill: C.text });
    s += txt(16, H - 17, `Καμπίνες ΜΔ-77/81/83: βάση ${m2(R.cabinet_base)} m πάνω από το έδαφος · στύλος ≥ ${m2(R.pole_edge)} m από το άκρο του πεζοδρομίου (C-3 VI) · επίτονος ≥ ${m2(R.guy_sidewalk)} m πεζοδρόμιο / ${m2(R.guy_road)} m οδός · ΣΚ-ΠΠ στυλίσκος 3,00 / 5,50 m`, { size: 10, fill: C.muted });
    return wrap(W, H, s, opts.title || "Μετρητική διάταξη – εσοχή & κιβώτια (κλίμακα, cm)");
  }

  /* ---------------------------------------------------------------- 6. Ελάχιστες αποστάσεις από πεζοδρόμιο και δρόμο (ΜΔ / καλώδιο παροχής) */
  function mdDistances(opts) {
    opts = opts || {};
    const R = Object.assign({ niche_bottom: 0.60, row_upper: 1.50, row_lower: 0.80, rows: 2, sidewalk: 3.0, road: 5.5, guy_sidewalk: 2.5, guy_road: 5.5, pole_edge: 0.15, cabinet_base: 0.30, cabinet_h: 1.0, skpp_no_road: 3.0, skpp_road: 5.5 }, opts.rules || {});
    const W = 940, H = 536, G = 372, k = 38;      // k px per m
    const yOf = m => G - m * k;
    let s = "";
    // ground: road | curb | sidewalk | building
    const xr0 = 20, xc = 330, xw = 640;
    s += rect(0, G, W, H - G, { fill: C.ground, stroke: "none", w: 0 });
    s += rect(xr0, G, xc - xr0, 10, { fill: "#2b2b2b", stroke: "none", w: 0 });
    s += rect(xc, G - 6, xw - xc, 16, { fill: "#4a4036", stroke: "none", w: 0 });
    s += line(0, G, W, G, { stroke: "#7a6a4a", w: 2 });
    s += txt((xr0 + xc) / 2, G + 26, "ΟΔΟΣΤΡΩΜΑ (δρόμος)", { anchor: "middle", size: 11, fill: C.muted, bold: true });
    s += txt((xc + xw) / 2, G + 26, "ΠΕΖΟΔΡΟΜΙΟ", { anchor: "middle", size: 11, fill: C.muted, bold: true });
    s += txt(xc, G + 40, "κράσπεδο", { anchor: "middle", size: 9, fill: C.muted });
    s += txt(xc + 14, G + 54, `στύλος ≥ ${m2(R.pole_edge)} m από το άκρο του πεζοδρομίου (C-3 VI)`, { size: 9.5, fill: C.dim });
    // building wall with niche
    s += rect(xw, 44, W - xw, G - 44, { fill: C.wall, stroke: "#4b5f6d", w: 1.5 });
    s += txt(xw + 10, 60, "κτίριο / περίφραξη", { size: 11, fill: C.muted });
    const nb = R.niche_bottom, nt = R.row_upper + 0.5 + 0.2, nh = nt - nb;
    s += rect(xw + 30, yOf(nt), 110, nh * k, { fill: "#0f1e28", stroke: C.acc, w: 2, dash: "6 4" });
    // meter box rows: upper row always at 1,50 m, lower row (2nd arrangement) at 0,80 m (ΟΔ.45 ΜΔ-7 / ΜΔ-9)
    const rowsY = R.rows > 1 ? [R.row_upper, R.row_lower] : [R.row_upper];
    rowsY.forEach(ry => { for (let i = 0; i < 3; i++) s += rect(xw + 40 + i * 32, yOf(ry + 0.5), 26, 0.5 * k, { fill: "#1c2c38", stroke: C.ok, w: 1 }); });
    s += txt(xw + 85, yOf(nt) - 6, "εσοχή μετρητών", { anchor: "middle", size: 10, fill: C.acc });
    s += txt(xw + 85, yOf(nb) + 13, `εσοχή από ${m2(nb)} m`, { anchor: "middle", size: 9, fill: C.acc });
    s += vdim(xw + 160, yOf(R.row_upper), G, `άνω σειρά ${m2(R.row_upper)} m`, { color: C.ok, size: 10 });
    if (R.rows > 1) s += vdim(xw + 16, yOf(R.row_lower), G, `κάτω σειρά ${m2(R.row_lower)} m`, { color: C.ok, size: 10, left: true });
    // στυλίσκος on the building (6 m) & cable from the network pole across the road
    const px = xw + 12;
    s += rect(px - 3, yOf(6.0), 6, G - yOf(6.0), { fill: "#5b6770", stroke: "#8a98a3", w: 1 });
    s += txt(px - 8, yOf(6.0) - 6, "στυλίσκος παροχής 3\"/4\" – 6 m", { anchor: "end", size: 10, fill: C.muted });
    s += pole(60, yOf(7.2), G, { label: "στύλος δικτύου ΧΤ" });
    s += sagPath(60, yOf(7.0), px, yOf(5.9), 12);
    s += txt(300, yOf(7.0) - 10, "συγκεντρικό καλώδιο παροχής", { size: 10, fill: C.warn });
    // minimum heights: road segment ≥ 5,50 m, sidewalk segment ≥ 3,00 m
    s += line(xr0 + 20, yOf(R.road), xc, yOf(R.road), { stroke: C.warn, w: 2, dash: "8 5" });
    s += vdim(170, yOf(R.road), G, `≥ ${m2(R.road)} m`, { color: C.warn, size: 13 });
    s += txt(178, yOf(R.road) + 26, "καλώδιο πάνω από", { size: 9.5, fill: C.muted });
    s += txt(178, yOf(R.road) + 39, "οδόστρωμα (C-3 I, ΜΔ-79)", { size: 9.5, fill: C.muted });
    s += line(xc + 16, yOf(R.sidewalk), xw - 10, yOf(R.sidewalk), { stroke: C.ok, w: 2, dash: "8 5" });
    s += vdim(530, yOf(R.sidewalk), G, `≥ ${m2(R.sidewalk)} m`, { color: C.ok, size: 13 });
    s += txt(522, yOf(R.sidewalk) + 26, "καλώδιο πάνω από", { size: 9.5, fill: C.muted, anchor: "end" });
    s += txt(522, yOf(R.sidewalk) + 39, "πεζοδρόμιο (C-3 II, ΜΔ-81)", { size: 9.5, fill: C.muted, anchor: "end" });
    // pole at the curb (0,15 m) and cabinet base on the sidewalk
    const spx = xc + 10;
    s += rect(spx - 3, yOf(4.0), 6, G - yOf(4.0), { fill: "#5b6770", stroke: "#8a98a3", w: 1 });
    s += hdim(G - 22, xc, spx - 3, "", { color: C.dim, size: 9 });
    s += txt(spx + 6, G - 26, `≥ ${m2(R.pole_edge)} m`, { size: 9.5, fill: C.dim });
    const cbx = xc + 70;
    s += rect(cbx, yOf(R.cabinet_base), 60, R.cabinet_base * k, { fill: "#3b3b3b", stroke: "#8a98a3", w: 1 });
    s += rect(cbx + 5, yOf(R.cabinet_base + R.cabinet_h), 50, R.cabinet_h * k, { fill: "#2f4858", stroke: "#8fb4c4", w: 1.2 });
    s += txt(cbx + 30, yOf(R.cabinet_base + R.cabinet_h / 2) + 4, "καμπίνα", { anchor: "middle", size: 9, fill: C.text });
    s += txt(cbx + 30, yOf(R.cabinet_base + R.cabinet_h) - 6, "ΜΔ-77/81/83", { anchor: "middle", size: 9, fill: C.muted });
    s += vdim(cbx + 70, yOf(R.cabinet_base), G, `${m2(R.cabinet_base)} m`, { color: C.dim, size: 9 });
    // notes
    s += rect(8, H - 94, W - 16, 86, { fill: C.panel, stroke: "#3a4a55", w: 1, rx: 5 });
    s += txt(16, H - 77, `Επίτονος στυλίσκου: ≥ ${m2(R.guy_sidewalk)} m πάνω από πεζοδρόμιο · ≥ ${m2(R.guy_road)} m πάνω από οδό (C-3 II / I) · στύλος ≥ ${m2(R.pole_edge)} m από το άκρο του πεζοδρομίου (C-3 VI).`, { size: 10, fill: C.text });
    s += txt(16, H - 61, `Μεταλλικές καμπίνες ΜΔ-77 / ΜΔ-81 / ΜΔ-83: βάση σκυροδέματος ${m2(R.cabinet_base)} m πάνω από το έδαφος (0,50–0,80 m κάτω) · καμπίνα 1000 × 350 × 1000 mm (ΜΔ-83: min 790 × 600 × 1600 mm).`, { size: 10, fill: C.text });
    s += txt(16, H - 45, `Προσωρινές παροχές (ΣΚ-ΠΠ): στυλίσκος πελάτη Υ = ${m2(R.skpp_no_road)} m (Φ2½") χωρίς διάβαση δρόμου · ${m2(R.skpp_road)} m (Φ3") με διάβαση δρόμου · κιβώτιο πίνακα 70×70 cm στα 1,50 m.`, { size: 10, fill: C.text });
    s += txt(16, H - 29, "Η απόσταση 3,00 m ισχύει για συγκεντρικά καλώδια παροχής και μονωμένους αγωγούς σε γειωμένο συρματόσχοινο· για γυμνούς αγωγούς ΧΤ: 4,50 m πεζοδρόμιο / 5,50 m οδός (C-2/C-3).", { size: 10, fill: C.muted });
    s += txt(16, H - 13, "Οι αποστάσεις νοούνται από το χαμηλότερο σημείο του καλωδίου (μέγιστο βέλος) – όχι από τα σημεία στήριξης· για ανοίγματα > 50/75/100 m +1 cm ανά m (C-2 σημ. 2). Σχήμα όχι υπό κλίμακα.", { size: 10, fill: C.muted });
    return wrap(W, H, s, "Ελάχιστες αποστάσεις μετρητικής διάταξης & καλωδίου παροχής από πεζοδρόμιο και δρόμο");
  }

  const api = { groundClearances, buildingClearances, poleClearances, spanCheck, board, mdDistances,
    prim: { C, F, esc, m2, txt, line, rect, vdim, hdim, wrap, pole, sagPath } };   // primitives shared with app_clr.js (Αποστάσεις ασφαλείας)
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.DIAGRAMS = api;
})(typeof self !== "undefined" ? self : this);
