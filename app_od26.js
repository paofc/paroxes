/* ΟΔ.26 cable check tab (round-1 selector, adapted): I_B may come from the new «Επιλογή παροχής» tab. */
window.OD26APP = (function () {
  "use strict";
  const D = window.OD26_DATA;
  const ENG = window.OD26.makeEngine(D);
  const $ = id => document.getElementById(id);
  const fmt = (v, d = 1) => (v === null || v === undefined || isNaN(v)) ? "—" : Number(v).toLocaleString("el-GR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = v => fmt(v, 0);
  const YN = v => v === null || v === undefined ? '<span class="na">—</span>' : (v ? '<span class="ok">ΝΑΙ</span>' : '<span class="no">ΟΧΙ</span>');

  // ---------- populate selects ----------
  function fill(sel, items, value) {
    sel.innerHTML = "";
    items.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
    if (value !== undefined) sel.value = value;
  }
  fill($("family"), D.families.map(f => [f.code, f.label]));
  fill($("method"), D.methods.map(m => [m.code, m.label]));
  fill($("supply"), D.standard_supplies.map(s => [s.no, `${s.no} – ${s.phases}Φ – ${s.fuse_A} A`]), "Νο 2");
  fill($("gt"), Object.keys(D.table_VIII.ground).map(k => [k, k + " °C"]), "25");
  fill($("at"), Object.keys(D.table_VIII.air).map(k => [k, k + " °C"]), "50");
  fill($("rho"), Object.keys(D.table_XIII).map(k => [k, k.replace(".", ",") + " K·m/W"]), "1");
  fill($("ntr"), Object.keys(D.table_XIV).map(k => [k, k]), "1");
  fill($("npipe"), Object.keys(D.table_XVI).map(k => [k, k]), "1");
  fill($("ngr"), Object.keys(D.table_XV).map(k => [k, k]), "1");
  const airModes = [["NONE", "Χωρίς ομαδοποίηση (μεμονωμένο καλώδιο)"]]
    .concat(D.table_XVII.methods.map(m => [m.code, "[XVII – πολυπολικά] " + m.label]))
    .concat(D.table_XVIII.methods.map(m => [m.code, "[XVIII – μονοπολικά] " + m.label]));
  fill($("amode"), airModes, "NONE");

  function fillManual() {
    const fam = ENG.FAM[$("family").value];
    const cur = $("manual").value;
    fill($("manual"), [["", "ΑΥΤΟΜΑΤΗ"]].concat(fam.sizes.filter(s => s.selectable).map(s => [s.size, s.size + " mm²"])));
    if ([...$("manual").options].some(o => o.value === cur)) $("manual").value = cur;
  }
  fillManual();

  let loadIB = null;
  function setIB(v) { loadIB = (v === null || v === undefined || isNaN(v)) ? null : Number(v); $("l1val").value = loadIB === null ? "— (συμπληρώστε παροχές)" : fmt(loadIB, 2); if ($("lmode").value === "L1") update(); }

  // ---------- visibility rules ----------
  function applyVisibility() {
    const fam = ENG.FAM[$("family").value];
    const met = ENG.MET[$("method").value];
    const ground = met.env === "ground";
    document.querySelectorAll(".env-ground").forEach(e => e.classList.toggle("hidden", !ground));
    document.querySelectorAll(".env-air").forEach(e => e.classList.toggle("hidden", ground));
    document.querySelectorAll(".env-m1").forEach(e => e.classList.toggle("hidden", met.code !== "M1"));
    document.querySelectorAll(".env-m2").forEach(e => e.classList.toggle("hidden", met.code !== "M2"));
    document.querySelectorAll(".env-m1.multi").forEach(e => e.classList.toggle("hidden", met.code !== "M1" || !fam.multicore));
    document.querySelectorAll(".env-m1.single").forEach(e => e.classList.toggle("hidden", met.code !== "M1" || fam.multicore));
    const grp = $("amode").value !== "NONE";
    document.querySelectorAll(".env-grp").forEach(e => e.classList.toggle("hidden", ground || !grp));
    const lm = $("lmode").value;
    $("f_lval").classList.toggle("hidden", lm === "L1" || lm === "L5");
    $("f_cosl").classList.toggle("hidden", lm !== "L4");
    $("f_sup").classList.toggle("hidden", lm !== "L5");
    $("f_l1").classList.toggle("hidden", lm !== "L1");
    $("lval_label").textContent = lm === "L3" ? "Φαινόμενη ισχύς S (kVA)" : lm === "L4" ? "Ενεργός ισχύς P (kW)" : "Ρεύμα I (A)";
    ["sc", "ov", "per", "vd"].forEach(k => { const on = $(k + "_on").checked; $("g_" + k).classList.toggle("on", on); $("g_" + k).querySelectorAll("input,select").forEach(i => i.disabled = !on); $("g_" + k).classList.toggle("disabled", !on); });
    $("f_pre").classList.toggle("hidden", $("kmode").value !== "FORMULA");
  }

  // ---------- gather inputs ----------
  const num = (id, def = 0) => { const v = parseFloat($(id).value); return isNaN(v) ? def : v; };
  function gather() {
    const lm = $("lmode").value, ph = +$("phases").value;
    let IB;
    if (lm === "L1") IB = loadIB;
    else IB = ENG.requiredCurrent(lm, ph, num("lval"), num("cos_l", 0.9), $("supply").value);
    const limRaw = $("lim").value;
    return {
      family: $("family").value, method: $("method").value, phases: ph, I_B: IB,
      margin_pct: num("margin"), n_par: +$("npar").value, manual_size: $("manual").value || null,
      ground_temp: +$("gt").value, air_temp: +$("at").value, soil_rho: +$("rho").value,
      n_trench: +$("ntr").value, n_pipes: +$("npipe").value, n_groups: +$("ngr").value, sc_touching: $("touch").checked,
      air_group_mode: $("amode").value, air_trays: +$("atr").value, air_circuits: +$("acc").value,
      sc: { enabled: $("sc_on").checked, Ik_kA: num("ik"), t_s: num("tsc"), mode: $("kmode").value, preload_ratio: num("pre", 1) },
      ov: { enabled: $("ov_on").checked, I_ov: num("iov"), t_s: num("tov"), I_pre: num("ipre") },
      per: { enabled: $("per_on").checked, I: num("iper"), t1_s: num("t1"), t0_s: num("t0") },
      vd: { enabled: $("vd_on").checked, L_m: num("L"), cosphi: num("cosv", 0.9), X_assumed: num("X", 0.08), limit_pct: limRaw === "" ? null : parseFloat(limRaw) },
      lmode: lm,
    };
  }

  // ---------- render ----------
  let lastSummary = "";
  let lastRes = null;
  function update() {
    applyVisibility();
    const inp = gather();
    const res = $("result");
    if (inp.I_B === null || inp.I_B === undefined || isNaN(inp.I_B)) {
      res.className = "result warn"; $("r_status").textContent = "ΑΠΑΙΤΕΙΤΑΙ ΦΟΡΤΙΟ"; $("r_big").textContent = "—";
      $("r_line1").textContent = "Συμπληρώστε το φορτίο (ή το πλήθος μετρητών είναι εκτός πίνακα)."; $("r_line2").textContent = ""; $("r_chips").innerHTML = "";
      $("factors").innerHTML = ""; $("seltable").innerHTML = ""; $("notes").innerHTML = "";
      return;
    }
    let r;
    try { r = ENG.evaluate(inp); lastRes = r; } catch (e) { res.className = "result fail"; $("r_status").textContent = "ΣΦΑΛΜΑ"; $("r_big").textContent = e.message; return; }
    const fam = r.family, sel = r.selected, rec = r.recommended;
    const manual = !!inp.manual_size;
    // --- result card ---
    const chips = [];
    const chip = (label, v, cls) => chips.push(`<span class="chip ${cls || (v === null ? "na" : v ? "ok" : "no")}">${label}</span>`);
    if (!sel) {
      res.className = "result fail";
      $("r_status").textContent = "ΚΑΜΙΑ ΔΙΑΤΟΜΗ ΔΕΝ ΕΠΑΡΚΕΙ";
      $("r_big").innerHTML = `${fam.short}<small>I_req = ${fmt(r.I_req)} A</small>`;
      $("r_line1").textContent = "Καμία διατομή της οικογένειας δεν περνά τους ενεργούς ελέγχους με τις παρούσες συνθήκες – αλλάξτε οικογένεια, τρόπο εγκατάστασης ή χρησιμοποιήστε παράλληλα καλώδια.";
      $("r_line2").textContent = "";
    } else {
      const ok = sel.all_ok;
      res.className = "result " + (ok ? "" : "fail");
      $("r_status").textContent = ok ? (manual ? "Η ΧΕΙΡΟΚΙΝΗΤΗ ΔΙΑΤΟΜΗ ΕΠΑΡΚΕΙ" : "ΠΡΟΤΕΙΝΟΜΕΝΗ ΔΙΑΤΟΜΗ – ΕΠΑΡΚΕΙ") : "Η ΔΙΑΤΟΜΗ ΔΕΝ ΕΠΑΡΚΕΙ";
      $("r_big").innerHTML = `${r.n_par > 1 ? r.n_par + " × " : ""}${fam.short} ${sel.size} mm²<small>${sel.I_z === null ? "" : `I_z' = ${fmt(sel.I_z)} A · I_req${r.n_par > 1 ? " ανά καλώδιο" : ""} = ${fmt(r.I_req)} A · φόρτιση ${sel.util === null ? "—" : fmt0(sel.util * 100) + " %"}`}</small>`;
      const parts = [];
      if (sel.I_z !== null) parts.push(`I_z' = ${sel.base} A (πίνακας) × ${fmt(sel.k_pipe, 2)} (σωλήνας) × ${fmt(r.k_temp, 2)} (θ) × ${fmt(r.k_soil, 2)} (ρ εδάφους) × ${r.k_group === null ? "—" : fmt(r.k_group, 2)} (ομαδοποίηση) = ${fmt(sel.I_z)} A`);
      else parts.push(sel.note || "Δεν δίνεται τιμή για τον συνδυασμό διατομής/εγκατάστασης.");
      $("r_line1").textContent = parts.join(" · ");
      const l2 = [];
      if (r.sc.S_min !== undefined) l2.push(`Βραχυκύκλωμα: S_min = ${fmt(r.sc.K, 2)} × ${inp.sc.Ik_kA} kA × √${inp.sc.t_s} s = ${fmt(r.sc.S_min, 2)} mm² (S = ${sel.s_phase} mm²)`);
      if (sel.ov.applicable) l2.push(`Υπερφόρτιση: n απαιτ. ${fmt(sel.ov.n_req, 2)} ≤ n επιτρ. ${sel.ov.n_allowed === null ? "—" : fmt(sel.ov.n_allowed, 2)} (T = ${sel.T_min} min)`);
      if (sel.per.applicable) l2.push(`Περιοδική: n = ${fmt(sel.per.n, 2)} → I επιτρ. = ${fmt0(sel.per.I_allowed)} A (σ = ${fmt(sel.per.sigma_pct)} %)`);
      if (sel.vd.applicable) l2.push(`ΔU = ${fmt(sel.vd.dU_V, 2)} V = ${fmt(sel.vd.dU_pct, 2)} % (R = ${fmt(sel.vd.R, 3)}, X = ${fmt(sel.vd.X, 3)} Ω/km)`);
      if (sel.d_ext_mm) l2.push(`Ø εξ. ${sel.d_ext_mm} mm${sel.pipe_dia_mm ? " · σωλήνας Ø " + sel.pipe_dia_mm + " mm" : ""}`);
      $("r_line2").textContent = l2.join(" · ");
      chip("Αμπερομετρία", sel.amp_ok);
      if (inp.sc.enabled) chip("Βραχυκύκλωμα", sel.sc_ok);
      if (inp.ov.enabled) chip("Βραχ. υπερφόρτιση", sel.ov.applicable ? sel.ov.ok : null);
      if (inp.per.enabled) chip("Περιοδική υπερφόρτιση", sel.per.applicable ? sel.per.ok : null);
      if (inp.vd.enabled) chip(sel.vd.ok === null ? "ΔU πληροφοριακά" : "Πτώση τάσης", sel.vd.ok, sel.vd.ok === null ? "info" : null);
      if (manual && rec && rec.size !== sel.size) chip(`Αυτόματη πρόταση: ${rec.size}`, null, "info");
      if (sel.phases !== r.phases) chip("Διαφορετικό πλήθος φάσεων", false);
    }
    $("r_chips").innerHTML = chips.join("");
    // --- factors ---
    const fct = (k, v, s) => `<div class="factor"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
    $("factors").innerHTML =
      fct("Περιβάλλον", r.env === "ground" ? "Έδαφος" : "Αέρας", r.method.label) +
      fct("k θερμοκρασίας", fmt(r.k_temp, 2), r.temp_src) +
      fct("k θερμ. αντίστασης εδάφους", fmt(r.k_soil, 2), r.soil_src) +
      fct("k ομαδοποίησης", r.k_group === null ? "—" : fmt(r.k_group, 2), r.group_src) +
      (inp.sc.enabled ? fct("K βραχυκυκλώματος", fmt(r.sc.K, 2), `${r.sc.K_source} · ${fam.insulation} / ${fam.material} · θ1 = ${fmt(r.sc.theta1, 1)} °C`) + fct("S_min βραχυκυκλώματος", fmt(r.sc.S_min, 2) + " mm²", `K · ${inp.sc.Ik_kA} kA · √${inp.sc.t_s} s`) : "");
    // --- table ---
    let h = "<tr><th>Διατομή</th><th>S φάσης</th><th>Φ</th><th>I πίνακα (A)</th><th>k σωλ.</th><th>I_z' (A)</th><th>Φόρτιση</th><th>Αμπερ.</th>";
    if (inp.sc.enabled) h += "<th>S_min</th><th>Βραχ/μα</th>";
    if (inp.ov.enabled) h += "<th>T (min)</th><th>n απ.</th><th>n επ.</th><th>Υπερφ.</th>";
    if (inp.per.enabled) h += "<th>n περ.</th><th>I επιτρ.</th><th>Περιοδ.</th>";
    if (inp.vd.enabled) h += "<th>ΔU (V)</th><th>ΔU %</th><th>ΔU</th>";
    h += "<th>ΟΛΑ</th></tr>";
    r.rows.forEach(row => {
      const na = !row.selectable || row.phases !== r.phases;
      const cls = (sel && row.size === sel.size) ? "rec" : (na ? "dim" : "");
      h += `<tr class="${cls}"><td class="l"><b>${row.size}</b></td><td>${row.s_phase}</td><td>${row.phases}</td><td>${row.base === null ? "—" : row.base}</td><td>${row.k_pipe === null ? "—" : fmt(row.k_pipe, 2)}</td><td><b>${row.I_z === null ? "—" : fmt(row.I_z)}</b></td><td>${row.util === null ? "—" : fmt0(row.util * 100) + " %"}</td><td>${YN(row.amp_ok)}</td>`;
      if (inp.sc.enabled) h += `<td>${fmt(r.sc.S_min, 1)}</td><td>${YN(row.sc_ok)}</td>`;
      if (inp.ov.enabled) h += `<td>${row.T_min === null ? "—" : row.T_min}</td><td>${row.ov.applicable ? fmt(row.ov.n_req, 2) : "—"}</td><td>${row.ov.applicable && row.ov.n_allowed !== null ? fmt(row.ov.n_allowed, 2) : "—"}</td><td>${YN(row.ov.applicable ? row.ov.ok : null)}</td>`;
      if (inp.per.enabled) h += `<td>${row.per.applicable ? fmt(row.per.n, 2) : "—"}</td><td>${row.per.applicable ? fmt0(row.per.I_allowed) : "—"}</td><td>${YN(row.per.applicable ? row.per.ok : null)}</td>`;
      if (inp.vd.enabled) h += `<td>${row.vd.applicable ? fmt(row.vd.dU_V, 2) : "—"}</td><td>${row.vd.applicable ? fmt(row.vd.dU_pct, 2) : "—"}</td><td>${row.vd.applicable ? (row.vd.ok === null ? '<span class="na">πληρ.</span>' : YN(row.vd.ok)) : "—"}</td>`;
      h += `<td>${na ? '<span class="na">—</span>' : YN(row.all_ok)}</td></tr>`;
    });
    $("seltable").innerHTML = h;
    // --- notes ---
    const notes = r.notes.map(n => ["warn", n]);
    if (r.method.code === "M4" && fam.code !== "F1") notes.push(["warn", "Η ΟΔ.26 δίνει τιμή «επιτοίχια» μόνο για τα συγκεντρικά καλώδια (Πίν. V). Για τις άλλες οικογένειες επιλέξτε «Στον αέρα – ελεύθερα» με την κατάλληλη διάταξη ομαδοποίησης."]);
    if (r.phases === 1 && fam.code !== "F1") notes.push(["warn", "Μονοφασικό φορτίο: η ΟΔ.26 δίνει μονοφασικά καλώδια μόνο στα συγκεντρικά (2x6, 2x16)."]);
    if (r.k_group === null) notes.push(["warn", "Ο συνδυασμός διάταξης / σχαρών / κυκλωμάτων δεν δίνεται στον Πίν. XVII/XVIII ή δεν αντιστοιχεί στην οικογένεια (πολυπολικά → XVII, μονοπολικά → XVIII)."]);
    if (r.method.code === "M2") notes.push(["", fam.multicore ? (inp.n_pipes === 1 ? "Σωλήνας > 6 m: χρησιμοποιείται η στήλη «σε σωλήνες > 6 m» του πίνακα (= έδαφος × 0,82 με αποκοπή, Πίν. XVI)." : `Σωλήνες > 6 m: έδαφος × συντελεστής Πίν. XVI για ${inp.n_pipes} σωλήνες σε επαφή.`) : `Μονοπολικά σε σωλήνες: έδαφος × 0,85 (ομάδα σε επαφή) × Πίν. XVI για ${inp.n_pipes} σωλήνες (§4.2.2.2).`]);
    if (inp.lmode === "L1") notes.push(["", "Το ρεύμα I_B προέρχεται από την καρτέλα «Επιλογή παροχής» (φορτίο μετρητικής διάταξης ΟΔ.22/ΟΔ.45 με ταυτοχρονισμό)."]);
    if (inp.lmode === "L5") notes.push(["", `Ως φορτίο λαμβάνεται η ονομαστική ένταση της ασφάλειας της τυποποιημένης παροχής (${fmt0(inp.I_B)} A) – κριτήριο I_z' ≥ I_n ασφάλειας.`]);
    if (inp.vd.enabled) notes.push(["", "Η πτώση τάσης ΔΕΝ ορίζεται στην ΟΔ.26: R από Πίν. XIX (όπου υπάρχει) ή IEC 60228 ανηγμένη στη μέγιστη θερμοκρασία λειτουργίας, X = παραδοχή. Το όριο ΔU% το θέτει ο μελετητής."]);
    if (inp.sc.enabled && inp.sc.mode === "FORMULA") notes.push(["", `Ο K υπολογίστηκε για μερικώς φορτισμένο καλώδιο (§7.4): θ1 = ${fmt(r.sc.theta1, 1)} °C. Συντηρητική επιλογή: Πίνακας Α2.`]);
    if (inp.ov.enabled && sel && !sel.ov.applicable) notes.push(["warn", "Για τη διατομή αυτή δεν δίνεται σταθερά χρόνου T στον Πίν. Α1 (6 mm²) ή τα δεδομένα υπερφόρτισης δεν είναι έγκυρα – ο έλεγχος δεν μπορεί να γίνει."]);
    if (inp.per.enabled && sel && !sel.per.applicable) notes.push(["warn", "Περιοδική υπερφόρτιση: απαιτείται t1 ≤ t0 > 0 και σταθερά χρόνου T στον Πίν. Α1."]);
    notes.push(["", "Βασικές συνθήκες ΟΔ.26: έδαφος 25 °C & 1 K·m/W, αέρας 50 °C, συνεχής φόρτιση 100 %, θ αγωγού 90 °C (XLPE) / 85 °C (EPR)."]);
    $("notes").innerHTML = notes.map(([c, t]) => `<li class="${c}">${t}</li>`).join("");
    // summary for clipboard
    lastSummary = [
      `ΕΠΙΛΟΓΗ ΚΑΛΩΔΙΟΥ ΠΑΡΟΧΗΣ ΧΤ – ΟΔ.26 (3η έκδ. 07/2025) – Connexion Engineering`,
      `Έργο: ${$("p_name").value || "—"} · Θέση: ${$("p_addr").value || "—"} · Μελετητής: ${$("p_eng").value || "—"} · ${$("p_date").value || ""}`,
      `Καλώδιο: ${fam.label} · ${r.method.label} · ${r.phases}Φ`,
      `Φορτίο: I_B = ${fmt(r.I_B, 2)} A · περιθώριο ${r.margin_pct} % · παράλληλα καλώδια ${r.n_par} · I_req ανά καλώδιο = ${fmt(r.I_req, 2)} A`,
      `Συντελεστές: k_θ = ${fmt(r.k_temp, 2)} (${r.temp_src}) · k_ρ = ${fmt(r.k_soil, 2)} (${r.soil_src}) · k_ομαδ. = ${r.k_group === null ? "—" : fmt(r.k_group, 2)} (${r.group_src})`,
      inp.sc.enabled ? `Βραχυκύκλωμα: K = ${fmt(r.sc.K, 2)} (${r.sc.K_source}) · Iβ = ${inp.sc.Ik_kA} kA · t = ${inp.sc.t_s} s · S_min = ${fmt(r.sc.S_min, 2)} mm²` : "Βραχυκύκλωμα: δεν ελέγχθηκε",
      sel ? `ΑΠΟΤΕΛΕΣΜΑ: ${fam.short} ${sel.size} mm² – I_z' = ${fmt(sel.I_z)} A – φόρτιση ${sel.util === null ? "—" : fmt0(sel.util * 100) + " %"} – ${sel.all_ok ? "ΕΠΑΡΚΕΙ" : "ΔΕΝ ΕΠΑΡΚΕΙ"}` : "ΑΠΟΤΕΛΕΣΜΑ: ΚΑΜΙΑ ΔΙΑΤΟΜΗ ΔΕΝ ΕΠΑΡΚΕΙ",
    ].join("\n");
    saveState();
  }

  // ---------- tables tab ----------
  function renderTables(T) {
    T = T || $("tables");
    let h = "";
    const card = (title, page, body) => `<div class="card"><h2>${title} <span class="muted" style="text-transform:none;letter-spacing:0">σελ. ${page}</span></h2>${body}</div>`;
    const P = D.meta.pages;
    D.families.forEach(f => {
      let t = `<table class="grid"><tr><th>Διατομή</th><th>S φάσης</th><th>Φάσεις</th><th>Έδαφος (A)</th><th>Σωλήνας > 6 m (A)</th><th>Αέρας ελεύθερα (A)</th><th>Αέρας επιτοίχια (A)</th><th>Ø εξ. (mm)*</th><th>Σωλήνας Ø (mm)*</th></tr>`;
      f.sizes.forEach(s => { t += `<tr><td class="l"><b>${s.size}</b></td><td>${s.s_phase}</td><td>${s.phases}</td><td>${s.ground ?? "–"}</td><td>${s.pipe1 ?? "–"}</td><td>${s.air_free ?? "–"}</td><td>${s.air_wall ?? "–"}</td><td>${s.d_ext_mm ?? "–"}</td><td>${s.pipe_dia_mm ?? "–"}</td></tr>`; });
      t += "</table><div class='muted small'>* κατασκευαστικά στοιχεία από το υπάρχον εργαλείο του γραφείου (όχι ΟΔ.26)</div>";
      h += card(`Πίνακας ${f.table} – ${f.label}`, P["table_" + f.table], t);
    });
    const hrow = (obj, head) => `<table class="grid"><tr><th>${head}</th>${Object.keys(obj).map(k => `<th>${k}</th>`).join("")}</tr><tr><td class="l">Συντελεστής</td>${Object.values(obj).map(v => `<td>${v}</td>`).join("")}</tr></table>`;
    h += card("Πίνακας VIII – Συντελεστές θερμοκρασίας (XLPE & EPR)", P.table_VIII, hrow(D.table_VIII.ground, "θ εδάφους (°C)") + "<br>" + hrow(D.table_VIII.air, "θ αέρα (°C)"));
    h += card("Πίνακας XIII – Θερμική αντίσταση εδάφους (K·m/W)", P.table_XIII, hrow(D.table_XIII, "ρ (K·m/W)"));
    h += card("Πίνακας XIV – Γειτνίαση πολυπολικών στο έδαφος (διάκενο ≈ 7 cm)", P.table_XIV, hrow(D.table_XIV, "Καλώδια στο χαντάκι"));
    h += card("Πίνακας XV – Ομάδες 4 μονοπολικών στο έδαφος (σε επαφή, απόσταση ομάδων 7 cm)", P.table_XV, hrow(D.table_XV, "Ομάδες") + "<div class='muted small'>Μία ομάδα σε επαφή: 0,85 (§4.2.2.2)</div>");
    h += card("Πίνακας XVI – Καλώδια σε σωλήνες > 6 m (ένα ανά σωλήνα, σε επαφή)", P.table_XVI, hrow(D.table_XVI, "Σωλήνες"));
    const mat = (tab, name) => { let t = `<table class="grid"><tr><th>Μέθοδος</th><th>Κωδ.</th><th>Σχάρες</th>${tab.circuits.map(c => `<th>${c} κυκλ.</th>`).join("")}</tr>`; tab.methods.forEach(m => Object.entries(m.trays).forEach(([tr, vals]) => { t += `<tr><td class="l">${m.label}</td><td>${m.code}</td><td>${tr}</td>${vals.map(v => `<td>${v === null ? "–" : v.toFixed(2)}</td>`).join("")}</tr>`; })); return t + "</table>"; };
    h += card("Πίνακας XVII – Γειτνίαση πολυπολικών καλωδίων στον αέρα", P.table_XVII, mat(D.table_XVII) + "<div class='muted small'>Σημ.: το τελευταίο μπλοκ τιτλοφορείται στην ΟΔ.26 «κατακόρυφες διάτρητες σχάρες – spaced», αλλά τιμές/σχήμα αντιστοιχούν σε υποστηρίγματα σκαλοειδούς σχάρας σε απόσταση (IEC 60364-5-52 Πίν. B.52.20).</div>");
    h += card("Πίνακας XVIII – Γειτνίαση μονοπολικών καλωδίων στον αέρα", P.table_XVIII, mat(D.table_XVIII) + "<div class='muted small'>Σημ.: IEC 60364-5-52 (B.52.21) δίνει 0,96 / 0,95 για 2 / 3 σχάρες στην 1η διάταξη· η ΟΔ.26 αναγράφει 0,95 / 0,96 (διατηρούνται οι τιμές της ΟΔ.26).</div>");
    h += card("Πίνακας Α1 – Θερμική σταθερά χρόνου T (min)", P.table_A1, `<table class="grid"><tr><th>mm²</th>${Object.keys(D.table_A1_minutes.Cu).map(k => `<th>${k}</th>`).join("")}</tr><tr><td class="l">Cu</td>${Object.values(D.table_A1_minutes.Cu).map(v => `<td>${v}</td>`).join("")}</tr><tr><td class="l">Al</td>${Object.values(D.table_A1_minutes.Al).map(v => `<td>${v}</td>`).join("")}</tr></table>`);
    h += card("Πίνακας Α2 – Βραχυκύκλωμα: θερμοκρασίες και συντελεστής K [mm²/(kA·√s)]", P.table_A2, `<table class="grid"><tr><th>Μόνωση</th><th>θα (°C)</th><th>θτ (°C)</th><th>K Cu</th><th>K Al</th></tr>${Object.entries(D.table_A2).map(([k, v]) => `<tr><td class="l">${k}</td><td>${v.theta_a}</td><td>${v.theta_t}</td><td>${v.K.Cu.toFixed(2)}</td><td>${v.K.Al.toFixed(2)}</td></tr>`).join("")}</table>`);
    h += card("Πίνακας XX – Χαρακτηριστικά αγωγών για τη σταθερά K", P.table_XX, `<table class="grid"><tr><th>Υλικό</th><th>α20 (1/°C)</th><th>B0 (°C)</th><th>Qc (J/°C·m³)</th><th>ρ20 (Ω·m)</th><th>K1</th></tr>${["Cu", "Al", "St"].map(m => { const x = D.table_XX[m]; return `<tr><td class="l">${m}</td><td>${x.alpha20}</td><td>${x.B0}</td><td>${x.Qc.toExponential(2)}</td><td>${x.rho20.toExponential(3)}</td><td>${x.K1}</td></tr>`; }).join("")}</table><div class="muted small">${D.table_XX.note}</div>`);
    if (D.od26_mv) {
      const M = D.od26_mv;
      h += card("Πίνακας Ι – Φόρτιση καλωδίων ΜΤ XLPE (θ εδάφους 25 °C, θ αέρα 50 °C, θ αγωγών 90 °C)", P.table_I, `<table class="grid"><tr><th>Καλώδιο</th>${M.table_I.cols.map(c => `<th>${c}</th>`).join("")}</tr>${M.table_I.rows.map(r => `<tr><td class="l">${r.name}</td><td>${r.ground}</td><td>${r.air_shade}</td><td>${r.air_sun}</td></tr>`).join("")}</table><div class="muted small">${M.table_I.note}</div>`);
      h += card("Πίνακας ΙΙ – Φόρτιση γυμνών αγωγών Cu και ACSR (θ αγωγού Cu 70 °C / ACSR 80 °C, άνεμος 0,6 m/s, ηλιακή ακτινοβολία)", P.table_II, `<table class="grid"><tr><th>Διατομή (mm²)</th><th>Cu – αέρας 40 °C</th><th>ACSR – 40 °C</th><th>Cu – αέρας 50 °C</th><th>ACSR – 50 °C</th></tr>${M.table_II.rows.map(r => `<tr><td class="l">${r.size}</td><td>${r.Cu_40}</td><td>${r.ACSR_40}</td><td><b>${r.Cu_50}</b></td><td><b>${r.ACSR_50}</b></td></tr>`).join("")}</table><div class="muted small">${M.table_II.note}</div>`);
      h += card("Πίνακας ΙΙΙ – Φόρτιση καλυμμένων αγωγών ΜΤ (θ αγωγού 80 °C, άνεμος 0,6 m/s)", P.table_III, `<table class="grid"><tr><th>Τύπος</th><th>Στον αέρα 40 °C (A)</th><th>Στον αέρα 50 °C (A)</th></tr>${M.table_III.rows.map(r => `<tr><td class="l">${r.type}</td><td>${r.air_40}</td><td><b>${r.air_50}</b></td></tr>`).join("")}</table><div class="muted small">${M.table_III.note}</div>`);
    }
    h += card("Πίνακας XIX – R, X (Ω/km) για την πτώση τάσης", P.table_XIX, `<table class="grid"><tr><th>Καλώδιο</th><th>R</th><th>X</th></tr>${Object.entries(D.table_XIX).map(([k, v]) => `<tr><td class="l">${k}</td><td>${v.R}</td><td>${v.X}</td></tr>`).join("")}</table>`);
    h += card("Συμπληρωματικά (εκτός ΟΔ.26) – R20 IEC 60228 (Ω/km) για την πληροφοριακή πτώση τάσης", "—", `<table class="grid"><tr><th>mm²</th>${Object.keys(D.iec60228_R20_ohm_per_km.Cu).map(k => `<th>${k}</th>`).join("")}</tr><tr><td class="l">Cu</td>${Object.values(D.iec60228_R20_ohm_per_km.Cu).map(v => `<td>${v}</td>`).join("")}</tr><tr><td class="l">Al</td>${Object.keys(D.iec60228_R20_ohm_per_km.Cu).map(k => `<td>${D.iec60228_R20_ohm_per_km.Al[k] ?? "–"}</td>`).join("")}</tr></table>`);
    h += card("Τυποποιημένες παροχές (από το υπάρχον εργαλείο)", "—", `<table class="grid"><tr><th>Παροχή</th><th>Φάσεις</th><th>Ασφάλεια (A)</th><th>Παλιό τυποποιημένο καλώδιο</th></tr>${D.standard_supplies.map(s => `<tr><td class="l">${s.no}</td><td>${s.phases}</td><td>${s.fuse_A}</td><td>${s.legacy_cable || "—"}</td></tr>`).join("")}</table>`);
    let leg = `<table class="grid"><tr><th>Διατομή</th><th>Έδαφος παλιό</th><th>Έδαφος ΟΔ.26</th><th>Αέρας ελ. παλιό</th><th>Αέρας ελ. ΟΔ.26</th><th>Αέρας επιτ. παλιό</th><th>Αέρας επιτ. ΟΔ.26</th><th>Σωλήνας παλιό</th><th>Σωλήνας ΟΔ.26</th></tr>`;
    D.legacy_tables.epr_se1_old.forEach(o => { const n = D.families[0].sizes.find(s => s.size === o.size); leg += `<tr><td class="l">${o.size}</td><td>${o.ground}</td><td>${n.ground ?? "–"}</td><td>${o.air_free}</td><td>${n.air_free}</td><td>${o.air_wall}</td><td>${n.air_wall}</td><td>${o.pipe}</td><td>${n.pipe1 ?? "–"}</td></tr>`; });
    leg += "</table>";
    let legx = `<table class="grid"><tr><th>Διατομή</th><th>Έδαφος/σωλήνας < 6 m παλιό</th><th>Σωλήνας > 6 m παλιό</th><th>ΟΔ.26</th></tr>`;
    D.legacy_tables.xlpe_old.forEach(o => { legx += `<tr><td class="l">${o.size}</td><td>${o.ground_or_pipe_lt6}</td><td>${o.pipe_gt6}</td><td>${o.size === "3x150 Al + 50 Cu" ? "270 / 221 / αέρας 250" : "δεν περιλαμβάνεται"}</td></tr>`; });
    legx += "</table>";
    h += card("Σύγκριση παλιών τιμών (υπάρχον εργαλείο) – ΟΔ.26", "—", leg + "<br>" + legx + `<div class="muted small">${D.legacy_tables.note}</div>`);
    T.innerHTML = h;
  }

  // ---------- state ----------
  const IDS = ["p_name", "p_addr", "p_eng", "p_date", "family", "method", "phases", "manual", "lmode", "lval", "cos_l", "supply", "margin", "npar", "gt", "at", "rho", "ntr", "npipe", "ngr", "amode", "atr", "acc",
    "ik", "tsc", "kmode", "pre", "iov", "tov", "ipre", "iper", "t1", "t0", "L", "cosv", "X", "lim"];
  const CHK = ["touch", "sc_on", "ov_on", "per_on", "vd_on"];
  function saveState() {
    try {
      const st = {};
      IDS.forEach(id => st[id] = $(id).value);
      CHK.forEach(id => st[id] = $(id).checked);
      localStorage.setItem("od26_state_v2", JSON.stringify(st));
    } catch (e) { /* ignore */ }
  }
  function loadState() {
    try {
      const st = JSON.parse(localStorage.getItem("od26_state_v2") || "null");
      if (!st) return;
      IDS.forEach(id => { if (st[id] !== undefined && st[id] !== null) $(id).value = st[id]; });
      CHK.forEach(id => { if (st[id] !== undefined) $(id).checked = st[id]; });
      fillManual();
      if (st.manual !== undefined) $("manual").value = st.manual;
    } catch (e) { /* ignore */ }
  }

  // ---------- events ----------
  document.querySelectorAll("#tab-od26 input, #tab-od26 select").forEach(el => {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });
  $("family").addEventListener("change", () => { fillManual(); update(); });
  loadState();
  update();
  return { setIB, update, renderTables, getSummary: () => lastSummary, lastResult: () => lastRes };
})();
