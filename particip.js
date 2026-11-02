/* Συμμετοχές καταναλωτών ΧΤ και ΜΤ – Connexion Engineering.
   Ίδιοι υπολογισμοί με το src/particip.py (αναφορά) και το φύλλο ΣΥΜΜΕΤΟΧΕΣ του Excel· τα δεδομένα (Πίνακας Τιμών 2007 των τευχών και
   αναπροσαρμογή 2026 – ΡΑΑΕΥ Ε-114/2026, ΦΕΚ 3954/Β/1-7-2026 – κλίμακες, ομάδες παροχών, διαμερίσματα, περιπτώσεις ΜΤ) διαβάζονται από
   data.js → particip (src/summaries/particip_rules.json)· επιλογή πίνακα με inp.prices ("2026" προεπιλογή | "2007").
   Τεύχη ΔΕΔΔΗΕ: «Σύστημα υπολογισμού συμμετοχών καταναλωτών ΧΤ» (Σ = Σπ + Σα + Σδ) και «… ΜΤ» (Σ = Χ·(Σπ + Σεπ + Σεν)). */
(function () {
  "use strict";
  const D = window.OD26_DATA;
  const R = D && D.particip;
  if (!R) return;
  // ---- σύνολα τιμών (Πίνακας Τιμών): βάση = 2007 (τεύχη), «2026» = ΡΑΑΕΥ Ε-114/2026 (ΦΕΚ 3954/Β/1-7-2026) ως υπερκαλύψεις (overrides)
  const priceSets = () => ((R.price_sets || {}).sets || []).slice();
  function priceSet(id) {
    const PS = R.price_sets || {}, sets = PS.sets || [];
    if (!sets.length) return null;
    const sid = (id === undefined || id === null || id === "") ? String(PS.default || sets[0].id) : String(id).trim();
    return sets.find(s => String(s.id) === sid) || sets.find(s => String(s.id) === String(PS.default)) || sets[0];
  }
  function merge(base, over) {
    if (base && typeof base === "object" && !Array.isArray(base) && over && typeof over === "object" && !Array.isArray(over)) {
      const out = Object.assign({}, base);
      Object.keys(over).forEach(k => { out[k] = (k in base) ? merge(base[k], over[k]) : over[k]; });
      return out;
    }
    return over;
  }
  const PRICED = {};
  function priced(id) {
    const s = priceSet(id);
    if (!s) return R;
    if (PRICED[s.id]) return PRICED[s.id];
    const out = Object.assign({}, R, { lv: merge(R.lv, s.lv || {}), mv: merge(R.mv, s.mv || {}), _prices: {} });
    ["id", "label", "short", "effective", "source", "url"].forEach(k => { if (s[k] !== undefined && s[k] !== null) out._prices[k] = s[k]; });
    PRICED[s.id] = out;
    return out;
  }
  const r2 = x => Math.round((x + 1e-9) * 100) / 100;
  const num = (v, dflt) => { const x = parseFloat(v); return isFinite(x) ? x : (dflt === undefined ? 0 : dflt); };
  const g = v => String(Math.round(Number(v) * 1e6) / 1e6).replace(".", ",");
  const GROUP_LABEL = { A: "Α – Νο 03 / 05 / 1 / 2 / 3", B: "Β – Νο 4 / 5 / 6", C: "Γ – Νο 7" };
  function tiers(x, T) {
    let total = 0; const parts = [];
    (T || []).forEach(([lo, hi, rate]) => {
      lo = Number(lo); if (x <= lo) return;
      const q = (hi === null || hi === undefined ? x : Math.min(x, Number(hi))) - lo;
      if (q <= 0) return;
      total += q * Number(rate);
      parts.push({ from: lo, to: (hi === null || hi === undefined ? null : Number(hi)), qty: r2(q), rate: Number(rate), amount: r2(q * Number(rate)) });
    });
    return [r2(total), parts];
  }
  function counts(d, SUPS) {
    const out = {};
    Object.keys(d || {}).forEach(no => { if (SUPS[no]) { const n = Math.trunc(num(d[no])); if (n > 0) out[no] = n; } });
    return out;
  }
  function lvSaEach(RR, no, district, residential) {
    const LV = RR.lv;
    const s = LV.supplies.find(x => x.no === no);
    if (!s || Math.trunc(s.phases) !== 3) return [0, []];
    const N = num(s.N_particip_kva);
    if (N <= 10) return [0, []];
    if (residential) return tiers(N, LV.Sa.residential_3f_tiers);
    const alpha = Number(LV.Sa.alpha_nonres_3f[district]);
    return [r2(alpha * (N - 10)), []];
  }

  // ---------------------------------------------------------------- ΧΤ
  function lv(inp) {
    const RR = priced(inp.prices), PRI = RR._prices || {};
    const LV = RR.lv, SD = LV.Sd, OT = LV.other || {};
    const SUPS = {}; LV.supplies.forEach(s => SUPS[s.no] = s);
    const order = LV.supplies.map(s => s.no);
    let dist = String(inp.district || "C").toUpperCase(); if (!["A", "B", "C"].includes(dist)) dist = "C";
    let kind = String(inp.kind || (inp.temporary ? "TEMP" : (inp.increase ? "INC" : "NEW"))).toUpperCase(); if (!["NEW", "TEMP", "INC", "TEMP2PERM"].includes(kind)) kind = "NEW";
    let special = String(inp.special || "NONE").toUpperCase(); if (!["NONE", "EXC", "INACC"].includes(special)) special = "NONE";
    const use = String(inp.use || "NONRES").toUpperCase();
    const cnt = counts(inp.counts, SUPS);
    let resIn = inp.res_counts; if (resIn === undefined || resIn === null) resIn = use === "RES" ? Object.assign({}, cnt) : {};
    const res = {}; Object.keys(cnt).forEach(no => res[no] = Math.min(Math.trunc(num(resIn[no])), cnt[no]));
    const withOld = kind === "INC" || kind === "TEMP2PERM";
    const old = withOld ? counts(inp.old_counts, SUPS) : {};
    let oldResIn = inp.old_res_counts; if (oldResIn === undefined || oldResIn === null) oldResIn = use === "RES" ? Object.assign({}, old) : {};
    const oldRes = {}; Object.keys(old).forEach(no => oldRes[no] = Math.min(Math.trunc(num(oldResIn[no])), old[no]));
    const L = Math.max(0, num(inp.L_m)), Rm = Math.max(0, num(inp.R_m)), LkOh = Math.max(0, num(inp.Lk_oh_m)), LkUg = Math.max(0, num(inp.Lk_ug_m));
    const nYs = Math.max(1, Math.trunc(num(inp.n_ys, 1)) || 1);
    const no7Exc = !!inp.no7_exception;
    const netCost = Math.max(0, num(inp.network_cost_eur)), spaceVal = Math.max(0, num(inp.space_value_eur)), exceptional = Math.max(0, num(inp.exceptional_eur));
    const ugDiff = Math.max(0, num(inp.ug_diff_eur)), cableM = Math.max(0, num(inp.cable_m)), extraEur = Math.max(0, num(inp.extra_eur));
    const SpRate = Number(LV.Sp[dist]), alpha = Number(LV.Sa.alpha_nonres_3f[dist]);
    const saFactor = kind === "TEMP" ? 0.5 : 1;
    const noSp = kind === "INC" || kind === "TEMP2PERM" || special === "INACC";
    const rows = []; let Sp = 0, SaNew = 0; const groups = {}; let nTotal = 0, any3f = false;
    order.forEach(no => {
      const n = cnt[no] || 0; if (n <= 0) return;
      const s = SUPS[no], nRes = res[no] || 0, nNon = n - nRes, ph = Math.trunc(s.phases);
      any3f = any3f || ph === 3;
      const N = num(s.N_particip_kva), grp = s.group;
      groups[grp] = (groups[grp] || 0) + n; nTotal += n;
      const spI = noSp ? 0 : SpRate * n;
      const [saRes, saParts] = lvSaEach(RR, no, dist, true);
      const [saNon] = lvSaEach(RR, no, dist, false);
      const saI = (nRes * saRes + nNon * saNon) * saFactor;
      Sp += spI; SaNew += saI;
      rows.push({ no, n, n_res: nRes, n_nonres: nNon, kva_supply: (s.kva_supply === undefined ? null : s.kva_supply), N, phases: ph, group: grp, Sp: r2(spI), Sa_each_res: r2(saRes * saFactor), Sa_each_nonres: r2(saNon * saFactor), Sa_parts: saParts, Sa: r2(saI) });
    });
    let SaOld = 0;
    Object.keys(old).forEach(no => { const n = old[no], nRes = oldRes[no] || 0; SaOld += nRes * lvSaEach(RR, no, dist, true)[0] + (n - nRes) * lvSaEach(RR, no, dist, false)[0]; });
    let Sa;
    if (kind === "INC") Sa = Math.max(0, SaNew - SaOld);
    else if (kind === "TEMP2PERM") Sa = Math.max(0, SaNew - SaOld) + SaOld / 2;
    else Sa = SaNew;
    // Σδ
    const A1 = Number(SD.A1_eur_m), A2 = Number(SD.A2_eur_m), Lfree = Number(SD.L_free_m), Lbreak = Number(SD.L_break_m), Lalt = Number(SD.L_alt_m), Ralt = Number(SD.R_alt_m !== undefined ? SD.R_alt_m : SD.L_alt_m);
    const minA = Number(SD.min_groupA_eur), YA = Number(SD.Y_groupA_eur) * nYs, YBC = Number(SD.Y_groupBC_eur) * nYs;
    const dOh = Number(SD.delta_overhead_eur_m), dUg = Number(SD.delta_underground_eur_m);
    let dlk = null, dlkHow = "";
    if (LkOh > 0 || LkUg > 0) {
      const c = [];
      if (LkOh > 0) c.push([dOh * LkOh, `${g(dOh)} × ${g(LkOh)} m εναέριο`]);
      if (LkUg > 0) c.push([dUg * LkUg, `${g(dUg)} × ${g(LkUg)} m υπόγειο`]);
      c.sort((a, b) => a[0] - b[0]); dlk = c[0][0]; dlkHow = c[0][1];
    }
    const oldGroups = {}; Object.keys(old).forEach(no => oldGroups[SUPS[no].group] = 1);
    const Ytxt = nYs > 1 ? `${g(nYs)}·Υ` : "Υ";
    let Sd = 0; const sdRows = [];
    ["A", "B", "C"].forEach(grp => {
      if (!groups[grp]) return;
      const n = groups[grp];
      if (withOld && oldGroups[grp]) { sdRows.push({ group: grp, n, Sd: 0, Sd_each: 0, how: "αύξηση ισχύος χωρίς αλλαγή ομάδας → χωρίς Σδ" }); return; }
      if (special !== "NONE") { sdRows.push({ group: grp, n, Sd: 0, Sd_each: 0, how: "εξαιρετικές ιδιομορφίες / απρόσιτη περιοχή: αντί Σδ οι πραγματικές δαπάνες Δ" }); return; }
      let sd = 0, how = "";
      if (grp === "A") {
        if (L <= Lfree) { sd = 0; how = `L = ${g(L)} m ≤ ${g(Lfree)} m → Σδ = 0`; }
        else if (L <= Lbreak) { const base = A1 * (L - Lfree); sd = Math.max(minA, base); how = `A1·(L − ${g(Lfree)}) = ${g(A1)} × ${g(L - Lfree)} = ${g(r2(base))}` + (base < minA ? ` → ελάχιστο ${g(minA)} €` : ""); }
        else { sd = A1 * (Lbreak - Lfree) + 1.5 * A1 * (L - Lbreak); how = `${g(Lbreak - Lfree)}·A1 + 1,5·A1·(L − ${g(Lbreak)}) = ${g(r2(A1 * (Lbreak - Lfree)))} + ${g(r2(1.5 * A1 * (L - Lbreak)))}`; }
        if (L > Lalt && dlk !== null) {
          const alt = YA + dlk;
          how += ` · εναλλακτικά ${Ytxt} + δ·Lκ = ${g(YA)} + ${g(r2(dlk))} (${dlkHow}) = ${g(r2(alt))}`;
          if (alt < sd) { sd = alt; how += " → ισχύει το μικρότερο (εναλλακτικός τρόπος)"; } else how += " → ισχύει το μικρότερο (βασικός τύπος)";
        }
      } else if (grp === "B") {
        sd = A2 * Rm; how = `A2·R = ${g(A2)} × ${g(Rm)} m = ${g(r2(sd))}`;
        if (Rm > Ralt && dlk !== null) {
          const alt = YBC + dlk;
          how += ` · εναλλακτικά ${Ytxt} + δ·Lκ = ${g(YBC)} + ${g(r2(dlk))} (${dlkHow}) = ${g(r2(alt))}`;
          if (alt < sd) { sd = alt; how += " → ισχύει το μικρότερο (εναλλακτικός τρόπος)"; } else how += " → ισχύει το μικρότερο (βασικός τύπος)";
        }
      } else {
        if (no7Exc) { sd = netCost + spaceVal; how = `Νο 7 κατ’ εξαίρεση (όριο Νο 6): δαπάνη δικτύου ΜΤ & ΧΤ & Υ/Σ ${g(netCost)} + αξία χώρου Υ/Σ ${g(spaceVal)}`; }
        else {
          let base;
          if (dlk !== null) { base = YBC + dlk; how = `${Ytxt} + δ·Lκ = ${g(YBC)} + ${g(r2(dlk))} (${dlkHow}) = ${g(r2(base))}`; }
          else { base = YBC; how = `${Ytxt} + δ·Lκ = ${g(YBC)} + 0 (δεν δόθηκε απόσταση Lκ από δίκτυο ΜΤ)`; }
          if (n > 1) how += ` · ανά παροχή Νο 7 (× ${n})`;
          sd = base * n;
          if (withOld && netCost > 0) {
            const act = netCost + spaceVal;
            how += ` · αύξηση σε Νο 7: δαπάνη δικτύου + αξία χώρου = ${g(act)}`;
            if (act < sd) { sd = act; how += " → ισχύει το μικρότερο (πραγματική δαπάνη)"; } else how += " → ισχύει το μικρότερο (Σδ νέου Νο 7)";
          }
        }
      }
      Sd += sd;
      sdRows.push({ group: grp, n, Sd: r2(sd), Sd_each: n ? r2(sd / n) : 0, how });
    });
    // πρόσθετες επιβαρύνσεις
    const extras = [];
    const cableMax = num(OT.simple_supply_cable_max_m, 60);
    if (nTotal && L <= Lfree && cableM > Lfree) {
      const rate = num(any3f ? OT.simple_supply_cable_3f_eur : OT.simple_supply_cable_1f_eur);
      extras.push({ item: `Απλή παροχή με καλώδιο ${g(cableM)} m (> ${g(Lfree)} m` + (cableM <= cableMax ? `, έως ${g(cableMax)} m` : ` – υπέρβαση των ${g(cableMax)} m, ελέγξτε`) + `) – ${any3f ? "3Φ" : "1Φ"}`, qty: 1, rate, amount: r2(rate) });
    }
    if (ugDiff > 0) extras.push({ item: "Υπόγεια παροχή / δίκτυο αντί εναέριου – διαφορά κόστους", qty: 1, rate: ugDiff, amount: r2(ugDiff) });
    if (special !== "NONE") extras.push({ item: special === "EXC" ? "Δ – πραγματικές δαπάνες έργων ΜΤ & ΧΤ & Υ/Σ (εξαιρετικές ιδιομορφίες)" : "Δ – πραγματικές δαπάνες έργων σε απρόσιτη περιοχή (χωρίς Σπ)", qty: 1, rate: exceptional, amount: r2(exceptional) });
    const fopP = Math.trunc(num(inp.fop_poles)), fopW = num(inp.fop_wall_m);
    if (fopP > 0 && OT.FOP_pole_eur !== undefined && OT.FOP_pole_eur !== null) extras.push({ item: "ΦΟΠ – στύλοι", qty: fopP, rate: Number(OT.FOP_pole_eur), amount: r2(fopP * Number(OT.FOP_pole_eur)) });
    if (fopW > 0 && OT.FOP_wall_eur_m !== undefined && OT.FOP_wall_eur_m !== null) extras.push({ item: "ΦΟΠ – επιτοίχιο καλώδιο (m)", qty: fopW, rate: Number(OT.FOP_wall_eur_m), amount: r2(fopW * Number(OT.FOP_wall_eur_m)) });
    if (inp.night && OT.night_tariff_eur !== undefined && OT.night_tariff_eur !== null) extras.push({ item: "Διακριτή μέτρηση νυκτερινών καταναλώσεων", qty: 1, rate: Number(OT.night_tariff_eur), amount: r2(Number(OT.night_tariff_eur)) });
    if (extraEur > 0) extras.push({ item: "Λοιπή πρόσθετη επιβάρυνση (πραγματική δαπάνη)", qty: 1, rate: extraEur, amount: r2(extraEur) });
    const extraSum = extras.reduce((t, e) => t + e.amount, 0);
    const total = Sp + Sa + Sd + extraSum;
    const sdEach = {}; sdRows.forEach(x => sdEach[x.group] = x.Sd_each);
    rows.forEach(row => { const sh = sdEach[row.group] || 0; row.Sd_each = sh; const spEach = noSp ? 0 : SpRate; row.each_res = r2(spEach + row.Sa_each_res + sh); row.each_nonres = r2(spEach + row.Sa_each_nonres + sh); });
    return { district: dist, kind, special, L_m: L, R_m: Rm, Lk_oh_m: LkOh, Lk_ug_m: LkUg, n_ys: nYs, n: nTotal, rows, Sp: r2(Sp), Sa: r2(Sa), Sa_new: r2(SaNew), Sa_old: r2(SaOld), Sd: r2(Sd), sd_rows: sdRows,
      extras, extras_sum: r2(extraSum), total: r2(total), Sp_rate: SpRate, alpha, dlk: (dlk === null ? null : r2(dlk)),
      prices: PRI.id || "", prices_label: PRI.label || "", res_tiers: LV.Sa.residential_3f_tiers.map(t => Number(t[2])) };
  }

  // ---------------------------------------------------------------- ΜΤ
  function mv(inp) {
    const RR = priced(inp.prices), PRI = RR._prices || {};
    const MV = RR.mv, SP = MV.Sp, SEP = MV.Sep, SEN = MV.Sen;
    let kase = String(inp.case || (inp.temporary ? "TEMP" : "NEW")).toUpperCase();
    const cases = (MV.cases || []).map(c => c.key); if (!cases.length) cases.push("NEW");
    if (!cases.includes(kase)) kase = "NEW";
    const X = (inp.X !== undefined && inp.X !== null && inp.X !== "") ? num(inp.X, Number(MV.X === undefined ? 1 : MV.X)) : Number(MV.X === undefined ? 1 : MV.X);
    const step = num(SEN.N_rounding_kva, 50) || 50;
    const rnd = v => { v = Math.max(0, num(v)); return v > 0 ? Math.ceil(v / step - 1e-9) * step : 0; };
    const sup = String(inp.ep_supply || "OH").toUpperCase();
    const dOh = Number(SEP.delta_overhead_eur_m), dUg = Number(SEP.delta_underground_eur_m);
    const delta = (kase === "SPECIAL" || sup !== "UG") ? dOh : dUg;
    const metKey = String(inp.metering || "P43").toUpperCase();
    const met = metKey === "P43" ? Number(SP.metering_P43_eur || 0) : Number(SP.BKI_eur || 0);
    const opts = SP.protection_options || [];
    const protOf = key => {
      if (key === undefined || key === null || key === "") return [0, "—"];
      for (const o of opts) { if ((o.key !== undefined ? o.key : o.label) === key || o.label === key) return [Number(o.eur || 0), o.label || ""]; }
      return [0, "—"];
    };
    const [prot, protLabel] = protOf(inp.protection);
    const bExtra = Math.max(0, num(inp.b_extra_eur)), dpAct = Math.max(0, num(inp.dp_actual_eur)), dep = Math.max(0, num(inp.dep_eur));
    const years = Math.max(0, Math.trunc(num(inp.years))), removed = !!inp.removed, extraEur = Math.max(0, num(inp.extra_eur));
    const L = Math.max(0, num(inp.L_km !== undefined && inp.L_km !== null ? inp.L_km : inp.Len_km));
    const pump = kase === "IRR" || kase === "DRAIN";
    const stations = pump ? (inp.stations || []).filter(s => num((s || {}).N_kva) > 0) : [];
    const stRows = [];
    let N, NL, Lep, DpCat, nTxt = "", Nraw, Nold = 0, NLold = 0;
    if (pump) {
      stations.forEach((s, i) => {
        const Ni = rnd(s.N_kva), Li = Math.max(0, num(s.L_km)), Lepi = Math.max(0, num(s.Lep_m));
        const [pr, pl] = protOf(s.protection);
        stRows.push({ i: i + 1, N_kva: Ni, L_km: Li, Lep_m: Lepi, protection_eur: pr, protection_label: pl, Dp: r2(met + pr), NL: r2(Ni * Li) });
      });
      if (stRows.length >= 2) {
        N = 0.8 * stRows.reduce((t, r) => t + r.N_kva, 0);
        NL = stRows.reduce((t, r) => t + r.N_kva * r.L_km, 0);
        nTxt = `ισοδύναμος καταναλωτής ${stRows.length} αντλιοστασίων: N = 0,8·ΣNi = ${g(r2(N))} kVA, N·L = ΣNi·Li = ${g(r2(NL))} kVA·km`;
      } else if (stRows.length) { N = stRows[0].N_kva; NL = stRows[0].NL; nTxt = "μεμονωμένο αντλιοστάσιο"; }
      else { N = 0; NL = 0; nTxt = ""; }
      Lep = stRows.reduce((t, r) => t + r.Lep_m, 0);
      DpCat = stRows.reduce((t, r) => t + r.Dp, 0) + bExtra;
      Nraw = stations.reduce((t, s) => t + num(s.N_kva), 0);
    } else {
      Nraw = Math.max(0, num(inp.N_kva)); N = rnd(Nraw); Nold = rnd(inp.N_old_kva); NL = N * L; NLold = Nold * L;
      Lep = Math.max(0, num(inp.Lep_m)); DpCat = met + prot + bExtra;
    }
    const [S1n, s1p] = tiers(N, SEN.S1_tiers), [S2n, s2p] = tiers(NL, SEN.S2_tiers), [S1o] = tiers(Nold, SEN.S1_tiers), [S2o] = tiers(NLold, SEN.S2_tiers);
    const SenN = S1n + S2n, SenO = S1o + S2o;
    const SepCalc = delta * Lep;
    const lvNo = inp.lv_no, lvN = Math.max(0, inp.lv_n !== undefined && inp.lv_n !== null ? Math.trunc(num(inp.lv_n, 1)) : 1);
    let dist = String(inp.district || "C").toUpperCase(); if (!["A", "B", "C"].includes(dist)) dist = "C";
    const lvUse = String(inp.lv_use || "NONRES").toUpperCase();
    let spLv = 0, saLv = 0;
    if ((kase === "INC_LV" || kase === "LVTEMP2MV") && lvNo && lvN) { spLv = Number(RR.lv.Sp[dist]) * lvN; saLv = lvSaEach(RR, lvNo, dist, lvUse === "RES")[0] * lvN; }
    let fRec = 0; const how = []; let S1 = S1n, S2 = S2n, Sp, Sep, Sen;
    if (kase === "NEW") { Sp = DpCat; Sep = SepCalc; Sen = SenN; how.push("νέα ηλεκτροδότηση: Σ = Χ·(Δπ + δ·Lεπ + Σ1 + Σ2)"); }
    else if (kase === "TEMP") { S1 = r2(S1n / 2); Sp = DpCat; Sep = SepCalc; Sen = S1 + S2n; how.push("προσωρινή ηλεκτροδότηση έως 1 έτος: ½ Σ1 (το υπόλοιπο ½ σε παράταση/οριστικοποίηση)"); }
    else if (kase === "INC_LV") { Sp = DpCat - spLv; Sep = SepCalc; Sen = SenN - saLv; how.push(`αύξηση από ΧΤ σε ΜΤ: Σπ = Δπ − Σπ(ΧΤ) = ${g(r2(DpCat))} − ${g(r2(spLv))} · Σεν = Σεν(ΜΤ) − Σα(ΧΤ) = ${g(r2(SenN))} − ${g(r2(saLv))}`); }
    else if (kase === "INC_MV") { Sp = dpAct; Sep = 0; Sen = Math.max(0, SenN - SenO); how.push(`αύξηση από ΜΤ σε ΜΤ: Σπ = δαπάνη πραγματικού έργου · Σεπ = 0 · Σεν = Σεν(${g(N)}) − Σεν(${g(Nold)}) = ${g(r2(SenN))} − ${g(r2(SenO))}`); }
    else if (kase === "RECON") {
      fRec = years < 10 ? 0 : (years >= 14 ? 1 : (years - 9) / 5);
      const SenMin = N <= Nold ? SenN : SenO;
      Sen = fRec * SenMin + Math.max(0, SenN - SenO);
      Sp = removed ? DpCat : dpAct; Sep = 0;
      how.push(`επανασύνδεση μετά από ${years} έτη: συντελεστής Σεν αρχικής ισχύος ${g(fRec)} (${years < 10 ? "ν < 10 → 0" : (years >= 14 ? "ν ≥ 14 → πλήρες" : "(ν − 9)/5")})` + (N > Nold ? ` · επιπλέον ισχύς: Σεν(${g(N)}) − Σεν(${g(Nold)}) = ${g(r2(SenN - SenO))}` : "") + (removed ? " · Σπ = Δπ (παροχή αποξηλωμένη)" : " · Σπ = πραγματικές δαπάνες επαναλειτουργίας"));
    }
    else if (kase === "SPECIAL") {
      const cond = SepCalc + S2n >= dep;
      Sp = DpCat; Sep = cond ? SepCalc : dep; Sen = cond ? SenN : S1n;
      how.push(`ειδικές συνθήκες: Σεπ + Σ2 = ${g(r2(SepCalc))} + ${g(r2(S2n))} = ${g(r2(SepCalc + S2n))} ${cond ? "≥" : "<"} Δεπ = ${g(dep)} → ` + (cond ? "Σ = Χ·(Σπ + Σεπ + Σ1 + Σ2)" : "Σ = Χ·(Σπ + Δεπ + Σ1)"));
    }
    else if (kase === "IRR") { Sp = DpCat; Sep = SepCalc; Sen = SenN; how.push("αντλιοστάσια άρδευσης – " + (nTxt || "δώστε τα στοιχεία των αντλιοστασίων")); }
    else if (kase === "DRAIN") {
      const cond = S2n >= dep;
      Sp = DpCat; Sep = dep; Sen = cond ? (S1n + S2n - dep) : S1n;
      how.push("αντλιοστάσια αποστράγγισης – " + (nTxt || "δώστε τα στοιχεία") + `: Σ2 = ${g(r2(S2n))} ${cond ? "≥" : "<"} Δεπ = ${g(dep)} → ` + (cond ? "Σεν = Σ1 + Σ2 − Δεπ" : "Σεν = Σ1") + " · Σ = Χ·(Δπ + Δεπ + Σεν)");
    }
    else if (kase === "TEMP2PERM") { Sp = dpAct; Sep = SepCalc; Sen = Math.max(0, SenN - SenO) + S1o / 2; how.push(`μετατροπή προσωρινής ΜΤ σε οριστική: Σεν = ½Σ1(Νπρ) + Σεν(Νορ) − Σεν(Νπρ) = ${g(r2(S1o / 2))} + ${g(r2(SenN))} − ${g(r2(SenO))}`); }
    else { Sp = DpCat - spLv; Sep = SepCalc; Sen = SenN - saLv / 2; how.push(`μετατροπή προσωρινής ΧΤ σε οριστική ΜΤ: Σπ = Δπ − Σπ(ΧΤ) = ${g(r2(DpCat))} − ${g(r2(spLv))} · Σεν = Σ1 + Σ2 − ½Σα(ΧΤ) = ${g(r2(SenN))} − ${g(r2(saLv / 2))}`); }
    const conn = X * (Sp + Sep + Sen);                    // κόστος σύνδεσης κατά το Σύστημα Συμμετοχών (100%)
    const totalFull = conn + extraEur;
    let share = num(MV.share_pct, 100); if (!(share > 0 && share <= 100)) share = 100;
    const meterIn = Math.max(0, num(inp.meter_eur));
    const meter = share < 100 ? Math.min(meterIn, Math.max(0, conn)) : 0;
    let total;
    if (share < 100) {
      total = share / 100 * (conn - meter) + meter + extraEur;
      how.push(`Ε-114/2026: ο καταναλωτής ΜΤ καταβάλλει το ${g(share)}% του κόστους σύνδεσης ${g(r2(conn))} €` + (meter > 0 ? ` πλην του κόστους μετρητή ${g(r2(meter))} € που καταβάλλεται πλήρως` : " (κόστος μετρητή: πλήρως – δώστε το ποσό του μετρητή)"));
    } else total = totalFull;
    return { case: kase, N_kva: r2(N), N_raw: r2(Nraw), N_old_kva: r2(Nold), X, L_km: L, Lep_m: r2(Lep), ep_supply: sup, kvakm: r2(NL), kvakm_old: r2(NLold),
      metering: metKey, metering_eur: r2(met), protection_eur: r2(prot), protection_label: protLabel, b_extra_eur: r2(bExtra), Dp_catalog: r2(DpCat),
      dp_actual_eur: r2(dpAct), dep_eur: r2(dep), years, removed, f_recon: r2(fRec), sp_lv: r2(spLv), sa_lv: r2(saLv),
      stations: stRows, Sp: r2(Sp), Sep: r2(Sep), Sep_calc: r2(SepCalc), delta, S1: r2(S1), S1_parts: s1p, S2: r2(S2), S2_parts: s2p,
      S1_old: r2(S1o), S2_old: r2(S2o), Sen_new: r2(SenN), Sen_old: r2(SenO), Sen: r2(Sen), extra_eur: r2(extraEur),
      conn_cost: r2(conn), share_pct: share, meter_eur: r2(meter), total_full: r2(totalFull), total: r2(total), how: how.join(" · "),
      prices: PRI.id || "", prices_label: PRI.label || "" };
  }
  window.PARTICIP = { lv, mv, rules: R, priced, priceSets, priceSet, groupLabel: GROUP_LABEL, lvSaEach: (no, district, residential, prices) => lvSaEach(priced(prices), no, district, residential) };
})();
