/* UI v2 – Επιλογή παροχής, μετρητική διάταξη, υλικά (τοποθέτηση/αποξήλωση), αναχώρηση Μ/Σ, πελάτης ΜΤ, πίνακες, οδηγίες. */
(function () {
  "use strict";
  const D = window.OD26_DATA;
  const E = window.ENGINE2.makeEngine2(D);
  const $ = id => document.getElementById(id);
  const fmt = (v, d = 1) => (v === null || v === undefined || v === "" || isNaN(v)) ? "—" : Number(v).toLocaleString("el-GR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = v => fmt(v, 0);
  const YN = v => v === null || v === undefined ? '<span class="na">—</span>' : (v ? '<span class="ok">ΝΑΙ</span>' : '<span class="no">ΟΧΙ</span>');
  const esc = s => String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const SUPS = D.supplies;
  const CASES = ["OH_F", "OH_W", "UG_OH", "UG_G", "UG_P"];
  const CASE_LABEL = { OH_F: "Εναέρια – ελεύθερα στον αέρα", OH_W: "Εναέρια – επιτοίχια", UG_OH: "Υπόγεια από εναέριο δίκτυο", UG_G: "Υπόγεια – έδαφος / σωλήνας ≤ 6 m", UG_P: "Υπόγεια – σωλήνας > 6 m" };
  const CASE_UPPER = { OH_F: "ΕΛΕΥΘΕΡΑ ΣΤΟΝ ΑΕΡΑ", OH_W: "ΕΠΙΤΟΙΧΙΑ", UG_OH: "ΑΠΟ ΕΝΑΕΡΙΟ ΔΙΚΤΥΟ", UG_G: "ΕΔΑΦΟΣ / ΣΩΛΗΝΑΣ ≤ 6 m", UG_P: "ΣΩΛΗΝΑΣ > 6 m" };
  const POLE_LABEL = { "POLE": "Στυλίσκος παροχής 3\"/4\" – 6 m", "2.5": "Στυλίσκος παροχών ΔΕΔΔΗΕ 2,5 m", "4.75": "Στυλίσκος παροχών ΔΕΔΔΗΕ 4,75 m", "WALL": "Γάντζος / γωνιακό έλασμα τοίχου", "NONE": "Καμία / υπόγεια", "POLE3": "Στυλίσκος παροχής 3\" – 6 m", "POLE4": "Στυλίσκος παροχής 4\" – 6 m" };
  const G = window.DIAGRAMS;
  const IMG_MD = "img/md/";
  // εικόνα που δεν φορτώθηκε (π.χ. προσωρινό σφάλμα δικτύου / cache): εμφανές μήνυμα και νέα προσπάθεια με ένα πάτημα
  window.APP_IMG_ERR = function (im) {
    if (!im || im.dataset.retried) { if (im) { const d = document.createElement("div"); d.className = "imgerr"; d.textContent = "⚠ Η εικόνα " + (im.getAttribute("alt") || "") + " δεν φορτώθηκε – πατήστε για νέα προσπάθεια"; d.onclick = e => { e.stopPropagation(); im.dataset.retried = ""; im.src = im.src.split("?")[0] + "?r=" + Date.now(); d.remove(); im.style.display = ""; }; im.style.display = "none"; im.parentNode.insertBefore(d, im); } return; }
    im.dataset.retried = "1"; im.src = im.src.split("?")[0] + "?r=" + Date.now();
  };
  const key = v => { const n = Number(v); return (!isNaN(n) && Number.isInteger(n)) ? String(n) : String(v); };

  function fill(sel, items, value) {
    sel.innerHTML = "";
    items.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
    if (value !== undefined) sel.value = value;
  }
  const num = (id, def = 0) => { const v = parseFloat($(id).value); return isNaN(v) ? def : v; };

  // ---------------------------------------------------------------- state
  const ST = {
    counts: {}, loads: {}, board: {}, mat: { drop_m: D.materials.cable_length_rule.drop_m, board_m: D.materials.cable_length_rule.board_m, termination_m: D.materials.cable_length_rule.termination_m,
      rods: D.materials.defaults.rods, earth_conductor_m: D.materials.defaults.earth_conductor_m, galv_pipe_m: D.materials.defaults.galv_pipe_m },
    rem: { counts: {}, protection: "fuse", cable_key: "", cable_len_m: 0, pole: "NONE", distributors: 0, fuse_boxes: 0, ug_box: false, link_box: false, rods: 0 },
    field: {},  // ΤΟΠΟΘΕΤΗΘΗΚΑΝ / ΑΠΟΜΑΚΡΥΝΘΗΚΑΝ per item
    vd: { sections: [] },   // πτώση τάσης: τμήματα γραμμής
    nz: { sections: [] },   // ουδετέρωση ΧΤ (συνθήκη βραχυκύκλωσης): τμήματα γραμμής
  };
  SUPS.forEach(s => { ST.counts[s.no] = s.no === "Νο 03" ? 3 : 0; ST.loads[s.no] = s.load_A; ST.rem.counts[s.no] = 0; });
  Object.keys(D.od45.rules).forEach(k => ST.board[k] = D.od45.rules[k]);
  const IDS = ["p_name", "p_addr", "p_eng", "p_date", "f3_no", "f3_earth", "f3_present", "f3_notes", "m_extra_c", "m_extra", "m_dist", "m_line", "m_margin", "m_net", "m_req", "m_pipe", "m_feed", "m_irrig", "m_L", "m_pole", "m_prot", "m_rows", "m_use", "m_link", "m_basis", "m_maxc", "m_airgov", "m_x150", "m_airpos", "m_at", "m_gt", "m_rho", "m_ntr", "m_np", "m_zone", "m_cross",
    "x_area", "x_ap", "f_kva", "f_cond", "f_i1", "f_src", "f_i2", "f_L", "f_fuse", "f_kd", "f_itr", "f_cos", "f_du", "v_kva", "v_n", "v_par", "v_met", "v_net", "v_fut", "v_sep", "v_kv", "v_big", "y_kva", "y_kv", "y_fk", "y_up", "y_bl", "y_single", "y_sup", "y_lvnet", "y_indoor",
    "vd_volt", "vd_cos", "vd_lim", "vd_unit", "vd_tr", "vd_lp", "nz_tr", "nz_sup", "nz_lp", "nz_fuse", "s_pset", "s_src", "s_dist", "s_kind", "s_L", "s_R", "s_Lk_oh", "s_Lk_ug", "s_nys", "s_special", "s_exc", "s_no7exc", "s_netcost", "s_space", "s_ugdiff", "s_cable", "s_fop_p", "s_fop_w", "s_night", "s_extra", "v2_case", "v2_kva", "v2_nold", "v2_len", "v2_lep", "v2_sup", "v2_met", "v2_prot", "v2_bextra", "v2_dpact", "v2_dep", "v2_years", "v2_removed", "v2_lvno", "v2_lvn", "v2_lvuse", "v2_extra", "v2_x", "v2_meter",
    "e_ys", "e_gs", "e_sf", "e_L", "e_ends", "e_poles", "e_sup", "e_re", "e_rho", "e_resup", "e_ysrods", "e_rys", "e_sheath", "e_netovr"];
  function saveState() {
    try { const st = { v: 7, ids: {}, ST }; IDS.forEach(id => st.ids[id] = $(id).value); localStorage.setItem("supply_v2_state", JSON.stringify(st)); } catch (e) { /* ignore */ }
  }
  function loadState() {
    try {
      const st = JSON.parse(localStorage.getItem("supply_v2_state") || "null");
      if (!st) return;
      IDS.forEach(id => { if (st.ids && st.ids[id] !== undefined && st.ids[id] !== null) $(id).value = st.ids[id]; });
      if (!(st.v >= 6)) $("m_airgov").value = "0";   // v6: underground columns = ΟΔ.26 Πίν. V as printed (older saved states had ΝΑΙ)
      if (!(st.v >= 7)) $("m_rows").value = "0";     // v7: C37/m_rows = πλήθος διατάξεων (0 = αυτόματα) αντί για σειρές
      if (st.ST) { ["counts", "loads", "board", "mat", "field"].forEach(k => Object.assign(ST[k], st.ST[k] || {})); if (st.ST.rem) { Object.assign(ST.rem, st.ST.rem); Object.assign(ST.rem.counts, (st.ST.rem.counts || {})); }
        if (st.ST.sym && typeof st.ST.sym === "object") ST.sym = Object.assign({}, st.ST.sym);
        if (st.ST.vd && Array.isArray(st.ST.vd.sections)) ST.vd.sections = st.ST.vd.sections.filter(x => x && typeof x === "object");
        if (st.ST.nz && Array.isArray(st.ST.nz.sections)) { ST.nz.sections = st.ST.nz.sections.filter(x => x && typeof x === "object"); nzSaved = true; } }
    } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------- selects
  fill($("m_at"), Object.keys(D.table_VIII.air).map(k => [k, k + " °C"]), "50");
  fill($("m_gt"), Object.keys(D.table_VIII.ground).map(k => [k, k + " °C"]), "25");
  fill($("m_rho"), Object.keys(D.table_XIII).map(k => [k, k.replace(".", ",") + " K·m/W"]), "1");
  fill($("m_ntr"), Object.keys(D.table_XIV).map(k => [k, k]), "1");
  fill($("m_np"), Object.keys(D.table_XVI).map(k => [k, k]), "1");
  fill($("m_cross"), D.typ.service_clearances.crossing_options.map(o => [o[0], o[1]]), "SIDEWALK");
  fill($("m_use"), D.md.use_types.map(u => [u.code, u.label]), "ΠΟΛΥΚΑΤΟΙΚΙΑ");
  fill($("f_kva"), D.transformers.filter(t => t.dedie).map(t => [t.kva, t.kva + " kVA"]), "250");
  fill($("f_cond"), D.lv_feeder_conductors.map(c => [c.key, c.name]), "SK_120");
  fill($("f_fuse"), [["", "—"]].concat(D.lv_fuse_sizes.map(f => [f, f + " A"])), "");
  fill($("v_big"), D.transformers.map(t => [t.kva, t.kva + " kVA"]), "400");
  fill($("nz_tr"), D.transformers.filter(t => t.standard && t.RM !== null && t.RM !== undefined).map(t => [t.kva, `${t.kva} kVA  (RM ${String(t.RM).replace(".", ",")} / XM ${String(t.XM).replace(".", ",")} mΩ · μέγ. ασφ. ${t.max_lv_fuse} A)`]), "250");
  fill($("nz_sup"), D.lv_neutral.supply_cables.map(c => [c.key, c.label + (c.R ? `  – ${String(c.R).replace(".", ",")} Ω/km` : "")]), "C_2x6");
  fill($("nz_fuse"), [["", "— (εύρεση μέγιστης)"]].concat(D.lv_fuse_sizes.map(f => [f, f + " A"])), "");
  const YS_DEDIE = new Set(D.transformers.filter(t => t.standard).map(t => t.kva));   // μόνο τυποποιημένοι Μ/Σ δικτύου (50…1000 kVA)
  const YS_KVAS = [...new Set(D.ys.fuse_table.flatMap(r => [r.kva_num, r.kva_num2]))].filter(k => YS_DEDIE.has(k)).sort((a, b) => a - b);
  fill($("y_kva"), YS_KVAS.map(k => [k, k + " kVA"]), "160");
  fill($("y_up"), D.ys.upstream.map(u => [u.code, u.label]), "ED");
  fill($("vd_volt"), D.vdrop.voltages.map(v => [v.code, v.label]), "XT");
  fill($("vd_cos"), D.vdrop.cos_cols.map(c => [c, String(c).replace(".", ",")]), "0.9");
  fill($("vd_tr"), [["", "— (χωρίς έλεγχο ουδετέρωσης)"]].concat(D.transformers.filter(t => t.standard && t.RM !== null && t.RM !== undefined).map(t => [t.kva, t.kva + " kVA"])), "");
  fill($("e_ys"), D.earthing.ys_types.map(y => [y.code, y.label]), "OH_CONC");
  fill($("e_rho"), [["", "— (δίνεται η μετρημένη Re)"]].concat(D.earthing.soil.map(x => [x.rho, x.label])), "");
  const E_FIGS = [["fig01", "Σχ. 1"], ["fig02", "Σχ. 2"], ["fig03", "Σχ. 3"], ["fig04", "Σχ. 4"], ["fig05", "Σχ. 5"], ["fig06", "Σχ. 6"], ["fig07", "Σχ. 7"], ["fig08", "Σχ. 8"], ["fig09", "Σχ. 9"], ["fig10", "Σχ. 10"],
    ["fig11", "Σχ. 11 – Rολ αγωγού γης γραμμής ΜΤ (στύλοι Ω.Σ.)"], ["fig11a", "Σχ. 11Α – Rολ αγωγού γης (συνέχεια)"], ["nomogram", "Παράρτημα 1971 – προστασία ατόμων έναντι τάσεων επαφής (νομογράφημα, ελλιπής σάρωση)"]];
  fill($("e_fig"), E_FIGS.map(([k, t]) => [k, t.length > 8 ? t : t + " – " + ((D.earthing.figures.find(f => f.no === t) || {}).when || "")]), "fig01");

  // ---------------------------------------------------------------- supplies table (main tab)
  function renderSupplies() {
    const tb = $("m_supplies");
    let h = "<tr><th>Παροχή</th><th>Πλήθος μετρητών</th><th>Φορτίο (A) <span class='param'>●</span></th><th>n × A</th><th class='hide-m'>ΟΔ.22: kVA · γεν. ασφ. / ασφ. μετρητή · ελάχ. ασφ. αναχ.</th></tr>";
    SUPS.forEach(s => {
      h += `<tr><td class="l"><b>${s.no}</b> <span class="muted small">${s.phases}Φ · ${s.kva} kVA</span></td>
        <td><input data-cnt="${s.no}" type="number" min="0" max="72" step="1" value="${ST.counts[s.no]}"></td>
        <td><input data-load="${s.no}" type="number" min="0" step="1" value="${ST.loads[s.no]}" class="param"></td>
        <td data-tot="${s.no}">${fmt(ST.counts[s.no] * ST.loads[s.no], 0)}</td>
        <td class="small muted hide-m">${s.kva} kVA · ${s.gen_fuse} / ${s.meter_fuse || "—"} A · ≥ ${s.feeder_fuse_net} A${s.no === "Νο 7" ? " · πάντα ιδιαίτερη αναχώρηση" : ""}</td></tr>`;
    });
    h += `<tr class="sub"><td class="l">ΣΥΝΟΛΟ</td><td id="m_N">0</td><td></td><td id="m_sumA">0</td><td class="small muted hide-m">N > 72: εκτός Πίν. ΙΙ ΟΔ.45</td></tr>`;
    tb.innerHTML = h;
    tb.querySelectorAll("input[data-cnt]").forEach(i => i.addEventListener("input", e => { ST.counts[e.target.dataset.cnt] = Math.max(0, parseInt(e.target.value || "0", 10) || 0); update(); }));
    tb.querySelectorAll("input[data-load]").forEach(i => i.addEventListener("input", e => { ST.loads[e.target.dataset.load] = Math.max(0, parseFloat(e.target.value || "0") || 0); update(); }));
  }

  // ---------------------------------------------------------------- board params
  const BOARD_PARAMS = [
    ["box_1f_w_cm", "Πλάτος κιβωτίου 1Φ μετρητή (cm)", "ΟΔ.45 ΜΔ-1 §4: 20 cm"], ["box_1f_h_cm", "Ύψος κιβωτίου 1Φ (cm)", ""],
    ["box_3f_w_cm", "Πλάτος κιβωτίου 3Φ μετρητή (cm)", "ΟΔ.45 ΜΔ-1 §4: 30 cm"], ["box_3f_h_cm", "Ύψος κιβωτίου 3Φ (cm)", ""],
    ["box_ct_w_cm", "Πλάτος κυψέλης ΧΤ Νο5–7 (cm)", "ΔΔ-151: 606 × 815 mm"], ["box_ct_h_cm", "Ύψος κυψέλης ΧΤ (cm)", ""],
    ["distributor_w_cm", "Πλάτος διανομέα (cm)", "κιβώτιο διακλάδωσης 30 cm"], ["distributor_h_cm", "Ύψος διανομέα (cm)", ""],
    ["extra_width_cm", "Επιπλέον πλάτος εσοχής (cm)", "κανόνας γραφείου: + 30 cm"], ["meters_no_branch_box", "Μονοφασικά κιβώτια χωρίς διανομέα έως", "ΟΔ.45 ΜΔ-5"],
    ["slots_per_side", "Θέσεις ανά πλευρά διανομέα", "9 μονοφασικοί ή 3 τριφασικοί ανά πλευρά"], ["big_per_side", "Μέγιστα Νο 4+ ανά πλευρά", "μόνο μία Νο 4 σε κάθε πλευρά"],
    ["row_upper_bottom_cm", "Κάτω άκρο κιβωτίων ΑΝΩ σειράς – 1η διάταξη (cm)", "ΟΔ.45 ΜΔ-7/ΜΔ-9: πάντοτε 1,50 m (και με μία σειρά)"], ["row_lower_bottom_cm", "Κάτω άκρο κιβωτίων ΚΑΤΩ σειράς – 2η διάταξη (cm)", "ΟΔ.45 ΜΔ-9: πάντοτε 0,80 m"],
    ["niche_margin_bottom_cm", "Περιθώριο εσοχής κάτω από τα κιβώτια (cm)", "+ 20 cm κάτω"],
    ["niche_margin_top_cm", "Περιθώριο εσοχής πάνω από τα κιβώτια (cm)", "+ 20 cm πάνω"], ["row_gap_cm", "Ελάχιστο κατακόρυφο διάκενο σειρών (cm)", "μόνο αν η κάτω σειρά έχει ψηλά κιβώτια (κυψέλη 80 cm) – αλλιώς οι σειρές μένουν στα 0,80 / 1,50 m"],
    ["column_gap_cm", "Απόσταση στηλών διατάξεων (cm)", "3η/4η διάταξη σε στήλη δίπλα – διανομείς χωρίς απόσταση (5 cm)"],
    ["niche_depth_cm", "Ελάχιστο βάθος εσοχής (cm)", "ΟΔ.45 ΜΔ-1 §2"],
    ["link_box_1f", "Κιβώτιο ζεύξεως από υπόγειο δίκτυο όταν 1Φ >", "ΟΔ.45 §6"], ["link_box_3f", "… ή 3Φ >", "ΟΔ.45 §6"],
  ];
  function renderBoardParams() {
    $("b_params").innerHTML = BOARD_PARAMS.map(([k, lab, note]) => `<div class="field"><label>${lab}${note ? `<small>${note}</small>` : ""}</label><input data-bp="${k}" type="number" min="0" step="1" value="${ST.board[k]}" class="param"></div>`).join("");
    $("b_params").querySelectorAll("input").forEach(i => i.addEventListener("input", e => { ST.board[e.target.dataset.bp] = parseFloat(e.target.value || "0") || 0; update(); }));
  }

  // ---------------------------------------------------------------- materials params & removal
  const MAT_PARAMS = [["drop_m", "Κάθοδος καλωδίου (m)"], ["board_m", "Διάταξη μετρητών (m)"], ["termination_m", "Τερματισμοί (m)"], ["rods", "Ράβδοι γείωσης (τεμ.)"], ["earth_conductor_m", "Αγωγός Cu 16 mm² (m)"], ["galv_pipe_m", "Σωλήνας γαλβ. 1/2\" (m)"]];
  function renderMatInputs() {
    $("x_params").innerHTML = MAT_PARAMS.map(([k, lab]) => `<div class="field"><label>${lab}</label><input data-mp="${k}" type="number" min="0" step="0.1" value="${ST.mat[k]}" class="param"></div>`).join("");
    $("x_params").querySelectorAll("input").forEach(i => i.addEventListener("input", e => { ST.mat[e.target.dataset.mp] = parseFloat(e.target.value || "0") || 0; update(); }));
    let h = "<tr><th>Υφιστάμενοι μετρητές</th><th>Πλήθος</th><th>Μετρητής</th></tr>";
    SUPS.forEach(s => { h += `<tr><td class="l"><b>${s.no}</b> <span class="muted small">${s.phases}Φ</span></td><td><input data-rc="${s.no}" type="number" min="0" step="1" value="${ST.rem.counts[s.no] || 0}"></td><td class="l small muted">${s.meter}</td></tr>`; });
    $("x_rem_counts").innerHTML = h;
    $("x_rem_counts").querySelectorAll("input").forEach(i => i.addEventListener("input", e => { ST.rem.counts[e.target.dataset.rc] = Math.max(0, parseInt(e.target.value || "0", 10) || 0); update(); }));
    const cabOpts = [["", "—"]].concat(D.supply_cables.filter(c => c.parallel === 1).map(c => [c.key, c.name]));
    const yn = v => `<option value="0"${v ? "" : " selected"}>ΟΧΙ</option><option value="1"${v ? " selected" : ""}>ΝΑΙ</option>`;
    $("x_rem_fields").innerHTML = `
      <div class="field"><label>Υφιστάμενη προστασία μετρητών</label><select data-rf="protection"><option value="fuse"${ST.rem.protection === "fuse" ? " selected" : ""}>Ασφάλειες μετρητή</option><option value="mcb"${ST.rem.protection === "mcb" ? " selected" : ""}>Μικροαυτόματοι</option></select></div>
      <div class="field wide"><label>Υφιστάμενο καλώδιο παροχής</label><select data-rf="cable_key">${cabOpts.map(([v, t]) => `<option value="${v}"${ST.rem.cable_key === v ? " selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Μήκος υφιστάμενου καλωδίου (m)</label><input data-rf="cable_len_m" type="number" min="0" step="0.5" value="${ST.rem.cable_len_m}"></div>
      <div class="field wide"><label>Υφιστάμενη στήριξη εναέριας παροχής</label><select data-rf="pole">${["NONE", "POLE3", "POLE4", "2.5", "4.75", "WALL"].map(p => `<option value="${p}"${ST.rem.pole === p ? " selected" : ""}>${POLE_LABEL[p]}</option>`).join("")}</select></div>
      <div class="field"><label>Υφιστάμενοι διανομείς</label><input data-rf="distributors" type="number" min="0" step="1" value="${ST.rem.distributors}"></div>
      <div class="field"><label>Υφιστάμενα κιβώτια ασφαλειών</label><input data-rf="fuse_boxes" type="number" min="0" step="1" value="${ST.rem.fuse_boxes}"></div>
      <div class="field"><label>Υφιστάμενο υπόγειο κιβώτιο ευθύ</label><select data-rf="ug_box">${yn(ST.rem.ug_box)}</select></div>
      <div class="field"><label>Υφιστάμενο κιβώτιο ζεύξεως (link box)</label><select data-rf="link_box">${yn(ST.rem.link_box)}</select></div>
      <div class="field"><label>Υφιστάμενες ράβδοι γείωσης προς αποξήλωση</label><input data-rf="rods" type="number" min="0" step="1" value="${ST.rem.rods}"></div>`;
    $("x_rem_fields").querySelectorAll("[data-rf]").forEach(el => el.addEventListener("input", e => {
      const k = e.target.dataset.rf, v = e.target.value;
      if (k === "ug_box" || k === "link_box") ST.rem[k] = v === "1";
      else if (k === "protection" || k === "cable_key" || k === "pole") ST.rem[k] = v;
      else ST.rem[k] = parseFloat(v || "0") || 0;
      update();
    }));
  }

  // ---------------------------------------------------------------- gather & compute
  function gather() {
    const basis = $("m_basis").value;
    const kAir = basis === "od26" ? D.table_VIII.air[key($("m_at").value)] : 1;
    const kGnd = basis === "od26" ? D.table_VIII.ground[key($("m_gt").value)] * D.table_XIII[key($("m_rho").value)] * D.table_XIV[key($("m_ntr").value)] : 1;
    const kPipe = basis === "od26" ? D.table_VIII.ground[key($("m_gt").value)] * D.table_XIII[key($("m_rho").value)] * D.table_XVI[key($("m_np").value)] / 0.82 : 1;
    return {
      counts: ST.counts, loads: ST.loads, line: $("m_line").value, extra_A: num("m_extra"), extra_A_coinc: num("m_extra_c"), distribution: $("m_dist").value, margin_pct: num("m_margin"),
      network: $("m_net").value, request: $("m_req").value, pipe_gt6: $("m_pipe").value === "1", isolated: $("m_feed").value === "ISO", irrigation: $("m_irrig").value === "IRRIG", L_m: num("m_L"), pole: $("m_pole").value,
      protection: $("m_prot").value, n_arr: +$("m_rows").value, use: $("m_use").value, link_box: $("m_link").value, basis, max_conc_ug: $("m_maxc").value, air_governs: $("m_airgov").value === "1", ug_xlpe150: $("m_x150").value !== "0", wall: $("m_airpos").value === "air_wall",
      k_air: kAir, k_ground: kGnd, k_pipe: kPipe, load_zone: $("m_zone").value, crossing: $("m_cross").value, board_params: ST.board,
      material_params: { rods: ST.mat.rods, earth_conductor_m: ST.mat.earth_conductor_m, galv_pipe_m: ST.mat.galv_pipe_m }, length_params: { drop_m: ST.mat.drop_m, board_m: ST.mat.board_m, termination_m: ST.mat.termination_m },
      removal: Object.assign({}, ST.rem, { cable_key: ST.rem.cable_key || null }),
    };
  }

  let nzSaved = false;   // true when a saved state already carried «Ουδετέρωση ΧΤ» sections (otherwise the manual example is loaded)
  let R = null, lastInp = null, lastSummary = "";
  function update() {
    const inp = gather();
    lastInp = inp;
    R = E.design(inp);
    $("f_irrig").classList.toggle("hidden", !(Number(ST.counts["Νο 4"]) > 0));
    renderMain(inp, R);
    renderBoard(inp, R);
    renderMaterials(inp, R);
    renderForm(inp, R);
    renderFeeder();
    renderMV();
    renderSym();
    renderYS();
    renderVD();
    renderNZ();
    renderEarth();
    window.OD26APP.setIB(R.error ? null : R.cluster.I_B);
    saveState();
  }

  // card 1 (Στοιχεία έργου): the selected cable cross-section, always visible at the top
  function setCableTop(cls, v, s) {
    const box = $("m_cabletop"); if (!box) return;
    box.className = "cabletop" + (cls ? " " + cls : ""); $("m_cabletop_v").innerHTML = v; $("m_cabletop_s").innerHTML = s;
  }

  // ---------------------------------------------------------------- main tab rendering
  function renderMain(inp, r) {
    const cl = r.cluster;
    $("m_N").textContent = cl.N; $("m_sumA").textContent = fmt0(cl.sum1 + cl.sum3);
    SUPS.forEach(s => { const td = document.querySelector(`[data-tot="${s.no}"]`); if (td) td.textContent = fmt0(ST.counts[s.no] * ST.loads[s.no]); });
    const res = $("m_result");
    const chips = [];
    const chip = (label, cls) => chips.push(`<span class="chip ${cls}">${label}</span>`);
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    if (cl.N === 0) {
      res.className = "result warn"; $("m_status").textContent = "ΣΥΜΠΛΗΡΩΣΤΕ ΤΙΣ ΠΑΡΟΧΕΣ"; $("m_big").textContent = "—";
      $("m_line1").textContent = "Εισάγετε το πλήθος των μετρητών ανά τύπο παροχής."; $("m_line2").textContent = ""; $("m_chips").innerHTML = "";
      setCableTop("wait", "—", "Συμπληρώστε τις παροχές (2) – η διατομή ενημερώνεται αυτόματα.");
    }
    if (r.error) {
      res.className = "result fail"; $("m_status").textContent = "ΕΚΤΟΣ ΠΙΝΑΚΑ"; $("m_big").textContent = "N > 72"; $("m_line1").textContent = r.error; $("m_line2").textContent = ""; $("m_chips").innerHTML = "";
      $("m_load").innerHTML = fc("Μετρητές N1 / N3 / N", `${cl.N1} / ${cl.N3} / ${cl.N}`, "> 72: χωρίστε σε δύο συγκροτήματα", "no");
      $("m_supply").innerHTML = ""; $("m_seltable").innerHTML = ""; $("m_summary").innerHTML = ""; $("m_span").innerHTML = ""; $("m_span_notes").innerHTML = ""; $("m_clear").innerHTML = ""; $("m_od22").innerHTML = ""; $("m_notes").innerHTML = "";
      $("m_lcheck").innerHTML = ""; $("m_span_svg").innerHTML = ""; $("m_sizing").innerHTML = ""; $("m_sizing_note").textContent = ""; $("m_mdsum").innerHTML = ""; $("m_clear_svg").innerHTML = "";
      setCableTop("no", "N > 72", esc(r.error));
      return;
    }
    const ch = r.chosen, sup = r.supply_type, sp = r.span;
    const ug = r.ug_cables || null, ugMulti = !!(ug && ug.n_arr > 1);
    const nCab = ug ? ug.n_cables : (ch ? ch.parallel : 0);
    if (cl.N > 0) {
      if (ugMulti) {
        // υπόγεια παροχή με περισσότερες διατάξεις: ένα (ή περισσότερα παράλληλα) υπόγεια καλώδια ανά διανομέα, από το φορτίο κάθε διάταξης (κανόνας γραφείου)
        const bad = ug.per_arr.some(p => !p.ok);
        res.className = "result" + (bad ? " fail" : "");
        $("m_status").textContent = `ΥΠΟΓΕΙΑ ΠΑΡΟΧΗ – ${CASE_UPPER[r.case]} – ${ug.n_arr} ΔΙΑΤΑΞΕΙΣ${r.board.n_cells ? ` (${r.board.n_arr} ΜΕ ΔΙΑΝΟΜΕΑ + ${r.board.n_cells} ΚΥΨΕΛ${r.board.n_cells === 1 ? "Η" : "ΕΣ"})` : ""} → ${ug.n_cables} ΥΠΟΓΕΙΑ ΚΑΛΩΔΙΑ`;
        $("m_big").innerHTML = `${esc(ug.head)}<small>${ug.n_cables} υπόγεια καλώδια – ένα (ή περισσότερα παράλληλα) ανά μετρητική διάταξη, από το φορτίο κάθε διάταξης (κανόνας γραφείου) · ${esc(ug.list)} · συγκρότημα: ${cl.N} μετρητές, Kn = ${fmt(cl.kn, 2)}, I_B = ${fmt(cl.I_B)} A/φάση · ενιαίο καλώδιο για όλο το φορτίο (αναφορά): ${ch ? esc(ch.name) : "ΚΑΜΙΑ"}</small>`;
        $("m_line1").textContent = r.supply_why;
        const z = r.sizing;
        $("m_line2").textContent = `Μήκος καλωδίων για τα υλικά: ${fmt(r.bom.cable_length_m * nCab)} m (L = ${inp.L_m} m + ${ST.mat.drop_m} + ${ST.mat.board_m} + ${ST.mat.termination_m} m × ${nCab} καλώδια) · Εσοχή: ${r.board.width_cm} × ${r.board.height_cm} cm · ${r.board.n_arr} διατάξ. · ${r.md.code}` + (z && z.fuse_A ? ` · Αναχώρηση: ασφάλεια ${z.fuse_A} A, Μ/Σ ≥ ${z.ms_kva || "> 1000"} kVA` : "");
        chip("Υπόγεια", "info"); chip(`${ug.n_cables} υπόγεια καλώδια`, "info");
        chip(bad ? "Διάταξη χωρίς επαρκές καλώδιο" : "Επάρκεια I_z' ανά διάταξη", bad ? "no" : "ok");
        chip(r.md.code, "info");
        if (r.board.link_box) chip("Link box " + r.board.link_box_type, "warn");
        setCableTop(bad ? "no" : "", `${esc(ug.head)}<small>${ug.n_cables} υπόγεια καλώδια – ένα ή περισσότερα ανά διάταξη · υπόγεια παροχή – ${CASE_LABEL[r.case]} · ${esc(ug.list)}</small>`,
          `Κανόνας γραφείου: κάθε μετρητική διάταξη (διανομέας ή κυψέλη Νο 5–7 μόνη της) με δικό της υπόγειο καλώδιο από το φορτίο της · ${cl.N} μετρητές · I_B συγκροτήματος = ${fmt(cl.I_B)} A/φάση · ΜΔ: ${esc(r.md.code)}`);
      } else if (!ch) {
        res.className = "result fail"; $("m_status").textContent = "ΚΑΝΕΝΑ ΚΑΛΩΔΙΟ ΔΕΝ ΕΠΑΡΚΕΙ";
        $("m_big").innerHTML = `I_req = ${fmt(r.I_req)} A<small>${sup === "OH" ? "εναέρια" : "υπόγεια"} παροχή – εξετάστε παράλληλα καλώδια ή ιδιαίτερη αναχώρηση</small>`;
        $("m_line1").textContent = r.supply_why; $("m_line2").textContent = "";
        setCableTop("no", `ΚΑΝΕΝΑ ΚΑΛΩΔΙΟ ΔΕΝ ΕΠΑΡΚΕΙ<small>I_req = ${fmt(r.I_req)} A – ${sup === "OH" ? "εναέρια" : "υπόγεια"} παροχή</small>`, "Εξετάστε παράλληλα καλώδια ή ιδιαίτερη αναχώρηση.");
      } else {
        const ex = r.exception && r.exception.applied ? r.exception : null;
        res.className = "result" + (sp.heavy_hook || sp.messenger || (ex && !ex.adequate) ? " warn" : "");
        $("m_status").textContent = (sup === "OH" ? "ΕΝΑΕΡΙΑ ΠΑΡΟΧΗ" : "ΥΠΟΓΕΙΑ ΠΑΡΟΧΗ") + " – " + CASE_UPPER[r.case] + (ex ? " – ΚΑΤ' ΕΞΑΙΡΕΣΗ" : "");
        $("m_big").innerHTML = `${ch.name}<small>I_z' = ${fmt(ch.I_z)} A ${ch.I_z >= r.I_req ? "≥" : "<"} I_req = ${fmt(r.I_req)} A · φόρτιση ${fmt0(r.I_req / ch.I_z * 100)} % · ${cl.N} μετρητές · Kn = ${fmt(cl.kn, 2)} · I_B = ${fmt(cl.I_B)} A/φάση${ex ? ` · <b>ΚΑΤ' ΕΞΑΙΡΕΣΗ (κανόνας γραφείου): ${ex.pair ? `δύο μετρητές ${esc(ex.no.replace(/^\d+ × /, ""))} μόνοι τους → ${esc(ex.cable)} με διανομέα, τριφασική γραμμή` : `μεμονωμένη παροχή ${esc(ex.no)} → ${esc(ex.cable)}`}</b>` : ""}</small>`;
        $("m_line1").textContent = r.supply_why;
        const z = r.sizing;
        $("m_line2").textContent = `Μήκος καλωδίου για τα υλικά: ${fmt(r.bom.cable_length_m * ch.parallel)} m (L = ${inp.L_m} m + ${ST.mat.drop_m} + ${ST.mat.board_m} + ${ST.mat.termination_m} m${ch.parallel > 1 ? " × " + ch.parallel + " καλώδια" : ""}) · Εσοχή: ${r.board.width_cm} × ${r.board.height_cm} cm · ${r.board.n_arr} διατάξ. · ${r.md.code}` + (sp.applicable ? ` · Στήριξη: ${sp.status}` : "") + (z && z.fuse_A ? ` · Αναχώρηση: ασφάλεια ${z.fuse_A} A, Μ/Σ ≥ ${z.ms_kva || "> 1000"} kVA` : "");
        chip(sup === "OH" ? "Εναέρια" : "Υπόγεια", "info");
        if (ex) chip(`ΚΑΤ' ΕΞΑΙΡΕΣΗ ${ex.no} → ${ex.cable}`, ex.adequate ? "ok" : "warn"); else chip("Επάρκεια I_z'", "ok");
        if (sp.applicable) { if (sp.is_pole && sp.pole_ok) chip(`ΣΤΥΛΙΣΚΟΣ ${sp.pole_pipe} / 6 m`, "ok"); if (sp.is_pole && !sp.pole_ok) chip("ΣΤΥΛΙΣΚΟΣ ΕΚΤΟΣ ΟΡΙΩΝ", "no"); if (sp.heavy_hook) chip("ΓΑΝΤΖΟΣ ΒΑΡΕΩΣ ΤΥΠΟΥ", "warn"); if (sp.messenger) chip("ΣΥΡΜΑΤΟΣΧΟΙΝΟ", "warn"); if (!sp.is_pole && !sp.heavy_hook && !sp.messenger) chip("Άνοιγμα εντός τυποποίησης", "ok"); }
        chip(r.md.code, "info");
        if (r.board.link_box) chip("Link box " + r.board.link_box_type, "warn");
        if (ch.parallel > 1) chip(`${ch.parallel} παράλληλα καλώδια`, "info");
        setCableTop(sp.heavy_hook || sp.messenger || (sp.applicable && sp.is_pole && !sp.pole_ok) || (ex && !ex.adequate) ? "warn" : "",
          `${esc(ch.short)} mm²${/Al|Cu/.test(ch.short) ? "" : " " + esc((D.supply_cables.find(c => c.key === ch.key) || {}).material || "Cu")}${ch.parallel > 1 && !/^2\(/.test(ch.short) ? " × " + ch.parallel : ""}<small>${esc(ch.name)}${ch.parallel > 1 ? " – " + ch.parallel + " παράλληλα" : ""} · ${sup === "OH" ? "εναέρια" : "υπόγεια"} παροχή – ${CASE_LABEL[r.case]}${ex ? ` · <b>κατ' εξαίρεση: μεμονωμένη ${esc(ex.no)} → ${esc(ex.cable)}</b>` : ""}</small>`,
          `I_z' = ${fmt(ch.I_z)} A ${ch.I_z >= r.I_req ? "≥" : "<"} I_req = ${fmt(r.I_req)} A (φόρτιση ${fmt0(r.I_req / ch.I_z * 100)} %) · ${cl.N} μετρητές · I_B = ${fmt(cl.I_B)} A/φάση · ΜΔ: ${esc(r.md.code)}`);
      }
    }
    $("m_chips").innerHTML = chips.join("");
    // load
    $("m_load").innerHTML =
      fc("Μετρητές N1 / N3 / N", `${cl.N1} / ${cl.N3} / ${cl.N}`, `ισοδύναμοι μονοφασικοί ${cl.eq1f} (${cl.eq1f > 18 ? "> 18 → υπόγεια" : "≤ 18"}) · θέσεις ${cl.slots}`) +
      fc("Συντελεστής ταυτοχρονισμού Kn", cl.kn === null ? "?" : fmt(cl.kn, 2), "ΟΔ.45 Πίν. ΙΙ για " + cl.N + " μετρητές") +
      fc("Γραμμή παροχής", cl.line === "1F" ? "1Φ – 2x" : "3Φ – 4x", inp.line === "AUTO" ? "αυτόματη επιλογή" : "επιλογή μελετητή") +
      fc("Μονοφασικά: δυσμενέστερη φάση (A)", fmt(cl.line === "1F" ? cl.sum1 : cl.per_phase_raw - cl.sum3), cl.line === "1F" ? "όλο το φορτίο στη μία φάση" : (inp.distribution === "WORST" ? "ceil(N1/3) μετρητές στη δυσμενέστερη φάση" : "ισοκατανομή /3")) +
      fc("Τριφασικά (A)", fmt(cl.sum3), "άθροισμα φορτίων") +
      fc("Ρεύμα φορτίου I_B (A/φάση)", fmt(cl.I_B), `(${fmt(cl.per_phase_raw + cl.extra_A_coinc)} A × Kn ${cl.kn}) + ${cl.extra_A} A`, "res") +
      fc("Απαιτούμενη I_req (A)", fmt(r.I_req), `με περιθώριο ${inp.margin_pct} %`, "res");
    // supply type
    $("m_supply").innerHTML = `<div class="factors">${fc("Είδος παροχής", sup === "OH" ? "ΕΝΑΕΡΙΑ" : "ΥΠΟΓΕΙΑ", r.supply_why, "res")}${fc("Εφαρμοστέα περίπτωση", CASE_LABEL[r.case], E.CASES[r.case].label)}</div>`;
    // selection table
    let h = "<tr><th>Καλώδιο</th><th>S (mm²)</th><th>Τύπος</th>" + CASES.map(c => `<th class="${r.case === c ? "cur" : ""}" colspan="2">${CASE_LABEL[c]}<br><span class="muted">I_z' (A) · επαρκεί;</span></th>`).join("") + "</tr>";
    const rowsBy = {}; CASES.forEach(c => r.selection[c].rows.forEach(row => { rowsBy[row.key] = rowsBy[row.key] || {}; rowsBy[row.key][c] = row; }));
    D.supply_cables.forEach(c => {
      const rb = rowsBy[c.key]; if (!rb && c.phases !== cl.phases) return;
      h += `<tr><td class="l"><b>${c.name}</b></td><td>${c.s_phase}</td><td>${c.kind === "conc" ? "συγκεντρικό" : "XLPE"}</td>`;
      CASES.forEach(cs => { const row = rb ? rb[cs] : null; const hi = row && r.case === cs && ch && ch.key === c.key; h += !row ? `<td class="na">—</td><td class="na">—</td>` : (row.office_skip ? `<td class="na" colspan="2"><span class="muted small">δεν χρησιμοποιείται (κανόνας γραφείου: μετά το 4x50 Cu απευθείας 3x150Al+50Cu)</span></td>` : `<td class="${hi ? "hi" : ""}">${fmt(row.I_z)}</td><td class="${hi ? "hi" : ""}">${YN(row.ok)}</td>`); });
      h += "</tr>";
    });
    h += `<tr class="sub"><td class="l" colspan="3">ΕΠΙΛΟΓΗ – μικρότερο καλώδιο που επαρκεί για όλο το φορτίο${r.exception ? " (κατ' εξαίρεση: " + (r.exception.pair ? "δύο μετρητές " + esc(r.exception.no.replace(/^\d+ × /, "")) + " μόνοι τους → " + esc(r.exception.cable) + " με διανομέα" : "μεμονωμένη " + esc(r.exception.no) + " → " + esc(r.exception.cable)) + ")" : ""}</td>` + CASES.map(c => `<td colspan="2">${r.selection[c].chosen ? esc(r.selection[c].chosen.short) : "ΚΑΜΙΑ"}${r.selection[c].exception ? " *" : ""}${r.case === c ? " ◄" : ""}</td>`).join("") + "</tr>";
    if (ugMulti) h += `<tr class="sub"><td class="l" colspan="3">ΥΠΟΓΕΙΑ ΚΑΛΩΔΙΑ ΑΝΑ ΔΙΑΤΑΞΗ (κανόνας γραφείου) – εφαρμόζεται</td><td colspan="${CASES.length * 2}" class="l"><b>${esc(ug.head)}</b> – ${esc(ug.list)}</td></tr>`;
    $("m_seltable").innerHTML = h;
    renderUgTable("m_ugcard", "m_ugtable", "m_ugnotes", r);
    // summary
    const noteBy = { OH_F: cl.eq1f > 18 ? "εναέρια δεν επιτρέπεται (> 18 ισοδύναμοι 1Φ)" : (inp.network === "UG" ? "μόνο από εναέριο δίκτυο" : "συγκεντρικό ελεύθερα – ΟΔ.26 Πίν. V"), OH_W: cl.eq1f > 18 ? "εναέρια δεν επιτρέπεται (> 18 ισοδύναμοι 1Φ)" : (inp.network === "UG" ? "μόνο από εναέριο δίκτυο" : "συγκεντρικό επιτοίχια – μειωμένη ένταση"),
      UG_OH: `κάθοδος στον στύλο: συγκεντρικό με ένταση αέρα (όριο ${inp.max_conc_ug}) · XLPE με ένταση σωλήνα`, UG_G: `έδαφος / σωλήνας ≤ 6 m – k = ${fmt(inp.k_ground, 2)}`, UG_P: `σωλήνας > 6 m – k = ${fmt(inp.k_pipe, 2)}` };
    h = "<tr><th>Τρόπος εγκατάστασης</th><th>Καλώδιο</th><th>I_z' (A)</th><th>Επαρκεί;</th><th>Φόρτιση</th><th>Εφαρμόζεται</th><th>Παρατήρηση</th></tr>";
    CASES.forEach(c => { const x = r.selection[c].chosen; h += `<tr class="${r.case === c ? "rec" : ""}"><td class="l">${CASE_LABEL[c]}</td><td><b>${x ? x.name : "ΚΑΜΙΑ"}</b></td><td>${x ? fmt(x.I_z) : "—"}</td><td>${cl.N ? (x && r.selection[c].exception && x.I_z < r.I_req ? '<span class="warn-t">ΕΞΑΙΡΕΣΗ</span>' : YN(!!x)) : '<span class="na">—</span>'}</td><td>${x ? fmt0(r.I_req / x.I_z * 100) + " %" : "—"}</td><td>${r.case === c ? '<span class="ok">◄ ΝΑΙ</span>' : ""}</td><td class="l small muted">${noteBy[c]}</td></tr>`; });
    $("m_summary").innerHTML = h;
    // L check next to the input (στυλίσκος / γάντζος)
    const lcls = sp.applicable ? [sp.pole_ok ? "ok" : "no", sp.hook_messenger ? "warn" : "ok"] : ["", ""];
    $("m_lcheck").innerHTML = sup === "UG" || !sp.applicable ? (ch && sup === "OH" ? `<div class="lc warn"><b>Στυλίσκος:</b> ${esc(sp.pole_text)}</div><div class="lc warn"><b>Γάντζος:</b> ${esc(sp.hook_text)}</div>` : `<div class="lc"><b>Έλεγχος L:</b> ${sup === "UG" ? "υπόγεια παροχή – χωρίς εναέριο άνοιγμα" : "—"}</div>`) :
      `<div class="lc ${lcls[0]}"><b>Σε στυλίσκο:</b> ${esc(sp.pole_text)}</div><div class="lc ${lcls[1]}"><b>Σε γάντζο:</b> ${esc(sp.hook_text)}</div>`;
    // span
    if (!sp.applicable) {
      $("m_span").innerHTML = fc("Στήριξη / άνοιγμα", sp.status, sup === "UG" ? "υπόγεια παροχή – χωρίς εναέριο άνοιγμα" : (ch ? "μη αυτοφερόμενο καλώδιο" : "—"), sup === "UG" ? "" : "warn");
      $("m_span_notes").innerHTML = sp.messages.map(m => `<li>${m}</li>`).join("");
      $("m_span_svg").innerHTML = "";
    } else {
      const zone = inp.load_zone === "LM" ? "ελαφριά/μέση" : "βαριά";
      const PR = D.typ.span_rules.pole_rules;
      $("m_span").innerHTML =
        fc("Άνοιγμα L / επιλεγμένη στήριξη", `${inp.L_m} m`, POLE_LABEL[inp.pole] + " · " + zone + " επιφόρτιση") +
        fc("ΣΕ ΣΤΥΛΙΣΚΟ ΠΑΡΟΧΗΣ (≥ 3\", 6 m)", sp.pole_ok ? `ΕΝΤΟΣ ΟΡΙΩΝ – ${sp.pole_pipe} / ${PR.height_m} m` : "ΕΚΤΟΣ ΟΡΙΩΝ", `όριο ${ch.short}: ${sp.pole_limit} m` + (PR.big_cables.indexOf(ch.short) >= 0 ? ` · 4" όταν L > ${PR.pipe_big_from_m} m` : ""), sp.pole_ok ? "ok" : "no") +
        fc("ΣΕ ΓΑΝΤΖΟ ΤΟΙΧΟΥ", sp.hook_messenger ? "ΑΠΑΙΤΕΙΤΑΙ ΣΥΡΜΑΤΟΣΧΟΙΝΟ" : "ΧΩΡΙΣ ΣΥΡΜΑΤΟΣΧΟΙΝΟ", `όριο ${ch.short}: ${sp.messenger_limit} m` + (sp.hook_heavy ? " · γάντζος βαρέως τύπου (L > CS-3)" : " · κανονικός γάντζος"), sp.hook_messenger || sp.hook_heavy ? "warn" : "ok") +
        fc("ΣΤΗΡΙΞΗ ΓΙΑ ΤΑ ΥΛΙΚΑ", sp.status, sp.is_pole && !sp.pole_ok ? "ο στυλίσκος είναι εκτός ορίων → υλικά γάντζου" : (sp.is_pole ? "στυλίσκος, περικόχλιο με άγκιστρο, κοχλίας Μ20" : "γωνιακό έλασμα / στέλεχος με άγκιστρο"), sp.is_pole ? (sp.pole_ok ? "ok" : "no") : (sp.heavy_hook || sp.messenger ? "warn" : "ok")) +
        fc("Τυποποιημένο άνοιγμα CS-3 (m)", sp.std_span === null ? "—" : sp.std_span, `${ch.short} – Πίν. Β.1 χωρίς επίτονο (τάνυση ≤ 65 kg)` + (sp.guy ? " · L > τυποποιημένο → τάνυση Πίν. Α.2" : "")) +
        fc("Βέλος τάνυσης στο L (m)", sp.sag_m === null ? "εκτός πίνακα" : fmt(sp.sag_m, 2), sp.guy ? "CS-3 Πίν. Α.1 (με επίτονο / γάντζο βαρέως τύπου)" : "CS-3 Πίν. Β.1 – αφόρτιστη κατάσταση") +
        fc("Μέγιστη τάνυση με επιφόρτιση (kg)", sp.tension_kg === null ? "—" : sp.tension_kg, sp.guy ? "CS-3 Πίν. Α.2" : "CS-3 Β.2: χωρίς επίτονο") +
        fc("Βάρος καλωδίου", sp.weight_kg_m === null ? "—" : `${fmt(sp.weight_kg_m, 2)} kg/m`, `στο άνοιγμα: ${fmt(sp.total_weight_kg)} kg`);
      $("m_span_notes").innerHTML = sp.messages.map(m => `<li class="${m.indexOf("ΑΠΑΙΤΕΙΤΑΙ") >= 0 || m.indexOf("ΕΚΤΟΣ") === 0 ? "warn" : ""}">${m}</li>`).join("");
      $("m_span_svg").innerHTML = G.spanCheck(sp, { L_m: inp.L_m, chosen_short: ch.short }, D.typ.span_rules);
    }
    // sizing (Μ/Σ & feeder fuse from the number of supplies)
    const z = r.sizing, fr = D.feeder_rules;
    if (z) {
      $("m_sizing").innerHTML =
        fc("Φαινόμενη ισχύς S (kVA)", fmt(z.S_kva), cl.phases === 3 ? `√3 × 400 V × ${fmt(cl.I_B)} A` : `230 V × ${fmt(cl.I_B)} A`) +
        fc("Ελάχ. Μ/Σ παροχών (kVA)", z.ms_min_kva, z.irrigation ? "αρδευτική Νο 4 → 50 kVA (κανόνας γραφείου) · λοιπές ΟΔ.22 Πίν. 11.1 / 11.2 / V" : "ΟΔ.22 Πίν. 11.1 / 11.2 / V") +
        fc("ΑΠΑΙΤΟΥΜΕΝΟΣ Μ/Σ (kVA) – ΟΔ.22", z.ms_kva === null ? "> 1000" : z.ms_kva, z.irrig_only ? `ΑΡΔΕΥΤΙΚΗ ΠΑΡΟΧΗ Νο 4 (κανόνας γραφείου): Μ/Σ 50 kVA, ασφάλεια αναχώρησης ≤ ${z.fuse_A} A (μέγ. ασφάλεια ΧΤ του Μ/Σ)· σε αστικό περιβάλλον 100 kVA` : (z.ms_bumped ? `αύξηση από ${z.ms_power_kva} kVA λόγω μέγ. ασφάλειας ΧΤ Μ/Σ (Πίν. Β2-8)` : (z.ms_governed_by === "min" ? "κρίνει ο ελάχιστος Μ/Σ των παροχών (ΟΔ.22)" : "τυποποιημένος Μ/Σ ΔΕΔΔΗΕ ≥ S")) + ` · μέγ. ασφ. ΧΤ ${z.ms_max_fuse || "—"} A`, "res") +
        fc(`Με περιθώριο ανάπτυξης S / ${fr.transformer_load_factor} (kVA)`, `${fmt(z.S_req_kva)} → ${z.ms_growth_kva === null ? "> 1000" : z.ms_growth_kva}`, "Εγχειρίδιο §11.3 (φόρτιση Μ/Σ 70 % σε περιοχή ανάπτυξης) – ενδεικτικό") +
        fc(`${fr.fuse_margin} × I_B (A)`, fmt(z.fuse_load_A), "ΟΔ.22 §5.1") +
        fc("Ελάχ. ασφάλεια παροχών (A)", z.fuse_min_A, `ΟΔ.22 Πίν. ${inp.isolated ? "11.2" : "11.1"}`) +
        fc("ΑΣΦΑΛΕΙΑ ΑΝΑΧΩΡΗΣΗΣ (A)", z.fuse_A, z.fuse_over_load ? `I_B = ${fmt0(cl.I_B)} A > ${z.fuse_max_A} A – δύο αναχωρήσεις / ιδιαίτερος Υ/Σ` : (z.fuse_capped ? `μέγιστη τυποποιημένη ασφάλεια ${z.fuse_max_A} A – χωρίς φυσίγγια 500 A (1,3 × I_B = ${fmt0(z.fuse_load_A)} A· Νο 7: 400 A κατά ΟΔ.22 Πίν. V)` : (z.fuse_governed_by === "min" ? "κρίνει η ελάχιστη ασφάλεια των παροχών (GR-207)" : "τυποποιημένο φυσίγγιο ≥ 1,3 × I_B (GR-207)")), z.fuse_over_load ? "no" : "res") +
        fc("Ελάχ. αγωγός αναχώρησης", `${z.cond_oh || "—"}<br>${z.cond_ug || "—"}`, "Iεπ ≥ ασφάλεια (Β2-3/Β2-4/Β2-9)");
      $("m_sizing_note").textContent = "Ο πλήρης έλεγχος της αναχώρησης (αγωγός, βραχυκύκλωμα 3·Ιασφ ≤ Ιβρ, πτώση τάσης ΔU ≤ 4 %, επάρκεια υφιστάμενου Μ/Σ) με το μήκος της αναχώρησης γίνεται στην καρτέλα «Αναχώρηση Μ/Σ».";
    } else { $("m_sizing").innerHTML = ""; $("m_sizing_note").textContent = ""; }
    // board summary + ΜΔ
    const bd = r.board, md = r.md;
    $("m_mdsum").innerHTML = fc("Εσοχή (cm)", cl.N ? `${bd.width_cm} × ${bd.height_cm}` : "—", cl.N ? `από ${fmt(bd.niche.y0 / 100, 2)} m · ${bd.n_arr} διατάξ. · ${bd.n_distr} διανομείς · ${bd.rows} σειρ${bd.rows > 1 ? `ές (${fmt(bd.mount_upper_cm / 100, 2)} / ${fmt(bd.mount_lower_cm / 100, 2)} m)` : `ά (${fmt(bd.mount_lower_cm / 100, 2)} m)`}` : "") +
      fc("Προτεινόμενη ΜΔ", md.code, md.title, "res") + fc("Είδος εγκατάστασης", md.use_label, md.why) +
      fc("Κιβώτιο ζεύξεως (link box)", bd.link_box_type || "—", bd.link_box ? (bd.link_box_need ? "ΟΔ.45 §6" : "επιλογή χρήστη") : (bd.link_box_need ? "ΠΡΟΣΟΧΗ: απαιτείται κατά ΟΔ.45 §6" : (inp.network === "UG" ? "δεν απαιτείται" : "εναέριο δίκτυο")), bd.link_box ? "warn" : (bd.link_box_need ? "no" : ""));
    // clearance diagrams
    $("m_clear_svg").innerHTML = sup === "OH" ? G.groundClearances(inp.crossing, D.typ.service_clearances) : "";
    if (!$("m_clear_svg2").innerHTML) { $("m_clear_svg2").innerHTML = G.buildingClearances(); $("m_clear_svg3").innerHTML = G.poleClearances(); }
    // clearances
    const clr = r.clearances;
    h = "<tr><th>Απόσταση</th><th>Ελάχιστο (m)</th><th>Τυποποίηση</th></tr>";
    clr.rows.forEach(([lab, v, src], i) => { h += `<tr class="${i === 0 && sup === "OH" ? "rec" : ""}"><td class="l">${lab}</td><td><b>${typeof v === "number" ? fmt(v, 2) : v}</b></td><td class="small muted">${src}</td></tr>`; });
    h += `<tr><td class="l small muted" colspan="3">${clr.note}</td></tr>`;
    $("m_clear").innerHTML = h;
    // ΟΔ.22 table
    h = "<tr><th>Παροχή</th><th>Πλήθος</th><th>Γενική ασφ. (A)</th><th>Ασφάλεια μετρητή (A)</th><th>Μικροαυτ. (A)</th><th>Ελάχ. ασφ. αναχώρησης (A)</th><th>Μετρητής</th><th>Καλώδιο ΟΔ.22</th><th>Γραμμή πίνακα-μετρητή</th><th>Ελάχ. Μ/Σ (kVA)</th></tr>";
    r.std.forEach(s => {
      const iso = inp.isolated, big = ["Νο 3", "Νο 4", "Νο 5", "Νο 6", "Νο 7"].indexOf(s.no) >= 0;
      const mf = iso ? (s.no === "Νο 03" ? 35 : s.no === "Νο 05" ? 63 : "—") : (s.meter_fuse || "—");
      h += `<tr><td class="l"><b>${s.no}</b></td><td>${ST.counts[s.no]}</td><td>${s.gen_fuse}</td><td>${mf}</td><td>${iso && big ? "—" : (s.meter_mcb || "—")}</td><td>${iso ? s.feeder_fuse_iso : s.feeder_fuse_net}</td><td>${s.meter}</td><td>${s.cable_conc}${s.cable_xlpe ? " / " + s.cable_xlpe : ""}</td><td>${s.panel_line}</td><td>${s.min_ms_kva}</td></tr>`;
    });
    $("m_od22").innerHTML = h || "";
    // notes
    const notes = [];
    if (r.exception && r.exception.applied) notes.push([r.exception.adequate ? "" : "warn", `ΚΑΤ' ΕΞΑΙΡΕΣΗ – ${r.exception.note}${ch && !r.exception.adequate ? ` (εδώ I_z' = ${fmt(ch.I_z)} A < I_req = ${fmt(r.I_req)} A, φόρτιση ${fmt0(r.I_req / ch.I_z * 100)} %)` : ""}. ${r.exception.pair ? "Με άλλον μετρητή ή πρόσθετο φορτίο (ή με επιβολή γραμμής 1Φ) η επιλογή γίνεται κανονικά από τον πίνακα." : "Με δεύτερο μετρητή ή πρόσθετο φορτίο η επιλογή γίνεται κανονικά από τον πίνακα."}`]);
    if (inp.network === "OH" && sup === "UG" && inp.request !== "UG" && cl.eq1f > 18) notes.push(["warn", `Υποχρεωτικά υπόγεια παροχή: ${cl.eq1f} ισοδύναμοι μονοφασικοί μετρητές > 18 (ΟΔ.45 §4.2).`]);
    if (sp.applicable && sp.is_pole && !sp.pole_ok) notes.push(["warn", `${sp.pole_text} – τα υλικά στήριξης υπολογίζονται για γάντζο.`]);
    if (sp.applicable && sp.is_pole && sp.pole_ok) notes.push(["", `${sp.pole_text}.`]);
    if (sp.applicable && sp.heavy_hook && !sp.is_pole) notes.push(["warn", `ΑΠΑΙΤΕΙΤΑΙ ΓΑΝΤΖΟΣ ΒΑΡΕΩΣ ΤΥΠΟΥ: το άνοιγμα L = ${inp.L_m} m υπερβαίνει το τυποποιημένο άνοιγμα ${sp.std_span} m του ${ch.short} (CS-3 Πίν. Β.1) – τάνυση έως ${sp.tension_kg} kg.`]);
    if (sp.applicable && sp.messenger) notes.push(["warn", `ΑΠΑΙΤΕΙΤΑΙ ΣΥΡΜΑΤΟΣΧΟΙΝΟ: καλώδιο ${ch.short} με άνοιγμα ${inp.L_m} m > ${sp.messenger_limit} m σε στήριξη με γάντζο.`]);
    if (sp.applicable && sp.hook_messenger && sp.is_pole && sp.pole_ok) notes.push(["", `Με γάντζο θα απαιτούνταν συρματόσχοινο (L > ${sp.messenger_limit} m) – σε στυλίσκο εντός ορίων δεν απαιτείται.`]);
    if (r.sizing && r.sizing.fuse_A) notes.push([r.sizing.fuse_over_load ? "warn" : "", `Αναχώρηση για το συγκρότημα: ασφάλεια ${r.sizing.fuse_A} A${r.sizing.fuse_over_load ? ` (I_B = ${fmt0(cl.I_B)} A > ${r.sizing.fuse_max_A} A → δύο αναχωρήσεις / ιδιαίτερος Υ/Σ)` : (r.sizing.fuse_capped ? " (μέγιστη τυποποιημένη – χωρίς φυσίγγια 500 A)" : "")}, Μ/Σ ≥ ${r.sizing.ms_kva || "> 1000"} kVA κατά ΟΔ.22 (S = ${fmt(r.sizing.S_kva)} kVA· με περιθώριο ανάπτυξης S/0,7 = ${fmt(r.sizing.S_req_kva)} kVA → ${r.sizing.ms_growth_kva || "> 1000"} kVA).`]);
    notes.push(["", `Μετρητική διάταξη: ${r.md.code} – ${r.md.why}`]);
    r.md.alt.forEach(a => notes.push(["", "ΜΔ: " + a]));
    if (sup === "OH" && clr.height_m) notes.push(["", `Ελάχιστο ύψος καλωδίου παροχής από το έδαφος: ${fmt(clr.height_m, 2)} m (${clr.rows[0][2]})· επιτοίχιο τμήμα ≥ 2,50 m, 0,15 m πάνω / 0,90 m πλευρικά από ανοίγματα (C-12).`]);
    r.board.notes.forEach(n => notes.push([n.indexOf("Απαιτείται") === 0 || n.indexOf("Απαιτούνται") === 0 || n.indexOf("ΠΡΟΣΟΧΗ") === 0 ? "warn" : "", n]));
    notes.push(["", "Ελάχιστες αποστάσεις από πεζοδρόμιο / δρόμο: κιβώτια μετρητών " + fmt(r.board.mount_upper_cm / 100, 2) + (r.board.rows > 1 ? " / " + fmt(r.board.mount_lower_cm / 100, 2) : "") + " m από το δάπεδο (εσοχή από " + fmt(r.board.niche_bottom_cm / 100, 2) + " m) · καλώδιο παροχής ≥ 3,00 m πάνω από πεζοδρόμιο (C-3 II, ΜΔ-81) και ≥ 5,50 m πάνω από οδόστρωμα (C-3 I, ΜΔ-79) · στύλος ≥ 0,15 m από το άκρο πεζοδρομίου (C-3 VI) · καμπίνες ΜΔ-77/81/83 βάση 0,30 m."]);
    if (ST.counts["Νο 7"] > 0) notes.push(["", "Παροχή Νο 7: τροφοδοτείται πάντοτε από ιδιαίτερη αναχώρηση Υ/Σ (ΟΔ.22 Πίν. 11.2) – μεμονωμένος καταναλωτής."]);
    if (!inp.isolated && (ST.counts["Νο 5"] > 0 || ST.counts["Νο 6"] > 0)) notes.push(["", "Παροχές Νο 5/Νο 6 από δίκτυο ΧΤ: μετρητές μέσω Μ/Σ έντασης 200/5, ασφάλειες μετρητή 160/250 A, ελάχ. ασφάλεια αναχώρησης 250/400 A (ΟΔ.22 Πίν. 11.1) – συνιστάται ιδιαίτερη αναχώρηση."]);
    if (ch && ch.kind === "conc" && ch.s_phase > 16 && sup === "UG") notes.push(["", "Συγκεντρικό > 4x16 σε υπόγεια παροχή: η ΟΔ.45 §4.4 προβλέπει συγκεντρικό έως 4x16 και μετά XLPE· η ΟΔ.22 Πίν. 11.1 τυποποιεί 4x25/4x50 για Νο 4/Νο 5. Ρυθμίστε το όριο στην παράμετρο «Μέγιστο συγκεντρικό»."]);
    if (inp.basis === "od45") notes.push(["warn", "Χρησιμοποιούνται οι παλαιοί πίνακες ΟΔ.45 (1983) – μόνο για σύγκριση. Η ισχύουσα βάση είναι η ΟΔ.26 3η έκδοση (07/2025)."]);
    if (inp.basis === "od26" && ch && ch.kind === "conc") notes.push(["", "Οι εντάσεις «στον αέρα» των συγκεντρικών κατά ΟΔ.26 (3η έκδ., βάση 50 °C) είναι 26–35 % χαμηλότερες από την ΟΔ.45 (1983) – γι’ αυτό προκύπτουν μεγαλύτερες διατομές από τον παλιό Πίν. ΙΙ."]);
    notes.push(["", `Κανόνας μήκους καλωδίου: L + ${ST.mat.drop_m} m κάθοδος + ${ST.mat.board_m} m διάταξη + ${ST.mat.termination_m} m τερματισμοί. Σωλήνας υπόγειας διέλευσης ≥ Ø 12 cm με οδηγό (ΟΔ.45 §5.2).`]);
    if (r.bom.customer && r.bom.customer.length) {
      const pipe = r.bom.customer.find(c => /Σιδηροσωλήνας/.test(c.item));
      const pit = r.bom.customer.find(c => /Φρεάτιο/.test(c.item));
      const ear = (r.bom.earthing || []).map(e => `${e.label} → ${e.mm2} mm² Cu${e.exception ? " (κατ' εξαίρεση " + e.exception + ")" : ""}`).join(" · ");
      notes.push(["warn", `ΥΠΟΧΡΕΩΣΕΙΣ ΠΕΛΑΤΗ (κανόνας γραφείου): ${pipe && pipe.qty > 0 ? `σιδηροσωλήνας γαλβανιζέ 4" × 1,50 m για την προστασία κάθε υπόγειου καλωδίου – ${fmt0(pipe.qty)} τεμ. (τοποθέτηση από τον πελάτη) · ` : ""}${pit && pit.qty > 0 ? `εσοχή ανοιχτή μέχρι το δάπεδο με ${pit.qty > 1 ? fmt0(pit.qty) + " φρεάτια" : "φρεάτιο"} ΜΔ-51 τύπου Ι στη βάση του ερμαρίου, σε ευθεία κάτω από τον διανομέα / την κυψέλη (κατασκευή πελάτη) · ` : ""}γείωση πελάτη: ελάχιστη 25 mm² Cu ανά μετρητική διάταξη, βάσει παροχής έως 50 mm² Cu (Νο 6 → 70 mm² Cu, Νο 7 → 2×50 ή 2×70 mm² Cu κατ' εξαίρεση)${ear ? " – " + ear : ""}.`]);
    }
    $("m_notes").innerHTML = notes.map(([c, t]) => `<li class="${c}">${t}</li>`).join("");
    lastSummary = [
      `ΕΠΙΛΟΓΗ ΠΑΡΟΧΗΣ ΧΤ – Connexion Engineering`,
      `Έργο: ${$("p_name").value || "—"} · Θέση: ${$("p_addr").value || "—"} · Μελετητής: ${$("p_eng").value || "—"} · ${$("p_date").value || ""}`,
      `Παροχές: ${SUPS.filter(s => ST.counts[s.no] > 0).map(s => `${ST.counts[s.no]} × ${s.no}`).join(", ") || "—"} · N = ${cl.N} · Kn = ${fmt(cl.kn, 2)} · I_B = ${fmt(cl.I_B)} A/φάση · I_req = ${fmt(r.I_req)} A`,
      `Δίκτυο: ${inp.network === "OH" ? "εναέριο" : "υπόγειο"} · ${sup === "OH" ? "ΕΝΑΕΡΙΑ" : "ΥΠΟΓΕΙΑ"} ΠΑΡΟΧΗ (${CASE_LABEL[r.case]}) – ${r.supply_why}`,
      r.ug_cables && r.ug_cables.n_arr > 1 ? `ΥΠΟΓΕΙΑ ΚΑΛΩΔΙΑ ΑΝΑ ΔΙΑΤΑΞΗ (κανόνας γραφείου): ${r.ug_cables.head} – ${r.ug_cables.n_cables} καλώδια · ${r.ug_cables.list} · συνολικό μήκος ${fmt(r.bom.cable_length_m * r.ug_cables.n_cables)} m · ενιαίο καλώδιο (αναφορά): ${ch ? ch.name : "ΚΑΜΙΑ"}` :
        (ch ? `ΚΑΛΩΔΙΟ: ${ch.name} – I_z' = ${fmt(ch.I_z)} A (${fmt0(r.I_req / ch.I_z * 100)} %) · μήκος ${fmt(r.bom.cable_length_m * ch.parallel)} m` : "ΚΑΛΩΔΙΟ: ΚΑΝΕΝΑ ΔΕΝ ΕΠΑΡΚΕΙ"),
      `Ανά τρόπο: ${CASES.map(c => `${CASE_LABEL[c]}: ${r.selection[c].chosen ? r.selection[c].chosen.short : "ΚΑΜΙΑ"}`).join(" · ")}`,
      `Άνοιγμα L = ${inp.L_m} m, ${POLE_LABEL[inp.pole]}: ${sp.status}${sp.applicable ? ` (τυποπ. ${sp.std_span} m, βέλος ${sp.sag_m === null ? "—" : fmt(sp.sag_m, 2)} m, τάνυση ${sp.tension_kg} kg)` : ""}`,
      sp.applicable ? `Σε στυλίσκο: ${sp.pole_text} · Σε γάντζο: ${sp.hook_text}` : "",
      r.sizing && r.sizing.fuse_A ? `Αναχώρηση: ασφάλεια ${r.sizing.fuse_A} A${r.sizing.fuse_over_load ? " (I_B > 400 A → δύο αναχωρήσεις)" : ""} · Μ/Σ ≥ ${r.sizing.ms_kva || "> 1000"} kVA κατά ΟΔ.22 (S = ${fmt(r.sizing.S_kva)} kVA· με περιθώριο S/0,7 → ${r.sizing.ms_growth_kva || "> 1000"} kVA)` : "",
      `Μετρητική διάταξη: εσοχή ${r.board.width_cm} × ${r.board.height_cm} cm από ${fmt(r.board.niche.y0 / 100, 2)} m · ${r.board.n_arr} διατάξεις (${r.board.n_distr} διανομείς) · ${r.md.code} – ${r.md.title} · ${r.md.why}${r.md.related && r.md.related.length ? " · σχετικές: " + r.md.related.join(", ") : ""}${r.board.link_box ? " · link box " + r.board.link_box_type : ""}`,
      sup === "OH" ? `Αποστάσεις: ύψος καλωδίου ≥ ${fmt(clr.height_m, 2)} m (${$("m_cross").selectedOptions[0].textContent})` : "",
      r.bom.customer && r.bom.customer.length ? `Υποχρεώσεις πελάτη: ${r.bom.customer.filter(c => c.qty > 0).map(c => `${c.item} × ${fmt(c.qty, 0)}${c.note && /^Δ|^Κυψ/.test(c.note) ? " (" + c.note + ")" : ""}`).join(" · ")}` : "",
    ].filter(Boolean).join("\n");
  }

  // υπόγεια καλώδια ανά μετρητική διάταξη (κανόνας γραφείου) – κοινός πίνακας για τις καρτέλες «Επιλογή παροχής» και «Μετρητική διάταξη»
  function renderUgTable(cardId, tableId, notesId, r) {
    const card = $(cardId); if (!card) return;
    const ug = r.ug_cables;
    if (!ug || !r.cluster.N) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");
    let h = "<tr><th>Διάταξη</th><th>Μετρητές</th><th>Kn</th><th>I_B (A/φάση)</th><th>I_req (A)</th><th>Υπόγειο καλώδιο</th><th>Καλώδια</th><th>I_z' (A)</th><th>Φόρτιση</th></tr>";
    ug.per_arr.forEach(p => {
      const cnt = Object.keys(p.counts).map(no => `${p.counts[no]} × ${no}`).join(", ");
      h += `<tr class="${p.ok ? "" : "bad"}"><td><b>${esc(p.label || ("Δ" + p.idx))}</b>${p.cell ? '<br><span class="muted small">μόνη της, χωρίς διανομέα</span>' : ""}</td><td class="l">${p.n} (${p.N1} 1Φ + ${p.N3} 3Φ)<br><span class="muted small">${esc(cnt)}${p.extra ? " + πρόσθετα φορτία" : ""}</span></td><td>${fmt(p.kn, 2)}</td><td>${fmt(p.I_B)}</td><td>${fmt(p.I_req)}</td><td class="l"><b>${p.cable ? esc(p.cable.name) : "ΚΑΝΕΝΑ ΔΕΝ ΕΠΑΡΚΕΙ"}</b></td><td>${p.parallel}</td><td>${p.cable ? fmt(p.cable.I_z) : "—"}</td><td>${p.util !== null && p.util !== undefined ? fmt0(p.util * 100) + " %" : "—"}</td></tr>`;
    });
    h += `<tr class="sub"><td class="l" colspan="6">ΣΥΝΟΛΟ ΥΠΟΓΕΙΩΝ ΚΑΛΩΔΙΩΝ – ${esc(ug.head)}</td><td><b>${ug.n_cables}</b></td><td colspan="2" class="l">μήκος για τα υλικά ${fmt(r.bom.cable_length_m * ug.n_cables)} m</td></tr>`;
    $(tableId).innerHTML = h;
    $(notesId).innerHTML = ug.notes.map(n => `<li class="${n.indexOf("⚠") === 0 ? "warn" : ""}">${esc(n)}</li>`).join("") + (ug.n_arr === 1 ? "<li>Μία διάταξη: το υπόγειο καλώδιο ταυτίζεται με το καλώδιο του συγκροτήματος.</li>" : "");
  }

  // ---------------------------------------------------------------- board tab
  function renderBoard(inp, r) {
    const b = r.board, cl = r.cluster, md = r.md;
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    $("b_big").innerHTML = cl.N === 0 ? "—" : `${b.width_cm} cm πλάτος × ${b.height_cm} cm ύψος<small>εσοχή από ${fmt(b.niche.y0 / 100, 2)} έως ${fmt(b.niche.y1 / 100, 2)} m${b.ug_open ? " (ανοιχτή μέχρι το δάπεδο – υπόγεια παροχή" + (b.pit ? `, ${b.pit.n > 1 ? b.pit.n + " φρεάτια" : "φρεάτιο"} ${b.pit.type} ${fmt(b.pit.w_cm, 0)}×${fmt(b.pit.d_cm, 0)}×${fmt(b.pit.h_cm, 0)} cm από τον πελάτη κάτω από τον διανομέα / την κυψέλη` : "") + ")" : ""} · ${b.n_arr} διατάξ${b.n_arr === 1 ? "η" : "εις"} · ${b.n_distr} διανομείς${b.n_cells ? ` · ${b.n_cells} κυψέλ${b.n_cells === 1 ? "η" : "ες"} Νο 5–7 μόνες τους` : ""} · ${b.rows} σειρ${b.rows > 1 ? `ές (κιβώτια ${fmt(b.mount_upper_cm / 100, 2)} / ${fmt(b.mount_lower_cm / 100, 2)} m)` : `ά (κιβώτια ${fmt(b.mount_lower_cm / 100, 2)} m)`}${b.n_cols > 1 ? ` · ${b.n_cols} στήλες (${b.col_gap_cm} cm)` : ""} · ${b.arrangement}</small>`;
    $("b_line1").textContent = cl.N === 0 ? "Συμπληρώστε τις παροχές στην καρτέλα «Επιλογή παροχής»." : `Κανόνας γραφείου: 9 μονοφασικοί ή 3 τριφασικοί ανά πλευρά διανομέα (Νο 4 = 6 θέσεις, το πολύ ένα ανά πλευρά· οι Νο 5/6/7 ΜΟΝΕΣ τους, χωρίς διανομέα, με την κυψέλη και έναν τριφασικό μετρητή, εκτός διάταξης – σε ιδιαίτερη στήλη) · ${b.n_arr} διατάξ${b.n_arr === 1 ? "η" : "εις"}${b.n_arr_sel > 0 ? " (επιλογή χρήστη" + (b.n_arr_sel < b.n_arr_min ? ` – ζητήθηκαν ${b.n_arr_sel}, ελάχιστο ${b.n_arr_min}` : "") + ")" : " (αυτόματα – ελάχιστο)"} με ισόποση κατανομή μετρητών · 1η επάνω, 2η κάτω με τους διανομείς τον έναν κάτω από τον άλλον, 3η/4η σε δεύτερη στήλη (${b.col_gap_cm} cm) · άνω σειρά πάντοτε ${fmt(b.row_upper_bottom_cm / 100, 2)} m, κάτω σειρά ${fmt(b.row_lower_bottom_cm / 100, 2)} m (ΟΔ.45 ΜΔ-7/9) · εσοχή από ${fmt(b.niche_bottom_cm / 100, 2)} m με ${b.margin_bottom_cm} cm κάτω / ${b.margin_top_cm} cm πάνω από τα κιβώτια · πλάτος = στήλες ${b.w_cols_cm} cm + ${ST.board.extra_width_cm} cm.`;
    $("b_line2").textContent = (b.link_box ? `Κιβώτιο ζεύξεως (link box) ${b.link_box_type === "U2B4" ? "4" : "2"} διευθύνσεων – κατασκευή ${b.link_box_type}${b.link_box_need ? " (ΟΔ.45 §6)" : " (επιλογή χρήστη)"}. ` : (b.link_box_need ? "ΠΡΟΣΟΧΗ: κατά ΟΔ.45 §6 απαιτείται κιβώτιο ζεύξεως – επιλέχθηκε «χωρίς». " : "")) + (cl.N ? `Προτεινόμενη ΜΔ (${md.use_label}): ${md.code} – ${md.title}` : "");
    $("b_chips").innerHTML = cl.N ? `<span class="chip info">${md.code}</span>` + (r.ug_cables ? `<span class="chip info">${r.ug_cables.n_cables} υπόγει${r.ug_cables.n_cables === 1 ? "ο καλώδιο" : "α καλώδια"}</span>` : "") + (b.n_cells ? `<span class="chip warn">${b.n_cells} κυψέλ${b.n_cells === 1 ? "η" : "ες"} μόνες τους</span>` : "") + (b.n_arr >= 2 ? '<span class="chip warn">1η επάνω – 2η κάτω</span>' : "") + (b.n_cols > 1 ? `<span class="chip warn">${b.n_cols} στήλες</span>` : "") + (cl.N >= 4 ? '<span class="chip">εσωτερικά – ΟΔ.45 §7.2</span>' : "") + (b.link_box ? `<span class="chip warn">link box ${b.link_box_type}</span>` : "") + (b.link_box_need && !b.link_box ? '<span class="chip no">χωρίς link box!</span>' : "") : "";
    $("b_calc").innerHTML =
      fc("Μονοφασικοί (1Φ κιβώτια)", b.N1, "Νο 03 + Νο 05") + fc("Τριφασικοί (3Φ κιβώτια)", b.N3, "Νο 1 … Νο 7") + fc("Θέσεις διανομέων", b.slots, "1Φ = 1 · Νο1–3 = 3 · Νο4+ = 6") +
      fc("Απαιτείται διανομέας;", b.distributor ? "ΝΑΙ" : "ΟΧΙ", `> ${ST.board.meters_no_branch_box} μονοφασικά, ή 3Φ μαζί με άλλον μετρητή`, b.distributor ? "ok" : "") +
      fc("ΠΛΗΘΟΣ ΔΙΑΤΑΞΕΩΝ", b.n_arr, `${ST.board.slots_per_side}+${ST.board.slots_per_side} θέσεις ανά διανομέα`, "res") + fc("Διανομείς", b.n_distr, "ένας ανά διάταξη") + fc("Κυψέλες Νο 5–7 μόνες τους", b.n_cells || 0, "χωρίς διανομέα, εκτός διάταξης – ιδιαίτερη στήλη", b.n_cells ? "warn" : "") +
      fc("ΠΛΑΤΟΣ ΕΣΟΧΗΣ (cm)", b.width_cm, `στήλες ${b.w_cols_cm} cm (${b.n_cols} × μέγ. πλάτος${b.n_cols > 1 ? ` + ${b.col_gap_cm} cm διάκενο` : ""}) + ${ST.board.extra_width_cm} cm`, "res") +
      fc("ΥΨΟΣ ΕΣΟΧΗΣ (cm)", b.height_cm, b.ug_open ? `από 0,00 m (δάπεδο – υπόγεια παροχή: εσοχή ανοιχτή μέχρι κάτω) έως ${fmt(b.niche.y1 / 100, 2)} m – κιβώτια + ${b.margin_top_cm} cm πάνω` : `από ${fmt(b.niche.y0 / 100, 2)} m (κάτω άκρο) έως ${fmt(b.niche.y1 / 100, 2)} m – κιβώτια + ${b.margin_bottom_cm} cm κάτω + ${b.margin_top_cm} cm πάνω`, "res") +
      (b.pit ? fc(b.pit.n > 1 ? `Φρεάτια πελάτη στη βάση (${b.pit.n})` : "Φρεάτιο πελάτη στη βάση", `${b.pit.type}`, `${fmt(b.pit.w_cm, 0)} × ${fmt(b.pit.d_cm, 0)} cm, βάθος ${fmt(b.pit.h_cm, 0)} cm – ${b.pit.n > 1 ? "ένα ανά στήλη, " : ""}σε ευθεία κάτω από τον διανομέα / την κυψέλη – κατασκευή από τον πελάτη (Οδηγίες κατασκευής παροχής ΔΕΔΔΗΕ)`, "warn") : "") +
      fc("Κάτω άκρο κιβωτίων", `${fmt(b.mount_lower_cm / 100, 2)} m` + (b.rows > 1 ? ` / ${fmt(b.mount_upper_cm / 100, 2)} m` : ""), b.rows > 1 ? "κάτω σειρά (2η διάταξη) / άνω σειρά (1η διάταξη) – ΟΔ.45 ΜΔ-9: πάντοτε 0,80 / 1,50 m" : "μία σειρά – πάντοτε 1,50 m (ΟΔ.45 ΜΔ-7)") +
      fc("Διάταξη ΟΔ.45", b.md_code, b.arrangement) +
      fc("Κιβώτιο ζεύξεως (link box)", b.link_box_type || "—", b.link_box ? (b.link_box_need ? "ΟΔ.45 §6 – υπόγεια παροχή > 9 1Φ / > 5 3Φ" : "επιλογή χρήστη") : (b.link_box_need ? "ΠΡΟΣΟΧΗ: απαιτείται κατά ΟΔ.45 §6" : "δεν απαιτείται / εναέριο δίκτυο"), b.link_box ? "warn" : (b.link_box_need ? "no" : "")) + fc("Θέση εγκατάστασης", cl.N >= 4 ? "Εσωτερικά – πρόσβαση 24ωρο" : (cl.N === 0 ? "—" : "Εσωτερικά ή εξωτερικά"), "ΟΔ.45 §7.2");
    let h = "<tr><th>Διάταξη</th><th>Σειρά (ύψος)</th><th>Αριστερά του διανομέα</th><th>Δεξιά του διανομέα</th><th>Μετρητές</th><th>Θέσεις</th><th>Πλάτος (cm)</th><th>Γείωση πελάτη</th></tr>";
    const earthBy = {}; (r.bom.earthing || []).forEach(e => earthBy[e.idx] = e);
    b.arrangements.forEach(a => {
      const lab = lst => lst.map(no => `[${no.replace("Νο ", "Νο")}]`).join(" ");
      const e = earthBy[a.idx];
      h += `<tr><td><b>${a.idx}</b>${a.cell ? `<br><span class="muted small">κυψέλη ${esc(a.no)} μόνη της</span>` : ""}</td><td>${a.row}${b.n_cols > 1 ? ` / στήλη ${a.col}` : ""} (${fmt((a.y !== undefined ? a.y : (a.row === 1 ? b.mount_upper_cm : b.mount_lower_cm)) / 100, 2)} m)</td><td class="l">${lab(a.left.slice().reverse()) || "—"}</td><td class="l">${a.distributor ? "[Δ] " : (a.cell ? "χωρίς διανομέα: " : "")}${lab(a.right)}${a.cell ? " [3Φ]" : ""}</td><td>${a.n}</td><td>${a.slots}</td><td>${a.width}</td><td>${e ? `${e.mm2} mm² Cu${e.exception ? `<br><span class="muted small">κατ' εξαίρεση ${esc(e.exception)}</span>` : ""}` : "—"}</td></tr>`;
    });
    $("b_arr").innerHTML = cl.N ? h : "";
    renderUgTable("b_ugcard", "b_ugtable", "b_ugnotes", r);
    const SC = D.typ.service_clearances;
    const distRules = { niche_bottom: cl.N ? b.niche_bottom_cm / 100 : (b.row_lower_bottom_cm - b.margin_bottom_cm) / 100, row_upper: b.row_upper_bottom_cm / 100, row_lower: b.row_lower_bottom_cm / 100, rows: cl.N ? b.rows : 2, sidewalk: SC.crossing_options[0][2], road: SC.crossing_options[1][2], guy_sidewalk: SC.guy_sidewalk, guy_road: SC.guy_road };
    $("b_svg").innerHTML = G.board(b, { supply: r.supply_type, title: `Μετρητική διάταξη – ${cl.N} μετρητές · ${md.code}`, rules: distRules, ug: r.ug_cables });
    $("b_dist_svg").innerHTML = G.mdDistances({ rules: distRules });
    $("b_sketch_txt").innerHTML = b.sketch.map(t => esc(t)).join("<br>");
    // ΜΔ proposal card
    const img = md.img ? `<img src="${IMG_MD}${md.img}" alt="${esc(md.code)}" data-zoom="${IMG_MD}${md.img}" decoding="async" onerror="window.APP_IMG_ERR && window.APP_IMG_ERR(this)">` : "";
    const img2 = md.img2 ? `<img src="${IMG_MD}${md.img2}" alt="${esc(md.code)}" data-zoom="${IMG_MD}${md.img2}" style="margin-top:8px" decoding="async" onerror="window.APP_IMG_ERR && window.APP_IMG_ERR(this)">` : "";
    $("b_md").innerHTML = cl.N === 0 ? '<div class="muted">Συμπληρώστε τις παροχές.</div>' : `<div class="mdcard"><div><div class="code">${esc(md.code)}</div><div class="ttl">${esc(md.title)}</div><div class="small">${esc(md.why)}</div><div class="muted small" style="margin-top:6px">${esc(md.dims)}</div><div class="muted small" style="margin-top:4px">Πηγή: ${esc(md.src)}</div>${md.alt.length ? `<ul class="notes small" style="margin-top:6px">${md.alt.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</div><div>${img}${img2}</div></div>`;
    // related pages (materials, wiring, pits / routing, earthing)
    const MDC = {}; D.md.catalog.forEach(m => MDC[m.code] = m);
    const rel = (md.related || []).map(c => MDC[c]).filter(Boolean);
    $("b_related").innerHTML = cl.N && rel.length ? `<div class="small muted" style="margin-top:10px">Σχετικές σελίδες ΟΔ.45 (υλικά · συνδεσμολογία · φρεάτια / διελεύσεις · γείωση · οδηγίες):</div><div class="relgrid">${rel.map(m => `<div class="rel" ${m.img ? `data-zoom="${IMG_MD}${m.img}"` : ""}>${m.img ? `<img src="${IMG_MD}${m.img}" alt="${esc(m.code)}" loading="lazy">` : ""}<b>${esc(m.code)}</b><span class="muted small">${esc(m.title)}</span></div>`).join("")}</div>` : "";
    // gallery with group filter
    const cat = D.md.catalog.filter(m => m.img);
    const groups = ["όλα"].concat([...new Set(cat.map(m => m.group || "ΟΔ.45 διατάξεις"))]);
    const relSet = new Set(md.related || []);
    if (!$("b_gfilter").innerHTML) {
      $("b_gfilter").innerHTML = groups.map((g, i) => `<button data-g="${esc(g)}" class="${i === 0 ? "active" : ""}">${esc(g)}</button>`).join("");
      $("b_gfilter").querySelectorAll("button").forEach(bt => bt.addEventListener("click", () => { $("b_gfilter").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === bt)); $("b_gallery").querySelectorAll(".g").forEach(d => d.classList.toggle("hidden", bt.dataset.g !== "όλα" && d.dataset.g !== bt.dataset.g)); }));
    }
    const curG = ($("b_gfilter").querySelector("button.active") || {}).dataset ? $("b_gfilter").querySelector("button.active").dataset.g : "όλα";
    $("b_gallery").innerHTML = cat.map(m => `<div class="g ${m.code === md.code ? "cur" : (relSet.has(m.code) ? "rel" : "")} ${curG !== "όλα" && (m.group || "ΟΔ.45 διατάξεις") !== curG ? "hidden" : ""}" data-g="${esc(m.group || "ΟΔ.45 διατάξεις")}" data-zoom="${IMG_MD}${m.img}"><img src="${IMG_MD}${m.img}" alt="${esc(m.code)}" decoding="async" onerror="window.APP_IMG_ERR && window.APP_IMG_ERR(this)"><b>${esc(m.code)}</b><span class="muted">${esc(m.title)}</span></div>`).join("");
    document.querySelectorAll("[data-zoom]").forEach(el => { el.onclick = () => { const lb = document.createElement("div"); lb.className = "lightbox"; lb.innerHTML = `<img src="${el.dataset.zoom}">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); }; });
    const R45 = D.od45.rules;
    $("b_reqs").innerHTML = [
      "Πολεοδομικά: οι κατασκευές για την τοποθέτηση μετρητών ηλεκτρικού ρεύματος στα όρια των οικοπέδων / γηπέδων ή εντός ακάλυπτων χώρων τους (τοιχία ΜΔ-71…75, καμπίνες ΜΔ-77/79/81, εσοχές), σύμφωνα με τις ισχύουσες προδιαγραφές, γίνονται ΧΩΡΙΣ οικοδομική άδεια και ΧΩΡΙΣ Έγκριση Εργασιών Μικρής Κλίμακας (Ν.4495/2017 άρθ. 30 §1 ιθ)· η ΕΕΔΜΚ (ΥΑ ΥΠΕΝ/ΔΑΟΚΑ/43266/1174 – ΦΕΚ 1843Β/2020, όπως τροποποιήθηκε με το ΦΕΚ 1028Β/2022) απαιτείται για τις λοιπές μικρής κλίμακας εργασίες (π.χ. περιφράξεις, τοιχία αντιστήριξης) – βλ. Γενικές πληροφορίες.",
      `Διανομέας: 9 μονοφασικοί ή 3 τριφασικοί από κάθε πλευρά (18 θέσεις)· Νο 4 και άνω = 6 θέσεις, το πολύ ένα ανά πλευρά· όταν γεμίσει η πρώτη διάταξη γίνεται δεύτερη: η 1η επάνω (πάντοτε στα ${fmt(ST.board.row_upper_bottom_cm / 100, 2)} m) και η 2η κάτω από αυτήν (πάντοτε στα ${fmt(ST.board.row_lower_bottom_cm / 100, 2)} m – ΟΔ.45 ΜΔ-9)· η 3η/4η σε στήλη δίπλα σε απόσταση ${ST.board.column_gap_cm} cm – κανόνας γραφείου (ΜΔ-7 / ΜΔ-9 / ΜΔ-11 / ΜΔ-13).`,
      `Εσοχή: κιβώτια + ${ST.board.niche_margin_bottom_cm} cm κάτω + ${ST.board.niche_margin_top_cm} cm πάνω (από 0,60 m με δύο σειρές, από 1,30 m με μία)· πλάτος = Σ πλάτη κιβωτίων (+ ${ST.board.column_gap_cm} cm ανά διάκενο στηλών) + ${ST.board.extra_width_cm} cm – προσαρμογή κατά τα έντυπα ΜΔ (ΜΔ-71/72 εσοχή από 1,05 m, ΜΔ-73 από 1,45 m).`,
      "Ελάχιστες αποστάσεις από πεζοδρόμιο και δρόμο: καλώδιο παροχής ≥ 3,00 m πάνω από πεζοδρόμιο (C-3 II, ΜΔ-81) και ≥ 5,50 m πάνω από οδόστρωμα (C-3 I, ΜΔ-79)· επίτονος ≥ 2,50 / 5,50 m· στύλος ≥ 0,15 m από το άκρο του πεζοδρομίου (C-3 VI)· καμπίνες ΜΔ-77/81/83 με βάση 0,30 m· προσωρινές παροχές (ΣΚ-ΠΠ): στυλίσκος 3,00 m (Φ2½\") χωρίς διάβαση δρόμου / 5,50 m (Φ3\") με διάβαση δρόμου.",
      `Βάθος εσοχής ≥ ${ST.board.niche_depth_cm} cm ή μεταλλικό ερμάριο κατάλληλης αντοχής (ΜΔ-1 §2). Σε πυλωτή/προσιτό χώρο: ντουλάπι με περσίδες εξαερισμού.`,
      `Διάδρομος μπροστά από τους μετρητές: πλάτος ≥ ${R45.corridor_w_m.toFixed(2)} m (κατ’ εξαίρεση ${R45.corridor_w_niche_m.toFixed(2)} m σε εσοχή), ύψος ≥ ${R45.corridor_h_m.toFixed(2)} m (ΜΔ-1 §4).`,
      `Τοίχος στήριξης: τούβλα συμπαγή ≥ ${R45.wall_brick_cm} cm ή οπλισμένο σκυρόδεμα ≥ ${R45.wall_concrete_cm} cm· όχι ξυλοκατασκευή, όχι τοίχος φρεατίου ανελκυστήρα (ΜΔ-1 §3).`,
      "Χώρος φωτιζόμενος, αεριζόμενος, προσπελάσιμος 24 ώρες· όχι υγροί/θερμαινόμενοι χώροι· 4+ μετρητές πάντοτε εσωτερικά (ΟΔ.45 §7.2–7.3).",
      "Γείωση διάταξης: ράβδος 2,5 m με μονόκλωνο αγωγό 16 mm² Cu (σχέδιο 36621)· σε νέα κτίρια ακροδέκτης θεμελιακής γείωσης (ΜΔ-1 §5–6).",
      "Γραμμές κιβωτίου διακλάδωσης – μετρητών 10 mm² Cu· σε δύο σειρές οι γραμμές της κάτω σειράς σε βάθος ≥ 6 cm (ΟΔ.45 §10).",
      "Μέγιστοι τριφασικοί ανά διάταξη: ΜΔ-7 έως 6, ΜΔ-11 έως 12, ΜΔ-13 13–24· η ΜΔ-9 δεν εφαρμόζεται για τριφασικούς (ΟΔ.45 §8). Νο 5–7: ιδιαίτερη διάταξη (ΜΔ-75 / ΜΔ-83).",
      "Εξοχικές κατοικίες (ΟΔ.45 §11): ΜΔ-71 (στύλος απέναντι από τον δρόμο) / ΜΔ-72 (ίδια πλευρά) εναέρια, ΜΔ-73 υπόγεια· η γραμμή πίνακα–μετρητή δεν στηρίζεται στον στυλίσκο της παροχής (§11.5).",
      "Μεταλλικές καμπίνες 3Φ Νο1–Νο4: ΜΔ-77 υπόγεια · ΜΔ-79 εναέρια πάνω από οδόστρωμα (στύλος 11 m) · ΜΔ-81 εναέρια πάνω από πεζοδρόμιο (σιδηροσωλήνας 4\" 4,00 m)· ΜΔ-83: καμπίνα Νο5–Νο7 για υποδομές επαναφόρτισης Η/Ο.",
      "Υπόγεια παροχή που τροφοδοτεί > 9 μονοφασικούς ή > 5 τριφασικούς: κιβώτιο ζεύξεως (link box) 2 διευθύνσεων – κατασκευή U2B2· 4 διευθύνσεων (U2B4) για διασύνδεση με γειτονικά καλώδια / ιδιαίτερη αναχώρηση· υποχρεωτικό και σε χώρους συνάθροισης (ΟΔ.45 §6).",
      "Προσωρινές (εργοταξιακές) παροχές: σκαρίφημα μεταλλικής κατασκευής ΔΕΗ (ΣΚ-ΠΠ) – στυλίσκος προμήθειας πελάτη, κιβώτιο πίνακα 70×70 cm στα 1,50 m, πάκτωση σε σκυρόδεμα (150 kg), μόνο το συγκεντρικό καλώδιο ΔΕΔΔΗΕ στον στυλίσκο, ερευνητική τομή σε πεζοδρόμιο.",
      "Διέλευση καλωδίου παροχής σε πολυκατοικίες (ΟΔ.45 §5, Οδηγίες 1984): σωλήνες ≥ Φ12 cm με οδηγό, φρεάτια ΜΔ-51 (τύποι Ι/ΙΙ/ΙΙΙ) και ΜΔ-52/52Α στις αλλαγές κατεύθυνσης (μόνο σε κοινόχρηστους χώρους), προστατευτικά κιβώτια ΜΔ-53/54 και κάλυμμα ΜΔ-55 στις ορατές διαδρομές – παραδείγματα ΜΔ-61…ΜΔ-66· συνδεσμολογίες ΜΔ-35…ΜΔ-38 (ΝΥΑ 10 mm² Cu).",
    ].map(t => `<li>${t}</li>`).join("");
  }

  // ---------------------------------------------------------------- materials tab
  const SUPPORT_ORDER = ["Κιβώτιο ΙΦ μετρητή πλήρες", "Κιβώτιο ΙΙΙΦ μετρητή πλήρες", "Κιβώτιο Ασφαλειών πλήρες", "Στυλίσκος παροχών Χ.Τ. 4,75μ.", "Σύνδεσμος κοχλωτός <U> (4,75μ.)", "Σιδηροδοκός στηρίξ. Στυλίσκου", "Κοχλίας χωρίς περ. 20 Χ 110", "Περικόχλιο με άγκιστρο", "Στυλίσκος παροχών Χ.Τ. 2,5μ.", "Σύνδεσμος κοχλωτός <U> (2,5μ.)", "Έλασμα στερεώσεως στυλίσκου", "Κοχλίας χωρίς περικόχλιο 20Χ80", "Στέλεχος διχαλωτό με περικόχλ.", "Γωνιακό έλασμα στηρ. Παροχής", "Κοχλίας χωρίς περικόχλιο 20Χ35", "Στέλεχος διχαλωτό με άγκιστρο", "Στυλίσκος παροχής – σιδηροσωλήνας γαλβ. 3\" βαρέως τύπου, 6 m", "Στυλίσκος παροχής – σιδηροσωλήνας γαλβ. 4\" βαρέως τύπου, 6 m", "Κοχλίας Μ20 × 210 mm (8.8 – DIN 931) στυλίσκου παροχής", "Γάντζος βαρέως τύπου (άνοιγμα > τυποποιημένου, CS-3)", "Συρματόσχοινο ανάρτησης καλωδίου (m)"];
  const MAIN_ORDER = (() => { const o = D.materials.main.map(m => m.item); const i = o.indexOf("Καλώδιο μονοπολ. 1χ"); o.splice(i < 0 ? 7 : i, 0, "Καλώδιο XLPE 3x50Al+35Cu", "Καλώδιο XLPE 3x95Al+35Cu", "Καλώδιο XLPE 3x150Al+50Cu"); const j = o.indexOf("Μ/Σ έντασης 200/5 (σετ 3)"); o.splice(j < 0 ? o.length : j + 1, 0, "Μ/Σ έντασης 400/5 (σετ 3)"); return o; })();
  const CLS = {}, UNIT = {};
  [D.materials.support, D.materials.main].forEach(l => l.forEach(m => { CLS[m.item] = m.cls; UNIT[m.item] = m.unit; }));
  function renderMaterials(inp, r) {
    const items = {}; r.bom.items.forEach(it => items[it.item] = it);
    const ch = r.chosen;
    const ugx = r.ug_cables;
    $("x_info").textContent = `Έργο: ${$("p_name").value || "—"} · ${ugx && ugx.n_arr > 1 ? `Υπόγεια καλώδια: ${ugx.head} (${ugx.n_cables} – ένα ή περισσότερα ανά διάταξη)` : `Καλώδιο παροχής: ${ch ? ch.name : "—"}`} · μήκος ${ugx ? fmt(r.bom.cable_length_m * ugx.n_cables) : (ch ? fmt(r.bom.cable_length_m * ch.parallel) : "—")} m · ${r.supply_type === "OH" ? "εναέρια" : "υπόγεια"} παροχή · ${r.cluster.N} μετρητές · ${r.board.n_distr} διανομείς${r.board.n_cells ? ` + ${r.board.n_cells} κυψέλ${r.board.n_cells === 1 ? "η" : "ες"} Νο 5–7 μόνες τους` : ""} · προστασία: ${inp.protection === "fuse" ? "ασφάλειες" : "μικροαυτόματοι"}${r.span.applicable ? " · στήριξη: " + r.span.status : ""} · αποξήλωση: ${Object.values(ST.rem.counts).reduce((a, b) => a + (b || 0), 0)} μετρητές${ST.rem.cable_key ? ", καλώδιο " + ST.rem.cable_len_m + " m" : ""}`;
    const build = (order, group, tid) => {
      let h = "<tr><th>Υλικό</th><th>Κλάση</th><th>Μον.</th><th>ΑΠΑΙΤΟΥΝΤΑΙ</th><th>ΤΟΠΟΘΕΤΗΘΗΚΑΝ</th><th>ΓΙΑ ΑΠΟΜΑΚΡΥΝΣΗ</th><th>ΑΠΟΜΑΚΡΥΝΘΗΚΑΝ</th></tr>";
      const seen = new Set();
      const rows = order.slice(); r.bom.items.filter(it => it.group === group && order.indexOf(it.item) < 0).forEach(it => rows.push(it.item));
      let tq = 0, tr = 0;
      rows.forEach(name => {
        if (seen.has(name)) return; seen.add(name);
        const it = items[name] && items[name].group === group ? items[name] : null;
        const q = it ? it.qty : 0, rq = it ? it.qty_remove : 0; tq += q; tr += rq;
        const fk = group + "|" + name;
        const f = ST.field[fk] || {};
        h += `<tr><td class="l">${esc(name)}</td><td class="small muted">${esc(CLS[name] || "")}</td><td class="small">${esc(UNIT[name] || "τεμ.")}</td><td class="${q > 0 ? "hi" : ""}">${q > 0 ? fmt(q, Number.isInteger(q) ? 0 : 1) : "0"}</td><td><input data-fk="${esc(fk)}" data-f="inst" type="number" min="0" step="0.5" value="${f.inst === undefined ? "" : f.inst}" style="width:70px"></td><td class="${rq > 0 ? "remhi" : ""}">${rq > 0 ? fmt(rq, Number.isInteger(rq) ? 0 : 1) : "0"}</td><td><input data-fk="${esc(fk)}" data-f="rem" type="number" min="0" step="0.5" value="${f.rem === undefined ? "" : f.rem}" style="width:70px"></td></tr>`;
      });
      h += `<tr class="sub"><td class="l" colspan="3">ΣΥΝΟΛΟ</td><td>${fmt(tq, 1)}</td><td></td><td>${fmt(tr, 1)}</td><td></td></tr>`;
      $(tid).innerHTML = h;
      $(tid).querySelectorAll("input[data-fk]").forEach(i => i.addEventListener("input", e => { const k = e.target.dataset.fk; ST.field[k] = ST.field[k] || {}; ST.field[k][e.target.dataset.f] = e.target.value; saveState(); }));
    };
    build(SUPPORT_ORDER, "support", "x_sup");
    build(MAIN_ORDER, "main", "x_main");
    // υποχρεώσεις πελάτη (κανόνες γραφείου): σιδηροσωλήνας 4" × 1,50 m ανά υπόγειο καλώδιο · γείωση πελάτη ανά μετρητική διάταξη
    const cust = r.bom.customer || [];
    let hc = "<tr><th>Υλικό / υποχρέωση πελάτη</th><th>Μον.</th><th>ΑΠΑΙΤΟΥΝΤΑΙ</th><th>Παρατήρηση</th></tr>";
    cust.forEach(c => { hc += `<tr><td class="l">${esc(c.item)}</td><td class="small">${esc(c.unit)}</td><td class="${c.qty > 0 ? "hi" : ""}">${c.qty > 0 ? fmt(c.qty, Number.isInteger(c.qty) ? 0 : 1) : "0"}</td><td class="l small muted">${esc(c.note)}</td></tr>`; });
    if ($("x_cust")) $("x_cust").innerHTML = r.cluster.N ? hc : "";
    const CU = D.materials.customer || {};
    if ($("x_cust_notes")) $("x_cust_notes").innerHTML = r.cluster.N ? [CU.ug_pipe ? CU.ug_pipe.note : "", CU.earthing ? CU.earthing.note : ""].filter(Boolean).map(n => `<li>${esc(n)}</li>`).join("") + (r.bom.earthing && r.bom.earthing.length ? `<li>Γείωση πελάτη ανά διάταξη: ${r.bom.earthing.map(e => `${esc(e.label)} → ${e.mm2} mm² Cu${e.exception ? " (κατ' εξαίρεση " + esc(e.exception) + ")" : ""}`).join(" · ")}.</li>` : "") : "";
  }

  // ---------------------------------------------------------------- έντυπο ΔΕΔΔΗΕ «Οδηγίες κατασκευής παροχής – Δήλωση ετοιμότητας» (V3) – προσυμπληρωμένο από τη μελέτη
  function renderForm(inp, r) {
    const el = $("form_v3"); if (!el) return;
    const vv = (v, na) => `<span class="vv${na ? " na" : ""}">${v}</span>`;
    const dash = vv("—", true), fill = vv("……………", true);
    const m2s = cm => fmt(cm / 100, 2) + " m";
    if (!r || r.error || !r.cluster.N) { el.innerHTML = '<div class="muted">Συμπληρώστε τις παροχές στην καρτέλα «Επιλογή παροχής» – το έντυπο συμπληρώνεται αυτόματα.</div>'; return; }
    const b = r.board, cl = r.cluster, sup = r.supply_type, ug = r.ug_cables, sp = r.span, md = r.md, ch = r.chosen;
    const cust = r.bom.customer || [], ear = r.bom.earthing || [];
    const pipe = cust.find(c => /Σιδηροσωλήνας/.test(c.item)), pit = cust.find(c => /Φρεάτιο/.test(c.item));
    const isUG = sup === "UG";
    const nCab = ug ? ug.n_cables : (ch ? ch.parallel : 0);
    const cabD = ch ? (D.supply_cables.find(c => c.key === ch.key) || {}) : {};
    const sel = (id, d) => { const e = $(id); return e ? (e.value || d) : d; };
    const earthSys = { neutral: "i) Ουδετέρωση", direct: "ii) Άμεση γείωση", rcd: "iii) Ρελέ διαφυγής – άμεση γείωση" }[sel("f3_earth", "neutral")];
    const lines = {}; SUPS.forEach(s_ => { const n = ST.counts[s_.no] || 0; if (n > 0) lines[s_.panel_line] = (lines[s_.panel_line] || 0) + n; });
    const panelLines = Object.keys(lines).map(k => `${lines[k]} × ${k} mm² Cu`).join(", ");
    const earTxt = ear.length ? ear.map(e => `${esc(e.label)}: ${e.mm2} mm² Cu${e.exception ? " (κατ' εξαίρεση " + esc(e.exception) + ")" : ""}`).join(" · ") : "≥ 25 mm² Cu";
    const md52 = isUG && (md.code === "ΜΔ-13" || md.code === "ΜΔ-15") ? 1 : 0;
    const poleTxt = sup === "OH" && sp.applicable && sp.is_pole && sp.pole_ok ? `στυλίσκος παροχής ${esc(sp.pole_pipe || '3"')} × 6 m (συνεχής γαλβανισμένος σιδηροσωλήνας βαρέως τύπου, εγκάρσια οπή Φ20 mm στην κορυφή)` : null;
    const hookTxt = sup === "OH" && sp.applicable && (!sp.is_pole || !sp.pole_ok) ? `ΝΑΙ – ${sp.heavy_hook ? "γάντζος βαρέως τύπου (CS-3)" : "γάντζος / κοχλίας ανάρτησης"}${sp.messenger ? " με συρματόσχοινο" : ""}` : null;
    const boardSvg = $("b_svg") ? $("b_svg").innerHTML : "";
    const spanSvg = sup === "OH" && $("m_span_svg") ? $("m_span_svg").innerHTML : "";
    const notes = [];
    if (isUG) notes.push(`Υπόγεια παροχή: ${nCab} υπόγει${nCab === 1 ? "ο καλώδιο" : "α καλώδια"} (${esc(ug ? ug.head : (ch ? ch.short : ""))})${ug && ug.n_arr > 1 ? " – ένα ανά μετρητική διάταξη: " + esc(ug.list) : ""}· η εσοχή ανοιχτή μέχρι το δάπεδο με φρεάτιο ΜΔ-51 τύπου Ι στη βάση του ερμαρίου (κατασκευή πελάτη)· σιδηροσωλήνας γαλβανιζέ 4" × 1,50 m ανά υπόγειο καλώδιο (πελάτης).`);
    else notes.push(`Εναέρια παροχή: καλώδιο ${ch ? esc(ch.name) : "—"}${sp.applicable ? " · " + esc(sp.status) : ""}· ελάχιστο ύψος καλωδίου ${r.clearances && r.clearances.height_m ? fmt(r.clearances.height_m, 2) + " m" : "κατά C-2/C-3"}.`);
    if (b.n_cells) notes.push(`${b.n_cells} παροχ${b.n_cells === 1 ? "ή" : "ές"} Νο 5–7: κυψέλη ΧΤ + κιβώτιο 3Φ μετρητή μόνη της, εκτός της διάταξης (ΜΔ-75 / ΜΔ-83).`);
    if (b.link_box) notes.push(`Κιβώτιο ζεύξεως (link box) ${esc(b.link_box_type)} (ΟΔ.45 §6).`);
    notes.push(`Γείωση πελάτη ανά μετρητική διάταξη: ${earTxt}.`);
    notes.push("Οι κατασκευές για την τοποθέτηση μετρητών στα όρια του οικοπέδου / γηπέδου ή εντός ακάλυπτων χώρων του (κατά τις προδιαγραφές ΔΕΔΔΗΕ) δεν απαιτούν οικοδομική άδεια ούτε ΕΕΔΜΚ (Ν.4495/2017 άρθ. 30 §1 ιθ).");
    if (r.sizing && r.sizing.fuse_A) notes.push(`Αναχώρηση ΔΕΔΔΗΕ: ασφάλεια ${r.sizing.fuse_A} A, Μ/Σ ≥ ${r.sizing.ms_kva || "> 1000"} kVA (ΟΔ.22).`);
    const extra = sel("f3_notes", ""); if (extra) notes.push(esc(extra));
    const H3 = t => `<h3>${t}</h3>`;
    let h = `<div class="v3meta"><div><b>Αρ. Παροχής/Διάταξης:</b>${esc(sel("f3_no", "")) || fill}</div><div><b>Δ/νση:</b>${esc($("p_addr").value) || fill}</div><div><b>Ονομ/νυμο:</b>${esc($("p_name").value) || fill}</div></div>`;
    h += H3("Ι. ΚΟΙΝΟΧΡΗΣΤΟΣ ΧΩΡΟΣ ΜΕΤΡΗΤΩΝ ΔΕΔΔΗΕ") + "<ol>";
    h += `<li>Να γίνει ο τοίχος μπατικός (20 cm) ή οπλισμένο σκυρόδεμα (10 cm). Όχι σε τοίχο φρεατίου ανελκυστήρα. ${vv("ΝΑΙ")}</li>`;
    h += `<li>Να διευρυνθεί και να διαμορφωθεί ο τοίχος προς τα ${fill} ώστε να γίνει επίπεδος (όχι σαγρέ). Ελάχιστες διαστάσεις: ύψος ${vv(m2s(b.height_cm))}, πλάτος ${vv(m2s(b.width_cm))}, βάθος ${vv(m2s(b.depth_cm || 30))}.</li>`;
    h += `<li>Να διευρυνθεί η εσοχή προς τα ${fill} και να διαμορφωθεί ώστε να γίνει επίπεδη (όχι σαγρέ). Ελάχιστες εσωτερικές διαστάσεις: ύψος ${vv(m2s(b.height_cm))}, πλάτος ${vv(m2s(b.width_cm))}, βάθος ${vv(m2s(b.depth_cm || 30))}${b.ug_open ? " – <b>εσοχή ανοιχτή μέχρι το δάπεδο</b> (υπόγεια παροχή)" : ""}.</li>`;
    h += `<li>Να κατασκευαστεί ερμάριο (συνημμένο σχέδιο) με ελάχιστες εσωτερικές διαστάσεις ερμαρίου: πλάτος ${vv(m2s(b.width_cm))}, ύψος ${vv(m2s(b.height_cm))}, βάθος εσοχής 0,30 m και σε απόσταση από το έδαφος ${vv(m2s(b.niche.y0))}${b.pit ? ` – ${b.pit.n > 1 ? b.pit.n + " φρεάτια" : "φρεάτιο"} ${esc(b.pit.type)} ${fmt(b.pit.w_cm, 0)}×${fmt(b.pit.d_cm, 0)} cm, βάθους ${fmt(b.pit.h_cm, 0)} cm στη βάση του ερμαρίου, σε ευθεία κάτω από τον διανομέα / την κυψέλη (κατασκευή πελάτη)` : ""}.</li>`;
    h += `<li>Ο διάδρομος μπροστά από την μετρητική διάταξη να έχει καθαρό πλάτος 1,20 m και ελάχιστο 1,00 m όταν οι μετρητές τοποθετούνται σε εσοχή. Επιθυμητό ύψος διαδρόμου 2,40 m με ελάχιστο τα 2,20 m. ${vv("ΝΑΙ")}</li>`;
    h += `<li>Να μην υφίστανται ξένες εγκαταστάσεις στον χώρο των μετρητών (Ο.Τ.Ε., πίνακες, πρίζες, ξύλινες ή πέτρινες επενδύσεις, υπάρχον ερμάριο, δοχεία με εύφλεκτα υγρά ή ατμούς καυσίμων, χαρτιά, ξύλα, εμφανείς σωλήνες νερού υπό πίεση, σωλήνες αποχέτευσης κ.τ.λ.). ${vv("ΝΑΙ")}</li>`;
    h += `<li>Να τοποθετηθεί διαπέρασμα ή επιτοίχιος σιδηροσωλήνας Φ ${isUG ? vv('4" (γαλβανισμένος)') : (sup === "OH" && !poleTxt ? vv(cabD.pipe_dia_mm ? `${cabD.pipe_dia_mm} mm (κάθοδος καλωδίου ${esc(ch.short)})` : "κατά C-12") : dash)}, μήκους ${isUG ? vv(`1,50 m – ${fmt0(pipe ? pipe.qty : nCab)} τεμ. (ένας ανά υπόγειο καλώδιο)`) : dash} σύμφωνα με το σκαρίφημα, αν απαιτηθεί από την μελέτη.</li>`;
    h += `<li>Θα τοποθετηθεί κατάλληλος γάντζος ή κοχλίας για την ανάρτηση του παροχικού καλωδίου, αν απαιτείται από την μελέτη. ${hookTxt ? vv(hookTxt) : dash}</li>`;
    h += `<li>Να προβλεφθεί επαρκής κοινόχρηστος ή φυσικός φωτισμός στον χώρο της μετρητικής διάταξης. ${vv("ΝΑΙ")}</li></ol>`;
    h += H3("ΙΙ. ΟΔΕΥΣΗ ΚΑΛΩΔΙΟΥ ΠΑΡΟΧΗΣ ΔΕΔΔΗΕ ΑΠΟ ΚΟΙΝΟΧΡΗΣΤΟΥΣ ΚΑΤ’ ΕΞΟΧΗΝ ΧΩΡΟΥΣ") + "<ol>";
    h += `<li>Άνοιγμα στον τοίχο, στο μπαλκόνι ή στο ερμάριο οπής, Φ ${isUG ? vv("12 cm (σωλήνας διέλευσης με οδηγό – ΟΔ.45 §5.2)") : vv(cabD.pipe_dia_mm ? `${cabD.pipe_dia_mm} mm (καλώδιο ${esc(ch ? ch.short : "")})` : "κατά τη μελέτη")} για την διέλευση του καλωδίου παροχής.</li>`;
    h += `<li>Τοποθέτηση στυλίσκου παροχής σύμφωνα με τις προδιαγραφές ΔΕΔΔΗΕ διαμέτρου 3″ / ύψους 6 m (συνεχής γαλβανισμένος σιδηροσωλήνας βαρέως τύπου) με εγκάρσια οπή στην κορυφή Φ20 mm. ${poleTxt ? vv(poleTxt) : dash}</li>`;
    h += `<li>Κατασκευή ΜΔ τύπου ${vv(esc(md.code) + (md.title ? " – " + esc(md.title) : ""))} τυποποιημένων διαστάσεων σκυροδέματος, οπλισμού και θεμελίωσης.</li>`;
    h += `<li>Τοποθέτηση γαλβανισμένου σιδηροσωλήνα 4″ με οδηγό σε βάθος 0,60–0,70 m μέχρι τη ρυμοτομική γραμμή. ${isUG ? vv(`ΝΑΙ – ${nCab} υπόγει${nCab === 1 ? "ο καλώδιο" : "α καλώδια"}`) : dash}</li>`;
    h += `<li>Φρεάτια κατά τις εξής Προδιαγραφές:<div class="v3sub">α) ΜΔ-51 Φρεάτιο διελεύσεως υπογείων καλωδίων (κτιστά): i) Τύπος Ι: ${isUG ? vv(`${fmt0(pit ? pit.qty : 1)} τεμ. (βάση ερμαρίου – κάτω από τον διανομέα / την κυψέλη)` + " + στις αλλαγές κατεύθυνσης κατά τη μελέτη") : dash} · ii) Τύπος ΙΙ: ${isUG ? vv("κατά τη μελέτη", true) : dash} · iii) Τύπος ΙΙΙ: ${isUG ? vv("κατά τη μελέτη", true) : dash}</div><div class="v3sub">β) ΜΔ-52 Φρεάτιο διελεύσεως υπογείων καλωδίων (κτιστά): i) ΜΔ-52 (Διακλάδωση): ${md52 ? vv(md52 + " τεμ. (" + esc(md.code) + ")") : dash} · ii) ΜΔ-52Α (Ευθεία/Διακλάδωση): ${dash}</div><div class="v3sub">γ) ΜΔ-53 Προστατευτικό Κιβώτιο Αλλαγής Κατεύθυνσης (μεταλλικά): i) Τύπος Ι: ${dash} · ii) Τύπος ΙΙ: ${dash}</div><div class="v3sub">δ) ΜΔ-54 Προστατευτικό Κιβώτιο Διπλής Αλλαγής (μεταλλικά): τεμάχια ${dash}</div><div class="v3sub">ε) ΜΔ-55 Προστατευτικό Κάλυμμα Καλωδίου: μήκος ${dash}</div></li>`;
    h += `<li>Να προβλεφθεί ή να γίνει με άδεια του Μηχανικού του έργου, ξετρύπημα Φ ${dash} στην πλάκα του ισογείου ή του μπαλκονιού.</li></ol>`;
    h += H3("ΙΙΙ. ΕΣΩΤΕΡΙΚΗ ΗΛΕΚΤΡΙΚΗ ΕΓΚΑΤΑΣΤΑΣΗ ΠΕΛΑΤΗ") + "<ol>";
    h += `<li>Τοποθέτηση γραμμής πίνακα-μετρητή κατάλληλης διατομής σύμφωνα με το έντυπο ηλεκτροδότησης, και κατάλληλου χρωματισμού πόλων σύμφωνα με το πρότυπο HD-308 S2. ${vv(panelLines || "κατά ΟΔ.22")}</li>`;
    h += `<li>Τοποθέτηση γραμμών πίνακα-μετρητή σε περίπτωση διπλής διάταξης, για την κάτω σειρά 1,45 m από το δάπεδο και για την άνω σειρά 2,15 m από το δάπεδο επαρκούς μήκους. Επίτευξη βάθους τοποθέτησης γραμμών πίνακα-μετρητή της κάτω διάταξης ≥ 6 cm ώστε να μη παρεμποδίζεται η στερέωση των κιβωτίων μετρητών της άνω διάταξης. ${b.rows >= 2 ? vv("ΝΑΙ – διπλή διάταξη (2 σειρές)") : vv("— (μία σειρά)", true)}</li>`;
    h += `<li>Τοποθέτηση μηχανικά προστατευμένου αγωγού γείωσης διατομής ≥ 25 mm², ή κατάλληλη απόληξη της θεμελιακής γείωσης στον χώρο της μετρητικής διάταξης. ${vv(earTxt)}</li>`;
    h += `<li>Διακόπτης Διαφυγής Έντασης (επιθεωρήσιμος κατά την ηλεκτροδότηση για εργοταξιακές και προσωρινές παροχές). ${vv(inp.use === "ΠΡΟΣΩΡΙΝΗ" ? "ΝΑΙ – προσωρινή παροχή: επιθεωρήσιμος" : "ΝΑΙ")}</li></ol>`;
    h += H3("IV. ΣΥΣΤΗΜΑ ΓΕΙΩΣΗΣ") + `<div class="v3decl">${vv(earthSys)} <span class="muted small">(i) Ουδετέρωση · ii) Άμεση γείωση · iii) Ρελέ διαφυγής – άμεση γείωση)</span></div>`;
    h += H3("V. ΠΑΡΑΤΗΡΗΣΕΙΣ") + `<ol>${notes.map(n => `<li>${n}</li>`).join("")}</ol>`;
    h += H3("VI. ΣΚΑΡΙΦΗΜΑ ΜΕΤΡΗΤΙΚΗΣ ΔΙΑΤΑΞΗΣ") + (boardSvg ? `<div class="v3sk">${boardSvg}</div>` : `<div class="muted small">(καρτέλα «Μετρητική διάταξη»)</div>`);
    h += H3("VIΙ. ΣΚΑΡΙΦΗΜΑ ΠΑΡΟΧΕΤΕΥΣΗΣ") + (spanSvg ? `<div class="v3sk">${spanSvg}</div>` : `<div class="v3decl">${isUG ? `Υπόγεια παροχή: ${nCab} καλώδι${nCab === 1 ? "ο" : "α"} ${esc(ug ? ug.head : "")} από το δίκτυο ΧΤ μέσω σωλήνα 4″ με οδηγό (βάθος 0,60–0,70 m) έως το φρεάτιο ΜΔ-51/Ι στη βάση του ερμαρίου.` : "—"}</div>`);
    h += H3("VΙII. ΔΗΛΩΣΗ ΕΤΟΙΜΟΤΗΤΑΣ ΠΕΛΑΤΗ") + `<div class="v3decl">Δηλώνω ότι οι ανωτέρω κατασκευές θα εκτελεσθούν και θα πληρούνται οι προϋποθέσεις που τίθενται. Σε περίπτωση που κατά την κατασκευή παροχής υπάρχουν ελλείψεις θα επιβαρυνθώ με τις δαπάνες ελέγχου και η αίτησή μου θα λάβει νέα σειρά προτεραιότητας.</div><div class="v3decl">Η επισκόπηση έγινε παρουσία του ${esc(sel("f3_present", "")) || fill}. Η τελική μελέτη θα σας αποσταλεί συνημμένη με την επιστολή οικονομικών προϋποθέσεων, μετά την έγκρισή της αρμοδίως.</div>`;
    h += `<div class="v3sign"><div>Για την ΔΕΔΔΗΕ Α.Ε. – Εγκρίνεται<br>(Ονοματεπώνυμο, Υπογραφή)</div><div>Μελετήθηκε: ${esc($("p_eng").value) || ""} ${esc($("p_date").value) || ""}<br>(Ονοματεπώνυμο, Υπογραφή)</div></div>`;
    h += `<div class="muted small" style="margin-top:10px">Έντυπο ΔΕΔΔΗΕ «Οδηγίες κατασκευής παροχής – Δήλωση ετοιμότητας» (V3) – συμπληρωμένο από την εφαρμογή Επιλογή Παροχής ΧΤ (Connexion Engineering) με τα στοιχεία της μελέτης· τα συνημμένα σχέδια ΜΔ-51…ΜΔ-55 βρίσκονται στην καρτέλα «Μετρητική διάταξη» (τυποποιήσεις ΜΔ).</div>`;
    el.innerHTML = h;
  }

  // ---------------------------------------------------------------- feeder tab
  function renderFeeder() {
    const kva = +$("f_kva").value, cond = $("f_cond").value, I1 = num("f_i1"), L = num("f_L"), fuse = $("f_fuse").value ? +$("f_fuse").value : null, kd = num("f_kd", 1);
    const itrRaw = $("f_itr").value, itr = itrRaw === "" ? null : parseFloat(itrRaw);
    const I2 = $("f_src").value === "MAIN" ? ((R && !R.error) ? R.cluster.I_B : 0) : num("f_i2");
    $("f_i2").disabled = $("f_src").value === "MAIN";
    const fc = E.feederCheck(kva, cond, I1, I2, L, num("f_cos", 0.9), fuse, itr, kd, null, num("f_du", 4));
    const cap = E.feederCapacity(kva, cond, I1, kd, fuse, ST.loads);
    const res = $("f_result");
    res.className = "result " + (fc.all_ok ? "" : "fail");
    $("f_status").textContent = fc.all_ok ? "Η ΑΝΑΧΩΡΗΣΗ ΕΠΑΡΚΕΙ" : "Η ΑΝΑΧΩΡΗΣΗ ΔΕΝ ΕΠΑΡΚΕΙ";
    $("f_big").innerHTML = `Ασφάλεια ${fc.fuse_sel === null ? "—" : fc.fuse_sel + " A"} · I3 = ${fmt(fc.I3)} A<small>${fc.cond.name} · Μ/Σ ${kva} kVA · I2 = ${fmt(I2)} A ${$("f_src").value === "MAIN" ? "(από την επιλογή παροχής)" : "(χειροκίνητα)"}</small>`;
    const bad = [];
    if (!fc.fuse_ok_load) bad.push("ασφάλεια μικρότερη του 1,3 × φορτίου"); if (!fc.fuse_ok_cond) bad.push("ασφάλεια > Iεπ αγωγού"); if (!fc.fuse_ok_tr) bad.push("ασφάλεια > μέγ. ασφάλεια Μ/Σ");
    if (!fc.sc_ok) bad.push("συνθήκη βραχυκύκλωσης"); if (!fc.du_ok) bad.push("πτώση τάσης"); if (!fc.tr_ok) bad.push(`ανεπαρκής Μ/Σ (απαιτ. ${fmt0(fc.S_req)} kVA → ${fc.next_tr || "> 1000"} kVA)`);
    $("f_line1").textContent = fc.all_ok ? `Ιβρ = ${fc.Isc === null ? "—" : fmt0(fc.Isc)} A · ΔU = ${fmt(fc.dU_pct, 2)} % · S μετά = ${fmt0(fc.S_after)} kVA (απαιτ. ${fmt0(fc.S_req)} kVA ≤ ${kva} kVA)` : "Δεν ικανοποιούνται: " + bad.join("· ") + " – εξετάστε ενίσχυση αγωγού, νέα αναχώρηση ή μεγαλύτερο Μ/Σ.";
    const chip = (l, ok) => `<span class="chip ${ok ? "ok" : "no"}">${l}</span>`;
    $("f_chips").innerHTML = chip("Ασφάλεια ≥ 1,3·I", fc.fuse_ok_load) + chip("Ασφάλεια ≤ Iεπ", fc.fuse_ok_cond) + chip("≤ μέγ. ασφ. Μ/Σ", fc.fuse_ok_tr) + (fc.sc_applicable ? chip("3·Ιασφ ≤ Ιβρ", fc.sc_ok) : '<span class="chip na">βραχυκύκλωμα: —</span>') + chip("ΔU", fc.du_ok) + chip("Μ/Σ", fc.tr_ok);
    const fr = D.feeder_rules;
    let h = "<tr><th>Έλεγχος</th><th>Τιμή</th><th>ΟΚ;</th><th>Κριτήριο</th></tr>";
    const row = (l, v, ok, c) => { h += `<tr><td class="l">${l}</td><td><b>${v}</b></td><td>${ok === null ? '<span class="na">—</span>' : YN(ok)}</td><td class="l small muted">${c}</td></tr>`; };
    row("Συνολικό φορτίο I3 = I1 + I2 (A/φάση)", fmt(fc.I3), null, `I1 = ${I1} + I2 = ${fmt(I2)}`);
    row(`Απαιτούμενη ασφάλεια ≥ ${fr.fuse_margin} × I3 → τυποποιημένη (A)`, fc.fuse_req === null ? "— (> 400 A: δεν υπάρχει τυποποιημένο φυσίγγιο)" : fc.fuse_req, null, `${fr.fuse_margin} × ${fmt(fc.I3)} = ${fmt(fr.fuse_margin * fc.I3)} A → φυσίγγιο GR-207`);
    row("Ασφάλεια αναχώρησης που εξετάζεται (A)", fc.fuse_sel === null ? "—" : fc.fuse_sel, fc.fuse_ok_load, fuse ? `υφιστάμενη ${fuse} A` : "νέα ασφάλεια από το εργαλείο");
    row("Επιτρεπόμενη ένταση αγωγού Iεπ × k (A)", fmt(fc.I_max), fc.fuse_ok_cond, `ασφάλεια ≤ Iεπ${fc.fuse_ok_cond ? "" : " – μέγ. ασφάλεια " + fc.fuse_max_ok + " A"}`);
    row("Μέγιστη ασφάλεια αναχώρησης Μ/Σ (Πίν. Β2-8) (A)", fc.max_lv_fuse, fc.fuse_ok_tr, `Μ/Σ ${kva} kVA`);
    row("Ρεύμα βραχυκύκλωσης 1Φ στο άκρο Ιβρ (A)", fc.Isc === null ? "—" : fmt0(fc.Isc), fc.sc_applicable ? fc.sc_ok : null, fc.sc_applicable ? `Z = ${fmt(fc.Z, 3)} Ω (RM/XM Μ/Σ + 2·L·αγωγός + 2·${fr.supply_Lp_m} m παροχή 2x6) · ${fr.sc_factor} × Ιασφ ≤ Ιβρ${fc.sc_ok ? "" : " – μέγ. ασφάλεια " + fc.fuse_sc_max + " A"}` : "Μ/Σ 25 kVA: δεν δίνονται RM/XM");
    row("Πτώση τάσης νέων φορτίων ΔU (%)", fmt(fc.dU_pct, 2), fc.du_ok, `√3·I2·L·(R·συνφ + X·ημφ)/400 ≤ ${fc.du_limit} %`);
    row("Φαινόμενη ισχύς Μ/Σ μετά τη σύνδεση S (kVA)", fmt(fc.S_after), null, "√3 × 400 × I_Μ/Σ");
    row(`Απαιτούμενη ισχύς Μ/Σ S/${fc.load_factor} (kVA)`, fmt(fc.S_req), fc.tr_ok, fc.tr_ok ? `Μ/Σ ${kva} kVA επαρκεί` : `επόμενος τυποποιημένος: ${fc.next_tr || "> 1000"} kVA`);
    $("f_table").innerHTML = h;
    const fcx = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    $("f_capinfo").innerHTML = fcx("Ικανότητα αναχώρησης (A)", fmt(cap.I_cap), "min(Iεπ·k, μέγ. ασφ. Μ/Σ, υφιστ. ασφάλεια)") + fcx("Διαθέσιμο ρεύμα για νέα φορτία (A/φάση)", fmt(cap.I_avail), `ικανότητα / ${fr.fuse_margin} − I1`, "res");
    h = "<tr><th>Παροχή</th><th>Φορτίο (A)</th><th>Ανά φάση (A)</th><th>n_max παροχές</th><th>Ρεύμα στο n_max (A)</th><th>Kn</th></tr>";
    cap.by_type.forEach(t => { h += `<tr><td class="l"><b>${t.no}</b></td><td>${fmt0(t.A)}</td><td>${fmt(t.per_phase)}</td><td class="${t.n_max ? "hi" : ""}">${t.n_max}${t.n_max >= 72 ? " (όριο)" : ""}</td><td>${fmt(t.I_at_max)}</td><td>${t.n_max ? fmt(E.kn(t.n_max), 2) : "—"}</td></tr>`; });
    $("f_cap").innerHTML = h;
  }

  // ---------------------------------------------------------------- overhead substations / transformers tab
  let ysCat = "όλα";
  function renderYS() {
    const bl = $("y_bl").value === "" ? null : num("y_bl");
    const y = E.ysFuses(+$("y_kva").value, $("y_kv").value, $("y_fk").value, $("y_up").value, $("y_single").value === "1", $("y_sup").value, $("y_lvnet").value === "1", $("y_indoor").value === "1", bl);
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const kvt = String(y.kv).replace(".", ",");
    $("y_result").className = "result" + (y.warnings.length ? " warn" : "");
    if (!y.row) {
      $("y_big").innerHTML = "—"; $("y_line1").textContent = y.warnings[0] || ""; $("y_line2").textContent = ""; $("y_chips").innerHTML = ""; $("y_facts").innerHTML = ""; $("y_notes").innerHTML = "";
    } else {
      $("y_big").innerHTML = `${esc(y.fuse_label)}<small>Μ/Σ ${esc(y.row.kva)} kVA · ${kvt} kV · In = ${fmt(y.I_mv_A, 2)} A (ΜΤ) / ${fmt(y.I_lv_A, 0)} A (ΧΤ) · ${esc(y.fuse_text)}</small>`;
      $("y_line1").textContent = `${y.branch_text}. ${y.coord_text}.`;
      $("y_line2").textContent = `Μέγιστη ασφάλεια ΧΤ αναχώρησης ${y.max_lv_fuse_A || "—"} A (Πίν. Β2-8) · ${y.lv_omit_text}.`;
      const chips = [];
      chips.push(`<span class="chip info">${esc(y.fuse_label)}</span>`);
      chips.push(`<span class="chip">${esc(y.branch_label)} διακλάδωση</span>`);
      chips.push(y.coord_max_A ? `<span class="chip ok">συνεργασία έως ${fmt0(y.coord_max_A)} A</span>` : (y.fuse_kind === "EXP" && y.fuse_A ? '<span class="chip no">χωρίς συνεργασία Τ→Κ</span>' : '<span class="chip na">συνεργασία: —</span>'));
      chips.push(y.lv_omit_ok ? '<span class="chip warn">χωρίς ασφάλειες ΧΤ (ΟΔ.22 §7)</span>' : `<span class="chip">ασφ. ΧΤ ≤ ${y.max_lv_fuse_A || "—"} A</span>`);
      if (y.warnings.length) chips.push(`<span class="chip warn">${y.warnings.length} προειδοπ.</span>`);
      $("y_chips").innerHTML = chips.join("");
      const b214 = y.b2_14;
      $("y_facts").innerHTML =
        fc("Ονομαστική ένταση πρωτεύοντος In (A)", fmt(y.I_mv_A, 2), `${y.row.kva} kVA / (√3 · ${kvt} kV)`) +
        fc("Ονομαστική ένταση δευτερεύοντος (A)", fmt(y.I_lv_A, 0), "400 V") +
        fc("12 × In – ρεύμα ζεύξης Μ/Σ (A)", fmt(y.I_12In_A, 1), "η ασφάλεια δεν τήκεται για 0,1 s (ΟΔ.22 §2 κριτ. 3)") +
        fc("ΑΣΦΑΛΕΙΑ ΜΤ ΠΡΟΣΤΑΣΙΑΣ Μ/Σ", esc(y.fuse_label), y.fuse_ratio ? `λόγος ασφάλεια / In = ${fmt(y.fuse_ratio, 2)}` : "—", y.fuse_A ? "res" : "no") +
        fc("Ασφάλεια εκτόνωσης Πίν. Β2-8 (Κ)", y.exp_fuse_A ? `${y.exp_fuse_A} K` : "—", y.exp_alt ? y.exp_alt.note : `${kvt} kV`) +
        fc("Ασφάλεια κόνεως Πίν. Β2-8 (A)", y.powder_fuses_A.length ? y.powder_fuses_A.join(" ή ") : "—", y.kv === "6.6" ? "6,6 kV" : "15 ή 20 kV") +
        fc("ΜΕΓΙΣΤΗ ΑΣΦΑΛΕΙΑ ΧΤ ΑΝΑΧΩΡΗΣΗΣ (A)", y.max_lv_fuse_A || "—", y.max_lv_fuse_capped ? `Πίν. Β2-8: ${y.max_lv_fuse_b28_A} A – χωρίς φυσίγγια 500 A → 400 A` : "ΟΔ.22 §4/§6 – καίγεται πρώτη σε κάθε βραχυκύκλωμα ΧΤ", "res") +
        fc("Ασφαλειοκιβώτιο ΧΤ", y.row.kva_num <= 25 ? "κεντρικές" : "ανά αναχώρηση", y.lv_box_text) +
        fc("ΑΣΦΑΛΕΙΑ ΔΙΑΚΛΑΔΩΣΗΣ ΜΤ", esc(y.branch_label), "ΟΔ.21 §11α – τηκτό βραδείας τήξης Τ", "res") +
        fc("Συνεργασία Τ → Κ (ΟΔ.21 Πίν. V(Α))", y.coord_max_A ? `έως ${fmt0(y.coord_max_A)} A` : (y.fuse_kind === "EXP" && y.fuse_A ? "ΟΧΙ" : "—"), y.coord_text, y.coord_max_A ? "ok" : (y.fuse_kind === "EXP" && y.fuse_A ? "no" : "")) +
        fc("Παροδικά σφάλματα (Πίν. V(Β))", y.transient_text ? y.transient_text.replace(/^.*έως /, "έως ") : "—", "προστασία της Τ από τα Σ.Λ. των Ε/Δ / Δ/ΑΕ") +
        fc("Παράλειψη ασφαλειών ΧΤ (ΟΔ.22 §7)", y.lv_omit_ok ? "ΝΑΙ" : "ΟΧΙ", D.ys.lv_omit_conditions.map((c, i) => `${y.lv_omit_conditions[i] ? "✓" : "✗"} ${c}`).join(" · "), y.lv_omit_ok ? "warn" : "") +
        fc("Προστατευόμενη διατομή Β2-14 (mm²)", b214 ? b214.protected_section_mm2 : "—", b214 ? `ασφάλειες ΜΤ ${b214.mv_fuse_15kV_A} A (15 kV) / ${b214.mv_fuse_20kV_A} A (20 kV)` : "μόνο 75–250 kVA, 15/20 kV") +
        fc("Ενδεικτικό Ιβρ 1Φ στους ακροδέκτες ΧΤ (A)", y.Ik_lv_1f_A ? fmt0(y.Ik_lv_1f_A) : "—", y.RM_mohm !== null && y.RM_mohm !== undefined ? `RM = ${y.RM_mohm} mΩ · XM = ${y.XM_mohm} mΩ (Β2-9Α)` : "—") +
        fc("Μέγ. ρεύμα ζεύξης καταναλωτή (A)", y.customer_switching_limit_A || "—", "Εγχ. §10.5 σημ. 5 – ιδιαίτερος Μ/Σ") +
        fc("Στήριξη Μ/Σ", y.row.kva_num <= 50 ? "Μονόστυλο" : (y.row.kva_num <= 250 ? "Δίστυλο" : (y.row.kva_num <= 630 ? "Δίστυλο Ω.Σ." : "Όχι εναέριος")), y.pole_text);
      const nl = [];
      y.warnings.forEach(w => nl.push(["warn", w]));
      y.notes.forEach(n => nl.push(["", n]));
      nl.push(["", y.placement_text]);
      if (y.sc_text) nl.push(["", y.sc_text]);
      $("y_notes").innerHTML = nl.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join("");
    }
    // Β2-8 table
    let h = "<tr><th>Μ/Σ (kVA)</th><th>Εκτόνωσης 6,6 kV (Κ)</th><th>Εκτόνωσης 15 kV (Κ)</th><th>Εκτόνωσης 20 kV (Κ)</th><th>Κόνεως 6,6 kV (A)</th><th>Κόνεως 15 ή 20 kV (A)</th><th>Μέγ. ασφάλεια ΧΤ (A)</th><th>RM (mΩ)</th><th>XM (mΩ)</th><th>In 20 kV (A)</th></tr>";
    const vv = x => x === null || x === undefined ? "—" : x;
    D.ys.fuse_table.forEach(r => {
      const cur = y.row && r.kva === y.row.kva;
      const alt = D.ys.fuse_alt[`${r.kva_num}|15`];
      h += `<tr class="${cur ? "rec" : ""}"><td class="l"><b>${esc(r.kva)}</b></td><td>${vv(r.exp_6_6)}</td><td>${vv(r.exp_15)}${alt ? " *" : ""}</td><td>${vv(r.exp_20)}</td><td>${vv(r.powder_6_6)}</td><td>${r.powder_text || (r.powder_15_20 ? r.powder_15_20.join(" ή ") : "—")}</td><td><b>${vv(r.max_lv_fuse)}</b></td><td>${vv(r.RM)}</td><td>${vv(r.XM)}</td><td>${fmt(r.kva_num / (Math.sqrt(3) * 20), 2)}</td></tr>`;
    });
    $("y_b28").innerHTML = h;
    $("y_b28_note").innerHTML = "«—» = δεν προβλέπεται. Πηγή: Εγχειρίδιο Μελετών Πίν. Β2-8 & Β2-9Α · ΟΔ.22 Πίν. Ι (οπτική επαλήθευση). * 400 kVA / 15 kV: ΟΔ.22 = 25 Κ, Εγχειρίδιο = 40 Κ (απαιτεί επιβεβαίωση)· 500 kVA / 15 kV: 40 Κ (ΟΔ.22)· 1000 kVA: χειρόγραφη προσθήκη 63 Α (κόνεως) στο αντίγραφο της ΟΔ.22 – ανεπίσημη. Μ/Σ 500 και 750 kVA δεν υπάρχουν ως Μ/Σ διανομής ΔΕΔΔΗΕ (σειρές μόνο για Μ/Σ πελατών ΜΤ)· μέγιστη ασφάλεια ΧΤ 400 A (δεν χρησιμοποιούνται φυσίγγια 500 A).";
    // ΟΔ.21 block (static – rendered once)
    if (!$("y_od21").innerHTML) {
      const grid = (heads, rows, leftCols = 1) => `<div style="overflow-x:auto"><table class="grid"><tr>${heads.map(x => `<th>${x}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i < leftCols ? "l" : ""}">${c === null || c === undefined ? "—" : c}</td>`).join("")}</tr>`).join("")}</table></div>`;
      const B = D.ys.branch, VA = B.table_V_A, VB = B.table_V_B, V7 = B.table_VII;
      let o = `<h3 class="tt">Επιλογή τηκτού Τ διακλάδωσης κατά το ανάντη μέσο (ΟΔ.21 §11α, §9γ)</h3>` + grid(["Ανάντη μέσο", "Τηκτό Τ (A)", "Μέγ. φορτίο διακλάδωσης για Α/Ζ(Τ) (A)", "Αλλιώς"], B.selection_by_upstream_device.map(u => [u.upstream, u.T_link_A, u.max_branch_load_A_for_fuse, u.else]));
      o += `<h3 class="tt">${esc(VA.title)}</h3>` + grid(["Κατάντη τηκτό"].concat(VA.upstream_T_A.map(t => `ανάντη ${t} T`)), Object.keys(VA.downstream).map(k => [k.replace("_", " ").replace(/^T /, "").replace(/^K /, "") + (k.startsWith("T_") ? " T" : " K")].concat(VA.upstream_T_A.map(t => VA.downstream[k][t])))) + `<div class="muted small">${esc(VA.note)} ${esc(VA.ref)}</div>`;
      o += `<h3 class="tt">${esc(VB.title)}</h3>` + grid(["Τηκτό Τ", "Ε/Δ (A)", "Δ/ΑΕ (A)"], VB.rows.map(r => [`${r.T_link} T`, r.E_D, r.D_AE]));
      o += `<h3 class="tt">${esc(V7.title)}</h3>` + grid(["Κατ.", "Α.Ε.", "Ε/Δ φάσεις Σ.Λ.", "Ε/Δ φάσεις Χ.Κ.", "Η/Ν γης CGE", "γη Σ.Λ.", "γη Χ.Κ.", "t", "FIR Σ.Λ.", "FIR Χ.Κ.", "FIR t", "Δ/ΑΕ Σ.Λ.", "Δ/ΑΕ φάσεις", "Δ/ΑΕ γη", "Διακλ. πριν Δ/ΑΕ 1η", "2η", "3η", "Διακλ. μετά Δ/ΑΕ 1η", "2η", "3η"], V7.rows) + `<div class="muted small">${esc(V7.row_note || "")} ${Object.keys(V7.legend).map(k => `<b>${esc(k)}</b>: ${esc(V7.legend[k])}`).join(" · ")}</div>`;
      o += `<h3 class="tt">Κατηγορίες γραμμών ΜΤ (ΟΔ.21)</h3>` + grid(["Κατ.", "Περιγραφή"], Object.keys(B.line_categories).map(k => [k, B.line_categories[k]]), 2);
      const flat = x => typeof x === "object" && x !== null ? (Array.isArray(x) ? x.map(flat).join(", ") : Object.keys(x).map(k => `${k}: ${flat(x[k])}`).join(" · ")) : String(x);
      o += `<h3 class="tt">Δ/ΑΕ & Δ/Α – ΟΔ.21</h3>` + grid(["Στοιχείο", "Τιμές"], Object.keys(B.recloser_data).map(k => [k, esc(flat(B.recloser_data[k]))]), 1);
      o += `<h3 class="tt">${esc(D.ys.b2_14.title)}</h3>` + grid(["Μ/Σ (kVA)", "Ασφ. ΜΤ 15 kV (A)", "Ασφ. ΜΤ 20 kV (A)", "Προστατευόμενη διατομή (mm²)"], D.ys.b2_14.rows.map(r => [r.kva, r.mv_fuse_15kV_A, r.mv_fuse_20kV_A, r.protected_section_mm2])) + `<div class="muted small">${esc(D.ys.b2_14.note || "")}</div>`;
      o += `<h3 class="tt">Μέγιστο ρεύμα ζεύξης καταναλωτή από ιδιαίτερο Μ/Σ (Εγχ. §10.5 σημ. 5)</h3><div style="display:flex;flex-wrap:wrap;gap:6px">` + Object.keys(D.ys.inrush_limits.values_A).map(k => `<span class="chip">${k} kVA: <b>${D.ys.inrush_limits.values_A[k]} A</b></span>`).join("") + `</div><div class="muted small">${esc(D.ys.inrush_limits.note)}</div>`;
      const G2 = D.ys.general;
      o += `<h3 class="tt">Μετασχηματιστές διανομής – γενικά (Εγχειρίδιο Κεφ. 1)</h3><ul class="notes small">` + [`Τυποποιημένα μεγέθη: ${G2.standard_sizes_kVA_current.join(", ")} kVA (παλαιά ${G2.legacy_sizes_kVA.join(", ")} kVA)`, `Λόγος μετασχηματισμού: ${G2.ratio}`, `Συνδεσμολογία: ${G2.vector_group}`, `Τάση βραχυκύκλωσης ${G2.impedance_pct} %`].concat(G2.pole_mounting).map(t => `<li>${esc(t)}</li>`).join("") + "</ul>";
      const T66 = D.ys.od22_time_fuses_6_6;
      if (T66) o += `<h3 class="tt">${esc(T66.title)}</h3>` + grid(["Μ/Σ (kVA)"].concat(T66.ct_ratios.map(c => `Μ/Σ έντασης ${c}`)), Object.keys(T66.rows).map(k => [k].concat(T66.rows[k])));
      o += `<h3 class="tt">ΟΔ.41 «Εκλογή στοιχείων δικτύων» – σημεία για εναέριους Υ/Σ</h3><div class="muted small">${esc(D.ys.od41.coverage_note || "")}</div><ul class="notes small">` + ["oh_substation", "transformer_sizes"].flatMap(k => (D.ys.od41[k] || []).map(it => `<li>${esc(it.text)} <span class="muted">(${esc(it.ref)})</span></li>`)).join("") + "</ul>";
      o += `<h3 class="tt">Διαφορές μεταξύ των πηγών</h3>` + grid(["Στοιχείο", "Εγχειρίδιο", "ΟΔ.22", "ΟΔ.21", "Αντιμετώπιση"], D.ys.discrepancies.map(d => [d.item, d.manual, d.od22, d.od21, d.resolution]), 1);
      $("y_od21").innerHTML = o;
      // rules with category filter
      const cats = ["όλα"].concat([...new Set(D.ys.rules.map(r => r.cat))]);
      $("y_rulecats").innerHTML = cats.map(c => `<button data-c="${esc(c)}" class="${c === ysCat ? "active" : ""}">${esc(c)}</button>`).join("");
      $("y_rulecats").querySelectorAll("button").forEach(bt => bt.addEventListener("click", () => { ysCat = bt.dataset.c; $("y_rulecats").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === bt)); renderYSRules(); }));
      renderYSRules();
    }
  }
  function renderYSRules() {
    $("y_rules").innerHTML = D.ys.rules.filter(r => ysCat === "όλα" || r.cat === ysCat).map(r => `<li><b>${esc(r.cat)}:</b> ${esc(r.text)} <span class="muted small">(${esc(r.ref)})</span></li>`).join("");
  }


  // ---------------------------------------------------------------- voltage drop tab (Εγχειρίδιο §10.3)
  const VDD = D.vdrop;
  const vdGroup = () => (E.VD_VOLT[$("vd_volt").value] || E.VD_VOLT.XT).group;
  const vdConds = () => VDD.conductors.filter(c => c.group === vdGroup());
  const VD_DEF = { XT: "XT_SK_120", MT: "MT_2" };
  const VD_EX = {
    XT: [{ cond: "XT_SK_120", L_m: 120, load: 90, phases: 3, dist: true }, { cond: "XT_SK_70", L_m: 100, load: 40, phases: 3, dist: true }, { cond: "XT_A_4x16AL", L_m: 60, load: 4, phases: 1, dist: false }],
    MT: [{ cond: "MT_2", L_m: 12000, load: 2500, phases: 3, dist: false }],
  };
  function vdFixSections() {
    const g = vdGroup();
    ST.vd.sections.forEach(sct => { if (!E.VD_COND[sct.cond] || E.VD_COND[sct.cond].group !== g) sct.cond = VD_DEF[g]; });
  }
  function vdGather() {
    return { voltage: $("vd_volt").value, cosphi: parseFloat($("vd_cos").value), limit_pct: num("vd_lim"), unit: $("vd_unit").value, sections: ST.vd.sections,
      tr_kva: $("vd_tr").value ? +$("vd_tr").value : null, Lp_m: $("vd_lp").value === "" ? null : num("vd_lp") };
  }
  function renderVDSections() {
    vdFixSections();
    const xt = vdGroup() === "XT";
    const tb = $("vd_secs");
    const unit = $("vd_unit").value;
    let h = `<tr><th>#</th><th>Αγωγός / καλώδιο</th><th>Μήκος (m)</th><th>Φορτίο κόμβου (${unit})</th><th>Φάσεις</th><th>Κατανεμ.</th><th>ΔU (%)</th><th>ΔU αθρ. (%)</th></tr>`;
    const opts = vdConds().map(c => [c.key, c.name]);
    ST.vd.sections.forEach((sct, i) => {
      h += `<tr><td><b>${i + 1}</b></td><td class="l"><select data-vs="${i}" data-f="cond">${opts.map(([k, n]) => `<option value="${k}"${k === sct.cond ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></td>
        <td><input data-vs="${i}" data-f="L_m" type="number" min="0" step="1" value="${sct.L_m}"></td>
        <td><input data-vs="${i}" data-f="load" type="number" min="0" step="1" value="${sct.load}"></td>
        <td>${xt ? `<select data-vs="${i}" data-f="phases"><option value="3"${+sct.phases === 3 || !sct.phases ? " selected" : ""}>3Φ</option><option value="2"${+sct.phases === 2 ? " selected" : ""}>2Φ</option><option value="1"${+sct.phases === 1 ? " selected" : ""}>1Φ</option></select>` : "3Φ"}</td>
        <td><input data-vs="${i}" data-f="dist" type="checkbox"${sct.dist ? " checked" : ""}></td>
        <td data-vr="dU-${i}">—</td><td data-vr="cum-${i}">—</td></tr>`;
    });
    if (!ST.vd.sections.length) h += `<tr><td colspan="8" class="muted small l">Προσθέστε τμήματα με το «+ Τμήμα» ή φορτώστε ένα παράδειγμα.</td></tr>`;
    tb.innerHTML = h;
    tb.classList.add("vdgrid");
    tb.querySelectorAll("[data-vs]").forEach(el => el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", e => {
      const sct = ST.vd.sections[+e.target.dataset.vs]; if (!sct) return;
      const f = e.target.dataset.f;
      if (f === "dist") sct.dist = e.target.checked; else if (f === "cond") sct.cond = e.target.value; else if (f === "phases") sct.phases = +e.target.value; else sct[f] = Math.max(0, parseFloat(e.target.value || "0") || 0);
      update();
    }));
  }
  $("vd_add").addEventListener("click", () => { if (ST.vd.sections.length >= VDD.max_sections) return; const last = ST.vd.sections[ST.vd.sections.length - 1]; ST.vd.sections.push({ cond: last ? last.cond : VD_DEF[vdGroup()], L_m: 100, load: 20, phases: 3, dist: false }); renderVDSections(); update(); });
  $("vd_del").addEventListener("click", () => { ST.vd.sections.pop(); renderVDSections(); update(); });
  $("vd_clear").addEventListener("click", () => { ST.vd.sections = []; renderVDSections(); update(); });
  $("vd_ex1").addEventListener("click", () => { $("vd_volt").value = "XT"; $("vd_lim").value = "4"; $("vd_cos").value = "0.9"; $("vd_unit").value = "kVA"; $("vd_tr").value = "250"; ST.vd.sections = VD_EX.XT.map(x => Object.assign({}, x)); renderVDSections(); update(); });
  $("vd_ex2").addEventListener("click", () => { $("vd_volt").value = "MT20"; $("vd_lim").value = "5"; $("vd_cos").value = "0.9"; $("vd_unit").value = "kVA"; $("vd_tr").value = ""; ST.vd.sections = VD_EX.MT.map(x => Object.assign({}, x)); renderVDSections(); update(); });
  $("vd_volt").addEventListener("change", () => { const V = E.VD_VOLT[$("vd_volt").value]; $("vd_lim").value = String(V.limit_pct); renderVDSections(); });
  $("vd_unit").addEventListener("change", () => renderVDSections());
  function renderVD() {
    const inp = vdGather();
    const r = E.vdrop(inp);
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const kvt = String(r.kv).replace(".", ",");
    // per-row results in the input table
    let j = 0;
    ST.vd.sections.forEach((sct, i) => {
      const valid = E.VD_COND[sct.cond] && (Number(sct.L_m) || 0) > 0 && j < r.sections.length;
      const x = valid ? r.sections[j++] : null;
      const a = document.querySelector(`[data-vr="dU-${i}"]`), b = document.querySelector(`[data-vr="cum-${i}"]`);
      if (a) { a.textContent = x ? fmt(x.dU, 2) : "—"; a.className = x && x.overload ? "bad" : ""; }
      if (b) { b.textContent = x ? fmt(x.dU_cum, 2) : "—"; b.className = x ? (x.ok ? "ok" : "no") : ""; }
    });
    $("vd_result").className = "result" + (r.n === 0 ? " warn" : (r.ok && !r.warnings.length ? "" : " warn"));
    if (!r.n) {
      $("vd_big").innerHTML = "—"; $("vd_line1").textContent = r.text; $("vd_line2").textContent = ""; $("vd_chips").innerHTML = ""; $("vd_table").innerHTML = ""; $("vd_facts").innerHTML = ""; $("vd_notes").innerHTML = "";
    } else {
      $("vd_big").innerHTML = `ΔU = ${fmt(r.dU_total, 2)} % ${r.ok ? "≤" : ">"} ${fmt(r.limit, 1)} %<small>${esc(E.VD_VOLT[r.voltage].label)} · συνφ ${String(r.cosphi).replace(".", ",")} · ${r.n} τμήμα${r.n > 1 ? "τα" : ""} · Σ φορτίων ${fmt(r.S_total, 1)} kVA · I αρχής ${fmt(r.I_start, 1)} A · Πίν. ${esc(r.table)}</small>`;
      $("vd_line1").textContent = r.ok ? `Η πτώση τάσης στο άκρο της γραμμής ικανοποιεί το όριο ${fmt(r.limit, 1)} % (§10.4.1).` : (r.warnings[0] || "");
      $("vd_line2").textContent = r.sc ? r.sc.text : (r.is_xt ? "Επιλέξτε Μ/Σ για τον έλεγχο ουδετέρωσης (Ιβρ 1Φ στο άκρο, 3·Ιασφ ≤ Ιβρ)." : `Όρια ΜΤ (§10.4.1): κορμός ≤ ${VDD.limits.MT_trunk} %, διακλάδωση ≤ ${VDD.limits.MT_branch} %, σύνολο < ${VDD.limits.MT_total} %.`);
      const chips = [];
      chips.push(`<span class="chip ${r.ok ? "ok" : "no"}">ΔU ${fmt(r.dU_total, 2)} % ${r.ok ? "≤" : ">"} ${fmt(r.limit, 1)} %</span>`);
      chips.push(r.sections.some(x => x.overload) ? '<span class="chip no">υπέρβαση Ιεπ</span>' : '<span class="chip ok">I ≤ Ιεπ</span>');
      if (r.sc) chips.push(`<span class="chip ${r.sc.ok ? "ok" : "no"}">Ιβρ ${fmt0(r.sc.Isc)} A · ασφ. ≤ ${r.sc.fuse_max || "—"} A</span>`);
      if (r.first_ok && !r.ok) chips.push(`<span class="chip info">πρόταση: ${esc(r.first_ok.name)}</span>`);
      $("vd_chips").innerHTML = chips.join("");
      let h = `<tr><th>#</th><th>Αγωγός</th><th>L (m)</th><th>Φορτίο κόμβου (kVA)</th><th>Διέλευση S (kVA)</th><th>I (A) / Ιεπ</th><th>Κ${r.is_xt ? " (/φάσεις)" : ""}</th><th>ΔU (%)</th><th>ΔU αθρ. (%)</th><th>Όριο</th></tr>`;
      r.sections.forEach(x => {
        h += `<tr class="${x.ok ? "" : "bad"}"><td>${x.i}</td><td class="l">${esc(x.name)}${x.dist ? ' <span class="muted small">κατανεμ.</span>' : ""}${x.phases !== 3 ? ` <span class="muted small">${x.phases}Φ</span>` : ""}</td><td>${fmt0(x.L_m)}</td><td>${fmt(x.S_node, 1)}</td><td>${fmt(x.S_through, 1)}</td><td class="${x.overload ? "no" : ""}">${fmt0(x.I_A)} / ${x.I_max === null || x.I_max === undefined ? "—" : x.I_max}</td><td>${r.is_xt ? fmt(x.K_eff, 3) : fmt0(x.K_eff)}</td><td>${fmt(x.dU, 2)}</td><td><b>${fmt(x.dU_cum, 2)}</b></td><td class="${x.ok ? "ok" : "no"}">${x.ok ? "ΝΑΙ" : "ΟΧΙ"}</td></tr>`;
      });
      $("vd_table").innerHTML = h;
      let facts = fc("Πτώση τάσης στο άκρο (%)", fmt(r.dU_total, 2), `όριο ${fmt(r.limit, 1)} % – ${r.ok ? "ικανοποιείται" : "ΥΠΕΡΒΑΣΗ"}`, r.ok ? "ok" : "no") +
        fc("Σ (kVA·km) ενεργό", fmt(r.kva_km, 2), "Σ S_διέλευσης × L (κατανεμημένα: P/2)") +
        fc("Συνολικό φορτίο (kVA)", fmt(r.S_total, 1), `συνφ ${String(r.cosphi).replace(".", ",")} κοινό`) +
        fc("Ένταση στην αρχή (A)", fmt(r.I_start, 1), r.is_xt ? "S / (√3 · 400 V) για 3Φ" : `S / (√3 · ${kvt} kV)`) +
        fc("Πτώση τάσης Μ/Σ (ενδεικτικά)", `${VDD.limits.tr_full_load_min}–${VDD.limits.tr_full_load_max} %`, "στο πλήρες φορτίο, συνφ 0,8–0,9 (§10.4.1 σημ. 2) – επιπλέον της γραμμής");
      if (r.sc) facts += fc("Ιβρ 1Φ στο άκρο (A)", fmt0(r.sc.Isc), `Z = ${fmt(r.sc.Z, 3)} Ω (RM ${r.sc.RM} / XM ${r.sc.XM} mΩ Μ/Σ ${r.sc.tr_kva} kVA + 2·ΣL·R αγωγών + 2·${fmt0(r.sc.Lp_m)} m 2x6 Cu)`, r.sc.ok ? "ok" : "no") +
        fc("Μέγ. ασφάλεια αναχώρησης για 3·Ιασφ ≤ Ιβρ (A)", r.sc.fuse_max || "—", r.sc.fuse_max ? `μέγ. ασφάλεια ΧΤ Μ/Σ ${r.sc.tr_kva} kVA: ${r.sc.max_lv_fuse} A (Πίν. Β2-8)` : "δεν καλύπτεται η συνθήκη ουδετέρωσης", r.sc.ok ? "res" : "no");
      $("vd_facts").innerHTML = facts;
      $("vd_notes").innerHTML = r.warnings.map(w => `<li class="warn">${esc(w)}</li>`).join("") + `<li>Η πτώση τάσης κάθε τμήματος = S_διέλευσης × L (km) / Κ, με Κ = 10·U²/(R·συνφ + X·ημφ) (U = ${kvt} kV) – αθροίζεται από την αρχή (Μ/Σ) μέχρι κάθε κόμβο (§10.3).</li>`;
    }
    // alternatives
    let ha = `<tr><th>Αγωγός / καλώδιο</th><th>R (Ω/km)</th><th>X (Ω/km)</th><th>Κ (συνφ ${String(r.cosphi).replace(".", ",")})</th><th>ΔU στο άκρο (%)</th><th>Ιεπ (A)</th><th>ΟΚ;</th></tr>`;
    const fo = r.first_ok ? r.first_ok.key : null;
    r.alternatives.forEach(a => {
      const c = E.VD_COND[a.key];
      ha += `<tr class="${a.key === fo ? "hi" : ""}"><td class="l">${esc(a.name)}</td><td>${fmt(c.R, 3)}</td><td>${fmt(c.X, 3)}</td><td>${r.is_xt ? fmt(a.K, 3) : fmt0(a.K)}</td><td>${r.n ? fmt(a.dU, 2) : "—"}</td><td class="${a.overload ? "no" : ""}">${a.I_max === null || a.I_max === undefined ? "—" : a.I_max}</td><td class="${r.n ? (a.ok && !a.overload ? "ok" : "no") : ""}">${r.n ? (a.ok && !a.overload ? "ΝΑΙ" : (a.ok ? "Ιεπ" : "ΟΧΙ")) : "—"}</td></tr>`;
    });
    $("vd_alts").innerHTML = ha;
    // K tables
    const cols = VDD.cos_cols;
    let hk = "";
    const kvsel = r.is_xt ? [[0.4, "Β2-7 – ΧΤ 0,4 kV", "K_table", null]] : [[20, "Β2-6 – ΜΤ 20 kV", "K_table", "KC20"], [15, "Β2-6Α – ΜΤ 15 kV", "K_table_15", "KC15"]];
    kvsel.forEach(([kv, title, fld, kc]) => {
      hk += `<tr><th colspan="${cols.length + 4 + (kc ? 1 : 0)}" class="l">ΠΙΝΑΚΑΣ ${title} – Κ = 10·U²/(R·συνφ + X·ημφ) (HLEKB2.XLS Φύλλο4)</th></tr>`;
      hk += `<tr><th>Αγωγοί</th><th>R</th><th>X</th>${cols.map(c => `<th>συνφ ${String(c).replace(".", ",")}</th>`).join("")}<th>Κ τύπος (συνφ ${String(r.cosphi).replace(".", ",")})</th>${kc ? "<th>KC = 10U²/X</th>" : ""}</tr>`;
      VDD.conductors.filter(c => c.group === r.group).forEach(c => {
        const kt = c[fld];
        hk += `<tr><td class="l">${esc(c.name)}</td><td>${fmt(c.R, 3)}</td><td>${fmt(c.X, 3)}</td>${cols.map((_, i) => `<td>${kt ? (r.is_xt ? fmt(kt[i], 2) : fmt0(kt[i])) : "—"}</td>`).join("")}<td class="dim">${r.is_xt ? fmt(E.vdK(c, kv, r.cosphi), 3) : fmt0(E.vdK(c, kv, r.cosphi))}</td>${kc ? `<td>${c[kc] ? fmt0(c[kc]) : "—"}</td>` : ""}</tr>`;
      });
    });
    $("vd_ktable").innerHTML = hk;
    $("vd_knote").textContent = r.is_xt ? "Μονοφασικές γραμμές: Κ/6 · γραμμές δύο φάσεων: Κ/3 (παρατηρήσεις Πίν. Β2-7). Οι τιμές του πίνακα είναι του Εγχειριδίου (σελ. 215)· η στήλη «Κ τύπος» υπολογίζεται από τα R, X για το επιλεγμένο συνφ (απόκλιση μόνο λόγω στρογγυλοποίησης). 4x70 Al: εκτός Πίν. Β2-7 – R/X από Πίν. Β2-9." : "Τιμές Εγχειριδίου σελ. 214–215. KC = συντελεστής ανύψωσης τάσης πυκνωτή (kVAr·km ανά 1 %). Για 6,6 kV δεν υπάρχει πίνακας – χρησιμοποιείται ο τύπος με τα ίδια R, X.";
    $("vd_rules").innerHTML = VDD.rules.map(t => `<li>${esc(t)}</li>`).join("") + VDD.examples.map(x => `<li class="muted"><b>Παράδειγμα (${esc(x.ref)}):</b> ${esc(x.text)}</li>`).join("");
  }

  // ---------------------------------------------------------------- Ουδετέρωση (ΟΔ.119)
  const ED = D.earthing;
  let eFigManual = false;
  const E_EX = {
    ex1: { e_ys: "OH_CONC", e_gs: "0", e_sf: "0", e_L: 600, e_ends: 2, e_poles: 16, e_sup: 20, e_re: 30, e_rho: "", e_resup: "", e_ysrods: 3, e_rys: "", e_sheath: 0, e_netovr: "" },
    ex2: { e_ys: "OH_WOOD", e_gs: "0", e_sf: "0", e_L: 900, e_ends: 3, e_poles: 24, e_sup: 4, e_re: "", e_rho: "1000", e_resup: "", e_ysrods: 3, e_rys: "", e_sheath: 0, e_netovr: "" },
    ex3: { e_ys: "INDOOR", e_gs: "1", e_sf: "0", e_L: 0, e_ends: 0, e_poles: 0, e_sup: 40, e_re: 20, e_rho: "", e_resup: "", e_ysrods: 4, e_rys: "", e_sheath: 1500, e_netovr: "" },
  };
  function earthGather() {
    const opt = id => $(id).value === "" ? null : num(id);
    return { ys: $("e_ys").value, ground_switch: $("e_gs").value === "1", small_fuse: $("e_sf").value === "1", L_oh_m: num("e_L"), n_ends: num("e_ends"), n_poles: num("e_poles"), n_supplies: num("e_sup"),
      R_e: opt("e_re"), rho: $("e_rho").value === "" ? 0 : Number($("e_rho").value), R_e_sup: opt("e_resup"), n_ys_rods: num("e_ysrods", 3), R_ys: opt("e_rys"), L_sheath_m: num("e_sheath"), n_net_override: opt("e_netovr") };
  }
  function earthFigKey(fig) { const m = /Σχ\. (\d+)/.exec(fig || ""); return m ? "fig" + (m[1].length < 2 ? "0" : "") + m[1] : null; }
  function renderEarthFig() {
    const k = $("e_fig").value;
    $("e_figimg").src = "img/od119/" + k + ".png";
    const lab = (E_FIGS.find(x => x[0] === k) || [])[1] || "";
    const f = ED.figures.find(x => x.no === lab) || (k.startsWith("fig11") ? ED.figures.find(x => x.no.startsWith("Σχ. 11")) : null);
    $("e_figcap").innerHTML = f ? `<b>${esc(f.no)}</b> – ${esc(f.when)}<br>${esc(f.what)}` : (k === "nomogram" ? "Παράρτημα ΟΔ.119 (υπηρεσιακό σημείωμα 1971): τάση επαφής Vε = Rγ·Ιβ ≤ 0,165/√t · Rα, Ιβ = 220/(Rφ + Rγ) – καμπύλες ασφαλειών 6–50 A συναρτήσει της αντίστασης γειώσεως Rγ. Η σάρωση της πηγής είναι ελλιπής στο αριστερό τμήμα." : "");
  }
  function renderEarth() {
    const inp = earthGather();
    const r = E.neutralEarthing(inp);
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const lim = ED.limits;
    if (!r.ok) {
      $("e_result").className = "result warn"; $("e_big").textContent = "—"; $("e_line1").textContent = r.error; $("e_line2").textContent = ""; $("e_chips").innerHTML = ""; $("e_steps").innerHTML = ""; $("e_measures").innerHTML = ""; $("e_facts").innerHTML = ""; $("e_note").textContent = "";
    } else {
      $("e_result").className = "result" + (r.mode === "NONE" ? " fail" : (r.common ? "" : " warn"));
      $("e_big").innerHTML = `${esc(r.status)}<small>${esc(r.ys_label)} · Rολ = ${fmt(r.R_final, 2)} Ω · όριο κοινής γείωσης ${fmt(r.limit, 0)} Ω · ουδετέρωση έως ${fmt(lim.neutralization_max_ohm, 0)} Ω${r.n_add ? ` · ${r.n_add} πρόσθετα ηλεκτρόδια` : ""} · ${esc(r.fig)}</small>`;
      $("e_line1").textContent = r.limit_why + (r.sheath_ok ? ` · μανδύας υπογείων καλωδίων ${fmt0(r.L_sheath_m)} m > ${lim.sheath_length_m} m.` : ".");
      $("e_line2").textContent = r.mixed.text;
      const chips = [];
      chips.push(`<span class="chip ${r.mode === "NONE" ? "no" : "ok"}">${r.mode === "NONE" ? "χωρίς ουδετέρωση" : "ουδετέρωση"}</span>`);
      chips.push(`<span class="chip ${r.common ? "ok" : "warn"}">${r.common ? "κοινή γείωση «μεταλλικών ΜΤ» + ουδετέρου" : `ανεξάρτητη γείωση «μεταλλικών ΜΤ» < ${lim.mt_metal_independent_ohm} Ω${r.grid ? " (πλέγμα)" : ""}`}</span>`);
      chips.push(`<span class="chip info">Rολ ${fmt(r.R_final, 2)} Ω ${r.R_final <= r.limit + 1e-9 ? "≤" : ">"} ${fmt(r.limit, 0)} Ω</span>`);
      chips.push(`<span class="chip ${r.mixed.wooden_ok ? "ok" : "na"}">μικτές ΜΤ+ΧΤ ξύλινοι ${r.mixed.wooden_ok ? "ΝΑΙ" : "ΟΧΙ"}</span>`);
      chips.push(`<span class="chip ${r.mixed.concrete_ok ? "ok" : "na"}">μικτές ΜΤ+ΧΤ Ω.Σ. ${r.mixed.concrete_ok ? "ΝΑΙ" : "ΟΧΙ"}</span>`);
      $("e_chips").innerHTML = chips.join("");
      $("e_steps").innerHTML = r.steps.map(t => `<li>${esc(t)}</li>`).join("");
      $("e_measures").innerHTML = r.measures.map(t => `<li class="${r.mode === "NONE" ? "warn" : ""}">${esc(t)}</li>`).join("") + `<li class="muted">${esc(r.mt_conc.text)}</li>`;
      $("e_facts").innerHTML =
        fc("Re ηλεκτροδίου (Ω)", fmt(r.R_e, 1), r.R_e_src) +
        fc("Γείωση ουδετέρου Υ/Σ (Ω)", fmt(r.R_ys, 2), `${r.n_ys_rods} ηλεκτρόδια`) +
        fc("Υποχρεωτικές γειώσεις δικτύου", r.n_net, `${r.n_ends} τέρματα + ${r.n_int} ανά ${lim.electrode_spacing_m} m${r.n_net !== r.n_net_auto ? " (χειροκίνητα)" : ""}`) +
        fc("Γειώσεις παροχών", r.n_supplies, `ηλεκτρόδια καταναλωτών ${fmt(r.R_e_sup, 1)} Ω`) +
        fc("Rολ υποχρεωτικών (Ω)", fmt(r.R_mand, 2), `όριο κοινής γείωσης ${fmt(r.limit, 0)} Ω`, r.R_mand <= r.limit + 1e-9 ? "ok" : (r.R_mand < lim.neutralization_max_ohm ? "warn" : "no")) +
        fc("Πρόσθετα ηλεκτρόδια", r.n_add, `διαθέσιμοι στύλοι χωρίς γείωση: ${r.max_add}`, r.n_add ? "res" : "") +
        fc("Rολ τελική (Ω)", fmt(r.R_final, 2), r.mode === "NONE" ? "με ηλεκτρόδιο σε κάθε στύλο" : r.status, r.mode === "NONE" ? "no" : (r.common ? "ok" : "warn")) +
        fc("Rολ ελάχιστη δυνατή (Ω)", fmt(r.R_all, 2), `ηλεκτρόδιο σε όλους τους ${r.n_poles} στύλους`) +
        fc("Σύνολο ηλεκτροδίων", r.n_electrodes_total, r.mode === "NONE" ? `Υ/Σ + ανά ${lim.no_neutralization_spacing_m} m` : "Υ/Σ + δίκτυο + πρόσθετα + παροχές");
      $("e_note").textContent = `Εκτίμηση γραφείου (ΟΔ.119 §3): οι γειώσεις θεωρούνται ανεξάρτητες και παράλληλες (1/Rολ = Σ 1/Ri, όπως Σχ. 11: Rολ = R/N). Η πραγματική τιμή επιβεβαιώνεται με μέτρηση της συνολικής αντίστασης μετά την κατασκευή (ΟΔ.25). Στα υπόγεια δίκτυα ΧΤ θεωρείται βέβαιο ότι Rολ < ${lim.neutralization_max_ohm} Ω (§7).`;
      if (!eFigManual) { const k = earthFigKey(r.fig); if (k) $("e_fig").value = k; }
    }
    renderEarthFig();
  }
  $("e_fig").addEventListener("change", () => { eFigManual = true; renderEarthFig(); });
  Object.keys(E_EX).forEach(k => $("e_" + k).addEventListener("click", () => { Object.entries(E_EX[k]).forEach(([id, v]) => $(id).value = v); eFigManual = false; update(); }));
  $("e_rules").innerHTML = ED.rules.map((t, i) => `<li><b>${i + 1}.</b> ${esc(t)}</li>`).join("") + `<li class="muted">Πηγή: ${esc(ED.source)}.</li>`;
  $("e_figtable").innerHTML = `<tr><th>Σχήμα</th><th>Περίπτωση</th><th>Διάταξη γειώσεων</th></tr>` + ED.figures.map(f => `<tr><td><b>${esc(f.no)}</b></td><td class="l">${esc(f.when)}</td><td class="l">${esc(f.what)}</td></tr>`).join("");

  // ---------------------------------------------------------------- Ουδετέρωση ΧΤ – συνθήκη βραχυκύκλωσης (Εγχ. §10.7 / ΟΔ.22 – όπως η οθόνη «Ουδετέρωση ΧΤ» του Πυθαγόρα)
  const NZD = D.lv_neutral;
  const NZ_CONDS = D.lv_feeder_conductors.filter(c => c.R_sc !== null && c.R_sc !== undefined);
  const NZ_EX = {
    ex1: { tr: "250", sup: "C_2x6", lp: 30, fuse: "", sections: [{ cond: "A_4x50AL", L_m: 100 }, { cond: "SK_120", L_m: 200 }, { cond: "SK_70", L_m: 100 }] },
    ex2: { tr: "100", sup: "C_2x6", lp: 30, fuse: "63", sections: [{ cond: "SK_70", L_m: 350 }, { cond: "A_4x16AL", L_m: 250 }] },
    ex3: { tr: "630", sup: "X_95", lp: 20, fuse: "250", sections: [{ cond: "U_150", L_m: 300 }, { cond: "U_95", L_m: 150 }] },
  };
  function nzGather() {
    return { tr_kva: +$("nz_tr").value, sections: ST.nz.sections, supply: $("nz_sup").value, Lp_m: $("nz_lp").value === "" ? null : num("nz_lp"), fuse: $("nz_fuse").value ? +$("nz_fuse").value : null };
  }
  function renderNZSections() {
    const tb = $("nz_secs");
    let h = `<tr><th>#</th><th>Αγωγοί τμήματος</th><th>Μήκος (m)</th><th>Σ L (m)</th><th>Ιβρ στο άκρο του τμήματος (A)</th><th>Ασφάλεια ≤ (A)</th></tr>`;
    ST.nz.sections.forEach((sct, i) => {
      h += `<tr><td><b>${i + 1}</b></td><td class="l"><select data-ns="${i}" data-f="cond">${NZ_CONDS.map(c => `<option value="${c.key}"${c.key === sct.cond ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></td>
        <td><input data-ns="${i}" data-f="L_m" type="number" min="0" step="1" value="${sct.L_m}"></td>
        <td data-nr="L-${i}">—</td><td data-nr="Ik-${i}">—</td><td data-nr="f-${i}">—</td></tr>`;
    });
    if (!ST.nz.sections.length) h += `<tr><td colspan="6" class="muted small l">Προσθέστε τμήματα με το «+ Προσθήκη τμήματος» ή φορτώστε ένα παράδειγμα. Χωρίς τμήματα ο έλεγχος γίνεται για βραχυκύκλωμα στον ζυγό ΧΤ του Μ/Σ (+ παροχή).</td></tr>`;
    tb.innerHTML = h;
    tb.querySelectorAll("[data-ns]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", e => {
      const sct = ST.nz.sections[+e.target.dataset.ns]; if (!sct) return;
      if (e.target.dataset.f === "cond") sct.cond = e.target.value; else sct.L_m = Math.max(0, parseFloat(e.target.value || "0") || 0);
      update();
    }));
  }
  $("nz_add").addEventListener("click", () => { if (ST.nz.sections.length >= 12) return; const last = ST.nz.sections[ST.nz.sections.length - 1]; ST.nz.sections.push({ cond: last ? last.cond : "SK_120", L_m: 100 }); renderNZSections(); update(); });
  $("nz_del").addEventListener("click", () => { ST.nz.sections.pop(); renderNZSections(); update(); });
  $("nz_clear").addEventListener("click", () => { ST.nz.sections = []; renderNZSections(); update(); });
  $("nz_fromvd").addEventListener("click", () => {
    const secs = ST.vd.sections.map(x => ({ cond: String(x.cond || "").replace(/^XT_/, ""), L_m: +x.L_m || 0 })).filter(x => E.COND[x.cond] && E.COND[x.cond].R_sc !== null && E.COND[x.cond].R_sc !== undefined && x.L_m > 0);
    if (!secs.length) { $("nz_line2").textContent = "Στην «Πτώση τάσης» δεν υπάρχουν τμήματα ΧΤ με αγωγούς του Πίν. Β2-9."; return; }
    ST.nz.sections = secs; if ($("vd_tr").value && E.TR[+$("vd_tr").value] && E.TR[+$("vd_tr").value].RM !== null) $("nz_tr").value = $("vd_tr").value; if ($("vd_lp").value !== "") { $("nz_lp").value = $("vd_lp").value; $("nz_sup").value = "C_2x6"; }
    renderNZSections(); update();
  });
  Object.keys(NZ_EX).forEach(k => $("nz_" + k).addEventListener("click", () => { const x = NZ_EX[k]; $("nz_tr").value = x.tr; $("nz_sup").value = x.sup; $("nz_lp").value = x.lp; $("nz_fuse").value = x.fuse; ST.nz.sections = x.sections.map(o => Object.assign({}, o)); renderNZSections(); update(); }));
  function renderNZ() {
    const r = E.lvNeutralization(nzGather());
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const mO = v => fmt(v * 1000, 1);
    // per-row results in the input table
    let j = 0;
    ST.nz.sections.forEach((sct, i) => {
      const valid = r.ok && E.COND[sct.cond] && (Number(sct.L_m) || 0) > 0 && j < r.sections.length;
      const x = valid ? r.sections[j++] : null;
      const a = document.querySelector(`[data-nr="L-${i}"]`), b = document.querySelector(`[data-nr="Ik-${i}"]`), c = document.querySelector(`[data-nr="f-${i}"]`);
      if (a) a.textContent = x ? fmt0(x.L_cum) : "—";
      if (b) { b.textContent = x ? fmt0(x.Ik) : "—"; b.className = x ? (x.fuse_max ? "ok" : "no") : ""; }
      if (c) { c.textContent = x ? (x.fuse_max || "—") : "—"; c.className = x ? (x.fuse_max ? "" : "no") : ""; }
    });
    if (!r.ok) {
      $("nz_result").className = "result warn"; $("nz_big").textContent = "—"; $("nz_line1").textContent = r.text; $("nz_line2").textContent = ""; $("nz_chips").innerHTML = ""; $("nz_facts").innerHTML = ""; $("nz_steps").innerHTML = ""; $("nz_notes").innerHTML = ""; $("nz_lmax").innerHTML = ""; $("nz_lmaxnote").textContent = "";
      return;
    }
    const bad = r.fuse_check ? !r.fuse_check.ok : !r.fuse_tr;
    $("nz_result").className = "result" + (bad ? " fail" : (r.warnings.length ? " warn" : ""));
    $("nz_big").innerHTML = (r.fuse_tr ? `Μεγαλύτερη τυποπ. ασφάλεια για τη συνθήκη ουδετέρωσης: ${r.fuse_tr} A` : esc(r.result)) +
      `<small>Μ/Σ ${r.tr_kva} kVA · ${r.n} τμήμα${r.n !== 1 ? "τα" : ""} ${fmt0(r.L_total)} m · ${r.supply === "NONE" ? "χωρίς παροχή" : `παροχή ${esc(r.supply_label.split(" (")[0])} ${fmt0(r.Lp_m)} m`} → Z = ${fmt(r.Z, 4)} Ω · Ιβρ = ${fmt0(r.Ik)} A${r.fuse_max && r.fuse_max > r.max_lv_fuse ? ` · από Ιβρ ${r.fuse_max} A, όριο Μ/Σ ${r.max_lv_fuse} A` : ""}</small>`;
    $("nz_line1").textContent = r.fuse_check ? `Ασφάλεια ${r.fuse_check.fuse} A: ${r.fuse_check.ok ? "ΚΑΛΥΠΤΕΤΑΙ" : "ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ"} η συνθήκη ουδετέρωσης – 3 × ${r.fuse_check.fuse} = ${fmt0(r.fuse_check.I_req)} A ${r.fuse_check.ok ? "≤" : ">"} Ιβρ ${fmt0(r.Ik)} A (Ιβρ/Ιασφ = ${fmt(r.fuse_check.ratio, 2)}).`
      : `Συνθήκη: ρεύμα βραχυκύκλωσης ≥ 3 × ονομαστική ασφάλεια → Ιασφ ≤ ${fmt0(r.Ik / r.k)} A. Αντιστάσεις Μ/Σ, αγωγών και παροχών από τους πίνακες Β2-9, Β2-9Α, Β2-10 του Εγχειριδίου.`;
    $("nz_line2").textContent = r.L_extra !== null && r.n ? `Με ασφάλεια ${r.f_ref} A η γραμμή μπορεί να επεκταθεί με ${r.sections[r.n - 1].name} κατά ≤ ${fmt0(r.L_extra)} m ακόμη (ίδια παροχή στο άκρο).` : (r.warnings[0] || "");
    const chips = [];
    chips.push(`<span class="chip ${bad ? "no" : "ok"}">Ιβρ ${fmt0(r.Ik)} A</span>`);
    chips.push(`<span class="chip info">Z ${fmt(r.Z, 4)} Ω · R ${mO(r.R)} / X ${mO(r.X)} mΩ</span>`);
    chips.push(r.fuse_tr ? `<span class="chip ok">ασφ. ≤ ${r.fuse_tr} A</span>` : `<span class="chip no">καμία ασφάλεια</span>`);
    if (r.fuse_check) chips.push(`<span class="chip ${r.fuse_check.ok ? "ok" : "no"}">${r.fuse_check.fuse} A: ${r.fuse_check.ok ? "ΝΑΙ" : "ΟΧΙ"}</span>`);
    if (r.L_total > NZD.max_length_m) chips.push(`<span class="chip warn">L > ${NZD.max_length_m} m</span>`);
    $("nz_chips").innerHTML = chips.join("");
    $("nz_facts").innerHTML =
      fc("RM + jXM Μ/Σ (mΩ)", `${String(r.RM).replace(".", ",")} + j${String(r.XM).replace(".", ",")}`, `Μ/Σ ${r.tr_kva} kVA – Πίν. Β2-9Α · μέγ. ασφάλεια ΧΤ ${r.max_lv_fuse} A`) +
      fc("Γραμμή ΧΤ R / X (mΩ)", `${mO(r.R_line)} / ${mO(r.X_line)}`, `${r.n} τμήμα${r.n !== 1 ? "τα" : ""} · Σ L = ${fmt0(r.L_total)} m · 2·L·R′, 2·L·X′`) +
      fc("Παροχή R / X (mΩ)", `${mO(r.R_sup)} / ${mO(r.X_sup)}`, r.supply === "NONE" ? "χωρίς παροχή" : `${esc(r.supply_label)} · ${fmt0(r.Lp_m)} m · ${String(r.Rp).replace(".", ",")} Ω/km`) +
      fc("Z στο τέρμα της παροχής (Ω)", fmt(r.Z, 4), `√(${mO(r.R)}² + ${mO(r.X)}²) mΩ`, "res") +
      fc("Ιβρ = 230 / Z (A)", fmt0(r.Ik), `Ιασφ ≤ Ιβρ / 3 = ${fmt0(r.Ik / r.k)} A`, bad ? "no" : "ok") +
      fc("Μέγ. τυποποιημένη ασφάλεια (A)", r.fuse_tr || "—", r.fuse_max ? (r.fuse_max > r.max_lv_fuse ? `από Ιβρ ${r.fuse_max} A → όριο Μ/Σ ${r.max_lv_fuse} A` : `3 × ${r.fuse_tr} = ${fmt0(r.k * r.fuse_tr)} A ≤ ${fmt0(r.Ik)} A`) : `3 × ${D.lv_fuse_sizes[0]} = ${fmt0(r.k * D.lv_fuse_sizes[0])} A > Ιβρ`, r.fuse_tr ? "res" : "no");
    $("nz_steps").innerHTML = r.steps.map(t => `<li>${esc(t)}</li>`).join("");
    $("nz_notes").innerHTML = r.warnings.map(w => `<li class="warn">${esc(w)}</li>`).join("") + `<li class="muted">Η μέθοδος του Εγχειριδίου (§10.7) είναι προσεγγιστική – θεωρείται ικανοποιητική για τη μελέτη. Οι τιμές R των αγωγών είναι στους 45 °C (εναέρια) / 35 °C (υπόγεια) και όπου ο ουδέτερος διαφέρει από τις φάσεις είναι η μέση τιμή φάσης–ουδετέρου (Πίν. Β2-9).</li>`;
    // Β2-10 table for the chosen transformer + supply
    const fuses = r.fuses;
    let h = `<tr><th class="l">Αγωγοί γραμμής</th>${fuses.map(f => `<th>${f} A</th>`).join("")}</tr>`;
    r.lmax.forEach(row => {
      h += `<tr><td class="l">${esc(row.name)}</td>${row.L.map(L => L === null ? `<td class="no">—</td>` : (L > NZD.max_length_m ? `<td class="dim">&gt; ${NZD.max_length_m}</td>` : `<td>${fmt0(L)}</td>`)).join("")}</tr>`;
    });
    $("nz_lmax").innerHTML = h;
    $("nz_lmaxnote").textContent = `Μ/Σ ${r.tr_kva} kVA · ${r.supply === "NONE" ? "χωρίς παροχή στο άκρο" : `παροχή ${r.supply_label} ${fmt0(r.Lp_m)} m στο άκρο`} · «> ${NZD.max_length_m}» = κάλυψη της συνθήκης σε μήκος μεγαλύτερο των ${NZD.max_length_m} m (πρακτικό όριο δικτύων ΧΤ) · «—» = δεν καλύπτεται ούτε με L = 0. Ο Πίν. Β2-10 του Εγχειριδίου αντιστοιχεί σε παροχή 2x6 Cu 30 m.`;
  }
  $("nz_rules").innerHTML = NZD.rules.map((t, i) => `<li><b>${i + 1}.</b> ${esc(t)}</li>`).join("") + `<li class="muted"><b>${esc(NZD.example.title)}:</b> ${esc(NZD.example.expect)}.</li><li class="muted">Πηγή: ${esc(NZD.source)}.</li>`;
  // sub-tabs of the «Ουδετέρωση ΧΤ» tab
  document.querySelectorAll("#e_subtabs button").forEach(bt => bt.addEventListener("click", () => {
    document.querySelectorAll("#e_subtabs button").forEach(x => x.classList.toggle("active", x === bt));
    document.querySelectorAll("#tab-earth .esub").forEach(d => d.classList.toggle("hidden", d.dataset.es !== bt.dataset.es));
  }));

  // ---------------------------------------------------------------- MV tab
  const MV_EXAMPLES = [
    ["Βιοτεχνία με έναν Μ/Σ 250 kVA, υπόγειο δίκτυο, μέτρηση εσωτερικά", [250, 1, true, "IN", "UG", false, false]],
    ["Ξενοδοχείο με Μ/Σ 630 kVA, εναέριο δίκτυο, μέτρηση εσωτερικά", [630, 1, true, "IN", "OH", false, false]],
    ["Εμπορικό κέντρο 2 × 400 kVA μόνιμα παράλληλοι (800 kVA)", [800, 2, true, "IN", "UG", false, false]],
    ["Βιομηχανία 2 × 315 kVA σε χωριστές γραμμές ΧΤ (μη παράλληλοι)", [630, 2, false, "IN", "UG", false, false]],
    ["Μ/Σ 400 kVA με δηλωμένη μελλοντική επέκταση σε 1000 kVA", [400, 1, true, "IN", "UG", true, false]],
    ["Αντλιοστάσιο 160 kVA, εναέριο δίκτυο ΜΤ, μέτρηση σε στύλο", [160, 1, true, "OUT", "OH", false, false]],
    ["Μονάδα 1000 kVA, εναέριο δίκτυο ΜΤ, μέτρηση σε στύλο", [1000, 1, true, "OUT", "OH", false, false]],
    ["Μ/Σ 1250 kVA, υπόγειο δίκτυο, μέτρηση εσωτερικά", [1250, 1, true, "IN", "UG", false, false]],
  ];
  function renderMV() {
    const r = E.mvCustomer(num("v_kva", 400), parseInt($("v_n").value || "1", 10), $("v_par").value === "1", $("v_met").value, $("v_net").value, $("v_fut").value === "1", $("v_sep").value === "1", parseFloat($("v_kv").value), +$("v_big").value);
    const mt = r.metering;
    // εναέριο δίκτυο με μέτρηση σε στύλο (τύπος Α): στο αποτέλεσμα και η κατασκευή (P-43 / P-42 …) με τους Μ/Σ τάσεως / εντάσεως της μέτρησης κατά ΟΔ.34 §3.3
    const mtLine = mt && mt.outdoor ? `<small class="mt"><b>${esc(mt.construction)}</b> – μετρητικά επί στύλου: <b>${mt.vt_count} × Μ/Σ τάσεως ${esc(mt.vt_text)}</b>${mt.vt_count === 2 ? " (σύνδεση V)" : ""} + <b>${mt.ct_count} × Μ/Σ εντάσεως ${esc(mt.ct_text)}</b>${mt.ct_count === 2 ? " (σύνδεση Aron)" : ""} · I = ${fmt(mt.I_A, 1)} A (ΟΔ.34 §3.3)</small>` : "";
    $("v_big_out").innerHTML = `Παροχή ${r.type} – ${r.panel}<small>${r.why}</small>${mtLine}`;
    $("v_result").className = "result" + (r.type === "B2" ? " warn" : "");
    $("v_line1").textContent = r.type === "B1" ? "BKI = πίνακας GR-241 τύπου Ι: Διακόπτης Φορτίου μετ’ Ασφαλειών (ΔΦ/Α) – ασφάλειες ΜΤ ως γενικό μέσο προστασίας." : r.type === "B2" ? "BKII = πίνακας GR-241 τύπου ΙΙ: Διακόπτης Ισχύος (Δ/Ι) με ηλεκτρονόμους υπερεντάσεως φάσεων και γης· Μ/Σ με In < 10 % της ρύθμισης Η/Ν → ιδιαίτερη προστασία (ΟΔ.34 §2.4.2)." : "Παροχή τύπου Α: χωρίς πίνακα ΜΤ στον χώρο του πελάτη – το μέσο προστασίας είναι επί του τερματικού στύλου (ΟΔ.34 §2.1).";
    $("v_line2").textContent = "Γενικό μέσο προστασίας ΧΤ πελάτη: " + r.lv_protection + (r.metering ? " · Μ/Σ ΜΕΤΡΗΣΗΣ (" + r.metering.where + "): " + r.metering.text : "");
    const fc = (k, v, s) => `<div class="factor"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const tr = r.mv_fuse_row;
    $("v_facts").innerHTML = fc("Ονομαστικό ρεύμα ΜΤ (A)", fmt(r.I_mv_A), `${r.S_total} kVA / (√3 · ${$("v_kv").value} kV)`) +
      (r.metering ? fc("Μ/Σ εντάσεως μέτρησης", r.metering.ct_text, `${r.metering.ct_count} τεμ.${r.metering.ct_count === 2 ? " (σύνδεση Aron)" : ""} · αμέσως ανώτερος τυποποιημένος λόγος από I = ${fmt(r.metering.I_A)} A (ΟΔ.34 §3.3)`) + fc("Μ/Σ τάσεως μέτρησης", r.metering.vt_text, `${r.metering.vt_count} τεμ.${r.metering.vt_count === 2 ? " (σύνδεση V)" : ""} · ${r.metering.outdoor ? "σε στύλο: " + r.metering.construction + " (ξύλινοι βραχίονες) / P-42 (χαλύβδινοι) – σε ευθυγραμμία P-41 / P-40" : "στον πίνακα μέτρησης ΜΤ του πελάτη"}`) : "") + fc("Ιk δικτύου ΜΤ (kA)", fmt(r.Ik_kA), `Sκ = ${r.sc_mva} MVA (ΔΠΑ 1990 §3)`) +
      fc("Ασφάλειες ΜΤ μεγαλύτερου Μ/Σ", tr ? `${tr.exp_15 ?? "—"} / ${tr.exp_20 ?? "—"} A` : "—", tr ? `εκτόνωσης 15 / 20 kV · κόνεως: ${tr.powder || "—"} (Πίν. Β2-8, Μ/Σ ${tr.kva} kVA)` : "") + fc("Γείωση Υ/Σ", "≤ 1 Ω", "κοινή γείωση · Cu ≥ 50 mm² · ισοδυναμικό πλέγμα (ΟΔ.34 §3)");
    $("v_rules").innerHTML = D.mv.rules.map(t => `<li>${t}</li>`).join("");
    let h = "<tr><th>Περίπτωση</th><th>Τύπος / πίνακας</th><th>Αιτιολογία</th></tr>";
    MV_EXAMPLES.forEach(([lab, a]) => { const x = E.mvCustomer(a[0], a[1], a[2], a[3], a[4], a[5], a[6]); h += `<tr><td class="l">${lab}</td><td><b>${x.type} / ${x.panel}</b></td><td class="l small muted">${x.why}</td></tr>`; });
    $("v_examples").innerHTML = h;
  }

  // ---------------------------------------------------------------- Συμμετοχές ΧΤ / ΜΤ (καρτέλα «Συμμετοχές»)
  const SYM = window.PARTICIP || null;
  const eur = v => (Math.round(v * 100) / 100).toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const SYM_NST = 5;
  const pf = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const GRL = { A: "Α", B: "Β", C: "Γ" };
  function symState() {
    if (!ST.sym || typeof ST.sym !== "object") ST.sym = {};
    const s = ST.sym;
    if (!s.own) { const own = {}; Object.keys(s).forEach(k => { if (/^Νο /.test(k)) { own[k] = s[k]; delete s[k]; } }); s.own = own; }   // παλαιότερη μορφή {Νο: πλήθος}
    ["own", "res", "old", "old_res"].forEach(k => { if (!s[k] || typeof s[k] !== "object") s[k] = {}; });
    if (!Array.isArray(s.st)) s.st = [];
    s.st = s.st.filter(x => x && typeof x === "object").slice(0, SYM_NST);
    while (s.st.length < SYM_NST) s.st.push({ N_kva: 0, L_km: 0, Lep_m: 0, protection: "" });
    return s;
  }
  function symCounts() { const s = symState(); return $("s_src").value === "OWN" ? Object.assign({}, s.own) : Object.assign({}, ST.counts); }
  function symSyncInputs() { const s = symState(); document.querySelectorAll("#tab-sym [data-sym]").forEach(el => { el.value = s[el.dataset.sym][el.dataset.no] || 0; }); document.querySelectorAll("#v2_st [data-st]").forEach(el => { const x = s.st[Number(el.dataset.i)] || {}; el.value = el.dataset.st === "protection" ? (x.protection || "") : (x[el.dataset.st] || 0); }); }
  function symInit() {
    if (!SYM || !$("s_counts")) return;
    const LV = SYM.rules.lv, MV = SYM.rules.mv;
    const s = symState();
    LV.supplies.forEach(sp => ["own", "res", "old", "old_res"].forEach(k => { if (s[k][sp.no] === undefined) s[k][sp.no] = 0; }));
    const psets = SYM.priceSets ? SYM.priceSets() : [];
    const pdef = SYM.priceSet ? SYM.priceSet() : null;
    $("s_pset").innerHTML = psets.length ? psets.map(p => `<option value="${esc(String(p.id))}"${pdef && String(p.id) === String(pdef.id) ? " selected" : ""}>${esc(p.label)}</option>`).join("") : '<option value="">Πίνακας Τιμών των τευχών (2007)</option>';
    const protOpts = (MV.Sp.protection_options || []).map(o => `<option value="${esc(o.key !== undefined ? o.key : o.label)}">${esc(o.label)} – ${eur(Number(o.eur || 0))}</option>`).join("");
    $("v2_prot").innerHTML = protOpts || '<option value="">—</option>';
    $("v2_case").innerHTML = (MV.cases || []).map(c => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join("");
    $("v2_lvno").innerHTML = LV.supplies.map(sp => `<option value="${esc(sp.no)}"${sp.no === "Νο 3" ? " selected" : ""}>${esc(sp.no)} (${sp.kva_supply} kVA${sp.N_particip_kva ? ", N = " + sp.N_particip_kva : ""})</option>`).join("");
    $("s_counts").innerHTML = "<tr><th>Παροχή</th><th>Ισχύς παροχής (kVA)</th><th>Ισχύς συμμετοχής N (kVA)</th><th>Ομάδα</th><th>Πλήθος</th><th>εξ αυτών οικιακές</th></tr>" +
      LV.supplies.map(sp => `<tr><td class="l"><b>${esc(sp.no)}</b> (${sp.phases === 1 ? "1Φ" : "3Φ"})</td><td>${sp.kva_supply === null || sp.kva_supply === undefined ? "—" : sp.kva_supply}</td><td>${sp.N_particip_kva === null || sp.N_particip_kva === undefined ? "—" : sp.N_particip_kva}</td><td>${GRL[sp.group] || esc(sp.group)}</td><td><input type="number" min="0" max="99" step="1" data-sym="own" data-no="${esc(sp.no)}"></td><td><input type="number" min="0" max="99" step="1" data-sym="res" data-no="${esc(sp.no)}"></td></tr>`).join("");
    $("s_old").innerHTML = "<tr><th>Παροχή</th><th>Πλήθος</th><th>εξ αυτών οικιακές</th></tr>" +
      LV.supplies.map(sp => `<tr><td class="l"><b>${esc(sp.no)}</b> (${sp.phases === 1 ? "1Φ" : "3Φ"}${sp.N_particip_kva ? ", N = " + sp.N_particip_kva + " kVA" : ""})</td><td><input type="number" min="0" max="99" step="1" data-sym="old" data-no="${esc(sp.no)}"></td><td><input type="number" min="0" max="99" step="1" data-sym="old_res" data-no="${esc(sp.no)}"></td></tr>`).join("");
    $("v2_st").innerHTML = "<tr><th>#</th><th>Ni (kVA)</th><th>Li (km)</th><th>Lεπi (m)</th><th>Μέσα προστασίας</th></tr>" +
      s.st.map((x, i) => `<tr><td>${i + 1}</td><td><input type="number" min="0" step="10" data-st="N_kva" data-i="${i}"></td><td><input type="number" min="0" step="0.1" data-st="L_km" data-i="${i}"></td><td><input type="number" min="0" step="10" data-st="Lep_m" data-i="${i}"></td><td><select data-st="protection" data-i="${i}"><option value="">—</option>${protOpts}</select></td></tr>`).join("");
    document.querySelectorAll("#tab-sym [data-sym]").forEach(el => el.addEventListener("input", () => { symState()[el.dataset.sym][el.dataset.no] = Math.max(0, Math.trunc(pf(el.value))); renderSym(); saveState(); }));
    document.querySelectorAll("#v2_st [data-st]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { const y = symState().st[Number(el.dataset.i)]; y[el.dataset.st] = el.dataset.st === "protection" ? el.value : Math.max(0, pf(el.value)); renderSym(); saveState(); }));
    symSyncInputs();
    $("s_res_all").addEventListener("click", () => { const c = symCounts(), st = symState(); LV.supplies.forEach(sp => st.res[sp.no] = c[sp.no] || 0); symSyncInputs(); renderSym(); saveState(); });
    $("s_res_none").addEventListener("click", () => { const st = symState(); LV.supplies.forEach(sp => st.res[sp.no] = 0); symSyncInputs(); renderSym(); saveState(); });
  }
  function symInputs() {
    const s = symState();
    return { district: $("s_dist").value, counts: symCounts(), res_counts: Object.assign({}, s.res), kind: $("s_kind").value, old_counts: Object.assign({}, s.old), old_res_counts: Object.assign({}, s.old_res),
      special: $("s_special").value, exceptional_eur: num("s_exc"), L_m: num("s_L"), R_m: num("s_R"), Lk_oh_m: num("s_Lk_oh"), Lk_ug_m: num("s_Lk_ug"), n_ys: num("s_nys") || 1,
      no7_exception: $("s_no7exc").value === "1", network_cost_eur: num("s_netcost"), space_value_eur: num("s_space"), ug_diff_eur: num("s_ugdiff"), cable_m: num("s_cable"),
      fop_poles: num("s_fop_p"), fop_wall_m: num("s_fop_w"), night: $("s_night").value === "1", extra_eur: num("s_extra"), prices: $("s_pset").value };
  }
  function symInputsMV() {
    const s = symState();
    return { case: $("v2_case").value, N_kva: num("v2_kva"), N_old_kva: num("v2_nold"), L_km: num("v2_len"), Lep_m: num("v2_lep"), ep_supply: $("v2_sup").value, metering: $("v2_met").value, protection: $("v2_prot").value,
      b_extra_eur: num("v2_bextra"), dp_actual_eur: num("v2_dpact"), dep_eur: num("v2_dep"), years: num("v2_years"), removed: $("v2_removed").value === "1", lv_no: $("v2_lvno").value, lv_n: num("v2_lvn") || 1,
      district: $("s_dist").value, lv_use: $("v2_lvuse").value, stations: s.st.map(x => ({ N_kva: x.N_kva, L_km: x.L_km, Lep_m: x.Lep_m, protection: x.protection })), extra_eur: num("v2_extra"), X: $("v2_x").value === "" ? null : num("v2_x"),
      prices: $("s_pset").value, meter_eur: num("v2_meter") };
  }
  let symPsetShown = null;
  function renderPriceTable(pid) {
    if (!$("s_ptable") || !SYM.priced || symPsetShown === pid) return;
    symPsetShown = pid;
    const sets = SYM.priceSets(), base = SYM.rules, cur = SYM.priced(pid), act = cur._prices || {};
    const other = sets.find(p => String(p.id) !== String(act.id)) || null;
    const alt = other ? SYM.priced(other.id) : base;
    const col = [["2007", alt], [String(act.id || ""), cur]].sort((a, b) => a[0] < b[0] ? -1 : 1);   // στήλες: 2007 | 2026
    const A = col[0][1], B = col[1][1], ha = col[0][0], hb = col[1][0];
    const e = v => (v === null || v === undefined) ? "—" : (typeof v === "number" ? eur(v) : esc(String(v)));
    const t = (lab, fa, fb, unit) => `<tr><td class="l">${lab}</td><td>${fa === null || fa === undefined ? "—" : e(fa)}${unit && typeof fa === "number" ? unit : ""}</td><td class="${String(act.id) === hb ? "ok" : ""}">${fb === null || fb === undefined ? "—" : e(fb)}${unit && typeof fb === "number" ? unit : ""}</td></tr>`;
    const tier = (T, i) => (T && T[i]) ? Number(T[i][2]) : null;
    const rt = (L, i) => tier(L.Sa.residential_3f_tiers, i);
    const ot = (L, k) => (L.other || {})[k];
    let h = `<tr><th>Συντελεστής</th><th>${esc(ha)}</th><th>${esc(hb)}${String(act.id) === hb ? " (ενεργός)" : ""}</th></tr>`;
    h += t("Σπ – πάγιο ανά παροχή, διαμερίσματα Α & Β", A.lv.Sp.A, B.lv.Sp.A) + t("Σπ – διαμέρισμα Γ", A.lv.Sp.C, B.lv.Sp.C);
    h += t("α μη οικιακών 3Φ (€/kVA) – Α", A.lv.Sa.alpha_nonres_3f.A, B.lv.Sa.alpha_nonres_3f.A, "/kVA") + t("α – Β", A.lv.Sa.alpha_nonres_3f.B, B.lv.Sa.alpha_nonres_3f.B, "/kVA") + t("α – Γ", A.lv.Sa.alpha_nonres_3f.C, B.lv.Sa.alpha_nonres_3f.C, "/kVA");
    h += t("Οικιακές 3Φ – επόμενα 11 kVA (10–21)", rt(A.lv, 1), rt(B.lv, 1), "/kVA") + t("Οικιακές 3Φ – επόμενα 9 kVA (21–30)", rt(A.lv, 2), rt(B.lv, 2), "/kVA") + t("Οικιακές 3Φ – επιπλέον kVA", rt(A.lv, 3), rt(B.lv, 3), "/kVA");
    h += t("Σδ ομάδα Α – Α1 (€/m)", A.lv.Sd.A1_eur_m, B.lv.Sd.A1_eur_m, "/m") + t("Σδ ομάδα Α – Υ", A.lv.Sd.Y_groupA_eur, B.lv.Sd.Y_groupA_eur) + t("Σδ ομάδα Α – ελάχιστο (30 < L < 200 m)", A.lv.Sd.min_groupA_eur, B.lv.Sd.min_groupA_eur);
    h += t("Σδ ομάδα Β – Α2 (€/m)", A.lv.Sd.A2_eur_m, B.lv.Sd.A2_eur_m, "/m") + t("Σδ ομάδες Β / Γ – Υ", A.lv.Sd.Y_groupBC_eur, B.lv.Sd.Y_groupBC_eur);
    h += t("δ ΧΤ – εναέριο δίκτυο ΜΤ (€/m)", A.lv.Sd.delta_overhead_eur_m, B.lv.Sd.delta_overhead_eur_m, "/m") + t("δ ΧΤ – υπόγειο δίκτυο ΜΤ (€/m)", A.lv.Sd.delta_underground_eur_m, B.lv.Sd.delta_underground_eur_m, "/m");
    h += t("Διακριτή μέτρηση νυκτερινών", ot(A.lv, "night_tariff_eur"), ot(B.lv, "night_tariff_eur")) + t("Απλή παροχή με καλώδιο 30–60 m – 1Φ / 3Φ", `${eur(ot(A.lv, "simple_supply_cable_1f_eur") || 0)} / ${eur(ot(A.lv, "simple_supply_cable_3f_eur") || 0)}`, `${eur(ot(B.lv, "simple_supply_cable_1f_eur") || 0)} / ${eur(ot(B.lv, "simple_supply_cable_3f_eur") || 0)}`);
    h += t("Μετακίνηση μετρητή πριν την κατασκευή – 1Φ / 3Φ (καλώδιο ≤ 10 m) · ελάχιστη διαφορά", `${eur(ot(A.lv, "meter_move_1f_eur") || 0)} / ${eur(ot(A.lv, "meter_move_3f_eur") || 0)} · ${eur(ot(A.lv, "meter_move_min_diff_eur") || 0)}`, `${eur(ot(B.lv, "meter_move_1f_eur") || 0)} / ${eur(ot(B.lv, "meter_move_3f_eur") || 0)} · ${eur(ot(B.lv, "meter_move_min_diff_eur") || 0)}`);
    h += t("ΦΟΠ – ανά στύλο / επιτοίχιο καλώδιο (€/m)", `${eur(ot(A.lv, "FOP_pole_eur") || 0)} / ${eur(ot(A.lv, "FOP_wall_eur_m") || 0)}`, `${eur(ot(B.lv, "FOP_pole_eur") || 0)} / ${eur(ot(B.lv, "FOP_wall_eur_m") || 0)} (χωρίς αναπροσαρμογή)`);
    h += t("ΜΤ – δ επέκτασης εναέριο / υπόγειο (€/m)", `${eur(A.mv.Sep.delta_overhead_eur_m)} / ${eur(A.mv.Sep.delta_underground_eur_m)}`, `${eur(B.mv.Sep.delta_overhead_eur_m)} / ${eur(B.mv.Sep.delta_underground_eur_m)}`);
    (B.mv.Sen.S1_tiers || []).forEach((tt, i) => { const ta = (A.mv.Sen.S1_tiers || [])[i]; h += t(`ΜΤ – Σ1 κλίμακα ${i + 1}: ${fmt(tt[0], 0)} – ${tt[1] === null ? "…" : fmt(tt[1], 0)} kVA`, ta ? Number(ta[2]) : null, Number(tt[2]), "/kVA"); });
    (B.mv.Sen.S2_tiers || []).forEach((tt, i) => { const ta = (A.mv.Sen.S2_tiers || [])[i]; h += t(`ΜΤ – Σ2 κλίμακα ${i + 1}: ${fmt(tt[0], 0)} – ${tt[1] === null ? "…" : fmt(tt[1], 0)} kVA·km`, ta ? Number(ta[2]) : null, Number(tt[2]), "/kVA·km"); });
    h += t("ΜΤ – ποσοστό επιβάρυνσης καταναλωτή επί του κόστους σύνδεσης", `${fmt(Number(A.mv.share_pct || 100), 0)} %`, `${fmt(Number(B.mv.share_pct || 100), 0)} %${Number(B.mv.share_pct || 100) < 100 ? " + πλήρες κόστος μετρητή" : ""}`);
    h += t("Σγ / Σ3 – νησιά με αυτόνομο σταθμό (€/kVA, δεν υπολογίζεται)", A.lv.Sg_eur_kva || null, B.lv.Sg_eur_kva || null, "/kVA");
    const pay = p => (p && p.payment) || {};
    const pa = pay(sets.find(p => String(p.id) === ha)), pb = pay(sets.find(p => String(p.id) === hb));
    if (pb.min_installment_eur) h += t("Καταβολή: ελάχιστη δόση · προκαταβολή Δήμων / Κοινοτήτων · όριο εγγυητικής", `${eur(pa.min_installment_eur || 0)} · ${eur(pa.advance_municipalities_eur || 0)} / ${eur(pa.advance_communities_eur || 0)} · ${eur(pa.bank_guarantee_threshold_eur || 0)}`, `${eur(pb.min_installment_eur)} · ${eur(pb.advance_municipalities_eur || 0)} / ${eur(pb.advance_communities_eur || 0)} · ${eur(pb.bank_guarantee_threshold_eur || 0)}`);
    $("s_ptable").innerHTML = h;
    const notes = [];
    sets.forEach(p => { notes.push(`<b>${esc(String(p.id))}</b>: ${esc(p.source || p.label)}${p.url ? ` – <a href="${esc(p.url)}" target="_blank" rel="noopener">ΦΕΚ (PDF)</a>` : ""}`); (p.notes || []).forEach(n => notes.push(esc(n))); });
    if (cur.mv.share_rule) notes.push(esc(cur.mv.share_rule));
    const est = (sets.find(p => p.estimator_url) || {}).estimator_url;
    if (est) notes.push(`Αντιπαραβολή με τον εκτιμητή κόστους σύνδεσης του ΔΕΔΔΗΕ: <a href="${esc(est)}" target="_blank" rel="noopener">${esc(est)}</a> (απαιτεί σύνδεση μέσω ΓΓΠΣ).`);
    $("s_pnotes").innerHTML = notes.map(x => `<li>${x}</li>`).join("");
  }
  function renderSym() {
    if (!SYM || !$("s_result")) return;
    const LV = SYM.rules.lv, MVr = SYM.rules.mv;
    const inp = symInputs();
    const r = SYM.lv(inp);
    const hasNo7 = (inp.counts["Νο 7"] || 0) > 0;
    document.querySelectorAll('#tab-sym [data-show="no7"]').forEach(el => el.classList.toggle("hidden", !hasNo7));
    document.querySelectorAll('#tab-sym [data-show="special"]').forEach(el => el.classList.toggle("hidden", inp.special === "NONE"));
    $("s_old_wrap").classList.toggle("hidden", !(inp.kind === "INC" || inp.kind === "TEMP2PERM"));
    document.querySelectorAll("#s_counts [data-sym='own']").forEach(el => { const own = $("s_src").value === "OWN"; el.disabled = !own; if (!own) el.value = ST.counts[el.dataset.no] || 0; });
    const fc = (k, v, s, cls) => `<div class="factor ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ""}</div></div>`;
    const kindTxt = { NEW: "νέα ηλεκτροδότηση", TEMP: "προσωρινή (½ Σα)", INC: "αύξηση ισχύος (χωρίς Σπ)", TEMP2PERM: "μετατροπή προσωρινής σε οριστική (½ Σα προσωρινής + αύξηση)" }[r.kind] || r.kind;
    if (!r.n) {
      $("s_result").className = "result warn"; $("s_big").innerHTML = "—<small>συμπληρώστε τις παροχές (καρτέλα «Επιλογή παροχής» ή ιδιαίτερη εισαγωγή στον πίνακα)</small>"; $("s_line1").textContent = ""; $("s_line2").textContent = "";
      $("s_facts").innerHTML = ""; $("s_rows").innerHTML = ""; $("s_sd").innerHTML = ""; $("s_notes").innerHTML = "";
    } else {
      $("s_result").className = "result";
      $("s_big").innerHTML = `Σ = ${eur(r.total)}<small>Σπ ${eur(r.Sp)} + Σα ${eur(r.Sa)} + Σδ ${eur(r.Sd)}${r.extras_sum ? " + λοιπά " + eur(r.extras_sum) : ""} · ${r.n} παροχ${r.n === 1 ? "ή" : "ές"} · διαμέρισμα ${GRL[r.district]} · ${kindTxt}${r.special !== "NONE" ? (r.special === "EXC" ? " · εξαιρετικές ιδιομορφίες" : " · απρόσιτη περιοχή") : ""}</small>`;
      $("s_line1").textContent = `Σπ = πάγιο ${eur(r.Sp_rate)} ανά παροχή (μετρητή) · Σα = συμμετοχή ισχύος τριφασικών παροχών: μη οικιακές α·(N − 10) με α = ${eur(r.alpha)}/kVA, οικιακές κλιμακωτά (${(r.res_tiers || []).map(v => fmt(v, 2)).join(" / ")} €/kVA) · Σδ = συμμετοχή δικτύου & Υ/Σ ανά ομάδα παροχών (L = ${fmt(r.L_m, 0)} m, R = ${fmt(r.R_m, 0)} m${r.dlk !== null ? `, δ·Lκ = ${eur(r.dlk)}` : ""}).`;
      $("s_line2").textContent = `Πίνακας Τιμών ${r.prices_label || "των τευχών (2007)"} – οι τιμές είναι παράμετροι (data.js → particip, επιλογή πίνακα στην κάρτα 1)· ελέγξτε τις ισχύουσες τιμές του ΔΕΔΔΗΕ (εκτιμητής apps.deddie.gr/ccrWebapp) πριν από την έκδοση προσφοράς.`;
      $("s_facts").innerHTML = fc("Σπ – παροχή", eur(r.Sp), (r.kind === "INC" || r.kind === "TEMP2PERM" || r.special === "INACC") ? "χωρίς Σπ" : `${r.n} × ${eur(r.Sp_rate)}`) +
        fc("Σα – ισχύς", eur(r.Sa), r.Sa_old ? `νέα ${eur(r.Sa_new)} − υφιστ. ${eur(r.Sa_old)}${r.kind === "TEMP2PERM" ? " + ½ υφιστ." : ""}` : "τριφασικές παροχές") +
        fc("Σδ – δίκτυο", eur(r.Sd), r.sd_rows.map(x => `${GRL[x.group]}: ${eur(x.Sd)}`).join(" · ") || "—") +
        (r.extras_sum ? fc("Λοιπά", eur(r.extras_sum), `${r.extras.length} χρεώσ${r.extras.length === 1 ? "η" : "εις"}`) : "") +
        fc("ΣΥΝΟΛΟ", eur(r.total), "Σπ + Σα + Σδ" + (r.extras_sum ? " + λοιπά" : ""), "res");
      $("s_rows").innerHTML = "<tr><th>Παροχή</th><th>Πλήθος</th><th>οικ. / μη οικ.</th><th>N (kVA)</th><th>Ομάδα</th><th>Σπ (€)</th><th>Σα ανά παροχή οικ. / μη οικ. (€)</th><th>Σα (€)</th><th>Σδ ανά παροχή (€)</th><th>Συμμετοχή ανά παροχή οικ. / μη οικ. (€)</th></tr>" +
        r.rows.map(x => `<tr><td class="l"><b>${esc(x.no)}</b> (${x.phases === 1 ? "1Φ" : "3Φ"})</td><td>${x.n}</td><td>${x.n_res} / ${x.n_nonres}</td><td>${x.N || "—"}</td><td>${GRL[x.group]}</td><td>${eur(x.Sp)}</td><td>${eur(x.Sa_each_res)} / ${eur(x.Sa_each_nonres)}${x.Sa_parts && x.Sa_parts.length ? `<br><span class="muted small">οικ.: ${x.Sa_parts.map(pp => `${fmt(pp.qty, 0)} kVA × ${eur(pp.rate)}`).join(" + ")}</span>` : ""}</td><td>${eur(x.Sa)}</td><td>${eur(x.Sd_each)}</td><td>${eur(x.each_res)} / ${eur(x.each_nonres)}</td></tr>`).join("");
      $("s_sd").innerHTML = "<tr><th>Ομάδα παροχών / χρέωση</th><th>Παροχές</th><th>Υπολογισμός</th><th>Ποσό (€)</th><th>ανά παροχή (€)</th></tr>" +
        r.sd_rows.map(x => `<tr><td class="l">Σδ ${esc(SYM.groupLabel[x.group] || x.group)}</td><td>${x.n}</td><td class="l small">${esc(x.how)}</td><td>${eur(x.Sd)}</td><td>${eur(x.Sd_each)}</td></tr>`).join("") +
        r.extras.map(e => `<tr><td class="l">${esc(e.item)}</td><td>${e.qty}</td><td class="l small">× ${eur(e.rate)}</td><td>${eur(e.amount)}</td><td></td></tr>`).join("");
      $("s_notes").innerHTML = (LV.Sd.rules || []).slice(0, 8).map(t => `<li>${esc(t)}</li>`).join("");
    }
    const ps = SYM.priceSet ? SYM.priceSet(inp.prices) : null;
    if ($("s_pset_info")) $("s_pset_info").innerHTML = ps ? `${esc(ps.source || "")}${ps.url ? ` – <a href="${esc(ps.url)}" target="_blank" rel="noopener">ΦΕΚ</a>` : ""}` : "";
    renderPriceTable(inp.prices);
    // ΜΤ
    const i2 = symInputsMV();
    document.querySelectorAll("#tab-sym [data-cases]").forEach(el => el.classList.toggle("hidden", !el.dataset.cases.split(" ").includes(i2.case)));
    const m = SYM.mv(i2);
    const RRm = SYM.priced ? SYM.priced(i2.prices) : SYM.rules;
    const supOpts = $("v2_sup").options;
    if (supOpts.length >= 2) { supOpts[0].text = `Εναέρια (δ = ${eur(RRm.mv.Sep.delta_overhead_eur_m)}/m)`; supOpts[1].text = `Υπόγεια (δ = ${eur(RRm.mv.Sep.delta_underground_eur_m)}/m)`; }
    if ($("v2_meter_wrap")) $("v2_meter_wrap").classList.toggle("hidden", !(m.share_pct < 100));
    const caseLabel = ((MVr.cases || []).find(c => c.key === m.case) || {}).label || m.case;
    const ok = m.N_kva > 0;
    $("s2_result").className = "result" + (ok ? "" : " warn");
    const shareTxt = m.share_pct < 100 ? ` · κόστος σύνδεσης ${eur(m.conn_cost)} → ${fmt(m.share_pct, 0)}% (Ε-114/2026)${m.meter_eur ? ` + μετρητής ${eur(m.meter_eur)} πλήρως` : " (μετρητής: δώστε το κόστος του – καταβάλλεται πλήρως)"}` : "";
    $("s2_big").innerHTML = ok ? `Σ = ${eur(m.total)}<small>Χ = ${fmt(m.X, 2)} · Σπ ${eur(m.Sp)} + Σεπ ${eur(m.Sep)} + Σεν ${eur(m.Sen)}${m.extra_eur ? " + πρόσθετη " + eur(m.extra_eur) : ""}${shareTxt} · N = ${fmt(m.N_kva, 0)} kVA${m.N_old_kva ? ` (προηγούμενη ${fmt(m.N_old_kva, 0)} kVA)` : ""}${m.N_raw && m.N_raw !== m.N_kva && !m.stations.length ? ` (από ${fmt(m.N_raw, 0)} kVA, στρογγύλευση στα 50)` : ""} · ${esc(caseLabel)} · Πίνακας Τιμών ${esc(m.prices || "2007")}</small>` : `—<small>${esc(caseLabel)}: δώστε τη συμφωνημένη ισχύ${m.case === "IRR" || m.case === "DRAIN" ? " των αντλιοστασίων (πίνακας)" : ""}</small>`;
    $("s2_line1").textContent = m.how;
    const spTxt = (m.case === "INC_MV" || m.case === "TEMP2PERM" || (m.case === "RECON" && !m.removed)) ? `πραγματική δαπάνη παροχής ${eur(m.dp_actual_eur)}` : (m.stations.length ? `Σ(μέτρηση + προστασία) των ${m.stations.length} αντλιοστασίων` : `μετρητική διάταξη ${eur(m.metering_eur)} (${m.metering === "P43" ? "P-43" : "BK1"}) + προστασία ${eur(m.protection_eur)}${m.b_extra_eur ? " + εγκαταστάσεις " + eur(m.b_extra_eur) : ""}`) + (m.sp_lv ? ` − Σπ(ΧΤ) ${eur(m.sp_lv)}` : "");
    $("s2_line2").textContent = `Σπ = ${spTxt} · Σεπ = δ·Lεπ = ${eur(m.delta)}/m × ${fmt(m.Lep_m, 0)} m = ${eur(m.Sep_calc)}${m.Sep !== m.Sep_calc ? ` (εφαρμόζεται ${eur(m.Sep)})` : ""} · Σ1 κλιμακωτά ανά kVA (${fmt(m.N_kva, 0)} kVA) · Σ2 κλιμακωτά ανά kVA·km (${fmt(m.kvakm, 0)} kVA·km, L = ${fmt(m.L_km, 2)} km)${m.sa_lv ? ` · Σα(ΧΤ) = ${eur(m.sa_lv)}` : ""}.`;
    $("s2_facts").innerHTML = fc("Σπ", eur(m.Sp), "δαπάνη παροχής") + fc("Σεπ", eur(m.Sep), `${fmt(m.Lep_m, 0)} m ${m.ep_supply === "UG" && m.case !== "SPECIAL" ? "υπόγεια" : "εναέρια"}`) + fc("Σ1 (kVA)", eur(m.S1), `${fmt(m.N_kva, 0)} kVA`) + fc("Σ2 (kVA·km)", eur(m.S2), `${fmt(m.kvakm, 0)} kVA·km`) + fc("Σεν", eur(m.Sen), m.Sen_old ? `νέα ${eur(m.Sen_new)} · προηγ. ${eur(m.Sen_old)}` : "ενίσχυση εγκαταστάσεων") +
      (m.share_pct < 100 ? fc("Κόστος σύνδεσης", eur(m.conn_cost), "Χ·(Σπ + Σεπ + Σεν) – 100%") + fc("ΣΥΝΟΛΟ", eur(m.total), `${fmt(m.share_pct, 0)}% × (κόστος − μετρητής) + μετρητής ${eur(m.meter_eur)}` + (m.extra_eur ? " + πρόσθετη" : ""), "res") : fc("ΣΥΝΟΛΟ", eur(m.total), "Χ·(Σπ + Σεπ + Σεν)" + (m.extra_eur ? " + πρόσθετη" : ""), "res"));
    $("s2_rows").innerHTML = "<tr><th>Κλίμακα / στοιχείο</th><th>Ποσότητα</th><th>Τιμή</th><th>Ποσό (€)</th></tr>" +
      m.stations.map(st => `<tr><td class="l">Αντλιοστάσιο ${st.i}: N = ${fmt(st.N_kva, 0)} kVA, L = ${fmt(st.L_km, 2)} km, Lεπ = ${fmt(st.Lep_m, 0)} m</td><td>${fmt(st.NL, 0)} kVA·km</td><td class="small">${esc(st.protection_label)}</td><td>Δπ ${eur(st.Dp)}</td></tr>`).join("") +
      m.S1_parts.map(pp => `<tr><td class="l">Σ1: ${fmt(pp.from, 0)} – ${pp.to === null ? "…" : fmt(pp.to, 0)} kVA</td><td>${fmt(pp.qty, 0)} kVA</td><td>${eur(pp.rate)}/kVA</td><td>${eur(pp.amount)}</td></tr>`).join("") +
      m.S2_parts.map(pp => `<tr><td class="l">Σ2: ${fmt(pp.from, 0)} – ${pp.to === null ? "…" : fmt(pp.to, 0)} kVA·km</td><td>${fmt(pp.qty, 0)} kVA·km</td><td>${eur(pp.rate)}/kVA·km</td><td>${eur(pp.amount)}</td></tr>`).join("");
    $("s2_notes").innerHTML = (MVr.cases || []).filter(c => c.key === m.case).map(c => `<li>${esc(c.formula)}</li>`).join("") + (m.share_pct < 100 && RRm.mv.share_rule ? `<li>${esc(RRm.mv.share_rule)}</li>` : "") + (MVr.Sen.rules || []).slice(0, 2).map(t => `<li>${esc(t)}</li>`).join("");
    if ($("s_rules") && !$("s_rules").innerHTML) $("s_rules").innerHTML = (LV.Sd.rules || []).concat(LV.Sa.notes || [], (LV.other || {}).increase_rules || [], (LV.other || {}).clusters_rules || [], (LV.other || {}).special_rules || [], MVr.Sen.rules || [], Object.values(MVr.special || {}).filter(x => typeof x === "string")).map(t => `<li>${esc(t)}</li>`).join("");
  }

  // ---------------------------------------------------------------- tables tab
  const TABLE_SECTIONS = window.APP_TABLE_SECTIONS = [["sup", "Παροχές ΟΔ.22 & ταυτοχρονισμός"], ["cat", "Κατάλογος καλωδίων παροχής"], ["cs3", "CS-3 / CS-3A ανοίγματα"], ["clr", "Αποστάσεις ασφαλείας C-1…C-23 · υπόγεια U-2…U-5A · ΟΔ.38 · εγκύκλιοι"], ["md", "Κατάλογος ΜΔ"], ["fd", "Μ/Σ, αγωγοί, ασφάλειες, ΜΤ"], ["od26", "Πίνακες ΟΔ.26"], ["mat", "Κατάλογος υλικών"]];
  function renderTables() {
    const sb = $("subtabs");
    sb.innerHTML = TABLE_SECTIONS.map(([k, t], i) => `<button data-st="${k}" class="${i === 0 ? "active" : ""}">${t}</button>`).join("");
    sb.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { sb.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b)); document.querySelectorAll("#tables .stab").forEach(d => d.classList.toggle("hidden", d.dataset.st !== b.dataset.st)); }));
    const card = (title, body) => `<div class="card"><h2>${title}</h2>${body}</div>`;
    const grid = (heads, rows, leftCols = 1) => `<div style="overflow-x:auto"><table class="grid"><tr>${heads.map(x => `<th>${x}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i < leftCols ? "l" : ""}">${c === null || c === undefined ? "—" : c}</td>`).join("")}</tr>`).join("")}</table></div>`;
    const notes = lst => `<ul class="notes small">${lst.map(t => `<li>${t}</li>`).join("")}</ul>`;
    const T = $("tables");
    let out = "";
    // --- supplies
    let b = grid(["Παροχή", "Φ", "kVA", "Φορτίο εργαλείου (A)", "Φορτίο ΟΔ.22 (A)", "Γενική ασφ. (A)", "Ασφ. μετρητή (A)", "Μικροαυτ. (A)", "Ελάχ. ασφ. αναχ. δίκτυο / μεμονωμ. (A)", "Μετρητής", "Καλώδιο ΟΔ.22", "Γραμμή πίνακα-μετρητή", "Ελάχ. Μ/Σ δίκτυο / μεμονωμ. (kVA)", "Ισοδ. 1Φ", "Θέσεις"],
      SUPS.map(s => [s.no, s.phases, s.kva, s.load_A, s.load_A_od22, s.gen_fuse, s.meter_fuse || "—", s.meter_mcb || "—", `${s.feeder_fuse_net} / ${s.feeder_fuse_iso}`, s.meter, s.cable_conc + (s.cable_xlpe ? " / " + s.cable_xlpe : ""), s.panel_line, `${s.min_ms_kva} / ${s.min_ms_kva_iso === undefined ? s.min_ms_kva : s.min_ms_kva_iso}`, s.eq1f, s.slots]));
    b += notes(D.supplies_notes);
    const co = D.coincidence_od45, ks = Object.keys(co).map(Number).sort((a, b2) => a - b2);
    b += "<h3 class='tt'>Συντελεστής ταυτοχρονισμού Kn – ΟΔ.45 Πίν. ΙΙ</h3><div style='display:flex;flex-wrap:wrap;gap:6px'>" + ks.map(n => `<span class="chip">${n}: <b>${co[n]}</b></span>`).join("") + "</div>";
    out += `<div class="stab" data-st="sup">${card("Παροχές ΟΔ.22 (Πίν. 11.1 / 11.2) – φορτία & ταυτοχρονισμός", b)}</div>`;
    // --- catalogue
    b = grid(["Καλώδιο", "Τύπος", "Φ", "S", "Παρ.", "ΟΔ.26 έδαφος", "ΟΔ.26 σωλήνα > 6 m", "ΟΔ.26 αέρα ελεύθ.", "ΟΔ.26 επιτοίχια", "ΟΔ.45 έδαφος", "ΟΔ.45 σωλήνα", "ΟΔ.45 αέρα", "Υλικό"],
      D.supply_cables.map(c => [c.name, c.kind === "conc" ? "συγκεντρικό" : "XLPE", c.phases, c.s_phase, c.parallel, c.od26 ? c.od26.ground : "—", c.od26 ? c.od26.pipe : "—", c.od26 ? c.od26.air : "—", c.od26 ? c.od26.air_wall : "—", c.od45.ground, c.od45.pipe, c.od45.air, c.bom_item]));
    b += notes(D.supply_cable_notes);
    b += "<h3 class='tt'>ΟΔ.45 Πίν. ΙΙ (1983) – μόνο αναφορά</h3>" + grid(["1Φ μετρητές", "Ανά φάση", "Φορτίο (A)", "Εναέρια", "Υπόγεια – έδαφος", "Υπόγεια – σωλήνα"], D.od45.table_II.map(r => [r.n_from === r.n_to ? r.n_from : `${r.n_from} – ${r.n_to}`, r.per_phase, r.load, r.oh, r.ground, r.pipe]));
    out += `<div class="stab hidden" data-st="cat">${card("Κατάλογος καλωδίων παροχής – επιτρεπόμενες εντάσεις (A)", b)}</div>`;
    // --- CS-3
    const sp = D.typ.cs3_cu, spa = D.typ.cs3a_al, SPANS = sp.spans;
    const cs = (tab, lab) => grid(["Καλώδιο", "kg/m", "Ø mm", "Τυποπ. άνοιγμα ελ./μέση (m)", "βαριά (m)", "Τάνυση με επίτονο ελ. / μέση / βαριά (kg)"].concat(SPANS.map(s => `Β.1 ελ/μέση ${s} m`)).concat(SPANS.map(s => `Β.1 βαριά ${s} m`)),
      tab.cables.map(c => [c.size + lab, c.kg_m.toFixed(2), c.d_mm, c.max_span_LM, c.max_span_H, `${c.tension_guy.L} / ${c.tension_guy.M} / ${c.tension_guy.H}`].concat(c.sag_LM.map((v, i) => v === null ? "—" : v.toFixed(2) + ((c.star || []).indexOf(SPANS[i]) >= 0 ? "*" : ""))).concat(c.sag_H.map(v => v === null ? "—" : v.toFixed(2)))));
    const PRr = D.typ.span_rules.pole_rules;
    b = "<h3 class='tt'>Κανόνες γραφείου – όρια ανά καλώδιο</h3>" + grid(["Καλώδιο", "Όριο ανοίγματος σε στυλίσκο (m)", "Στυλίσκος 4\" όταν L > (m)", "Συρματόσχοινο σε γάντζο όταν L > (m)", "Τυποπ. άνοιγμα CS-3 ελ./μέση – βαριά (m)"],
      sp.cables.map(c => [c.size, PRr.limit_by_cable_m[c.size] !== undefined ? PRr.limit_by_cable_m[c.size] : c.max_span_LM, PRr.big_cables.indexOf(c.size) >= 0 ? PRr.pipe_big_from_m : "—", D.typ.span_rules.messenger_by_cable_m[c.size] !== undefined ? D.typ.span_rules.messenger_by_cable_m[c.size] : D.typ.span_rules.messenger_span_m, `${c.max_span_LM} – ${c.max_span_H}`])) +
      notes([PRr.note, "Γάντζος βαρέως τύπου: όταν το άνοιγμα L υπερβαίνει το τυποποιημένο άνοιγμα του καλωδίου χωρίς επίτονο (CS-3 Πίν. Β.1).", "Μέγιστο άνοιγμα σε γάντζο κατά C-3: 2x6 35, 2x16 30, 4x6 30, 4x16 25, 4x25 25, 4x35 20, 4x50 20 m – πάνω από αυτό συρματόσχοινο (ΜΟΝΟ σε στήριξη με γάντζο).", D.typ.span_rules.note]) +
      "<h3 class='tt'>CS-3 – Συγκεντρικά Cu (ΙΑΝ.1983)</h3>" + cs(sp, " Cu") + `<div class="muted small">Βέλη με επίτονο F-21S (Πίν. Α.1, όλα τα καλώδια): ${SPANS.map(s => `${s} m → ${sp.sag_with_guy[String(s)].toFixed(2)} m`).join(" · ")}. Μέγιστη τάνυση χωρίς επίτονο ${sp.max_tension_no_guy_kg} kg.</div>` +
      "<h3 class='tt'>CS-3A – Συγκεντρικά Al (πληροφοριακά)</h3>" + cs(spa, " Al") + `<div class="muted small">${spa.note}</div>`;
    out += `<div class="stab hidden" data-st="cs3">${card("Ανοίγματα παροχής – ΔΕΗ CS-3 / CS-3A", b)}</div>`;
    // --- clearances: μεταφέρθηκαν στην καρτέλα «Αποστάσεις ασφαλείας» (σχέδια + πίνακες σε drop-down)
    const nUg = Object.keys(D.typ.clearances).filter(k => k.startsWith("ug_")).length, nClr = Object.keys(D.typ.clearances).length - nUg, nDocs = (D.typ.safety_docs || []).length;
    out += `<div class="stab hidden" data-st="clr">${card("Αποστάσεις ασφαλείας – C-1 … C-23 · υπόγεια καλώδια U-2 … U-5A · ΟΔ.38 · εγκύκλιοι", `<p>Οι ${nClr} τυποποιήσεις C-1 … C-23, οι ${nUg} ομάδες κατασκευών υπόγειων καλωδίων του ΕΤΚΔ Κεφ. U (χάνδακες, διαβάσεις οδών, κλίσεις, γειτνιάσεις U-3/U-3I/U-3A, διασταυρώσεις U-4I…U-4A, διαβάσεις U-5/U-5A) και τα ${nDocs} έγγραφα (ΟΔ.38 και εγκύκλιοι για κολυμβητήρια, ανεμογεννήτριες, βιοαέριο, πρατήρια καυσίμων / υδρογόνου, αγωγούς ΔΕΣΦΑ) παρουσιάζονται με <b>μιμικά σχέδια</b> στην καρτέλα «Αποστάσεις ασφαλείας»· κάτω από κάθε σχέδιο ανοίγει ο πλήρης πίνακας τιμών με τις σημειώσεις.</p><div class="btnrow noprint"><button class="btn" id="tbl_goto_clr">Άνοιγμα της καρτέλας «Αποστάσεις ασφαλείας» ↗</button></div>`)}</div>`;
    // --- ΜΔ catalogue
    b = grid(["ΜΔ", "Τίτλος", "Ομάδα", "Πηγή", "Πότε", "Βασικά στοιχεία / διαστάσεις"], D.md.catalog.map(m => [esc(m.code), esc(m.title), esc(m.group || "ΟΔ.45 διατάξεις"), esc(m.src), esc(m.why), esc(m.dims)]), 2) +
      "<h3 class='tt'>Είδη εγκατάστασης → τυποποιήσεις</h3>" + grid(["Είδος", "Εφαρμοζόμενες ΜΔ"], D.md.use_types.map(u => [esc(u.label), esc(u.note)]), 1);
    out += `<div class="stab hidden" data-st="md">${card("Κατάλογος τυποποιημένων μετρητικών διατάξεων (ΜΔ) – ΟΔ.45 1982/1983/2007, ΔΕΔΔΗΕ 2024–2026, προσωρινές παροχές, οδηγίες 1984", b)}</div>`;
    // --- feeder / MV data
    b = "<h3 class='tt'>Μ/Σ διανομής – Πίν. Β2-8 & Β2-9Α</h3>" + grid(["kVA", "Μέγ. ασφ. ΧΤ (A)", "Ασφ. εκτόνωσης 15 kV", "20 kV", "Ασφ. κόνεως", "RM (mΩ)", "XM (mΩ)", "Χρήση"], D.transformers.map(t => t.standard ? [`<b>${t.kva}</b>`, t.max_lv_fuse, t.exp_15, t.exp_20, t.powder, t.RM, t.XM, "<span class='ok'>τυποποιημένος</span>"] : [`<span class="muted">${t.kva}</span>`, t.max_lv_fuse, t.exp_15, t.exp_20, t.powder, t.RM, t.XM, "<span class='muted'>μόνο αναφορά</span>"])) +
      `<div class="muted small">${esc(D.transformer_notes[0])}</div>` +
      "<h3 class='tt'>Αγωγοί / καλώδια αναχωρήσεων ΧΤ – Β2-3/Β2-4/Β2-9</h3>" + grid(["Αγωγός", "Τύπος", "I_max (A)", "R", "X", "R βραχ.", "X βραχ.", "K (0,9)", "Πηγή"], D.lv_feeder_conductors.map(c => [c.name, c.type === "overhead" ? "εναέριο" : "υπόγειο", c.I_max, c.R, c.X, c.R_sc, c.X_sc, c.K09, c.src])) +
      "<h3 class='tt'>Τυποποιημένα φυσίγγια ΧΤ (GR-207) & κανόνες αναχώρησης</h3><div style='display:flex;flex-wrap:wrap;gap:6px'>" + D.lv_fuse_sizes.map(f => `<span class="chip">${f} A</span>`).join("") + "</div>" +
      notes([`Ιασφ ≥ ${D.feeder_rules.fuse_margin} × Ι φορτίου (ΟΔ.22 §5.1) · ${D.feeder_rules.sc_factor} × Ιασφ ≤ Ιβρ · παροχή 2x6 Cu ${D.feeder_rules.supply_Lp_m} m (R = ${D.feeder_rules.supply_Rp_ohm_km} Ω/km) στο άκρο · ΔU ≤ ${D.feeder_rules.voltage_drop_limit_pct} % (αρδευτικά ${D.feeder_rules.voltage_drop_limit_irrig_pct} %) · S_M ≥ S / ${D.feeder_rules.transformer_load_factor}.`, D.feeder_rules.note_Lp]) +
      "<h3 class='tt'>Πελάτες ΜΤ – ΟΔ.34 & ΔΠΑ 1990</h3>" + grid(["Τύπος", "Περιγραφή", "Πίνακας"], D.mv.types.map(t => [t.code, t.label, t.panel]), 2) + notes(D.mv.rules) +
      grid(["Αγωγός γείωσης Cu (mm²)", "Μέγ. Ιβρ 1Φ προς γη, 1 s (A)"], D.mv.earthing_table.map(e => [e.s, e.I_A])) + grid(["Αγωγοί ΜΤ (Β2-1/Β2-2)", "I_max Εγχειριδίου 40 °C (A)", "MVA 20 kV", "MVA 15 kV"], D.mv.mv_conductors.map(c => [c.name, c.I_max, c.mva20, c.mva15])) +
      "<h3 class='tt'>Αγωγοί / καλώδια ΜΤ – μέγιστη φόρτιση κατά ΟΔ.26 3η έκδ. (βάση 50 °C) & R, X</h3>" + grid(["Αγωγός", "I_max ΟΔ.26 (A)", "I_max Εγχειριδίου 40 °C (A)", "R (Ω/km)", "X (Ω/km)", "Πηγή I_max"], D.vdrop.conductors.filter(c => c.group === "MT").map(c => [c.name, c.I_max, c.I_max_40 || "—", c.R, c.X, c.I_src || c.src])) +
      notes(["Οι έλεγχοι Ιεπ της καρτέλας «Πτώση τάσης» χρησιμοποιούν τις τιμές ΟΔ.26 (γυμνοί αγωγοί στους 50 °C με ηλιακή ακτινοβολία – Πίν. ΙΙ· ΣΚ ΜΤ στον αέρα με ηλιακή ακτινοβολία και υπόγεια στο έδαφος – Πίν. Ι)· οι 3x16 ACSR / 3x16 Cu δεν περιλαμβάνονται στην ΟΔ.26 και κρατούν τις τιμές του Εγχειριδίου (Β2-1, 40 °C)."]);
    out += `<div class="stab hidden" data-st="fd">${card("Μ/Σ, αγωγοί αναχωρήσεων, ασφάλειες, ΜΤ", b)}</div>`;
    out += `<div class="stab hidden" data-st="od26"><div id="od26tables"></div></div>`;
    b = grid(["Υλικό", "Κλάση", "Μονάδα", "Ομάδα"], D.materials.support.map(m => [m.item, m.cls, m.unit, "ΥΛΙΚΑ ΣΤΗΡΙΞΗΣ"]).concat(D.materials.main.map(m => [m.item, m.cls, m.unit, "ΚΥΡΙΑ ΥΛΙΚΑ"])));
    out += `<div class="stab hidden" data-st="mat">${card("Κατάλογος υλικών παροχέτευσης (Α.Π. 20631525)", b + "<div class='muted small'>Οι κωδικοί κλάσης όπως στο έντυπο του γραφείου (ελλιπείς όπου υπάρχουν αποσιωπητικά).</div>")}</div>`;
    T.innerHTML = out;
    window.OD26APP.renderTables($("od26tables"));
    $("tbl_goto_clr").addEventListener("click", () => switchTab("clr"));
  }

  // ---------------------------------------------------------------- help
  function renderHelp() {
    const src = Object.values(D.meta.sources).map(s => `<li>${s}</li>`).join("");
    $("help").innerHTML = `
<h2>Αρχική οθόνη & drop-down</h2>
<p>Η εφαρμογή ανοίγει στην <b>Αρχική</b> με εικονίδια ανά εργασία (όπως ο Πυθαγόρας) – δεν υπάρχει γραμμή καρτελών· η επιστροφή γίνεται με το κουμπί «‹ Αρχική» και η <b>αναζήτηση</b> στην πάνω γραμμή βρίσκει καρτέλες, σχέδια ΕΤΚΔ (κωδικό ή λέξη του τίτλου), κατασκευές, ΜΔ, παροχές, καλώδια, κανόνες, πίνακες, γενικές πληροφορίες και αποστάσεις ασφαλείας και ανοίγει το αντίστοιχο σημείο (με επισήμανση). Οι <b>κανόνες, οι πίνακες και οι επεξηγήσεις των οδηγιών</b> σε κάθε καρτέλα είναι κλειστά drop-down («Κανόνες …», «Πίνακας Β2-…», «ℹ Επεξήγηση», «Επεξηγήσεις / σημειώσεις») – ανοίγουν με ένα πάτημα και ανοίγουν όλα αυτόματα στην εκτύπωση. Τα αποτελέσματα και οι προειδοποιήσεις μένουν πάντοτε ορατά.</p>
<h2>Ροή εργασίας</h2>
<ol>
<li><b>Επιλογή παροχής:</b> πλήθη μετρητών ανά παροχή (Νο 03 … Νο 7), δίκτυο, απόσταση L, στήριξη, είδος εγκατάστασης. Υπολογίζονται αυτόματα: φορτίο (ΟΔ.22/ΟΔ.45 με Kn), είδος παροχής (ΟΔ.45 §4), καλώδιο για ΚΑΘΕ τρόπο εγκατάστασης με ΝΑΙ/ΟΧΙ, έλεγχος του L δίπλα στο πεδίο (στυλίσκος 3"/4" – 6 m εντός/εκτός ορίων · γάντζος με/χωρίς συρματόσχοινο) με σχήμα, απαιτούμενος Μ/Σ και ασφάλεια αναχώρησης από το πλήθος των παροχών, προτεινόμενη ΜΔ, αποστάσεις ασφαλείας με σχήματα. <b>Παροχή Νο 4 – περιβάλλον:</b> όταν υπάρχει Νο 4 εμφανίζεται η επιλογή «αστικό περιβάλλον / αρδευτική παροχή»· για αρδευτικές παροχές (μόνο Νο 4 στο συγκρότημα) ο Μ/Σ υπολογίζεται στα <b>50 kVA</b> και η ασφάλεια αναχώρησης περιορίζεται στα 80 A. <b>Μ/Σ δικτύου:</b> επιλέγονται μόνο οι τυποποιημένοι 50 / 100 / 160 / 250 / 400 / 630 / 1000 kVA (οι 15 / 25 / 75 / 150 / 200 kVA μένουν μόνο ως αναφορά στους πίνακες).</li>
<li><b>Μετρητική διάταξη:</b> διατάξεις 9+9 / 3+3 ανά διανομέα (Νο 4 = 6 θέσεις, το πολύ ένα ανά πλευρά)· <b>οι παροχές Νο 5, Νο 6 και Νο 7 τοποθετούνται ΜΟΝΕΣ τους</b>, χωρίς διανομέα, με την κυψέλη ΧΤ (60×80 cm) και δίπλα της το κιβώτιο του τριφασικού μετρητή (30×50 cm – όπως στη ΜΔ-75), <b>εκτός της διάταξης</b> των λοιπών μετρητών – κάθε μία σε ιδιαίτερη «διάταξη» σε στήλη δεξιά (κανόνας γραφείου· ΜΔ-75 / ΜΔ-83)· <b>πλήθος μετρητικών διατάξεων</b> 0 = αυτόματα (το ελάχιστο εφικτό) ή 1–4 κατ\u2019 επιλογή (ποτέ λιγότερες από τις απαιτούμενες) – οι μετρητές κάθε τύπου μοιράζονται <b>ισόποσα</b> στις διατάξεις· το πολύ <b>δύο σειρές</b>: η 1η διάταξη επάνω (κάτω άκρο κιβωτίων πάντοτε στα 1,50 m), η 2η κάτω από αυτήν (πάντοτε στα 0,80 m – ΟΔ.45 ΜΔ-7/ΜΔ-9), η 3η/4η σε στήλη δίπλα – οι <b>διανομείς πάντοτε ο ένας κάτω από τον άλλον</b> (ευθυγραμμισμένοι ανά στήλη, διάκενο 5 cm)· η εσοχή έχει 20 cm κάτω / 20 cm πάνω από τα κιβώτια (από 0,60 m με δύο σειρές, από 1,30 m με μία)· link box U2B2 / U2B4 σε υπόγειο δίκτυο· σχέδιο εσοχής που προσαρμόζεται στους μετρητές και σχήμα ελάχιστων αποστάσεων από πεζοδρόμιο / δρόμο· πρόταση ΜΔ κατά το είδος εγκατάστασης (ΟΔ.45 ΜΔ-3…15 με σχετικές σελίδες υλικών ΜΔ-2…14, συνδεσμολογιών ΜΔ-35…38, φρεατίων ΜΔ-51/52, κιβωτίων ΜΔ-53/54/55, διελεύσεων ΜΔ-61…66 · ΜΔ-71/72/73/74 εξοχικές · ΜΔ-75 τοιχίο · ΜΔ-77/79/81 μεταλλικές καμπίνες · ΜΔ-83 ηλεκτροφόρτιση · ΣΚ-ΠΠ προσωρινές παροχές · οδηγίες προς κατασκευαστές 1984) και σχέδια αναφοράς.</li>
<li><b>Υπόγεια καλώδια ανά διάταξη (κανόνας γραφείου):</b> σε υπόγεια παροχή κάθε μετρητική διάταξη (διανομέας ή κυψέλη Νο 5–7 μόνη της) τροφοδοτείται με <b>δικό της υπόγειο καλώδιο</b>, διαστασιολογημένο από το φορτίο της διάταξής της (μετρητές της διάταξης, Kn του Πίν. ΙΙ ΟΔ.45 για το πλήθος τους, ίδια γραμμή 1Φ/3Φ με το συγκρότημα – τα πρόσθετα φορτία χρεώνονται στην 1η διάταξη)· το <b>πλήθος των υπόγειων καλωδίων</b> ακολουθεί τις διατάξεις και τα φορτία και μπορεί να ξεπερνά τα 2 (π.χ. 3 διατάξεις → 3 καλώδια)· όταν το φορτίο μιας διάταξης δεν καλύπτεται ούτε από 2 παράλληλα καλώδια επιλέγονται <b>n ≥ 3 παράλληλα</b> του μεγαλύτερου XLPE (3x150Al+50Cu). Το αποτέλεσμα (καλώδιο, I_z', φόρτιση και πλήθος ανά διάταξη, σύνολο καλωδίων) φαίνεται στην κάρτα του αποτελέσματος, στον πίνακα «8β» και στην καρτέλα «Μετρητική διάταξη» (πίνακας 4β και σχέδιο με τα καλώδια κάθε διανομέα)· τα μήκη των υλικών αθροίζουν όλα τα καλώδια. Με μία διάταξη το καλώδιο ταυτίζεται με το καλώδιο του συγκροτήματος· στην εναέρια παροχή υπολογίζεται ένα καλώδιο για όλο το συγκρότημα, όπως πριν. Από την κάρτα του αποτελέσματος το κουμπί «Μετρητική διάταξη ›» ανοίγει κατευθείαν την καρτέλα της διάταξης.</li>
<li><b>Υπόγεια παροχή – εσοχή & φρεάτιο (κανόνας γραφείου / Οδηγίες κατασκευής παροχής ΔΕΔΔΗΕ):</b> σε υπόγεια παροχή η εσοχή της μετρητικής διάταξης είναι <b>ανοιχτή μέχρι το δάπεδο</b> (από 0,00 m) και στη βάση του ερμαρίου κατασκευάζεται από τον πελάτη <b>φρεάτιο διελεύσεως ΜΔ-51 τύπου Ι</b> (80×60 cm, βάθος 70 cm, κάλυμμα μπακλαβωτή λαμαρίνα) από το οποίο ανεβαίνουν τα υπόγεια καλώδια· φαίνεται στο σχέδιο της διάταξης, στους υπολογισμούς (ύψος εσοχής από το δάπεδο) και στα υλικά (υποχρεώσεις πελάτη). <b>Μέγιστο υπόγειο καλώδιο:</b> το 3x150Al+50Cu XLPE – όταν το φορτίο ξεπερνά το 4x50 Cu δεν τοποθετείται δεύτερο καλώδιο μικρότερης διατομής αλλά εξαντλείται η ικανότητα του 3x150 και μετά παράλληλα 3x150 (2, 3 …).</li>
<li><b>Υποχρεώσεις πελάτη (κανόνες γραφείου):</b> σε παροχή με υπόγειο καλώδιο απαιτείται <b>σιδηροσωλήνας γαλβανιζέ 4" μήκους 1,50 m</b> για την προστασία κάθε υπόγειου καλωδίου, τοποθετημένος από τον πελάτη (ένας ανά υπόγειο καλώδιο – π.χ. 3 υπόγεια καλώδια → 3 σωλήνες)· <b>γείωση πελάτη</b>: ελάχιστη <b>25 mm² Cu</b> για κάθε μετρητική διάταξη, βάσει παροχής έως <b>50 mm² Cu</b> (Νο 5–7) – κατ' εξαίρεση στις μεγάλες παροχές <b>Νο 6 → 70 mm² Cu</b> και <b>Νο 7 → 2×50 mm² Cu ή 2×70 mm² Cu</b>. Εμφανίζονται στις σημειώσεις του αποτελέσματος, στον πίνακα των διατάξεων (στήλη «Γείωση πελάτη») και στην καρτέλα «Υλικά» (πίνακας «Υποχρεώσεις πελάτη»)· οι τιμές ανά παροχή είναι παράμετροι στο Excel (φύλλο ΥΛΙΚΑ).</li>
<li><b>Υλικά:</b> πίνακας υλικών παροχέτευσης (έντυπο ΔΕΔΔΗΕ) – «ΑΠΑΙΤΟΥΝΤΑΙ» (τοποθέτηση) και «ΓΙΑ ΑΠΟΜΑΚΡΥΝΣΗ» (αποξήλωση) από τα στοιχεία της υφιστάμενης εγκατάστασης που δηλώνετε. Οι στήλες «ΤΟΠΟΘΕΤΗΘΗΚΑΝ / ΑΠΟΜΑΚΡΥΝΘΗΚΑΝ» συμπληρώνονται από το συνεργείο.</li>
<li data-needs="feeder"><b>Αναχώρηση Μ/Σ:</b> ασφάλεια (≥ 1,3·I, ≤ Iεπ, ≤ μέγ. ασφάλεια Μ/Σ), βραχυκύκλωμα (3·Ιασφ ≤ Ιβρ), πτώση τάσης, επάρκεια Μ/Σ (S/0,7) και μέχρι πόσες παροχές κάθε τύπου μπορεί ακόμη να δεχθεί.</li>
<li data-needs="ys"><b>Υ/Σ – Μ/Σ:</b> εναέριοι υποσταθμοί διανομής – ασφάλειες ΜΤ προστασίας Μ/Σ από την ισχύ και την τάση (Εγχειρίδιο Πίν. Β2-8 = ΟΔ.22 Πίν. Ι), μέγιστη ασφάλεια ΧΤ, ρεύμα ζεύξης (12×In), ασφάλεια διακλάδωσης Τ και συνεργασία κατά ΟΔ.21 (Πίν. V), παράλειψη ασφαλειών ΧΤ (ΟΔ.22 §7, Πίν. Β2-14), στήριξη Μ/Σ (μονόστυλο / δίστυλο), κανόνες και πίνακες ΟΔ.21/22/41.</li>
<li data-needs="vd"><b>Πτώση τάσης:</b> γραμμή ΧΤ ή ΜΤ (0,4 / 20 / 15 / 6,6 kV) σε τμήματα από τον Μ/Σ προς το άκρο με αγωγό, μήκος και φορτίο κόμβου (kVA ή A)· πτ% = kVA·km / Κ με Κ = 10U²/(Rσυνφ + Xημφ) από τους Πίν. Β2-6 / Β2-6Α / Β2-7 (Εγχειρίδιο §10.3), κατανεμημένα φορτία (P·L/2K), μονοφασικά (Κ/6) και διφασικά (Κ/3) τμήματα, όρια §10.4.1 (ΧΤ 4 / 6 %, ΜΤ 5 + 3 %), εναλλακτικοί αγωγοί και – για ΧΤ – έλεγχος ουδετέρωσης (Ιβρ 1Φ στο άκρο με RM/XM Μ/Σ, μέγιστη ασφάλεια για 3·Ιασφ ≤ Ιβρ, όπως ο Πυθαγόρας / GKDNS).</li>
<li><b>Πυθαγόρας:</b> η εφαρμογή «Πυθαγόρας Κινητό» (GKDNS Field App) ενσωματωμένη αυτούσια: επιλογή στύλων αστικών γραμμών ανά κατασκευή (ξύλινοι / τσιμεντένιοι, μία ή δύο διευθύνσεις) και έλεγχος υπεραστικού στύλου στο Φύλλο Πασσαλώσεως – τα φύλλα PYTHAGOR / ASTGRAM / ASTSIM / FILPAS και οι συναρτήσεις VBA εκτελούνται τοπικά.</li>
<li><b>Ουδετέρωση ΧΤ – Α. Συνθήκη ουδετέρωσης:</b> ο έλεγχος της οθόνης «Ουδετέρωση ΧΤ» του Πυθαγόρα (GKDNS): μονοφασικό βραχυκύκλωμα φάσης–ουδετέρου στο τέρμα της παροχής – Μ/Σ (RM, XM Πίν. Β2-9Α), τμήματα γραμμής ΧΤ από τον Μ/Σ προς το άκρο (αγωγός + μήκος, R′/X′ Πίν. Β2-9, R = 2·L·R′), καλώδιο παροχής και μήκος (2x6 Cu 30 m = Πίν. Β2-10, ή άλλο συγκεντρικό / XLPE / χωρίς παροχή)· Ιβρ στο άκρο κάθε τμήματος, Z και Ιβρ στο τέρμα της παροχής, μεγαλύτερη τυποποιημένη ασφάλεια για Ιβρ ≥ 3·Ιασφ (και περιορισμός από τη μέγιστη ασφάλεια ΧΤ του Μ/Σ), έλεγχος υπάρχουσας ασφάλειας, περιθώριο επέκτασης και ο Πίν. Β2-10 (μέγιστα μήκη ανά αγωγό και ασφάλεια) υπολογισμένος για τον Μ/Σ και την παροχή που επιλέχθηκαν (Εγχειρίδιο §10.7 – παράδειγμα: 250 kVA, 100 m 4x50 Al + 200 m ΣΚ 120 + 100 m ΣΚ 70, παροχή 2x6 30 m → Z = 0,5396 Ω, 426 A → 125 A). Με το κουμπί «Τμήματα από την Πτώση τάσης» μεταφέρονται τα τμήματα ΧΤ της καρτέλας «Πτώση τάσης».</li>
<li><b>Ουδετέρωση ΧΤ – Β. Γειώσεις (ΟΔ.119):</b> γειώσεις ουδετέρου δικτύου ΧΤ κατά την ΟΔ.119 «Γειώσεις δικτύων διανομής» (ΚΕΗΕ άρθρο 19, συνθήκες 3–4): υποχρεωτικές γειώσεις (Υ/Σ, τέρματα, ανά 200 m, άκρο κάθε παροχής), εκτίμηση της συνολικής αντίστασης από τη μέση αντίσταση ενός ηλεκτροδίου (παράλληλα ηλεκτρόδια, Rολ = R/N) ή από την ειδική αντίσταση του εδάφους, όριο κοινής γείωσης 1 Ω / 2 Ω, πρόσθετα ηλεκτρόδια μέχρι ένα ανά στύλο, όριο ουδετέρωσης 10 Ω, ανεξάρτητη γείωση «μεταλλικών ΜΤ» &lt; 40 Ω, διάταξη γειώσεων Υ/Σ κατά τα Σχ. 1–10 (με τα σχήματα της οδηγίας), μικτές κατασκευές ΜΤ+ΧΤ και στύλοι Ω.Σ. γραμμών ΜΤ.</li>
<li data-needs="mv"><b>Πελάτης ΜΤ:</b> τύπος Α1/Α2/Β1/Β2 και πίνακας BKI/BKII – με παραδείγματα.</li>
<li><b>Συμμετοχές ΧΤ / ΜΤ:</b> τα Συστήματα υπολογισμού συμμετοχών καταναλωτών ΧΤ (Σ = Σπ + Σα + Σδ + πρόσθετες: ομάδες παροχών, διαμερίσματα Α/Β/Γ, οικιακές κλίμακες, αποστάσεις L/R/Lκ, εναλλακτικός τρόπος Υ + δ·Lκ, Νο 7 κατ’ εξαίρεση, προσωρινές, αυξήσεις, μετατροπές, συστάδες/πολυκατοικίες με μερίδια μελών, ΦΟΠ, νυκτερινή μέτρηση) και ΜΤ (Σ = Χ·(Σπ + Σεπ + Σεν) – 10 περιπτώσεις: νέα, προσωρινή, αυξήσεις ΧΤ→ΜΤ / ΜΤ→ΜΤ, επανασύνδεση, ειδικές συνθήκες, αντλιοστάσια άρδευσης / αποστράγγισης, μετατροπές) – τα 19 + 17 παραδείγματα των τευχών αναπαράγονται ακριβώς. <b>Πίνακας Τιμών (νέο 7.3):</b> επιλογή <b>2026</b> (απόφαση ΡΑΑΕΥ Ε-114/2026, ΦΕΚ 3954/Β/1-7-2026 – προεπιλογή: Σπ 334,80 / 420,73 €, α 50,60 / 84,50 / 66,04 €/kVA, οικιακές 70,33 / 112,59 / 168,89 €/kVA, Α1 35,17, Α2 51,57 €/m, Υ 12.197,25 / 16.418,68 €, ελάχιστο 562,95 €, δ 27,24 / 126,63 €/m, ΜΤ δ 39,91 / 147,82 €/m και νέες κλίμακες Σ1 / Σ2· <b>ΜΤ: ο καταναλωτής καταβάλλει το 50% του κόστους σύνδεσης και πλήρως το κόστος του μετρητή</b>) ή <b>2007</b> (τεύχη / παραδείγματα)· ο πίνακας σύγκρισης 2007 → 2026 εμφανίζεται στην καρτέλα και όλες οι τιμές είναι παράμετροι (Excel: κίτρινες στήλες 2007 | 2026). Αντιπαραβολή με τον εκτιμητή κόστους σύνδεσης του ΔΕΔΔΗΕ (apps.deddie.gr/ccrWebapp).</li>
<li data-needs="od26"><b>Έλεγχος ΟΔ.26:</b> αναλυτικός έλεγχος καλωδίου (όλοι οι συντελεστές, βραχυκύκλωμα, υπερφόρτιση, ΔU) – λαμβάνει το I_B της διάταξης.</li>
<li><b>ΕΤΚΔ:</b> το Εγχειρίδιο Τυποποιημένων Κατασκευών Δικτύων Διανομής ΔΕΔΔΗΕ (έκδοση 15.09.2025 με τις ενημερώσεις 2026: <span class="no">κόκκινο πλαίσιο</span> = σχέδιο που καταργήθηκε – παραμένει για αναφορά, <span class="param">πορτοκαλί</span> = προς τροποποίηση, ΝΕΑ 2026 = νέες σελίδες P-156/157/456/457 (συστοιχία πυκνωτών), ΑΝΑΘ. ΦΕΒ 2026 = αναθεωρημένες σελίδες G με τα νέα σύμβολα – η παλαιά έκδοση ως 2η σελίδα· κεφάλαιο CS καταργημένο ολόκληρο, καλύπτεται από τον Πυθαγόρα) με τα 1.087 σχέδια σε κεφάλαια G, C, CS, FC, FCP, F, P, S, T, U – μικρογραφίες (πλακίδια) ή λίστα, αναζήτηση με κωδικό <i>ή λέξη του τίτλου</i> (π.χ. «τέρμα γωνία», «Υ/Σ», «διακλάδωση» – οι τίτλοι διαβάστηκαν αυτόματα από τα σχέδια), αγαπημένα ★ και πρόσφατα, συναφή σχέδια (ίδιος βασικός κωδικός) και σύνδεσμοι προς τις κατασκευές που το χρησιμοποιούν, μεγέθυνση (+ / − / προσαρμογή), πλήρης οθόνη με πλήκτρα ← → και pinch-zoom στο κινητό, άνοιγμα σε νέο παράθυρο (στην εφαρμογή Windows και Android· στη διαδικτυακή έκδοση μόνο ο κατάλογος με τους τίτλους).</li>
<li><b>Κατασκευές:</b> οι 64 συνηθέστερες κατασκευές στύλων ΜΤ &amp; ΧΤ (ΔΕΔΔΗΕ – Κλάδος GIS, v2.3 11/2022) ως κάρτες με κωδικό, περιγραφή, κανόνα σχεδίασης στο GIS, παρατηρήσεις και τη <b>φωτογραφία της κατασκευής από το έντυπο</b> (πατώντας την κάρτα ανοίγει η φωτογραφία σε μεγέθυνση μαζί με τη σελίδα της παρουσίασης – 27 σελίδες, ταινία μικρογραφιών) και πατώντας έναν κωδικό 📐 το σχέδιο ΕΤΚΔ εμφανίζεται στη θέση του, χωρίς αλλαγή καρτέλας («Άνοιγμα στην καρτέλα ΕΤΚΔ» για την πλήρη προβολή)· οι κατασκευές που καταργήθηκαν στο ΕΤΚΔ έχουν <span class="no">κόκκινο πλαίσιο</span> αλλά δεν αφαιρούνται· αναζήτηση κωδικού ή περιγραφής, φίλτρα ανά ενότητα, πλήρης οθόνη.</li>
<li><b>Αναγνώριση από φωτογραφία (νέο 7.3):</b> βγάζετε φωτογραφία πεδίου (📷 κάμερα ή από τη συλλογή / αρχείο – στον υπολογιστή και με μεταφορά-απόθεση ή επικόλληση) και η εφαρμογή την αντιστοιχίζει <b>στη συσκευή, χωρίς σύνδεση</b>, με τις 65 φωτογραφίες των συνηθέστερων κατασκευών: ένα νευρωνικό δίκτυο MobileNetV2 (ImageNet, 1280 χαρακτηριστικά, υλοποιημένο σε JavaScript) υπολογίζει το «αποτύπωμα» της φωτογραφίας (κέντρο + κορυφή στύλου, με καθρέφτισμα) και η ομοιότητα (συνημίτονο, κεντραρισμένο) με τις όψεις κάθε φωτογραφίας αναφοράς δίνει τις 6 πιο όμοιες κατασκευές με κωδικό, ενότητα, περιγραφή, ένδειξη ομοιότητας (υψηλή ≥ 0,50 · μέτρια ≥ 0,35 · χαμηλή), κουμπιά για την <b>κάρτα της κατασκευής</b> και τα <b>σχέδια ΕΤΚΔ</b>, και τον <b>πιθανό συνδυασμό κατασκευών στον στύλο</b> (καλύτερη ΜΤ από το απόκομμα της κορυφής + καλύτερη ΧΤ από όλη την εικόνα, με τα σχέδια ΕΤΚΔ και των δύο)· επιλέγοντας «τσιμεντένιος» οι κωδικοί εμφανίζονται με +100. Είναι οπτική ομοιότητα – ένδειξη, όχι βεβαιότητα: για πιο αξιόπιστη αναγνώριση ο <b>AI agent</b> (κάρτα 3) στέλνει τη φωτογραφία με τον κατάλογο των κατασκευών σε μοντέλο Claude (κλειδί API Anthropic του χρήστη, απαιτείται σύνδεση· το κλειδί μένει στη συσκευή) και επιστρέφει κωδικούς, βεβαιότητα, αιτιολόγηση και συνδυασμό· εναλλακτικά «Αντιγραφή πακέτου για AI chat» (επικόλληση σε οποιοδήποτε AI μαζί με τη φωτογραφία). Το μοντέλο (3,6 MB) φορτώνεται την πρώτη φορά που πατάτε «Αναγνώριση»· χρόνος 2–5 s στον υπολογιστή, περισσότερο στο κινητό.</li>
<li><b>Αποστάσεις ασφαλείας:</b> ξεχωριστή καρτέλα με <b>μιμικά σχέδια</b> για κάθε περίπτωση – ύψη αγωγών από το έδαφος (C-2/C-3/C-3A ανά τύπο αγωγού), πεζοδρόμιο / δρόμος – ΜΔ, επικλινή εδάφη (C-14), στύλοι από υπεραστικές οδούς με υπολογιστή C-15B, σιδηρόδρομοι (C-10/11), κτίρια ΧΤ (C-8/9) και ΜΤ (C-7), επιτοίχια καλώδια (C-12), ανεμόσκαλες (C-23), χώρος αναρριχήσεως (C-13), διασταυρώσεις αγωγών (C-4/5 με επιλογή πάνω / κάτω γραμμής), διαχωρισμοί στον στύλο (C-18/19), αγωγοί από στύλους / αγωγούς άλλης γραμμής (C-20, C-21/22), κλάσεις κατασκευής (C-1, C-16/17), κολυμβητήρια (1994), ανεμογεννήτριες (2015 – υπολογισμός L = Hm + Hn), βιοαέριο (2015), πρατήρια καυσίμων / υδρογόνου (2023), αγωγοί ΔΕΣΦΑ (2024) και ΟΔ.38 (λατομεία, εκρηκτικά, εργοτάξια, αεροδρόμια, υπόγεια ΥΤ). Οι τιμές των σχεδίων διαβάζονται από τις τυποποιήσεις· κάτω από κάθε σχέδιο ανοίγει με drop-down ο πλήρης πίνακας με τις σημειώσεις. Πλήρης οθόνη με pinch-zoom στο κινητό.</li>
<li><b>Γενικές πληροφορίες:</b> τα σημαντικότερα σημεία με αρίθμηση των ΟΔ.5, ΟΔ.40, ΟΔ.41, ΟΔ.42, ΟΔ.48, ΟΔ.61 «Πολιτική ηλεκτροδότησης καταναλωτών ΧΤ», ΟΔ.95 «Μετατοπίσεις – παραλλαγές», ΟΔ.119, των «Οδηγιών κατασκευής παροχής – Δήλωσης ετοιμότητας» (V3), του ΔΔ/272503/2023, των Συστημάτων συμμετοχών ΧΤ / ΜΤ, του Ν.4495/2017 και της ΕΕΔΜΚ (κατασκευές μετρητών στα όρια οικοπέδων χωρίς άδεια – άρθ. 30 §1 ιθ), των «Πληροφοριακών στοιχείων ΜΤ» και της ΥΔ Ν.1599 – με αναζήτηση.</li>
</ol>
<h2>Πυθαγόρας – κανόνες γραφείου</h2>
<ul>
<li>Από τις επιλογές στύλων αφαιρέθηκαν οι <b>ξύλινοι 9Ε, 10Ε, 11Ε, 12Ε</b> (κατηγορία Ε) και οι <b>τσιμεντένιοι 9Ε–12Ε, 9Κ–12Κ, 10Β, 11ΕΒ, 11ΛΒ</b>: όπου ο Πυθαγόρας θα επέλεγε έναν από αυτούς, επιλέγεται ο επόμενος τυποποιημένος στύλος ίσης ή μεγαλύτερης αντοχής (ξύλινοι: Μ αντί Ε· τσιμεντένιοι: 10Ε/11Ε/10Κ/11Κ → 11Μ, 12Ε/12Κ → 12Μ, 10Β → 12Β, 11ΛΒ → 12ΛΒ, 11ΕΒ → 13ΕΒ).</li>
<li>Αφαιρέθηκαν οι ελαφροί επίτονοι <b>F-21X/E, F-21Y/E, F-21A/E, F-21B/E, F-34X/E, F-34Y/E</b> (και οι παραλλαγές τους N/I/W καθώς και οι αντίστοιχοι FCP- των τσιμεντένιων στύλων): στη θέση τους επιλέγεται ο αντίστοιχος μεσαίος επίτονος (/M). Οι επίτονοι F-21AI/E, F-21BI/E (με μονωτήρα) παραμένουν γιατί δεν υπάρχει αντίστοιχος /M στις τυποποιήσεις.</li>
<li>Στον <b>Υπεραστικό στύλο</b> προστέθηκε η <b>απόσταση του επιτόνου από τον στύλο X (m)</b>: κλίση επιτόνου = ύψος/X (0 = όπως ο Πυθαγόρας, X = ύψος, 45°)· στις αστικές κατασκευές η απόσταση X υπήρχε ήδη ως πεδίο κάθε κατασκευής.</li>
</ul>
<h2>Χρώματα</h2>
<p>Γαλάζια πεδία = εισαγωγή. <span class="param">Κίτρινα</span> = παράμετροι τυποποίησης (φορτία ανά παροχή, διαστάσεις κιβωτίων, μήκη). ΝΑΙ πράσινο / ΟΧΙ κόκκινο = επάρκεια. Τα δεδομένα αποθηκεύονται τοπικά στη συσκευή («Επαναφορά» τα διαγράφει).</p>
<h2>Βασικοί κανόνες</h2>
<ul>
<li>Φορτία ανά παροχή (A): Νο 03 = 32, Νο 05 = 50, Νο 1 = 25, Νο 2 = 35, Νο 3 = 50, Νο 4 = 80, Νο 5 = 125, Νο 6 = 215, Νο 7 = 315. Μονοφασικοί στη δυσμενέστερη φάση (ceil(N1/3) μετρητές), τριφασικοί πλήρως, × Kn(N) από τον Πίν. ΙΙ της ΟΔ.45.</li>
<li>Εναέρια παροχή μόνο από εναέριο δίκτυο και έως 18 ισοδύναμους μονοφασικούς μετρητές (ΟΔ.45 §4)· αλλιώς υπόγεια. Συγκεντρικό σε υπόγεια παροχή έως 4x50 (ρυθμιζόμενο: 4x16 κατά ΟΔ.45 §4.4).</li>
<li>Επιτρεπόμενες εντάσεις ΟΔ.26 3η έκδ. (07/2025) Πίν. IV/V με συντελεστές θερμοκρασίας, εδάφους, ομαδοποίησης. Στις υπόγειες περιπτώσεις ο πίνακας 7 δείχνει τις τιμές «στο έδαφος» και «σε σωλήνα > 6 m» της ΟΔ.26 όπως αναγράφονται (2x16: 129 / 105, 4x6: 62 / 50, 4x16: 108 / 88, 4x25: 140 / 114, 4x35: 169 / 138, 4x50: 200 / 164 A)· προαιρετικά (ΝΑΙ στην κάρτα 4) η ένταση αέρα του συγκεντρικού περιορίζει και τα υπόγεια, όπως ο Πίν. ΙΙ ΟΔ.45. Στην κάθοδο από εναέριο δίκτυο κρίνει πάντοτε ο αέρας.</li>
<li><b>Κατ' εξαίρεση (κανόνας γραφείου):</b> μεμονωμένη παροχή Νο 2 – ένας μόνο μετρητής Νο 2 χωρίς άλλους μετρητές και χωρίς πρόσθετα φορτία – παίρνει συγκεντρικό <b>4x6</b> (πρακτική ΔΕΔΔΗΕ – ΟΔ.45 Πίν. ΙΙΙ: 4x6 BN 44 A ≥ 35 A), αν και κατά ΟΔ.26 3η έκδ. το 4x6 δίνει I_z' = 33 A &lt; 35 A· το αποτέλεσμα σημειώνεται «ΚΑΤ' ΕΞΑΙΡΕΣΗ». <b>Κανόνας 2:</b> μεμονωμένη παροχή Νο 4 (μόνη της, χωρίς άλλες παροχές / πρόσθετα φορτία) → συγκεντρικό <b>4x25 Cu</b> («3x25 Cu»: τρεις φάσεις 25 mm² Cu + ομόκεντρος ουδέτερος 25 mm²)· όπου το 4x25 δεν επαρκεί κατά ΟΔ.26 (π.χ. εναέρια ελεύθερα στον αέρα, I_req 85 A) σημειώνεται «ΚΑΤ' ΕΞΑΙΡΕΣΗ» με τη φόρτιση. Με δεύτερο μετρητή ή πρόσθετο φορτίο η επιλογή γίνεται κανονικά από τον πίνακα. <b>Κανόνας 3:</b> ΔΥΟ μετρητές <b>Νο 05</b> μόνοι τους (χωρίς άλλους μετρητές / πρόσθετα φορτία) → <b>τριφασική γραμμή, συγκεντρικό 4x16 Cu και διανομέας</b> (κιβώτιο διακλάδωσης, ένας μετρητής σε κάθε πλευρά – ΜΔ-7)· δεν εφαρμόζεται όταν επιβληθεί γραμμή «1Φ».</li>
<li>Άνοιγμα L (συγκεντρικά EPR-SE1): στυλίσκος παροχής = σιδηροσωλήνας γαλβανισμένος βαρέως τύπου ≥ 3" ύψους 6 m· για 4x25/4x35/4x50 με L &gt; 12 m → 4"· μέγιστο άνοιγμα κατά C-3 σε στυλίσκο / σε γάντζο: 2x6 30/35 m · 2x16 25/30 · 4x6 25/30 · 4x16 20/25 · 4x25 20/25 · 4x35 & 4x50 15/20 m – πέρα από το όριο στυλίσκου ΕΚΤΟΣ ΟΡΙΩΝ → γάντζος βαρέως τύπου· πέρα από το όριο γάντζου → συρματόσχοινο. Γάντζος: L > τυποποιημένο CS-3 → ΓΑΝΤΖΟΣ ΒΑΡΕΩΣ ΤΥΠΟΥ.</li>
<li>Αναχώρηση για το συγκρότημα: ασφάλεια = τυποποιημένο φυσίγγιο GR-207 ≥ 1,3 × I_B και ≥ ελάχιστη ασφάλεια αναχώρησης των παροχών (ΟΔ.22), έως τη μέγιστη ασφάλεια 400 A (δεν υπάρχουν φυσίγγια 500 A – Νο 7: 400 A κατά ΟΔ.22 Πίν. V· I_B > 400 A → δύο αναχωρήσεις / ιδιαίτερος Υ/Σ)· Μ/Σ κατά ΟΔ.22 = τυποποιημένος Μ/Σ ΔΕΔΔΗΕ (50/100/160/250/400/630/1000 kVA) ≥ S και ≥ ελάχιστος Μ/Σ των παροχών (Νο 7: 250 kVA), με μέγιστη ασφάλεια ΧΤ κατά Πίν. Β2-8 (έως 400 A)· ενδεικτικά και ο Μ/Σ με περιθώριο ανάπτυξης S/0,7 (Εγχειρίδιο §11.3).</li>
<li>Αποστάσεις ασφαλείας (C-2…C-23): καλώδιο παροχής ≥ 3,00 m πάνω από πεζοδρόμιο, ≥ 5,50 m σε διασταύρωση οδού· επιτοίχιο ≥ 2,50 m, 0,15 m πάνω / 0,90 m πλευρικά από ανοίγματα· 0,90 m πάνω από επικλινή στέγη· στον στύλο 1,20 m από Ο.Τ.Ε. / 0,60 m από τηλεπικοινωνία ΔΕΔΔΗΕ· στύλος ≥ 0,15 m από το άκρο του πεζοδρομίου (C-3 VI, ΟΔ.38)· ειδικές αποστάσεις ΟΔ.38 και εγκυκλίων (κολυμβητήρια, ανεμογεννήτριες, βιοαέριο, πρατήρια καυσίμων / υδρογόνου, αγωγοί ΔΕΣΦΑ) στην καρτέλα «Πίνακες».</li>
<li>Εναέριοι Υ/Σ: ασφάλειες εκτόνωσης Κ κατά Πίν. Β2-8 (π.χ. 160 kVA / 20 kV → 12 Κ, 250 kVA → 15 Κ, 400 kVA → 25 Κ)· κόνεως σε Υ/Σ εσωτερικού χώρου· 30Τ μετά από Ε/Δ, 20Τ / 15Τ μετά από Δ/ΑΕ (γη 70 / 50 Α)· όχι μικρότερη ασφάλεια Μ/Σ όταν δεν υπάρχει συνεργασία – τροποποίηση ρυθμίσεων.</li>
<li>Μήκος καλωδίου υλικών = L + 5 m κάθοδος + 2 m διάταξη + 3 m τερματισμοί (αρχικές τιμές – αλλάζουν στην καρτέλα «Υλικά»).</li>
<li>ΜΤ: Β1 → BKI (ΔΦ/Α) για έναν Μ/Σ ≤ 630 kVA ή μόνιμα παράλληλους ≤ 630 kVA· Β2 → BKII (Δ/Ι) για > 630 kVA, μη παράλληλους Μ/Σ, ιδιαίτερη προστασία ή δηλωμένη αύξηση > 630 kVA· Α1/Α2 για εξωτερική μέτρηση από εναέριο δίκτυο.</li>
</ul>
<h2>Πηγές</h2><ul>${src}</ul>
<h2>Επαλήθευση</h2>
<p>Η ίδια λογική υπάρχει στο Excel (τύποι), στην εφαρμογή Windows και στην εφαρμογή κινητού. Excel ↔ Python και JavaScript ↔ Python: εκατοντάδες τυχαία σενάρια (φορτία, καλώδια, διατάξεις, σχέδιο εσοχής, υλικά, Μ/Σ, αναχωρήσεις, ΜΤ), 0 αποκλίσεις. Οι τιμές των πινάκων αντιπαραβλήθηκαν με τα σκαναρισμένα κείμενα των οδηγιών και τα σχέδια C/CS/ΜΔ.</p>
<p class="muted">Βοήθημα μελέτης – η τελική ευθύνη ανήκει στον μελετητή.</p>
<p><b>COPYRIGHT © Δημήτρης Βρούβας</b> (φιλική συμμετοχή Αθηνά) · Connexion Engineering · Έκδοση 7.3.</p>`;
  }

  // ---------------------------------------------------------------- αρχική οθόνη (πλακίδια), καρτέλες, κουμπιά
  const TAB_INFO = [
    ["main", "⚡", "Επιλογή παροχής", "Φορτίο, είδος παροχής, καλώδιο, στυλίσκος / γάντζος, Μ/Σ & ασφάλεια αναχώρησης, πρόταση ΜΔ", "calc"],
    ["board", "🧰", "Μετρητική διάταξη", "Διατάξεις 9+9 / 3+3, πλήθος διατάξεων, σχέδιο εσοχής, ΜΔ-1…83, αποστάσεις από πεζοδρόμιο / δρόμο", "calc"],
    ["mat", "📦", "Υλικά", "Πίνακας υλικών παροχέτευσης – τοποθέτηση / αποξήλωση", "calc"],
    ["form", "📋", "Οδηγίες κατασκευής", "Έντυπο ΔΕΔΔΗΕ «Οδηγίες κατασκευής παροχής – Δήλωση ετοιμότητας» προσυμπληρωμένο από τη μελέτη", "calc"],
    ["feeder", "🔌", "Αναχώρηση Μ/Σ", "Ασφάλεια, βραχυκύκλωμα, πτώση τάσης, επάρκεια Μ/Σ, πόσες παροχές ακόμη", "calc"],
    ["ys", "🏭", "Υ/Σ – Μ/Σ", "Εναέριοι υποσταθμοί – ασφάλειες ΜΤ / ΧΤ, ρεύμα ζεύξης, στήριξη Μ/Σ", "calc"],
    ["vd", "📉", "Πτώση τάσης", "Γραμμές ΧΤ / ΜΤ σε τμήματα – συντελεστές Κ, ΔU %, εναλλακτικοί αγωγοί", "calc"],
    ["earth", "⏚", "Ουδετέρωση ΧΤ", "Συνθήκη βραχυκύκλωσης (Ιβρ ≥ 3·Ιασφ, Πίν. Β2-10) & γειώσεις ΟΔ.119", "calc"],
    ["mv", "🏗️", "Πελάτης ΜΤ", "Τύπος Α1 / Α2 / Β1 / Β2 και πίνακας BKI / BKII", "calc"],
    ["sym", "💶", "Συμμετοχές ΧΤ / ΜΤ", "Συμμετοχή καταναλωτή ΧΤ (Σπ + Σα + Σδ – νέα, προσωρινή, αύξηση, συστάδες) και ΜΤ (Σπ + Σεπ + Σεν – 10 περιπτώσεις) – Συστήματα ΔΕΔΔΗΕ με τον Πίνακα Τιμών 2026 (ΡΑΑΕΥ Ε-114/2026: ΜΤ 50% + μετρητής) ή 2007", "calc"],
    ["od26", "🔎", "Έλεγχος ΟΔ.26", "Αναλυτικός έλεγχος καλωδίου – συντελεστές, βραχυκύκλωμα, υπερφόρτιση", "calc"],
    ["pyth", "📐", "Πυθαγόρας", "Επιλογή στύλων – GKDNS Field App (αστικές κατασκευές, υπεραστικός στύλος)", "tool"],
    ["etkd", "📘", "ΕΤΚΔ", "Σχέδια τυποποιημένων κατασκευών ΔΕΔΔΗΕ – αναζήτηση, μικρογραφίες, ενημερώσεις 2026", "tool"],
    ["constr", "🗼", "Κατασκευές", "Συνηθέστερες κατασκευές στύλων ΜΤ & ΧΤ με φωτογραφίες και σχέδια", "tool"],
    ["vision", "📷", "Αναγνώριση από φωτογραφία", "Φωτογραφία πεδίου → πιο όμοιες τυποποιημένες κατασκευές (ΕΤΚΔ), συνδυασμός ΜΤ + ΧΤ, προαιρετικά AI agent", "tool"],
    ["clr", "📏", "Αποστάσεις ασφαλείας", "C-1 … C-23, υπόγεια καλώδια U-2 … U-5A, ΟΔ.38 και εγκύκλιοι – με μιμικά σχέδια", "tool"],
    ["tables", "📊", "Πίνακες", "Παροχές, καλώδια, CS-3, κατάλογος ΜΔ, Μ/Σ, ΟΔ.26, υλικά", "tool"],
    ["info", "ℹ️", "Γενικές πληροφορίες", "ΟΔ.5/40/41/42/48/61/95/119, Οδηγίες κατασκευής παροχής V3, ΔΔ/272503/2023, συμμετοχές ΧΤ/ΜΤ, Ν.4495 & ΕΕΔΜΚ, στοιχεία ΜΤ – με αναζήτηση", "tool"],
    ["help", "❓", "Οδηγίες", "Ροή εργασίας, κανόνες γραφείου, χρώματα, πηγές, επαλήθευση", "tool"]];
  const TABS_ON = window.APP_TABS ? TAB_INFO.filter(t => window.APP_TABS.indexOf(t[0]) >= 0) : TAB_INFO;
  const tabTitle = name => { const t = TAB_INFO.find(x => x[0] === name); return t ? t[2] : (name === "home" ? "Αρχική" : name); };
  function renderHome() {
    const el = $("home_tiles"); if (!el) return;
    const grp = (lab, kind) => { const items = TABS_ON.filter(t => t[4] === kind); return items.length ? `<div class="home-grp">${lab}</div><div class="home-tiles">${items.map(t => `<button class="home-tile ${t[4]}" data-go="${t[0]}"><span class="ic">${t[1]}</span><span class="tt">${esc(t[2])}</span><span class="ds">${esc(t[3])}</span></button>`).join("")}</div>` : ""; };
    el.innerHTML = grp("Υπολογισμοί", "calc") + grp("Εργαλεία & βιβλιοθήκη", "tool");
    el.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.go)));
  }
  // πλοήγηση ΜΟΝΟ από τα εικονίδια της Αρχικής, το κουμπί «‹ Αρχική» και την αναζήτηση (δεν υπάρχει γραμμή καρτελών)
  function switchTab(name) {
    if (!document.getElementById("tab-" + name)) name = "home";
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
    if (name === "pyth") { const f = $("pyth_frame"); if (f && !f.getAttribute("src")) f.setAttribute("src", f.dataset.src); }
    document.body.dataset.tab = name;
    if ($("hb_title")) $("hb_title").textContent = tabTitle(name);
    if ($("g_results")) $("g_results").classList.add("hidden");
    window.scrollTo(0, 0);
  }
  if ($("hb_back")) $("hb_back").addEventListener("click", () => switchTab("home"));
  window.APP_SWITCH_TAB = switchTab;
  window.APP_TABS_INFO = TABS_ON;
  window.APP_TAB_TITLE = tabTitle;
  window.APP_OPEN_TABLES = key => { switchTab("tables"); const b = document.querySelector(`#subtabs button[data-st="${key}"]`); if (b) b.click(); };
  // κανόνες / επεξηγήσεις / πίνακες οδηγιών → drop-down (κλειστά), όπως ζητήθηκε· τα αποτελέσματα και οι προειδοποιήσεις μένουν ανοιχτά
  function collapseRules() {
    const RX = /^\s*\d*[α-ω]?\s*(Κανόνες|Απαιτήσεις χώρου|Πίνακας Β2-|Πίνακες Β2-|Τυποποιήσεις ΜΔ – σχέδια αναφοράς|Πότε BKI|Αποστάσεις ασφαλείας καλωδίου|ΟΔ\.21 –|Σχήματα ΟΔ\.119|Στοιχεία παροχών ΟΔ\.22|Παραδείγματα|Παράμετροι κιβωτίων|Σημειώσεις\s*$)/;
    document.querySelectorAll("section.tab .card").forEach(card => {
      const h = card.querySelector(":scope > h2"); if (!h) return;
      if (!RX.test(h.textContent.trim())) return;
      const det = document.createElement("details"); det.className = "rules"; det.id = card.id ? card.id : "";
      const sum = document.createElement("summary"); sum.innerHTML = h.innerHTML; det.appendChild(sum);
      Array.from(card.childNodes).forEach(n => { if (n !== h) det.appendChild(n); });
      card.replaceWith(det);
    });
    // επεξηγηματικές παράγραφοι μέσα στις κάρτες εισαγωγής (στατικό κείμενο, χωρίς id) → μικρό drop-down «Επεξήγηση»
    document.querySelectorAll("section.tab .card > .muted.small:not([id]), section.tab .card > div.small.muted:not([id])").forEach(p => {
      if (p.textContent.trim().length < 90 || p.closest("details") || p.querySelector("input,select,button")) return;
      const det = document.createElement("details"); det.className = "hint";
      det.innerHTML = "<summary>ℹ Επεξήγηση</summary>";
      p.replaceWith(det); det.appendChild(p);
    });
    // λίστες επεξηγήσεων των αποτελεσμάτων (εκτός των προειδοποιήσεων της επιλογής παροχής) → drop-down με πλήθος
    ["y_notes", "vd_notes", "nz_notes", "e_measures", "f_notes", "b_notes"].forEach(id => {
      const ul = $(id); if (!ul || ul.closest("details")) return;
      const det = document.createElement("details"); det.className = "xnotes";
      const sum = document.createElement("summary"); det.appendChild(sum);
      ul.replaceWith(det); det.appendChild(ul);
      const upd = () => { const n = ul.children.length; sum.textContent = n ? `Επεξηγήσεις / σημειώσεις (${n})` : "Επεξηγήσεις / σημειώσεις"; det.classList.toggle("hidden", n === 0); };
      new MutationObserver(upd).observe(ul, { childList: true }); upd();
    });
    // στην εκτύπωση ανοίγουν όλα τα drop-down της ενεργής καρτέλας
    let opened = [];
    window.addEventListener("beforeprint", () => { opened = Array.from(document.querySelectorAll(".tab.active details:not([open])")); opened.forEach(d => d.open = true); });
    window.addEventListener("afterprint", () => { opened.forEach(d => d.open = false); opened = []; });
  }
  const ART = !!window.ARTIFACT_MODE;   // hosted artifact: no print dialog, no confirm()/prompt()
  if (ART) { $("btn_print").classList.add("hidden"); $("btn_print_mat").classList.add("hidden"); }
  // inside the Android app (WebView) window.print() is a no-op – the launcher exposes AndroidApp.print()
  const doPrint = () => { try { if (window.AndroidApp && typeof AndroidApp.print === "function") { AndroidApp.print(); return; } } catch (e) { /* ignore */ } window.print(); };
  $("btn_print").addEventListener("click", () => { switchTab("main"); setTimeout(doPrint, 50); });
  ["btn_goto_board", "btn_goto_board2"].forEach(id => { if ($(id)) $(id).addEventListener("click", () => switchTab("board")); });
  if ($("btn_goto_form")) $("btn_goto_form").addEventListener("click", () => { if (R) renderForm(lastInp, R); switchTab("form"); });
  if ($("btn_form_back")) $("btn_form_back").addEventListener("click", () => switchTab("main"));
  if ($("btn_print_form")) $("btn_print_form").addEventListener("click", () => { switchTab("form"); setTimeout(doPrint, 50); });
  ["f3_no", "f3_earth", "f3_present", "f3_notes"].forEach(id => { if ($(id)) $(id).addEventListener("input", () => { if (R) renderForm(lastInp, R); saveState(); }); });
  $("btn_print_mat").addEventListener("click", () => { switchTab("mat"); setTimeout(doPrint, 50); });
  $("btn_copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lastSummary); $("btn_copy").textContent = "Αντιγράφηκε ✓"; setTimeout(() => $("btn_copy").textContent = "Αντιγραφή σύνοψης", 1500); }
    catch (e) { let ta = $("sum_ta"); if (!ta) { ta = document.createElement("textarea"); ta.id = "sum_ta"; ta.rows = 8; ta.style.cssText = "width:100%;margin-top:8px;font-family:inherit;font-size:12px"; $("m_result").appendChild(ta); } ta.value = lastSummary; ta.focus(); ta.select(); }
  });
  let resetArmed = 0;
  $("btn_reset").addEventListener("click", () => {
    if (Date.now() - resetArmed < 5000) { try { localStorage.removeItem("supply_v2_state"); localStorage.removeItem("od26_state_v2"); } catch (e) { /* ignore */ } location.reload(); return; }
    resetArmed = Date.now(); $("btn_reset").textContent = "Σίγουρα; πατήστε ξανά για επαναφορά"; setTimeout(() => { $("btn_reset").textContent = "Επαναφορά"; resetArmed = 0; }, 5000);
  });
  ["#tab-main", "#tab-feeder", "#tab-mv", "#tab-sym", "#tab-ys", "#tab-vd", "#tab-earth"].forEach(sel => document.querySelectorAll(`${sel} input, ${sel} select`).forEach(el => { if (!el.closest("table") && el.id !== "e_fig") { el.addEventListener("input", update); el.addEventListener("change", update); } }));
  ["x_area", "x_ap"].forEach(id => $(id).addEventListener("input", saveState));

  // heartbeat towards the local launcher (.exe) – only when served over http
  if (location.protocol === "http:") {
    const beat = () => fetch("/ping", { cache: "no-store" }).catch(() => {});
    beat(); setInterval(beat, 5000);
    window.addEventListener("pagehide", () => { try { navigator.sendBeacon("/bye"); } catch (e) { /* ignore */ } });
  }

  if (!$("p_date").value) $("p_date").value = new Date().toISOString().slice(0, 10);
  symInit();
  loadState();
  symSyncInputs();
  renderSupplies(); renderBoardParams(); renderMatInputs(); renderTables(); renderHelp(); renderHome(); collapseRules();
  if (!ST.vd.sections.length && !localStorage.getItem("supply_v2_state")) ST.vd.sections = VD_EX.XT.map(x => Object.assign({}, x));
  if (!ST.nz.sections.length && !nzSaved) ST.nz.sections = NZ_EX.ex1.sections.map(x => Object.assign({}, x));
  renderVDSections(); renderNZSections();
  update();
  switchTab("home");
})();
