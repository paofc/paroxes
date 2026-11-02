/* Καρτέλα «Αναγνώριση από φωτογραφία» – UI πάνω από τη μηχανή vision.js: λήψη / επιλογή φωτογραφίας πεδίου, ανάλυση στη συσκευή
   (MobileNetV2 σε JavaScript → ομοιότητα με τις 65 φωτογραφίες των συνηθέστερων κατασκευών ΔΕΔΔΗΕ), πιθανός συνδυασμός ΜΤ + ΧΤ,
   παραπομπές στις κάρτες των κατασκευών και στα σχέδια ΕΤΚΔ, και προαιρετικά AI agent (Claude) με το κλειδί του χρήστη. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  if (!$("tab-vision") || !window.VISION) return;
  const V = window.VISION, D = window.OD26_DATA;
  const esc = s => String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ART = !!window.ARTIFACT_MODE;
  let IMG = null, DATAURL = null, LAST = null, AI = null;
  const SECTIONS = (D.common_constructions || {}).sections || [];
  const ETKD_SET = () => { try { return new Set((window.ETKD && window.ETKD.list ? window.ETKD.list() : []).map(x => x.code)); } catch (e) { return new Set(); } };

  // ---------------------------------------------------------------- φωτογραφία
  function setStatus(msg, frac) {
    if (msg !== null && msg !== undefined) $("vs_status").textContent = msg;
    if (frac !== undefined && frac !== null) { $("vs_bar").style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%"; $("vs_barwrap").classList.toggle("hidden", frac <= 0 || frac >= 1); }
  }
  function loadFile(file) {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        // μείωση στα 1280 px (μνήμη, ταχύτητα, μικρότερο πακέτο για το AI agent)· διόρθωση EXIF προσανατολισμού από τον browser (image-orientation: from-image)
        const mx = 1280, sc = Math.min(1, mx / Math.max(im.naturalWidth, im.naturalHeight));
        const cv = document.createElement("canvas"); cv.width = Math.round(im.naturalWidth * sc); cv.height = Math.round(im.naturalHeight * sc);
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        DATAURL = cv.toDataURL("image/jpeg", 0.86);
        const im2 = new Image(); im2.onload = () => { IMG = im2; $("vs_prev").innerHTML = ""; $("vs_prev").appendChild(im2); im2.className = "vimg"; $("vs_run").disabled = false; $("vs_ai").disabled = false; $("vs_copy").disabled = false; setStatus(`φωτογραφία ${cv.width} × ${cv.height} px – πατήστε «Αναγνώριση»`, 0); }; im2.src = DATAURL;
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  ["vs_cam", "vs_file"].forEach(id => { const el = $(id); if (el) el.addEventListener("change", () => { loadFile(el.files && el.files[0]); el.value = ""; }); });
  // drag & drop / επικόλληση (desktop)
  $("vs_prev").addEventListener("dragover", e => { e.preventDefault(); });
  $("vs_prev").addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });
  document.addEventListener("paste", e => { if (document.body.dataset.tab !== "vision") return; const it = Array.from((e.clipboardData || {}).items || []).find(x => x.type.startsWith("image/")); if (it) loadFile(it.getAsFile()); });

  // ---------------------------------------------------------------- κωδικοί ανά υλικό στύλου
  function concreteCode(code) {   // ξύλινος → τσιμεντένιος: +100 στον αριθμό (P-3II → P-103II, S-13 → S-113)· ≥ 100 μένει
    return String(code).replace(/\b([PSU])-(\d+)([A-ZΑ-ΩIΙ]*)/g, (m, p, n, sfx) => Number(n) >= 100 ? m : `${p}-${Number(n) + 100}${sfx}`);
  }
  const simLabel = s => s >= 0.5 ? ["υψηλή", "ok"] : s >= 0.35 ? ["μέτρια", "warn"] : ["χαμηλή", "no"];
  const pct = s => Math.round(Math.max(0, Math.min(1, (s + 0.1) / 0.9)) * 100);
  function etkdBtns(codes) {
    const have = ETKD_SET();
    return (codes || []).map(c => `<button class="mini etk" data-etkd="${esc(c)}" title="${have.has(c) ? "άνοιγμα σχεδίου ΕΤΚΔ" : "δεν υπάρχει ως ξεχωριστό σχέδιο στο ΕΤΚΔ – αναζήτηση"}">${esc(c)}${have.has(c) ? "" : " ?"}</button>`).join(" ");
  }
  function bindBtns(root) {
    root.querySelectorAll("[data-etkd]").forEach(b => b.addEventListener("click", () => { const c = b.dataset.etkd; if (window.ETKD && window.ETKD.open && ETKD_SET().has(c)) window.ETKD.open(c); else if (window.APP_SEARCH) { window.APP_SWITCH_TAB("etkd"); window.APP_SEARCH.open(c); } }));
    root.querySelectorAll("[data-constr]").forEach(b => b.addEventListener("click", () => { const [si, ci] = b.dataset.constr.split(":").map(Number); if (window.CONSTR && window.CONSTR.open) window.CONSTR.open(si, ci); }));
  }
  function card(r, pole, rank) {
    const it = r.it, [lab, cls] = simLabel(r.s), code = it.code, cc = pole === "concrete" ? concreteCode(code) : null;
    return `<div class="vcard ${cls}"><div class="vph"><img src="${esc(it.photo)}" alt="" onerror="window.APP_IMG_ERR && window.APP_IMG_ERR(this)"></div>
      <div class="vbody"><div class="vhead"><span class="rk">${rank}</span><b>${esc(code)}</b><span class="vsim ${cls}">ομοιότητα ${r.s.toFixed(2)} – ${lab}</span></div>
      <div class="vbar"><div style="width:${pct(r.s)}%"></div></div>
      <div class="small">${esc(it.sec_title)}</div><div>${esc(it.desc)}</div>
      ${cc && cc !== code ? `<div class="small muted">τσιμεντένιος στύλος: <b>${esc(cc)}</b></div>` : ""}
      <div class="vlinks"><button class="mini" data-constr="${it.sec}:${it.idx}">κάρτα κατασκευής</button> ${etkdBtns(it.etkd)}</div></div></div>`;
  }

  // ---------------------------------------------------------------- ανάλυση στη συσκευή
  async function run() {
    if (!IMG) return;
    $("vs_run").disabled = true; AI = null; $("vs_aiout").innerHTML = ""; $("vs_aicard").classList.add("hidden");
    setStatus("φόρτωση μοντέλου…", 0.02);
    const ok = await V.load((m, f) => setStatus(m, f));
    if (!ok) { setStatus("Το μοντέλο δεν φορτώθηκε (" + (V.state.error || "άγνωστο σφάλμα") + ")", 0); $("vs_run").disabled = false; return; }
    const t0 = Date.now();
    try {
      LAST = await V.analyze(IMG, { focus: $("vs_focus").value, k: 6 }, (m, f) => setStatus(m, f));
    } catch (e) { setStatus("Σφάλμα ανάλυσης: " + (e && e.message || e), 0); $("vs_run").disabled = false; return; }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    setStatus(`ολοκληρώθηκε σε ${secs} s (${LAST.used.length} αποκόμματα × 2 όψεις)`, 1);
    render();
    $("vs_run").disabled = false;
  }
  function render() {
    const pole = $("vs_pole").value, r = LAST, best = r.ranked[0];
    const [lab, cls] = simLabel(best.s);
    $("vs_result").className = "result" + (cls === "ok" ? "" : cls === "warn" ? " warn" : " bad");
    $("vs_big").innerHTML = `${esc(best.it.code)}<small>${esc(best.it.sec_title)} – ${esc(best.it.desc)} · ομοιότητα ${best.s.toFixed(2)} (${lab})${pole === "concrete" && concreteCode(best.it.code) !== best.it.code ? ` · τσιμεντένιος: ${esc(concreteCode(best.it.code))}` : ""}</small>`;
    $("vs_line1").textContent = "Οπτική ομοιότητα της φωτογραφίας με τις φωτογραφίες αναφοράς των συνηθέστερων κατασκευών (MobileNetV2, 1280 χαρακτηριστικά, μέγιστο συνημίτονο στις όψεις κάθε αναφοράς). Είναι ΕΝΔΕΙΞΗ – ελέγξτε τις φωτογραφίες και τα σχέδια ΕΤΚΔ· για πιο αξιόπιστη αναγνώριση χρησιμοποιήστε τον AI agent (κάρτα 3).";
    $("vs_line2").textContent = `Αποκόμματα: ${r.used.join(", ")} · ${r.ranked.length} πιο όμοιες από ${V.refs().n} φωτογραφίες αναφοράς (ΔΕΔΔΗΕ GIS 11/2022).`;
    $("vs_list").innerHTML = r.ranked.map((x, i) => card(x, pole, i + 1)).join("");
    bindBtns($("vs_list"));
    // συνδυασμός ΜΤ + ΧΤ
    const mv = r.mv[0], lv = r.lv[0];
    const codes = new Set(); [mv, lv].forEach(x => x && x.s >= 0.3 && (x.it.etkd || []).forEach(c => codes.add(c)));
    const line = [mv && mv.s >= 0.3 ? `ΜΤ: ${mv.it.code}` : null, lv && lv.s >= 0.3 ? `ΧΤ: ${lv.it.code}` : null].filter(Boolean).join("  +  ");
    $("vs_combo").innerHTML = `<div class="vcombo">${line ? `<div class="big">${esc(pole === "concrete" ? concreteCode(line) : line)}</div>` : `<div class="muted">χαμηλή ομοιότητα – δεν προκύπτει συνδυασμός</div>`}
      <div class="small muted">Ο συνδυασμός προκύπτει από την καλύτερη κατασκευή ΜΤ (απόκομμα κορυφής) και την καλύτερη κατασκευή ΧΤ (όλη η εικόνα)· όταν ο στύλος φέρει μόνο ΜΤ ή μόνο ΧΤ αγνοήστε το άλλο σκέλος.</div>
      <table class="grid"><tr><th>Σκέλος</th><th>Κατασκευή</th><th>Ομοιότητα</th><th>Σχέδια ΕΤΚΔ</th><th></th></tr>
      ${[["ΜΤ (κορυφή στύλου)", mv], ["ΧΤ (κάτω τμήμα)", lv]].map(([t, x]) => x ? `<tr><td class="l">${t}</td><td class="l"><b>${esc(pole === "concrete" ? concreteCode(x.it.code) : x.it.code)}</b><br><span class="small muted">${esc(x.it.desc)}</span></td><td>${x.s.toFixed(2)} (${simLabel(x.s)[0]})</td><td class="l">${etkdBtns(x.it.etkd)}</td><td><button class="mini" data-constr="${x.it.sec}:${x.it.idx}">κάρτα</button></td></tr>` : "").join("")}
      </table>
      ${r.mv.length > 1 ? `<div class="small muted" style="margin-top:6px">Εναλλακτικές ΜΤ: ${r.mv.slice(1).map(x => `${esc(x.it.code)} (${x.s.toFixed(2)})`).join(" · ")} · εναλλακτικές ΧΤ: ${r.lv.slice(1).map(x => `${esc(x.it.code)} (${x.s.toFixed(2)})`).join(" · ")}</div>` : ""}</div>`;
    bindBtns($("vs_combo"));
    $("vs_notes").innerHTML = [
      "Η αναγνώριση στη συσκευή συγκρίνει μόνο την οπτική ομοιότητα με τις 65 φωτογραφίες του εντύπου «Συνηθέστερες κατασκευές» (ΔΕΔΔΗΕ GIS v2.3, 11/2022) – δεν «βλέπει» λεπτομέρειες όπως τον αριθμό μονωτήρων ανά αγωγό (II) ή ξύλινο / τσιμεντένιο στύλο· επιλέξτε το υλικό του στύλου για τους σωστούς κωδικούς (+100).",
      "Καλύτερα αποτελέσματα: φωτογραφία της κορυφής του στύλου από κοντά, με τους βραχίονες, τους μονωτήρες και τις γέφυρες ευδιάκριτες· για στύλο με ΜΤ και ΧΤ βγάλτε και μία φωτογραφία ανά στάθμη και αναλύστε τις χωριστά.",
      "Ο AI agent (κάρτα 3) λαμβάνει τη φωτογραφία και τον κατάλογο των κατασκευών και απαντά με κωδικούς, βεβαιότητα, αιτιολόγηση και συνδυασμό – απαιτεί σύνδεση στο διαδίκτυο και κλειδί API· εναλλακτικά «Αντιγραφή πακέτου» και επικόλληση σε οποιοδήποτε AI chat μαζί με τη φωτογραφία.",
      "Οι κωδικοί των κατασκευών ΜΤ αφορούν ξύλινους στύλους (τσιμεντένιοι: +100) και οι βραχίονες με τραβέρσα σε ξύλινο στύλο +400 (P-403II)· το «II» = διπλή στήριξη σε 2 μονωτήρες ανά αγωγό."].map(t => `<li>${t}</li>`).join("");
  }
  $("vs_run").addEventListener("click", run);
  $("vs_focus").addEventListener("change", () => { if (IMG) run(); });
  $("vs_pole").addEventListener("change", () => { if (LAST) render(); if (AI) renderAI(AI); });

  // ---------------------------------------------------------------- AI agent
  const KEY = "vision_ai_cfg";
  function cfg() { return { key: $("vs_key").value, model: $("vs_model").value || "claude-sonnet-5-5", pole: { wood: "ξύλινος", concrete: "τσιμεντένιος" }[$("vs_pole").value] || "" }; }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ key: $("vs_key").value, model: $("vs_model").value })); } catch (e) { /* ignore */ } }
  try { const c = JSON.parse(localStorage.getItem(KEY) || "null"); if (c) { if (c.key) $("vs_key").value = c.key; if (c.model) $("vs_model").value = c.model; } } catch (e) { /* ignore */ }
  ["vs_key", "vs_model"].forEach(id => $(id).addEventListener("change", saveCfg));
  function renderAI(res) {
    $("vs_aicard").classList.remove("hidden");
    const p = res.parsed, pole = $("vs_pole").value;
    if (!p) { $("vs_aiout").innerHTML = `<div class="small muted">Η απάντηση δεν ήταν JSON – πλήρες κείμενο:</div><pre class="vpre">${esc(res.text)}</pre>`; return; }
    const byCode = {}; SECTIONS.forEach((s, si) => s.items.forEach((it, ci) => byCode[it.code] = { si, ci, it }));
    let h = `<div class="vai"><div><b>Στύλος:</b> ${esc((p.pole || {}).material || "—")} – ${esc((p.pole || {}).type || "")}</div>`;
    h += `<table class="grid"><tr><th>Κατασκευή</th><th>Σχέδια ΕΤΚΔ</th><th>Βεβαιότητα</th><th>Ένδειξη στη φωτογραφία</th><th></th></tr>` + (p.constructions || []).map(c => {
      const m = byCode[c.code]; const conf = Number(c.confidence); const cls = conf >= 0.7 ? "ok" : conf >= 0.4 ? "warn" : "no";
      return `<tr><td class="l"><b>${esc(pole === "concrete" ? concreteCode(c.code) : c.code)}</b>${m ? `<br><span class="small muted">${esc(m.it.desc)}</span>` : ""}</td><td class="l">${etkdBtns(c.etkd && c.etkd.length ? c.etkd : (m ? m.it.etkd : []))}</td><td><span class="vsim ${cls}">${isFinite(conf) ? Math.round(conf * 100) + " %" : "—"}</span></td><td class="l small">${esc(c.evidence || "")}</td><td>${m ? `<button class="mini" data-constr="${m.si}:${m.ci}">κάρτα</button>` : ""}</td></tr>`;
    }).join("") + `</table>`;
    if (p.combination) h += `<div class="vcombo"><div class="big">${esc(p.combination)}</div></div>`;
    if (p.uncertain) h += `<div class="small"><b>Αβεβαιότητες:</b> ${esc(p.uncertain)}</div>`;
    if (p.notes) h += `<div class="small"><b>Παρατηρήσεις:</b> ${esc(p.notes)}</div>`;
    h += `<div class="small muted">μοντέλο ${esc(res.model)}${res.usage ? ` · tokens ${res.usage.input_tokens} + ${res.usage.output_tokens}` : ""} · η απάντηση του AI είναι βοήθημα – η τελική κρίση ανήκει στον μηχανικό.</div></div>`;
    $("vs_aiout").innerHTML = h;
    bindBtns($("vs_aiout"));
  }
  $("vs_ai").addEventListener("click", async () => {
    if (!DATAURL) return;
    const c = cfg();
    if (!c.key) { $("vs_aistatus").textContent = "Δώστε κλειδί API."; $("vs_key").focus(); return; }
    saveCfg();
    $("vs_ai").disabled = true; $("vs_aistatus").textContent = "αποστολή στο AI…";
    try {
      if (!V.state.loaded) await V.load(() => {});
      const res = await V.askAI(DATAURL, LAST, c);
      AI = res; renderAI(res); $("vs_aistatus").textContent = "ολοκληρώθηκε";
    } catch (e) {
      $("vs_aistatus").textContent = "Σφάλμα: " + (e && e.message || e) + (ART ? " (στη δημοσιευμένη σελίδα η κλήση μπορεί να εμποδίζεται – χρησιμοποιήστε την εφαρμογή Windows / Android ή την «Αντιγραφή πακέτου»)" : "");
    }
    $("vs_ai").disabled = false;
  });
  $("vs_copy").addEventListener("click", async () => {
    if (!V.state.loaded) { $("vs_aistatus").textContent = "φόρτωση…"; await V.load(() => {}); }
    const txt = V.aiPrompt(LAST, cfg().pole) + "\n\n(Επισυνάψτε τη φωτογραφία στο ίδιο μήνυμα.)";
    try { await navigator.clipboard.writeText(txt); $("vs_aistatus").textContent = "Το πακέτο αντιγράφηκε – επικολλήστε το σε AI chat μαζί με τη φωτογραφία."; }
    catch (e) { const ta = document.createElement("textarea"); ta.value = txt; ta.rows = 10; ta.style.width = "100%"; $("vs_aiout").innerHTML = ""; $("vs_aiout").appendChild(ta); $("vs_aicard").classList.remove("hidden"); ta.select(); $("vs_aistatus").textContent = "Αντιγράψτε το κείμενο από το πλαίσιο."; }
  });
  window.VISION_UI = { run, loadFile, last: () => LAST };
})();
