/* Καθολική αναζήτηση της εφαρμογής (πεδίο στην πάνω γραμμή). Ευρετήριο (φτιάχνεται στην πρώτη χρήση) από: καρτέλες / εργασίες,
   περιπτώσεις αποστάσεων ασφαλείας, σχέδια ΕΤΚΔ (κωδικός + τίτλος), συνηθέστερες κατασκευές, κατάλογος ΜΔ, παροχές, καλώδια,
   γενικές πληροφορίες (ΟΔ.41/48/119/5), οδηγίες, κανόνες των καρτελών (drop-down) και επικεφαλίδες των πινάκων. Το αποτέλεσμα
   ανοίγει την αντίστοιχη καρτέλα και το σημείο (σχέδιο, κατασκευή, περίπτωση, γραμμή πίνακα) με προσωρινή επισήμανση.
   Αναζήτηση ανεξάρτητη από τόνους / πεζά-κεφαλαία και από ελληνικούς-λατινικούς όμοιους χαρακτήρες στους κωδικούς (Ρ-3 = P-3). */
(function () {
  "use strict";
  const D = window.OD26_DATA;
  const $ = id => document.getElementById(id);
  const inp = $("g_search"), panel = $("g_results"), clr = $("g_clear");
  if (!D || !inp || !panel) return;
  const esc = s => String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const G2L = { "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X" };
  // κανονικοποίηση: κεφαλαία, χωρίς τόνους/διαλυτικά, ελληνικά όμοια → λατινικά, ενιαία κενά, παύλες
  const norm = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, c => G2L[c]).replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const tabTitle = name => (window.APP_TAB_TITLE ? window.APP_TAB_TITLE(name) : name);
  const go = name => window.APP_SWITCH_TAB && window.APP_SWITCH_TAB(name);
  // λέξεις-κλειδιά ανά καρτέλα (συνώνυμα που δεν υπάρχουν στον τίτλο / την περιγραφή)
  const KW = {
    main: "καλώδιο παροχής διατομή φορτίο μετρητές πλήθος Νο 03 05 1 2 3 4 5 6 7 στυλίσκος γάντζος συρματόσχοινο άνοιγμα L εναέρια υπόγεια δίκτυο αρδευτική αστικό Μ/Σ ασφάλεια αναχώρησης link box ΜΔ εξοχική πολυκατοικία προσωρινή εργοταξιακή ηλεκτροφόρτιση ταυτοχρονισμός Kn ΟΔ.45 ΟΔ.22 ΟΔ.26 εκτύπωση αναφορά",
    board: "μετρητική διάταξη εσοχή κιβώτιο διανομέας 9+9 3+3 σειρές στήλες 1,50 0,80 πλάτος ύψος ΜΔ-5 ΜΔ-7 ΜΔ-9 ΜΔ-11 ΜΔ-13 ΜΔ-15 ΜΔ-71 ΜΔ-72 ΜΔ-73 ΜΔ-74 ΜΔ-77 ΜΔ-79 ΜΔ-81 ΜΔ-83 ΣΚ-ΠΠ πεζοδρόμιο δρόμος φρεάτιο σχέδιο πλήθος διατάξεων",
    mat: "υλικά παροχέτευσης πίνακας υλικών τοποθέτηση αποξήλωση απομάκρυνση σφιγκτήρες στηρίγματα κλάση",
    feeder: "αναχώρηση Μ/Σ ασφάλεια αγωγός βραχυκύκλωμα πτώση τάσης επάρκεια Ιβρ 1,3 GR-207 φυσίγγιο πόσες παροχές",
    ys: "υποσταθμός εναέριος Υ/Σ Μ/Σ ασφάλειες ΜΤ εκτόνωσης κόνεως τηκτό K T ρεύμα ζεύξης διακλάδωση ΟΔ.21 ΟΔ.22 ΟΔ.41 στήριξη μονόστυλο δίστυλο Β2-8",
    vd: "πτώση τάσης ΔU % Κ kVA·km Β2-6 Β2-7 γραμμή ΧΤ ΜΤ τμήματα αγωγός 20 kV 15 kV",
    earth: "ουδετέρωση ΧΤ γειώσεις ΟΔ.119 ηλεκτρόδιο αντίσταση γείωσης Ιβρ 3·Ιασφ Β2-10 Β2-9 RM XM συνθήκη βραχυκύκλωσης ΚΕΗΕ άρθρο 19 μήκος γραμμής ασφάλεια",
    mv: "πελάτης ΜΤ Α1 Α2 Β1 Β2 BKI BKII ΟΔ.34 ΔΠΑ μέτρηση ΜΤ ΧΤ",
    od26: "ΟΔ.26 έλεγχος καλωδίου συντελεστές θερμοκρασία έδαφος ομαδοποίηση βραχυκύκλωμα υπερφόρτιση Iz",
    pyth: "Πυθαγόρας στύλοι επίτονοι ξύλινοι τσιμεντένιοι F-21 F-34 FCP αντοχή επιφόρτιση πασσάλωση υπεραστικός αστικές κατασκευές GKDNS",
    etkd: "ΕΤΚΔ σχέδια τυποποιημένες κατασκευές G C CS FC FCP F P S T U κωδικός εγχειρίδιο καταργημένα 2026",
    vision: "αναγνώριση φωτογραφία πεδίου κάμερα φωτογραφίζω στύλος κατασκευή ταίριασμα ομοιότητα AI agent Claude συνδυασμός κατασκευών ΜΤ ΧΤ ΕΤΚΔ",
    constr: "κατασκευές στύλων φωτογραφίες GIS P-3II S-233 ευθυγραμμία γωνία τέρμα διακλάδωση ΣΚΧΤ",
    clr: "αποστάσεις ασφαλείας C-1 C-2 C-3 C-4 C-5 C-7 C-8 C-9 C-10 C-11 C-12 C-13 C-14 C-15 C-18 C-19 C-20 C-21 C-22 C-23 ύψη αγωγών έδαφος κτίρια πισίνα κολυμβητήριο ανεμογεννήτρια βιοαέριο πρατήριο υδρογόνο ΔΕΣΦΑ ΟΔ.38 σιδηρόδρομος επιτοίχιο",
    tables: "πίνακες παροχές καλώδια CS-3 ΜΔ κατάλογος Μ/Σ ΟΔ.26 υλικά συντελεστές",
    sym: "συμμετοχές συμμετοχή καταναλωτή ΧΤ ΜΤ πάγιο Σπ Σα Σδ Σεπ Σεν Σ1 Σ2 πίνακας τιμών 2026 2007 ΡΑΑΕΥ Ε-114/2026 ΦΕΚ 3954Β αναπροσαρμογή τιμοκαταλόγου 50% κόστος μετρητή ΦΕΚ 440Β διαμέρισμα Αττική επέκταση δικτύου κόστος σύνδεσης προσφορά ΔΕΔΔΗΕ αύξηση ισχύος προσωρινή εργοταξιακή ΦΟΠ νυχτερινό συστάδα πολυκατοικία Υ/Σ διανομής Lκ R απόσταση κατ εξαίρεση Νο 7 επανασύνδεση καταγγελία αντλιοστάσιο άρδευση αποστράγγιση ειδικές συνθήκες ιδιαίτερη αναχώρηση P-43 BK1 μέσα προστασίας",
    form: "οδηγίες κατασκευής παροχής δήλωση ετοιμότητας έντυπο V3 εσοχή ερμάριο φρεάτιο ΜΔ-51 στυλίσκος σιδηροσωλήνας 4 γείωση πίνακας μετρητής",
    info: "γενικές πληροφορίες ΟΔ.41 ΟΔ.48 ΟΔ.119 ΟΔ.5 ΟΔ.40 ΟΔ.42 ΟΔ.61 ΟΔ.95 περιλήψεις ζώνη δουλείας συνεπτυγμένοι υποσταθμοί πολιτική ηλεκτροδότησης μετατοπίσεις παραλλαγές δήλωση ετοιμότητας οδηγίες κατασκευής παροχής ακραία καιρικά φαινόμενα ΔΔ/272503 συμμετοχές Ν.4495 ΕΕΔΜΚ άδεια μικρής κλίμακας μετρητές όρια οικοπέδου πληροφοριακά στοιχεία ΜΤ υπεύθυνη δήλωση",
    help: "οδηγίες βοήθεια ροή εργασίας κανόνες γραφείου χρώματα πηγές επαλήθευση έκδοση copyright" };
  const TS = {}; (window.APP_TABLE_SECTIONS || []).forEach(([k, t]) => TS[k] = t);

  // ---------------------------------------------------------------- ευρετήριο
  let IDX = null;
  const add = (items, group, title, sub, extra, run, w, order) => items.push({ group, title: String(title || ""), sub: String(sub || ""), hay: norm(title + " " + (sub || "") + " " + (extra || "")), hayT: norm(title), hayS: norm(sub || ""), run, w: w || 1, order: order || 9 });
  function openDetailsOf(el) { let p = el; while (p) { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } }
  function flash(el) {
    if (!el) return;
    openDetailsOf(el);
    setTimeout(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("srch-hl"); void el.offsetWidth; el.classList.add("srch-hl"); setTimeout(() => el.classList.remove("srch-hl"), 2800); }, 60);
  }
  function flashRow(containerSel, code) {
    const c = document.querySelector(containerSel); if (!c) return;
    const nc = norm(code);
    const row = Array.from(c.querySelectorAll("tr")).find(tr => tr.cells && tr.cells[0] && norm(tr.cells[0].textContent) === nc);
    flash(row || c.querySelector("h2"));
  }
  function build() {
    const items = [];
    (window.APP_TABS_INFO || []).forEach(t => add(items, "Καρτέλες / εργασίες", t[2], t[3], KW[t[0]] || "", () => go(t[0]), 3.5, 1));
    // μέρη καρτελών που δεν φαίνονται από τον τίτλο
    if ($("tab-earth")) { add(items, "Καρτέλες / εργασίες", "Ουδετέρωση ΧΤ – Α. Συνθήκη ουδετέρωσης", "Ιβρ ≥ 3·Ιασφ στο τέρμα της παροχής, Πίν. Β2-10, μέγιστη ασφάλεια", KW.earth, () => { go("earth"); const b = document.querySelector('#e_subtabs button[data-es="nz"]'); if (b) b.click(); }, 3, 1); add(items, "Καρτέλες / εργασίες", "Ουδετέρωση ΧΤ – Β. Γειώσεις ΟΔ.119", "υποχρεωτικές γειώσεις, Rολ, όριο 1 Ω / 2 Ω / 10 Ω, σχήματα Υ/Σ", KW.earth, () => { go("earth"); const b = document.querySelector('#e_subtabs button[data-es="od119"]'); if (b) b.click(); }, 3, 1); }
    ((window.CLR && window.CLR.list) || []).forEach(c => add(items, "Αποστάσεις ασφαλείας", c.short, `${c.code} · ${c.title}`, (c.group || "") + " " + (c.kw || ""), () => { go("clr"); window.CLR.open(c.id); }, 4, 2));
    (D.common_constructions ? D.common_constructions.sections : []).forEach((s, si) => s.items.forEach((it, ci) => add(items, "Κατασκευές στύλων (ΔΕΔΔΗΕ GIS)", it.code, it.desc + (it.draw ? " · " + it.draw : ""), (it.notes || []).join(" ") + " " + (it.etkd || []).join(" ") + " " + s.title, () => { if (window.CONSTR) window.CONSTR.open(si, ci); }, 3, 3)));
    ((D.md && D.md.catalog) || []).forEach(m => add(items, "Μετρητικές διατάξεις (ΜΔ)", m.code, m.title, [m.group, m.why, m.dims, m.src].join(" "), () => { if (window.APP_OPEN_TABLES) window.APP_OPEN_TABLES("md"); flashRow("#tables .stab[data-st=md]", m.code); }, 3, 4));
    (D.supplies || []).forEach(s => add(items, "Παροχές ΟΔ.22", s.no, `${s.phases} · ${s.kva} kVA · φορτίο ${s.load_A} A · γενική ασφάλεια ${s.gen_fuse} A · ${s.meter}`, "παροχή μετρητής", () => { if (window.APP_OPEN_TABLES) window.APP_OPEN_TABLES("sup"); flashRow("#tables .stab[data-st=sup]", s.no); }, 2, 5));
    (D.supply_cables || []).forEach(c => add(items, "Καλώδια παροχής", c.name, `${c.kind === "conc" ? "συγκεντρικό" : "XLPE"} · ${c.phases} · ${c.s_phase} mm² · ΟΔ.26 έδαφος ${c.od26 ? c.od26.ground : "—"} A · αέρα ${c.od26 ? c.od26.air : "—"} A`, "καλώδιο διατομή", () => { if (window.APP_OPEN_TABLES) window.APP_OPEN_TABLES("cat"); flashRow("#tables .stab[data-st=cat]", c.name); }, 2, 6));
    (D.transformers || []).forEach(t => add(items, "Μετασχηματιστές", `${t.kva} kVA`, `μέγ. ασφάλεια ΧΤ ${t.max_lv_fuse} A · ασφ. 15 kV ${t.exp_15} · 20 kV ${t.exp_20} · RM ${t.RM} mΩ · XM ${t.XM} mΩ${t.standard ? "" : " · μόνο αναφορά"}`, "Μ/Σ μετασχηματιστής", () => { if (window.APP_OPEN_TABLES) window.APP_OPEN_TABLES("fd"); flashRow("#tables .stab[data-st=fd]", String(t.kva)); }, 2, 6));
    ((window.ETKD && window.ETKD.list) ? window.ETKD.list() : []).forEach(it => add(items, "ΕΤΚΔ – σχέδια", it.code + (it.status === "abolished" ? " ✕ ΚΑΤΑΡΓΗΘΗΚΕ" : it.status === "revise" ? " ! προς τροποποίηση" : it.isNew ? " · ΝΕΟ 2026" : ""), `${it.ttl ? it.ttl + " · " : ""}${it.key} – ${it.title}`, it.base, () => window.ETKD.open(it.code), 2, 7));
    (D.general_info || []).forEach(g => (g.sections || []).forEach(sec => (sec.bullets || []).forEach(b => add(items, `Γενικές πληροφορίες – ${g.code}`, sec.title, b, g.title, () => { go("info"); if (window.INFO) window.INFO.search(b.slice(0, 48)); }, 1, 8))));
    document.querySelectorAll("#help li, #help p").forEach(el => { const t = el.textContent.trim(); if (t.length < 25) return; const h2 = el.closest("#help") && (() => { let p = el; while (p && p.id !== "help") { let q = p.previousElementSibling; while (q) { if (q.tagName === "H2") return q.textContent; q = q.previousElementSibling; } p = p.parentElement; } return ""; })(); add(items, "Οδηγίες", (el.querySelector("b") || {}).textContent || h2 || "Οδηγίες", t, h2, () => { go("help"); flash(el); }, 1, 9); });
    document.querySelectorAll("section.tab details.rules").forEach(det => {
      const sec = det.closest("section.tab"); if (!sec) return; const tab = sec.id.replace("tab-", ""), sum = (det.querySelector("summary") || {}).textContent || "";
      det.querySelectorAll("li, tr").forEach(el => { const t = el.textContent.trim(); if (t.length < 16) return; add(items, `Κανόνες – ${tabTitle(tab)}`, sum.trim().replace(/^\d+[α-ω]?\s*/, ""), t, "", () => { go(tab); det.open = true; flash(el); }, 1, 10); });
    });
    document.querySelectorAll("#tables .stab").forEach(st => { const key = st.dataset.st; st.querySelectorAll("h2, h3.tt").forEach(h => add(items, "Πίνακες", h.textContent.trim(), TS[key] || key, "", () => { if (window.APP_OPEN_TABLES) window.APP_OPEN_TABLES(key); flash(h); }, 2, 11)); });
    return items;
  }

  // ---------------------------------------------------------------- αναζήτηση & απόδοση
  const VAR = { "A": "AΑάΆaα", "B": "BΒbβ", "E": "EΕέΈeε", "Z": "ZΖzζ", "H": "HΗήΉhη", "I": "IΙίΐϊΊΪiι", "K": "KΚkκ", "M": "MΜmμ", "N": "NΝnν", "O": "OΟόΌoο", "P": "PΡpρ", "T": "TΤtτ", "Y": "YΥύΰϋΎΫyυ", "X": "XΧxχ",
    "Σ": "Σσς", "Ω": "ΩΏωώ", "Γ": "Γγ", "Δ": "Δδ", "Θ": "Θθ", "Λ": "Λλ", "Ξ": "Ξξ", "Π": "Ππ", "Φ": "Φφ", "Ψ": "Ψψ" };
  function hiRe(words) {
    const parts = words.filter(Boolean).map(w => Array.from(w).map(ch => { const v = VAR[ch]; return v ? "[" + v.replace(/[\]\\^-]/g, "\\$&") + "]" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("[\\u0300-\\u036f]?"));
    try { return parts.length ? new RegExp("(" + parts.join("|") + ")", "giu") : null; } catch (e) { return null; }
  }
  const hi = (text, re) => re ? esc(text).replace(re, "<mark>$1</mark>") : esc(text);
  function snippet(text, re, max) {
    if (!text) return "";
    if (text.length <= max) return hi(text, re);
    let pos = 0; if (re) { re.lastIndex = 0; const m = re.exec(text); pos = m ? m.index : 0; }
    const a = Math.max(0, pos - Math.floor(max * 0.35)), b = Math.min(text.length, a + max);
    return (a > 0 ? "… " : "") + hi(text.slice(a, b), re) + (b < text.length ? " …" : "");
  }
  let cur = [], sel = -1, expanded = {};
  function search(q) {
    if (!IDX) IDX = build();
    const words = norm(q).split(" ").filter(w => w.length);
    if (!words.length) return [];
    const res = [];
    IDX.forEach(it => {
      if (!words.every(w => it.hay.includes(w))) return;
      let score = it.w * 10;
      if (words.every(w => it.hayT.includes(w) || it.hayS.includes(w))) score += 15;   // ταίριασμα σε τίτλο/περιγραφή και όχι μόνο σε λέξεις-κλειδιά
      if (words.every(w => it.hayT.includes(w))) score += 40;
      if (it.hayT === words.join(" ")) score += 60;
      if (words.some(w => it.hayT.startsWith(w))) score += 10;
      res.push([score, it]);
    });
    res.sort((a, b) => b[0] - a[0] || a[1].order - b[1].order);
    return res.map(r => { r[1]._score = r[0]; return r[1]; });
  }
  function render(q) {
    const words = norm(q).split(" ").filter(Boolean), re = hiRe(Array.from(new Set(q.trim().split(/\s+/).filter(Boolean).map(w => norm(w)))));
    cur = search(q); sel = -1;
    if (!q.trim()) { panel.classList.add("hidden"); panel.innerHTML = ""; return; }
    const groups = [];
    cur.forEach(it => { let g = groups.find(x => x.name === it.group); if (!g) { g = { name: it.group, items: [], order: it.order, best: it._score }; groups.push(g); } g.items.push(it); g.best = Math.max(g.best, it._score); });
    groups.sort((a, b) => b.best - a.best || a.order - b.order);   // πρώτη η ομάδα με το καλύτερο αποτέλεσμα
    let h = `<div class="gr-head"><b>${cur.length}</b> αποτελέσματα για «${esc(q.trim())}»${cur.length ? " · Enter = άνοιγμα του πρώτου · ↑↓ επιλογή · Esc κλείσιμο" : ""}</div>`;
    if (!cur.length) h += `<div class="gr-empty">Δεν βρέθηκε τίποτα. Δοκιμάστε κωδικό (S-233, P-3II, ΜΔ-71, C-15), λέξη του τίτλου (τέρμα, γωνία, πισίνα) ή όνομα καρτέλας.</div>`;
    let idx = 0;
    groups.forEach(g => {
      const lim = expanded[g.name] ? g.items.length : 6;
      h += `<div class="gr-grp">${esc(g.name)} (${g.items.length})</div>`;
      g.items.slice(0, lim).forEach(it => { it._i = idx; h += `<button class="gr-it" data-i="${idx++}"><span class="t">${hi(it.title, re)}</span>${it.sub ? `<span class="s${/[Οο]δηγίες|Κανόνες|Γενικές/.test(g.name) ? " snip" : ""}">${snippet(it.sub, re, 190)}</span>` : ""}</button>`; });
      if (g.items.length > lim) h += `<button class="gr-more" data-more="${esc(g.name)}">+ ${g.items.length - lim} ακόμη στην ομάδα «${esc(g.name)}»</button>`;
    });
    panel.innerHTML = h; panel.classList.remove("hidden");
    panel.querySelectorAll(".gr-it").forEach(b => b.addEventListener("click", () => open(cur.find(it => it._i === +b.dataset.i))));
    panel.querySelectorAll(".gr-more").forEach(b => b.addEventListener("click", () => { expanded[b.dataset.more] = true; render(inp.value); }));
    void words;
  }
  function open(it) { if (!it) return; panel.classList.add("hidden"); try { it.run(); } catch (e) { /* ignore */ } inp.blur(); }
  function close() { panel.classList.add("hidden"); }
  let timer = null;
  inp.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { expanded = {}; render(inp.value); }, 120); });
  inp.addEventListener("focus", () => { if (inp.value.trim()) render(inp.value); });
  inp.addEventListener("keydown", e => {
    if (e.key === "Escape") { inp.value = ""; close(); inp.blur(); return; }
    const btns = Array.from(panel.querySelectorAll(".gr-it"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!btns.length) return; e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle("sel", i === sel)); btns[sel].scrollIntoView({ block: "nearest" }); return; }
    if (e.key === "Enter") { e.preventDefault(); if (!cur.length) return; if (sel >= 0 && btns[sel]) open(cur.find(it => it._i === +btns[sel].dataset.i)); else open(cur[0]); }
  });
  clr.addEventListener("click", () => { inp.value = ""; close(); inp.focus(); });
  document.addEventListener("click", e => { if (!panel.classList.contains("hidden") && !panel.contains(e.target) && !e.target.closest(".gsearch")) close(); });
  // πλήκτρο «/» ή Ctrl+K → εστίαση στην αναζήτηση
  document.addEventListener("keydown", e => { if ((e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) || (e.ctrlKey && e.key.toLowerCase() === "k")) { e.preventDefault(); inp.focus(); inp.select(); } });
  window.APP_SEARCH = { search: q => { if (!IDX) IDX = build(); return search(q); }, rebuild: () => { IDX = null; }, open: q => { inp.value = q; render(q); } };
})();
