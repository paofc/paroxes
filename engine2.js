/* Engine v2 (JavaScript) – mirrors engine2.py exactly: loads from supplies (ΟΔ.22/ΟΔ.45), cable per installation case
   (ΟΔ.26 3η έκδ. / ΟΔ.45), meter board, BOM (installation + removal), LV feeder adequacy & capacity, MV customers (ΟΔ.34),
   span/support check (CS-3) and service clearances (C-2…C-19). Data object D = data.json. */
(function (root) {
  "use strict";

  function makeEngine2(D) {
    const SUP = {}, CAB = {}, COND = {}, TR = {};
    D.supplies.forEach(s => SUP[s.no] = s);
    D.supply_cables.forEach(c => CAB[c.key] = c);
    D.lv_feeder_conductors.forEach(c => COND[c.key] = c);
    D.transformers.forEach(t => TR[t.kva] = t);
    const R45 = D.od45.rules, FUSES = D.lv_fuse_sizes, TYP = D.typ, SR = TYP.span_rules, SPANS = TYP.cs3_cu.spans;
    const CS3 = {}; TYP.cs3_cu.cables.forEach(c => CS3[c.size] = c);
    const num = v => (v === null || v === undefined || v === "" || isNaN(Number(v))) ? 0 : Number(v);
    const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

    function kn(n) { if (n <= 0) return 1.0; const v = D.coincidence_od45[String(Math.trunc(n))]; return v === undefined ? null : v; }

    function worstPhase1f(items) {
      items = items.filter(x => x[1] > 0).sort((a, b) => b[0] - a[0]);
      let taken = 0, tot = 0;
      items.forEach(([A, n]) => { const slots = Math.ceil((taken + n) / 3) - Math.ceil(taken / 3); tot += slots * A; taken += n; });
      return tot;
    }

    function clusterLoad(counts, loads, line, extraA, extraAcoinc, distribution) {
      loads = loads || {}; line = line || "AUTO"; distribution = distribution || "WORST";
      let N1 = 0, N3 = 0, sum1 = 0, sum3 = 0, eq1f = 0, slots = 0;
      const rows = [], items1 = [];
      D.supplies.forEach(s => {
        const n = Math.trunc(num(counts[s.no]));
        const A = loads[s.no] !== undefined && loads[s.no] !== null && loads[s.no] !== "" ? Number(loads[s.no]) : s.load_A;
        if (s.phases === 1) { N1 += n; sum1 += n * A; items1.push([A, n]); } else { N3 += n; sum3 += n * A; }
        eq1f += n * s.eq1f; slots += n * s.slots;
        rows.push({ no: s.no, n, A, phases: s.phases, nA: n * A });
      });
      const N = N1 + N3;
      if (line === "AUTO") line = (N3 === 0 && N1 <= 2 && N1 > 0) ? "1F" : "3F";
      if (line === "1F" && N3 > 0) line = "3F";
      const k = kn(N);
      const per = line === "1F" ? sum1 : ((distribution === "WORST" ? worstPhase1f(items1) : sum1 / 3) + sum3);
      const I = k === null ? null : (per + num(extraAcoinc)) * k + num(extraA);
      return { N, N1, N3, sum1, sum3, eq1f, slots, line, distribution, phases: line === "1F" ? 1 : 3, per_phase_raw: per, kn: k, I_B: I, rows, extra_A: num(extraA), extra_A_coinc: num(extraAcoinc) };
    }

    const CASES = {
      OH_F: { label: "Εναέρια παροχή – συγκεντρικό ελεύθερα στον αέρα", conc: "air", xlpe: null },
      OH_W: { label: "Εναέρια παροχή – συγκεντρικό επιτοίχια", conc: "air_wall", xlpe: null },
      UG_OH: { label: "Υπόγεια παροχή από εναέριο δίκτυο (κρίνει ο αέρας στον στύλο)", conc: "air", xlpe: "pipe" },
      UG_G: { label: "Υπόγεια παροχή από υπόγειο δίκτυο – στο έδαφος ή σωλήνα ≤ 6 m", conc: "ground", xlpe: "ground" },
      UG_P: { label: "Υπόγεια παροχή από υπόγειο δίκτυο – σε σωλήνα > 6 m", conc: "pipe", xlpe: "pipe" },
    };
    const rating = (c, basis, col) => { const t = c[basis]; if (!t) return null; const v = t[col]; return (v === undefined) ? null : v; };

    const UG_XLPE_MAX_S = 150;   // κανόνας γραφείου: μέγιστο / μοναδικό καλώδιο XLPE υπόγειας παροχής μετά το συγκεντρικό 4x50 Cu = 3x150Al+50Cu

    function selectCable(Ireq, phases, o) {
      o = o || {};
      const basis = o.basis || "od26", caseK = o.case || "OH_F", spec = CASES[caseK];
      const maxConc = o.max_conc_ug === undefined ? R45.max_conc_underground_default : o.max_conc_ug;
      const maxS = maxConc ? parseInt(String(maxConc).split("x")[1], 10) : 9999;
      const airGov = o.air_governs === undefined ? false : !!o.air_governs;
      const kAir = o.k_air === undefined ? 1 : o.k_air, kG = o.k_ground === undefined ? 1 : o.k_ground, kP = o.k_pipe === undefined ? 1 : o.k_pipe;
      const aircol = o.wall ? "air_wall" : "air";
      // κανόνας γραφείου (ugXlpe150, προεπιλογή ΝΑΙ): στις υπόγειες περιπτώσεις, όταν δεν επαρκεί το συγκεντρικό 4x50 Cu δεν επιλέγεται XLPE
      // μικρότερης διατομής (3x50 / 3x95) αλλά απευθείας το 3x150Al+50Cu – εξαντλείται η ικανότητά του και μετά 2, 3 … παράλληλα 3x150Al+50Cu
      const ugX150 = o.ug_xlpe150 === undefined ? true : !!o.ug_xlpe150;
      const rows = []; let chosen = null;
      D.supply_cables.forEach(c => {
        if (c.phases !== phases) return;
        if (basis === "od26" && !c.od26) return;
        let col;
        if (c.kind === "conc") {
          if (caseK !== "OH_F" && caseK !== "OH_W" && c.s_phase > maxS) return;
          col = spec.conc; if (col === "air" && caseK === "UG_OH") col = aircol;
        } else {
          if (!spec.xlpe) return; col = spec.xlpe;
          if (ugX150 && c.parallel === 1 && c.s_phase < UG_XLPE_MAX_S) {
            rows.push({ key: c.key, name: c.name, short: c.short, kind: c.kind, s_phase: c.s_phase, parallel: c.parallel, base: null, I_z: null, governs: col, ok: false, util: null, legacy_only: c.legacy_only, office_skip: true });
            return;
          }
        }
        const base = rating(c, basis, col);
        if (base === null) return;
        const k = { air: kAir, air_wall: kAir, ground: kG, pipe: kP }[col];
        let Iz = base * k, gov = col;
        if (c.kind === "conc" && airGov && col !== "air" && col !== "air_wall") { const Ia = rating(c, basis, aircol) * kAir; if (Ia < Iz) { Iz = Ia; gov = aircol; } }
        const ok = Iz >= Ireq;
        rows.push({ key: c.key, name: c.name, short: c.short, kind: c.kind, s_phase: c.s_phase, parallel: c.parallel, base, I_z: Iz, governs: gov, ok, util: Iz ? Ireq / Iz : null, legacy_only: c.legacy_only });
        if (ok && chosen === null) chosen = rows[rows.length - 1];
      });
      if (chosen === null && spec.xlpe) {
        // υπόγειες περιπτώσεις: όταν ούτε τα 2 παράλληλα του καταλόγου επαρκούν → n ≥ 3 παράλληλα του μεγαλύτερου XLPE (κανόνας γραφείου)
        chosen = parallelXlpe(rows, Ireq);
        if (chosen) rows.push(chosen);
      }
      return { case: caseK, label: spec.label, rows, chosen };
    }

    function parallelXlpe(rows, Ireq, nMin) {
      nMin = nMin || 3;
      let base = null;
      rows.forEach(r => { if (r.kind === "xlpe" && r.parallel === 1 && r.I_z && (base === null || r.I_z > base.I_z)) base = r; });
      if (!base) return null;
      const n = Math.max(nMin, Math.ceil(Ireq / base.I_z - 1e-9));
      const Iz = n * base.I_z;
      return { key: `${base.key}_x${n}`, name: `${n} × ${base.name}`, short: `${n}(${base.short})`, kind: "xlpe", s_phase: base.s_phase, parallel: n, base: n * base.base, I_z: Iz, governs: base.governs, ok: true, util: Ireq / Iz, legacy_only: base.legacy_only, multi: true, bom_item: CAB[base.key].bom_item };
    }

    // καλώδιο καταλόγου από το κλειδί – και για τα συνθετικά κλειδιά «<key>_x<n>»
    function resolveCable(key) {
      if (!key) return null;
      if (CAB[key]) return CAB[key];
      const m = /^(.+)_x(\d+)$/.exec(String(key));
      if (m && CAB[m[1]]) { const base = CAB[m[1]], n = parseInt(m[2], 10); return Object.assign({}, base, { key, parallel: n, name: `${n} × ${base.name}`, short: `${n}(${base.short})` }); }
      return null;
    }
    function cableUnit(ch) {
      if (!ch) return "";
      if (ch.parallel === 1) return ch.short;
      const base = resolveCable(ch.key); const bi = base ? base.bom_item : null;
      const c = D.supply_cables.find(x => x.parallel === 1 && x.bom_item === bi);
      return c ? c.short : ch.short;
    }
    const vf1 = (v, d) => { const m = Math.pow(10, d); return (Math.floor(v * m + 0.5) / m).toFixed(d); };

    // υπόγεια παροχή – κανόνας γραφείου: ένα (ή περισσότερα παράλληλα) υπόγεια καλώδια ανά μετρητική διάταξη, από το φορτίο ΤΗΣ διάταξης
    function ugCables(cl, board, counts, loads, caseK, marginPct, chosenMain, extraA, extraAcoinc, distribution, selOpts) {
      const arrs = board.arrangements || [];
      const per = []; let total = 0; const items = {};
      arrs.forEach(a => {
        const cnt = {}; a.left.concat(a.right).forEach(no => cnt[no] = (cnt[no] || 0) + 1);
        const first = a.idx === 1;
        const ck = clusterLoad(cnt, loads, cl.line, first ? extraA : 0, first ? extraAcoinc : 0, distribution);
        const Ireq = (ck.I_B || 0) * (1 + num(marginPct) / 100);
        const ch = arrs.length === 1 ? chosenMain : selectCable(Ireq, cl.phases, Object.assign({ case: caseK }, selOpts)).chosen;
        const npar = ch ? ch.parallel : 0;
        total += npar;
        if (ch) { const bi = resolveCable(ch.key).bom_item; items[bi] = (items[bi] || 0) + npar; }
        const counts2 = {}; Object.keys(cnt).forEach(no => { if (cnt[no]) counts2[no] = cnt[no]; });
        per.push({ idx: a.idx, cell: !!a.cell, label: a.cell ? `Κυψέλη ${a.no}` : `Δ${a.idx}`, n: ck.N, N1: ck.N1, N3: ck.N3, counts: counts2, kn: ck.kn, I_B: ck.I_B, I_req: Ireq, cable: ch, parallel: npar, util: (ch && ch.I_z) ? Ireq / ch.I_z : null, ok: !!ch,
          extra: first && (num(extraA) > 0 || num(extraAcoinc) > 0) });
      });
      const units = per.filter(p => p.cable).map(p => cableUnit(p.cable));
      const uniform = units.length > 0 && units.every(u => u === units[0]);
      const notes = [];
      const nCell = arrs.filter(a => a.cell).length;
      if (arrs.length >= 2) {
        notes.push(`Υπόγεια παροχή με ${arrs.length} μετρητικές διατάξεις` + (nCell ? ` (${arrs.length - nCell} με διανομέα + ${nCell} κυψέλ${nCell === 1 ? "η" : "ες"} Νο 5–7 μόν${nCell === 1 ? "η της" : "ες τους"})` : "") +
          `: κάθε διάταξη τροφοδοτείται με δικό της υπόγειο καλώδιο, διαστασιολογημένο από το φορτίο της (Kn του Πίν. ΙΙ ΟΔ.45 για τους μετρητές της διάταξης) – σύνολο ${total} υπόγεια καλώδια (κανόνας γραφείου).`);
        if (per.some(p => p.extra)) notes.push("Τα πρόσθετα φορτία (με / χωρίς ταυτοχρονισμό) χρεώθηκαν στην 1η διάταξη.");
      }
      if (per.some(p => p.cable && p.cable.multi)) notes.push("Σε διάταξη που δεν καλύπτεται ούτε από 2 παράλληλα καλώδια επιλέγονται n ≥ 3 παράλληλα του μεγαλύτερου καλωδίου XLPE (n·I_z' ≥ I_req).");
      if (per.some(p => !p.ok)) notes.push("⚠ Σε κάποια διάταξη κανένα καλώδιο του καταλόγου δεν επαρκεί (μονοφασική γραμμή) – εξετάστε τριφασική γραμμή.");
      let head;
      if (!units.length) head = "ΚΑΜΙΑ";
      else if (uniform) head = total > 1 ? `${total} × ${units[0]}` : units[0];
      else {   // σύνοψη ανά μονό καλώδιο, με τη σειρά του καταλόγου (όπως και στο Excel)
        const agg = {}; per.forEach(p => { if (p.cable) { const u = cableUnit(p.cable); agg[u] = (agg[u] || 0) + p.parallel; } });
        head = D.supply_cables.filter(c => c.parallel === 1 && (c.short in agg)).map(c => agg[c.short] > 1 ? `${agg[c.short]} × ${c.short}` : c.short).join(" + ");
      }
      const lst = per.map(p => `${p.label}: ${p.cable ? p.cable.short : "ΚΑΜΙΑ"} (I_B ${vf1(p.I_B || 0, 1)} A` + (p.cable ? `, I_z' ${vf1(p.cable.I_z, 1)} A, ${vf1(p.util * 100, 0)} %` : "") + ")").join(" · ");
      return { n_arr: arrs.length, per_arr: per, n_cables: total, items: Object.keys(items).map(k => ({ bom_item: k, parallel: items[k] })), uniform, head, notes, list: lst };
    }

    // office rule: a single meter of a listed type on its own (N = 1, no extra loads) → fixed concentric cable (e.g. Νο 2 → 4x6)
    function singleSupplyException(cl, counts, rules) {
      rules = rules || R45.single_supply_exceptions || [];
      if (cl.N !== 1 || cl.extra_A > 0 || cl.extra_A_coinc > 0) return null;
      for (const rule of rules) if (Number((counts || {})[rule.no] || 0) === 1) return rule;
      return null;
    }
    // κανόνας γραφείου: ΔΥΟ μετρητές Νο 05 μόνοι τους (χωρίς άλλους μετρητές / πρόσθετα φορτία) → τριφασική γραμμή, συγκεντρικό 4x16 Cu και διανομέας·
    // δεν εφαρμόζεται όταν ο χρήστης επιβάλλει μονοφασική γραμμή
    function pairSupplyException(counts, extraA, extraAcoinc, line, rule) {
      rule = rule === undefined ? R45.pair_supply_rule : rule;
      if (!rule || String(line || "AUTO").toUpperCase() === "1F") return null;
      if (num(extraA) > 0 || num(extraAcoinc) > 0) return null;
      const cnt = Math.trunc(rule.count || 2);
      let total = 0; Object.keys(counts || {}).forEach(k => { total += Math.trunc(num(counts[k])); });
      if (total !== cnt || Math.trunc(num((counts || {})[rule.no])) !== cnt) return null;
      return rule;
    }
    function applyException(sel, rule) {
      const applied = [];
      Object.keys(sel).forEach(c => {
        const s = sel[c]; const row = s.rows.find(r => r.short === rule.cable) || null;
        s.exception = null;
        if (row && row.I_z) { s.chosen = row; s.exception = rule; applied.push(c); }
      });
      return applied;
    }

    function supplyType(network, request, eq1f, ohFeasible) {
      const lim = R45.max_1f_equiv_overhead;
      if (network === "UG") return ["UG", "Από υπόγειο δίκτυο γίνεται υπόγεια παροχή (ΟΔ.45 §4.3)."];
      if (request === "UG") return ["UG", "Υπόγεια παροχή μετά από αίτηση του καταναλωτή ή απόφαση ΔΕΔΔΗΕ (ΟΔ.45 §4.1.2)."];
      if (eq1f > lim) return ["UG", `Ισοδύναμοι μονοφασικοί μετρητές ${eq1f} > ${lim} → υποχρεωτικά υπόγεια παροχή (ΟΔ.45 §4.2).`];
      if (!ohFeasible) return ["UG", "Το φορτίο υπερβαίνει την ικανότητα του μεγαλύτερου συγκεντρικού καλωδίου (4x50) στον αέρα → υπόγεια παροχή (ΟΔ.45 §2.3.4)."];
      if (request === "OH") return ["OH", "Εναέρια παροχή (επιλογή μελετητή – επιτρεπτή: ≤ 18 ισοδύναμοι μονοφασικοί, ΟΔ.45 §4.1.1)."];
      return ["OH", `Από εναέριο δίκτυο με ${eq1f} ≤ ${lim} ισοδύναμους μονοφασικούς μετρητές → εναέρια παροχή (ΟΔ.45 §4.1.1).`];
    }

    const BIG_ORDER = ["Νο 4"], CELL_ORDER = ["Νο 7", "Νο 6", "Νο 5"], T_ORDER = ["Νο 3", "Νο 2", "Νο 1"], S_ORDER = ["Νο 05", "Νο 03"];   // Νο 5–7: κυψέλες μόνες τους, χωρίς διανομέα, εκτός διάταξης
    const BOX_KIND = {}; D.supplies.forEach(s => BOX_KIND[s.no] = s.box || "3F");
    const BOX_LABEL = { "Νο 03": "1Φ", "Νο 05": "1Φ", "Νο 1": "3Φ", "Νο 2": "3Φ", "Νο 3": "3Φ", "Νο 4": "Νο4", "Νο 5": "Νο5", "Νο 6": "Νο6", "Νο 7": "Νο7" };
    const mFmt = cm => (Number(cm) / 100).toFixed(2).replace(".", ",");
    const ceilDiv = (a, b) => Math.ceil(a / b);

    function mdCode(N, N1, N3, slots, distributor, nArr, supply, nCells, pair) {
      nCells = nCells || 0;
      if (N === 0 && nCells === 0) return ["—", "—"];
      const suf = supply === "OH" ? "Ε" : "Υ";
      const cellsTxt = nCells ? ` + ${nCells} κυψέλ${nCells === 1 ? "η" : "ες"} ΧΤ Νο 5–7 μόν${nCells === 1 ? "η της" : "ες τους"}, χωρίς διανομέα, εκτός διάταξης (ΜΔ-75 / ΜΔ-83)` : "";
      if (N === 0) return ["ΜΔ-75", `${nCells} κυψέλ${nCells === 1 ? "η" : "ες"} ΧΤ Νο 5–7 – ιδιαίτερη διάταξη χωρίς διανομέα, με την κυψέλη και έναν τριφασικό μετρητή (τοιχίο ΜΔ-75 / καμπίνα ΜΔ-83)`];
      if (N === 1) return ["ΜΔ-3", `ΜΔ-3${suf} (ένας μετρητής` + (N3 ? " – τριφασικός, §7.2)" : ")") + cellsTxt];
      if (!distributor) return ["ΜΔ-5", `ΜΔ-5${suf} (2–3 μονοφασικοί, χωρίς κιβώτιο διακλάδωσης)` + cellsTxt];
      if (slots > 72 || nArr > 4) return ["ΜΔ-15", "Υπέρβαση 72 ισοδύναμων μονοφασικών – δύο μετρητικά συγκροτήματα / ΜΔ-15 σε ορόφους (ΜΔ-14 υλικά & σημ. 2007 – ΟΔ.45 §2.3.7, §7.4)" + cellsTxt];
      if (nArr === 1 && pair) return ["ΜΔ-7", "ΜΔ-7 (δύο μονοφασικοί μετρητές Νο 05 με κιβώτιο διακλάδωσης – κανόνας γραφείου: 2 × Νο 05 → 4x16 με διανομέα)" + cellsTxt];
      if (nArr === 1) return ["ΜΔ-7", "ΜΔ-7 (4–18 μονοφασικοί / έως 6 τριφασικοί, μία διάταξη – 1 κιβώτιο διακλάδωσης)" + (N3 === 0 ? " · εναλλακτικά ΜΔ-9 (δύο σειρές, μόνο μονοφασικοί)" : "") + cellsTxt];
      if (nArr === 2) return ["ΜΔ-11", "ΜΔ-11 (19–36 μονοφασικοί / έως 12 τριφασικοί – 2 κιβώτια διακλάδωσης, η δεύτερη διάταξη κάτω από την πρώτη)" + cellsTxt];
      return ["ΜΔ-13", "ΜΔ-13 (37–72 μονοφασικοί / 13–24 τριφασικοί – 2×ΜΔ-11 + κιβώτιο διακλάδωσης υπογείου καλωδίου, φρεάτιο ΜΔ-52)" + cellsTxt];
    }

    function boardQuota(total, n, k) { if (n <= 0) return 0; return Math.floor(total / n) + (k <= total % n ? 1 : 0); }
    function boardFeasible(nB, nT, nS, n, perSide, bigPerSide, sT, sB) {
      const b1 = ceilDiv(nB, n), t1 = ceilDiv(nT, n), s1 = ceilDiv(nS, n);
      if (b1 > 2 * bigPerSide) return false;
      const bA = Math.min(b1, bigPerSide), bB = b1 - bA;
      const capA = perSide - sB * bA, capB = perSide - sB * bB;
      if (t1 > Math.floor(capA / sT) + Math.floor(capB / sT)) return false;
      return sB * b1 + sT * t1 + s1 <= 2 * perSide;
    }
    function meterBoard(cl, counts, nArrSel, network, pipeGt6, p, supply, linkSel, forceDistributor) {
      p = p || {}; counts = counts || {};
      const g = k => (p[k] !== undefined && p[k] !== null && p[k] !== "") ? Number(p[k]) : Number(R45[k]);
      const n = no => Math.trunc(num(counts[no]));
      const N1 = cl.N1, N3 = cl.N3, N = cl.N, slots = cl.slots;
      const dims = { "1F": [g("box_1f_w_cm"), g("box_1f_h_cm")], "3F": [g("box_3f_w_cm"), g("box_3f_h_cm")], "CT": [g("box_ct_w_cm"), g("box_ct_h_cm")], "D": [g("distributor_w_cm"), g("distributor_h_cm")] };
      const rep = order => { const out = []; order.forEach(no => { for (let i = 0; i < n(no); i++) out.push(no); }); return out; };
      const bigs = rep(BIG_ORDER), ts = rep(T_ORDER), ss = rep(S_ORDER), cells = rep(CELL_ORDER);
      const nCells = cells.length;
      const Nd = N - nCells, N1d = N1, N3d = N3 - nCells, slotsD = slots - cells.reduce((t, no) => t + SUP[no].slots, 0);   // μετρητές της διάταξης (χωρίς κυψέλες)
      const distributor = (N1d > g("meters_no_branch_box")) || (N3d >= 1 && Nd >= 2) || !!forceDistributor;   // force: κανόνας γραφείου 2 × Νο 05 → διανομέας
      const maxRows = 2;
      const perSide = Math.trunc(g("slots_per_side")), bigPerSide = Math.trunc(g("big_per_side"));
      const sT = 3, sB = 6, extra = g("extra_width_cm");
      const nSel = Math.trunc(Number(nArrSel) || 0);
      let nMin = 0;
      const arrangements = [];
      if (Nd > 0 && !distributor) { arrangements.push({ left: [], right: bigs.concat(ts, ss), distributor: false }); nMin = 1; }
      else if (Nd > 0) {
        nMin = 8; for (let k = 1; k <= 8; k++) if (boardFeasible(bigs.length, ts.length, ss.length, k, perSide, bigPerSide, sT, sB)) { nMin = k; break; }
        const nUse = nSel > 0 ? Math.max(nMin, Math.min(nSel, 8)) : nMin;
        let remB = bigs.slice(), remT = ts.slice(), remS = ss.slice();
        for (let k = 1; k <= nUse; k++) {
          const qb = boardQuota(bigs.length, nUse, k), qt = boardQuota(ts.length, nUse, k), qs = boardQuota(ss.length, nUse, k);
          const bk = remB.slice(0, qb); remB = remB.slice(qb);
          const tk = remT.slice(0, qt); remT = remT.slice(qt);
          const sk = remS.slice(0, qs); remS = remS.slice(qs);
          const bA = bk.slice(0, bigPerSide), bB = bk.slice(bigPerSide, 2 * bigPerSide);
          const capA = perSide - sB * bA.length, capB = perSide - sB * bB.length;
          const tcapA = Math.floor(capA / sT), tcapB = Math.floor(capB / sT);
          const Ta = Math.min(tk.length, tcapA + tcapB);
          const TA = Math.min(tcapA, ceilDiv(Ta, 2)), TB = Ta - TA;
          const tA = tk.slice(0, TA), tB = tk.slice(TA, Ta);
          const scapA = capA - sT * TA, scapB = capB - sT * TB;
          const Sa = Math.min(sk.length, scapA + scapB);
          const SA = Math.min(scapA, Math.max(ceilDiv(Sa, 2), Sa - scapB));
          const sA = sk.slice(0, SA), sB2 = sk.slice(SA, Sa);
          arrangements.push({ left: bB.concat(tB, sB2), right: bA.concat(tA, sA), distributor: true });
        }
      }
      const nArr = arrangements.length;
      arrangements.forEach((a, i) => { const idx = i + 1; a.idx = idx; a.row = (idx - 1) % maxRows + 1; a.col = Math.floor((idx - 1) / maxRows) + 1; a.cell = false; });
      // κυψέλες ΧΤ Νο 5–7: κάθε μία ιδιαίτερη «διάταξη» (κυψέλη + ένας τριφασικός μετρητής, χωρίς διανομέα) σε ιδιαίτερη στήλη δεξιά από τις διατάξεις
      const ncolsD = arrangements.length ? Math.max(...arrangements.map(a => a.col)) : 0;
      cells.forEach((no, j) => arrangements.push({ left: [], right: [no], distributor: false, cell: true, no, idx: nArr + j + 1, row: j % maxRows + 1, col: ncolsD + 1 + Math.floor(j / maxRows) }));
      const cellGap = g("cell_meter_gap_cm");   // ΜΔ-75: απόσταση κυψέλης – κιβωτίου 3Φ μετρητή (250 mm)
      arrangements.forEach(a => {
        a.wL = a.left.reduce((t, no) => t + dims[BOX_KIND[no]][0], 0);
        a.wR = a.right.reduce((t, no) => t + dims[BOX_KIND[no]][0], 0) + (a.cell ? cellGap + dims["3F"][0] : 0);   // κυψέλη + διάκενο 25 cm + κιβώτιο 3Φ μετρητή δίπλα της (ΜΔ-75)
        a.wD = a.distributor ? dims.D[0] : 0;
        a.width = a.wL + a.wD + a.wR;
        a.slots = a.left.concat(a.right).reduce((t, no) => t + SUP[no].slots, 0);
        a.n = a.left.length + a.right.length;
      });
      const gap = g("column_gap_cm"), mTop = g("niche_margin_top_cm"), mBot = g("niche_margin_bottom_cm");
      const yUp = g("row_upper_bottom_cm"), yLow = g("row_lower_bottom_cm"), rowGap = g("row_gap_cm");
      const ncols = arrangements.length ? Math.max(...arrangements.map(a => a.col)) : 0;
      // στήλη: οι διανομείς ο ένας κάτω από τον άλλον → κοινή θέση διανομέα = μέγιστο αριστερό πλάτος της στήλης
      const colWL = {}, colWR = {}, colW = {};
      for (let c = 1; c <= ncols; c++) {
        const inCol = arrangements.filter(a => a.col === c);
        colWL[c] = Math.max(...inCol.map(a => a.wL)); colWR[c] = Math.max(...inCol.map(a => a.wR + a.wD)); colW[c] = colWL[c] + colWR[c];
      }
      arrangements.forEach(a => {
        let xCol = extra / 2; for (let c = 1; c < a.col; c++) xCol += colW[c] + gap;
        a.x_col = xCol; a.xD = xCol + colWL[a.col]; a.x = a.xD - a.wL; a.col_w = colW[a.col];
        a.h = Math.max(...a.left.concat(a.right).map(no => dims[BOX_KIND[no]][1]).concat(a.distributor ? [dims.D[1]] : [], a.cell ? [dims["3F"][1]] : [], [0]));
      });
      const rowW = {}; arrangements.forEach(a => { rowW[a.row] = (rowW[a.row] || 0) + a.width; });
      let totalW = 0; for (let c = 1; c <= ncols; c++) totalW += colW[c]; totalW += gap * Math.max(ncols - 1, 0);
      const rowsUsed = arrangements.length ? Math.max(...arrangements.map(a => a.row)) : 0;
      // ύψη σειρών (ΟΔ.45 ΜΔ-7 / ΜΔ-9): άνω σειρά (1η διάταξη) ΠΑΝΤΟΤΕ στα 1,50 m, κάτω σειρά (2η διάταξη) ΠΑΝΤΟΤΕ στα 0,80 m· η άνω ανεβαίνει μόνο αν η κάτω έχει ψηλά κιβώτια (διάκενο rowGap)
      const hRow2 = Math.max(...arrangements.filter(a => a.row === 2).map(a => a.h).concat([0]));
      const H_LOW = rowsUsed >= 2 ? yLow : yUp;
      const H_UP = rowsUsed >= 2 ? Math.max(yUp, H_LOW + hRow2 + rowGap) : yUp;
      const sup = supply || (network === "UG" ? "UG" : "OH");
      // υπόγεια παροχή (κανόνας γραφείου / Οδηγίες κατασκευής παροχής ΔΕΔΔΗΕ): η εσοχή ανοιχτή μέχρι το δάπεδο, με φρεάτιο (ΜΔ-51 τύπου Ι) από τον πελάτη στη βάση του ερμαρίου
      const ugOpen = sup === "UG" && arrangements.length > 0;
      const yNiche = arrangements.length ? (ugOpen ? 0 : H_LOW - mBot) : 0;
      const boxes = [];
      arrangements.forEach(a => {
        const y0 = a.row === 1 ? H_UP : H_LOW;
        a.y = y0;
        const xD = a.xD;
        if (a.distributor) boxes.push({ kind: "D", label: "Δ", no: "", x0: xD, x1: xD + dims.D[0], y0, y1: y0 + dims.D[1], arr: a.idx, side: "D" });
        let x = xD + a.wD;
        a.right.forEach(no => { const [w, h] = dims[BOX_KIND[no]]; boxes.push({ kind: BOX_KIND[no], label: BOX_LABEL[no], no, x0: x, x1: x + w, y0, y1: y0 + h, arr: a.idx, side: "R" }); x += w; });
        if (a.cell) { const [w, h] = dims["3F"]; x += cellGap; boxes.push({ kind: "3F", label: "3Φ", no: "", x0: x, x1: x + w, y0, y1: y0 + h, arr: a.idx, side: "R", meter_of: a.no }); x += w; }   // κιβώτιο τριφασικού μετρητή δίπλα στην κυψέλη, σε απόσταση 25 cm, κάτω άκρα στην ίδια στάθμη (ΜΔ-75)
        x = xD;
        a.left.forEach(no => { const [w, h] = dims[BOX_KIND[no]]; boxes.push({ kind: BOX_KIND[no], label: BOX_LABEL[no], no, x0: x - w, x1: x, y0, y1: y0 + h, arr: a.idx, side: "L" }); x -= w; });
      });
      boxes.forEach(b => ["x0", "x1", "y0", "y1"].forEach(k => b[k] = r2(b[k])));
      const rowWidths = Object.keys(rowW).map(k => rowW[k]);
      let niche;
      if (boxes.length) niche = { x0: 0, x1: r2(totalW + extra), y0: r2(yNiche), y1: r2(Math.max(...boxes.map(b => b.y1)) + mTop) };
      else niche = { x0: 0, x1: 0, y0: 0, y1: 0 };
      niche.width = r2(niche.x1 - niche.x0); niche.height = r2(niche.y1 - niche.y0);
      const hs = bigs.concat(ts, ss, cells).map(no => dims[BOX_KIND[no]][1]).concat(distributor ? [dims.D[1]] : [], [0]);
      const hBox = Math.max(...hs);
      const wBoxes = arrangements.reduce((t, a) => t + a.width, 0);
      const nDistr = distributor ? nArr : 0;
      const [code, arr] = mdCode(Nd, N1d, N3d, slotsD, distributor, nArr, sup, nCells, !!forceDistributor);
      // φρεάτια πελάτη στη βάση της εσοχής (υπόγεια παροχή) – ΜΔ-51 τύπου Ι: ένα ανά στήλη, σε ευθεία κάτω από τον διανομέα της στήλης
      // (ή κάτω από την κυψέλη στις στήλες κυψελών· χωρίς διανομέα: κάτω από το κέντρο των κιβωτίων) – κανόνας γραφείου
      const PIT = (D.materials.customer || {}).ug_pit || null;
      let pit = null;
      if (ugOpen && PIT) {
        const pw_ = Number(PIT.w_cm !== undefined ? PIT.w_cm : 80);
        const pits = [];
        for (let c = 1; c <= ncols; c++) {
          const colArrs = arrangements.filter(a => a.col === c);
          if (!colArrs.length) continue;
          const xDc = colArrs[0].xD;
          let cx, under;
          if (colArrs.some(a => a.distributor)) { cx = xDc + dims.D[0] / 2; under = "D"; }
          else if (colArrs.some(a => a.cell)) { cx = xDc + dims.CT[0] / 2; under = "CT"; }
          else { cx = colArrs[0].x + colArrs[0].width / 2; under = "B"; }
          pits.push({ col: c, under, cx: r2(cx), x0: r2(cx - pw_ / 2), x1: r2(cx + pw_ / 2) });
        }
        pit = { type: PIT.type || "ΜΔ-51 Τύπος Ι", w_cm: pw_, d_cm: Number(PIT.d_cm !== undefined ? PIT.d_cm : 60), h_cm: Number(PIT.h_cm !== undefined ? PIT.h_cm : 70),
          x0: pits[0].x0, x1: pits[0].x1, n: pits.length, pits, by: "πελάτης", note: PIT.note || "" };
      }
      // κιβώτιο ζεύξεως (link box) – μόνο σε παροχές από υπόγειο δίκτυο (ΟΔ.45 §6): αυτόματα U2B2 όταν > 9 1Φ ή > 5 3Φ, ή επιλογή U2B2 / U2B4 / χωρίς
      const linkNeed = network === "UG" && (N1 > g("link_box_1f") || N3 > g("link_box_3f"));
      linkSel = String(linkSel || "AUTO").toUpperCase();
      let linkType;
      if (network !== "UG" || N === 0 || linkSel === "NONE") linkType = "—";
      else if (linkSel === "U2B2" || linkSel === "U2B4") linkType = linkSel;
      else linkType = linkNeed ? "U2B2" : "—";
      const linkBox = linkType !== "—";
      const notes = [];
      if (forceDistributor) notes.push("Κανόνας γραφείου: δύο μετρητές Νο 05 μόνοι τους → τριφασική γραμμή, συγκεντρικό 4x16 Cu και διανομέας (κιβώτιο διακλάδωσης) – ένας μετρητής σε κάθε πλευρά του διανομέα.");
      if (N >= 4) notes.push("Διατάξεις με 4 και περισσότερους μετρητές εγκαθίστανται πάντοτε στο εσωτερικό της οικοδομής (ΟΔ.45 §7.2).");
      if (pipeGt6 && N1 > g("max_meters_per_cluster_pipe_gt6")) notes.push(`Με καλώδιο τροφοδότησης σε σωλήνα > 6 m οι μονοφασικοί μετρητές δεν πρέπει να ξεπερνούν τους ${Math.trunc(g("max_meters_per_cluster_pipe_gt6"))} (ΟΔ.45 ΜΔ-12 σημ. 3).`);
      if (slotsD > 72) notes.push("Απαιτούνται δύο μετρητικά συγκροτήματα με ιδιαίτερο υπολογισμό του καλωδίου διακλάδωσης (ΟΔ.45 §2.3.7).");
      if (nCells) notes.push(`Παροχές Νο 5 / Νο 6 / Νο 7 (${nCells}): τοποθετούνται ΜΟΝΕΣ τους, χωρίς διανομέα, με την κυψέλη ΧΤ (${fmtG(dims.CT[0])}×${fmtG(dims.CT[1])} cm) και δίπλα της, σε απόσταση ${fmtG(cellGap)} cm, το κιβώτιο του τριφασικού μετρητή (${fmtG(dims["3F"][0])}×${fmtG(dims["3F"][1])} cm, κάτω άκρα στην ίδια στάθμη – όπως στη ΜΔ-75), ΕΚΤΟΣ της διάταξης των λοιπών μετρητών – σε ιδιαίτερη στήλη δίπλα (κανόνας γραφείου)· σε υπόγεια παροχή κάθε κυψέλη με δικό της υπόγειο καλώδιο.`);
      if (ugOpen) { const nPit_ = pit ? pit.n : 1; notes.push(`Υπόγεια παροχή: η εσοχή της διάταξης είναι ΑΝΟΙΧΤΗ μέχρι το δάπεδο (από 0,00 m) και στη βάση του ερμαρίου κατασκευάζ${nPit_ === 1 ? "εται" : "ονται"} από τον πελάτη ${nPit_ === 1 ? "φρεάτιο" : nPit_ + " φρεάτια"} ${pit ? pit.type : "ΜΔ-51 τύπου Ι"} (${pit ? fmtG(pit.w_cm) : "80"}×${pit ? fmtG(pit.d_cm) : "60"} cm, βάθος ${pit ? fmtG(pit.h_cm) : "70"} cm) σε ευθεία κάτω από τον διανομέα (στο έδαφος) και κάτω από την κυψέλη, όταν υπάρχουν και διάταξη και κυψέλη – ένα ανά στήλη διατάξεων – κατά τις Οδηγίες κατασκευής παροχής ΔΕΔΔΗΕ· τα υπόγεια καλώδια ανεβαίνουν από το φρεάτιο στον διανομέα / στην κυψέλη (κανόνας γραφείου).`); }
      if (linkBox) notes.push(`Κιβώτιο ζεύξεως (link box) ${linkType === "U2B4" ? "4" : "2"} διευθύνσεων – κατασκευή ${linkType}` + (linkNeed ? " (ΟΔ.45 §6: υπόγεια παροχή με > 9 μονοφασικούς ή > 5 τριφασικούς μετρητές)" : " (επιλογή χρήστη – ΟΔ.45 §6 το απαιτεί από > 9 μονοφασικούς ή > 5 τριφασικούς μετρητές)") + ".");
      else if (linkNeed) notes.push("ΠΡΟΣΟΧΗ: κατά ΟΔ.45 §6 απαιτείται κιβώτιο ζεύξεως (link box) δύο διευθύνσεων (υπόγεια παροχή με > 9 μονοφασικούς ή > 5 τριφασικούς μετρητές) – επιλέχθηκε «χωρίς».");
      if (distributor && nSel > 0 && nSel < nMin) notes.push(`Ζητήθηκαν ${nSel} διατάξεις – δεν χωρούν (9+9 θέσεις ανά διανομέα, ένα Νο 4+ ανά πλευρά)· ελάχιστο πλήθος ${nMin}.`);
      if (distributor && nArr > nMin) notes.push(`Επιλογή χρήστη: ${nArr} διατάξεις (ελάχιστο ${nMin}) – οι μετρητές μοιράστηκαν ισόποσα (${arrangements.map(a => a.n).join(", ")} μετρητές).`);
      if (nArr >= 2) notes.push(`${nArr} διατάξεις (διανομείς): η 1η επάνω (κάτω άκρο κιβωτίων πάντοτε στα ${mFmt(H_UP)} m), η 2η κάτω από την πρώτη (πάντοτε στα ${mFmt(H_LOW)} m) με τον διανομέα ακριβώς κάτω από τον διανομέα της 1ης – ΟΔ.45 ΜΔ-9/ΜΔ-11` + (nArr > 2 ? `· η 3η/4η σε στήλη δίπλα, σε απόσταση ${gap} cm, πάλι ο ένας διανομέας κάτω από τον άλλον` : "") + " (κανόνας γραφείου)· ισόποση κατανομή μετρητών στις διατάξεις.");
      else if (nArr === 1) notes.push(`Μία διάταξη: κάτω άκρο κιβωτίων πάντοτε στα ${mFmt(H_UP)} m από το δάπεδο (ΟΔ.45 ΜΔ-7).`);
      if (N > 0) notes.push(`Εσοχή: από ${mFmt(yNiche)} m (${ugOpen ? "το δάπεδο – υπόγεια παροχή" : `${mBot} cm κάτω από τα κιβώτια`}) έως ${mFmt(niche.y1)} m (${mTop} cm πάνω)· πλάτος = Σ πλάτη κιβωτίων (+ ${gap} cm ανά διάκενο στηλών) + ${extra} cm (κανόνας γραφείου, προσαρμογή κατά τα έντυπα ΜΔ της ΟΔ.45).`);
      if (bigs.length && distributor) notes.push("Κιβώτια Νο 4: 6 θέσεις διανομέα, το πολύ ένα σε κάθε πλευρά του διανομέα (κανόνας γραφείου).");
      const sketch = [];
      for (let row = 1; row <= rowsUsed; row++) {
        const parts = [];
        arrangements.filter(a => a.row === row).forEach(a => {
          const lab = lst => lst.map(no => "[" + BOX_LABEL[no] + "]").join(" ");
          parts.push((lab(a.left.slice().reverse()) + (a.distributor ? " [Δ] " : " ") + lab(a.right) + (a.cell ? " [3Φ]" : "")).trim());
        });
        sketch.push(`Σειρά ${row} (${mFmt(row === 1 ? H_UP : H_LOW)} m): ` + parts.join("   ‖   "));
      }
      return { N1, N3, N, slots, N_d: Nd, N3_d: N3d, slots_d: slotsD, n_cells: nCells, cells, n_total: arrangements.length, ug_open: ugOpen, pit, distributor, n_distr: nDistr, n_arr: nArr, n_arr_min: nMin, n_arr_sel: nSel, rows: rowsUsed, max_rows: maxRows, arrangements, boxes, niche,
        w_boxes_cm: r2(wBoxes), w_row_cm: r2(rowWidths.length ? Math.max(...rowWidths) : 0), w_cols_cm: r2(totalW), n_cols: ncols, col_gap_cm: gap,
        margin_top_cm: mTop, margin_bottom_cm: mBot, width_cm: niche.width, height_cm: niche.height, h_box_cm: hBox,
        niche_bottom_cm: yNiche, row_gap_cm: rowGap, row_upper_bottom_cm: yUp, row_lower_bottom_cm: yLow,
        mount_upper_cm: H_UP, mount_lower_cm: H_LOW, md_code: code, arrangement: arr, sketch,
        link_box: linkBox, link_box_type: linkType, link_box_need: linkNeed, link_box_sel: linkSel, notes,
        depth_cm: g("niche_depth_cm"), corridor_w_m: g("corridor_w_m"), corridor_w_niche_m: g("corridor_w_niche_m"), corridor_h_m: g("corridor_h_m") };
    }

    const MD = {}; D.md.catalog.forEach(m => MD[m.code] = m);
    const USE_TYPES = {}; D.md.use_types.forEach(u => USE_TYPES[u.code] = u);

    const MD_MATERIALS = { "ΜΔ-3": "ΜΔ-2", "ΜΔ-5": "ΜΔ-4", "ΜΔ-7": "ΜΔ-6", "ΜΔ-9": "ΜΔ-8", "ΜΔ-11": "ΜΔ-10", "ΜΔ-13": "ΜΔ-12", "ΜΔ-15": "ΜΔ-14" };

    function mdProposal(use, cl, counts, board, supply, network, crossing) {
      counts = counts || {};
      const n = no => Math.trunc(num(counts[no]));
      const N = cl.N, N1 = cl.N1, N3 = cl.N3;
      const hasCt = ["Νο 5", "Νο 6", "Νο 7"].some(no => n(no) > 0);
      const has3f14 = ["Νο 1", "Νο 2", "Νο 3", "Νο 4"].some(no => n(no) > 0);
      use = USE_TYPES[use] ? use : "ΠΟΛΥΚΑΤΟΙΚΙΑ";
      const out = { use, use_label: USE_TYPES[use].label, code: "—", title: "—", why: "", alt: [], dims: "", img: "", img2: "", src: "", related: [] };
      if (N === 0) { out.why = "Συμπληρώστε το πλήθος των παροχών."; return out; }
      const cab14 = supply === "UG" ? "ΜΔ-77" : (crossing === "ROAD" ? "ΜΔ-79" : "ΜΔ-81");
      const base = supply === "UG" ? "ΜΔ-73" : (crossing === "ROAD" ? "ΜΔ-71" : "ΜΔ-72");
      const building = use === "ΠΟΛΥΚΑΤΟΙΚΙΑ" || use === "ΚΑΤΟΙΚΙΑ" || (N > 3 && use !== "ΠΡΟΣΩΡΙΝΗ");
      let code, rel = [];
      if (use === "ΠΡΟΣΩΡΙΝΗ") {
        code = "ΣΚ-ΠΠ";
        out.alt.push(crossing === "ROAD" ? "στυλίσκος προμήθειας πελάτη: ύψος Υ = 5,50 m (σωλήνας Φ3\", πάχος 3,65 mm) – το καλώδιο διασχίζει δρόμο" : "στυλίσκος προμήθειας πελάτη: ύψος Υ = 3,00 m (σωλήνας Φ2½\", πάχος 2,7 mm) – χωρίς διάβαση δρόμου");
        out.alt.push("μεταλλικό κιβώτιο 70 × 70 cm για τον πίνακα του πελάτη με κάτω άκρο 1,50 m από το έδαφος· πάκτωση σε σκυρόδεμα (φέρει 150 kg)· μόνο το συγκεντρικό καλώδιο ΔΕΔΔΗΕ στον στυλίσκο");
        if (supply === "UG") out.alt.push("υπόγεια παροχή: ερευνητική τομή στο πεζοδρόμιο για τον εντοπισμό υπογείων καλωδίων πριν την τοποθέτηση");
        if (hasCt) out.alt.push("παροχές Νο5–Νο7 (κυψέλη ΧΤ) δεν καλύπτονται από το σκαρίφημα – ΜΔ-75 / ΜΔ-83 ή συνεννόηση με ΔΕΔΔΗΕ");
        else if (N > 2) out.alt.push(`${N} μετρητές: το σκαρίφημα προβλέπει έναν πίνακα πελάτη – για περισσότερες παροχές συνεννόηση με ΔΕΔΔΗΕ`);
        rel = ["36621"];
      } else if (building) {
        code = board.md_code;
        if (code === "ΜΔ-3" && use === "ΚΑΤΟΙΚΙΑ" && hasCt) code = "ΜΔ-75";
        if (use !== "ΠΟΛΥΚΑΤΟΙΚΙΑ" && use !== "ΚΑΤΟΙΚΙΑ") out.alt.push(`${USE_TYPES[use].label}: με ${N} μετρητές εφαρμόζεται συγκρότημα κατά ΟΔ.45`);
        if (["ΜΔ-7", "ΜΔ-11", "ΜΔ-13", "ΜΔ-15"].indexOf(code) >= 0) out.alt.push("4+ μετρητές πάντοτε στο εσωτερικό της οικοδομής (ΟΔ.45 §7.2)");
        if (N === 1 && has3f14 && use === "ΚΑΤΟΙΚΙΑ") out.alt.push("εναλλακτικά μεταλλική καμπίνα ΜΔ-77 / ΜΔ-79 / ΜΔ-81 στο όριο του οικοπέδου");
        if (code !== "ΜΔ-75") {
          const mat = MD_MATERIALS[code]; if (mat) rel.push(mat);
          const nArr = board.n_arr || 0;
          if (!board.distributor && N >= 2) rel.push("ΜΔ-35");
          else if (nArr === 1) { rel.push("ΜΔ-36"); if (N3 === 0) rel.push("ΜΔ-37"); }
          else if (nArr >= 2) rel.push("ΜΔ-38");
          if (supply === "UG") {
            rel = rel.concat(["ΜΔ-61", "ΜΔ-62", "ΜΔ-63", "ΜΔ-64", "ΜΔ-65", "ΜΔ-66", "ΜΔ-51", "ΜΔ-53", "ΜΔ-54", "ΜΔ-55"]);
            if (code === "ΜΔ-13" || code === "ΜΔ-15") rel.push("ΜΔ-52");
          }
          rel = rel.concat(["ΜΔ-1", "36621", "ΟΔΗΓΙΕΣ-1984"]);
        }
      } else if (use === "ΕΞΟΧΙΚΗ") {
        code = hasCt ? "ΜΔ-75" : base;
        if (hasCt) out.alt.push("ΜΔ-83 (μεταλλική καμπίνα) για υπόγεια τροφοδότηση");
        else if (has3f14) out.alt.push(`εναλλακτικά μεταλλική καμπίνα ${cab14} (3Φ Νο1–Νο4)`);
        if (code === "ΜΔ-71" || code === "ΜΔ-72") {
          out.alt.push(`τυποποίηση ΟΔ.45 1982: ${code} (1982) ή βάση χωρίς εσοχή ΜΔ-74${code === "ΜΔ-71" ? "Ι" : "ΙΙ"}`);
          rel = [code + " (1982)", "ΜΔ-74", "36621", "ΟΔΗΓΙΕΣ-1984"];
        } else if (code === "ΜΔ-73") rel = ["ΜΔ-74", "36621", "ΟΔΗΓΙΕΣ-1984"];
        if ((code === "ΜΔ-71" || code === "ΜΔ-72" || code === "ΜΔ-73") && N >= 2) out.alt.push(`${N} παροχές (έως δύο τριφασικές): το πλάτος της βάσης προσαρμόζεται στον αριθμό των μετρητών ώστε να χωρά και το κιβώτιο διακλάδωσης (Οδηγίες 1984 §5.6)· για περισσότερους μετρητές συνεννόηση με ΔΕΔΔΗΕ`);
      } else if (use === "ΗΛΕΚΤΡΟΦΟΡΤΙΣΗ") {
        code = hasCt ? "ΜΔ-83" : (has3f14 ? cab14 : "ΜΔ-3");
        if (hasCt && supply === "OH") out.alt.push("η ΜΔ-83 προβλέπεται για ΥΠΟΓΕΙΑ τροφοδότηση – επιλέξτε υπόγεια παροχή (από εναέριο δίκτυο: κάθοδος στον στύλο)");
        if (has3f14 && !hasCt) out.alt.push("φορτιστές 3Φ Νο1–Νο4: μεταλλική καμπίνα στο όριο του οικοπέδου / χώρου στάθμευσης");
        rel = ["36621"].concat(code === "ΜΔ-3" ? ["ΜΔ-2"] : []);
      } else {
        code = hasCt ? "ΜΔ-75" : (has3f14 ? cab14 : base);
        if (hasCt) out.alt.push("ΜΔ-83 (μεταλλική καμπίνα) για υποδομές επαναφόρτισης");
        if (["ΜΔ-71", "ΜΔ-72", "ΜΔ-73"].indexOf(code) >= 0) rel = ["ΜΔ-74"].concat(code !== "ΜΔ-73" ? [code + " (1982)"] : []);
        rel = rel.concat(["36621"]);
      }
      if ((code === "ΜΔ-79" || code === "ΜΔ-81") && !building) out.alt.push(code === "ΜΔ-79" ? "ΜΔ-81 αν το καλώδιο δεν διασταυρώνει οδόστρωμα (σιδηροσωλήνας 4\"/4,00 m)" : "ΜΔ-79 (τσιμεντένιος στύλος 11 m) αν το καλώδιο διασταυρώνει οδόστρωμα");
      const m = MD[code] || {};
      Object.assign(out, { code, title: m.title || "", dims: m.dims || "", img: m.img || "", img2: m.img2 || "", src: m.src || "",
        why: (building && code !== "ΜΔ-75") ? board.arrangement : (m.why || ""), related: rel.filter(r => MD[r] && r !== code) });
      return out;
    }

    function cableLength(L, p) {
      const r = D.materials.cable_length_rule; p = p || {};
      const v = k => (p[k] !== undefined && p[k] !== null && p[k] !== "") ? Number(p[k]) : r[k];
      return num(L) + v("drop_m") + v("board_m") + v("termination_m");
    }

    const SUPPORTS = {
      "4.75": { "Στυλίσκος παροχών Χ.Τ. 4,75μ.": 1, "Σύνδεσμος κοχλωτός <U> (4,75μ.)": 2, "Σιδηροδοκός στηρίξ. Στυλίσκου": 1, "Κοχλίας χωρίς περ. 20 Χ 110": 2, "Περικόχλιο με άγκιστρο": 2 },
      "2.5": { "Στυλίσκος παροχών Χ.Τ. 2,5μ.": 1, "Σύνδεσμος κοχλωτός <U> (2,5μ.)": 2, "Έλασμα στερεώσεως στυλίσκου": 2, "Κοχλίας χωρίς περικόχλιο 20Χ80": 2, "Στέλεχος διχαλωτό με περικόχλ.": 1, "Περικόχλιο με άγκιστρο": 1 },
      "WALL": { "Γωνιακό έλασμα στηρ. Παροχής": 1, "Κοχλίας χωρίς περικόχλιο 20Χ35": 2, "Στέλεχος διχαλωτό με άγκιστρο": 1 },
    };
    const POLE_ITEM_3 = "Στυλίσκος παροχής – σιδηροσωλήνας γαλβ. 3\" βαρέως τύπου, 6 m", POLE_ITEM_4 = "Στυλίσκος παροχής – σιδηροσωλήνας γαλβ. 4\" βαρέως τύπου, 6 m";
    const POLE_BOLT = "Κοχλίας Μ20 × 210 mm (8.8 – DIN 931) στυλίσκου παροχής";
    SUPPORTS.POLE3 = {}; SUPPORTS.POLE3[POLE_ITEM_3] = 1; SUPPORTS.POLE3["Περικόχλιο με άγκιστρο"] = 1; SUPPORTS.POLE3[POLE_BOLT] = 1;
    SUPPORTS.POLE4 = {}; SUPPORTS.POLE4[POLE_ITEM_4] = 1; SUPPORTS.POLE4["Περικόχλιο με άγκιστρο"] = 1; SUPPORTS.POLE4[POLE_BOLT] = 1;
    const LINK_ITEM = { U2B2: "Κιβώτιο ζεύξεως (link box) 2 διευθύνσεων – κατασκευή U2B2", U2B4: "Κιβώτιο ζεύξεως (link box) 4 διευθύνσεων – κατασκευή U2B4" };
    const LINK_OPTIONS = ["AUTO", "U2B2", "U2B4", "NONE"];

    const CUST = D.materials.customer || {};
    // γείωση πελάτη ανά μετρητική διάταξη (κανόνας γραφείου): ελάχιστο min_mm2 Cu ανά διάταξη, βάσει παροχής έως max_mm2 Cu· κατ' εξαίρεση Νο 6 → 70 mm², Νο 7 → 2×50 / 2×70 mm² Cu
    function customerEarthing(board) {
      const E = CUST.earthing || {}, by = E.by_no || {};
      const mn = Number(E.min_mm2 !== undefined ? E.min_mm2 : 25), mx = Number(E.max_mm2 !== undefined ? E.max_mm2 : 50);
      const out = [];
      ((board || {}).arrangements || []).forEach(a => {
        const nos = a.left.concat(a.right);
        let v = Math.max(mn, ...nos.map(no => Number(by[no] !== undefined ? by[no] : mn)));
        v = Math.min(v, mx);
        let exc = null;
        nos.forEach(no => { if ((E.exceptions || {})[no] !== undefined) exc = [E.exceptions[no], no]; });
        out.push({ idx: a.idx, label: a.cell ? `Κυψέλη ${a.no}` : `Δ${a.idx}`, mm2: v, exception: exc ? exc[0] : null, exception_no: exc ? exc[1] : null, cell: !!a.cell });
      });
      return out;
    }
    // υλικά / υποχρεώσεις πελάτη: σιδηροσωλήνας γαλβανιζέ 4" × 1,50 m ανά υπόγειο καλώδιο + αγωγός γείωσης πελάτη Cu ανά διάταξη
    function customerItems(board, ug, supply, counts) {
      const items = [];
      const P = CUST.ug_pipe || {}, E = CUST.earthing || {};
      const nCab = supply === "UG" ? ((ug || {}).n_cables || 0) : 0;
      if (P.item) items.push({ item: P.item, unit: P.unit || "τεμ.", qty: nCab * Number(P.per_cable !== undefined ? P.per_cable : 1), note: (P.note || "") + (nCab ? ` Υπόγεια καλώδια: ${nCab}.` : " Εναέρια παροχή – δεν απαιτείται.") });
      const PT = CUST.ug_pit || {};
      if (PT.item) { const bp = (board || {}).pit || {}; const nPit = (supply === "UG" && ((board || {}).N || 0) > 0) ? Number(bp.n !== undefined ? bp.n : 1) * Number(PT.per_column !== undefined ? PT.per_column : 1) : 0; items.push({ item: PT.item, unit: PT.unit || "τεμ.", qty: nPit, note: nPit ? ((PT.note || "") + ` Φρεάτια: ${Math.trunc(nPit)} (ένα ανά στήλη διατάξεων – κάτω από τον διανομέα / την κυψέλη).`) : "Εναέρια παροχή – δεν απαιτείται." }); }
      if (E.item) {
        const ear = customerEarthing(board);
        const vals = Array.from(new Set(ear.map(e => e.mm2))).sort((x, y) => x - y);
        vals.forEach(v => {
          const labs = ear.filter(e => e.mm2 === v).map(e => e.label);
          items.push({ item: `Αγωγός γείωσης πελάτη Cu ${fmtG(v)} mm² (ανά μετρητική διάταξη)`, unit: "διατάξεις", qty: labs.length, note: labs.join(", ") });
        });
        const exc = E.exceptions || {};
        ["Νο 6", "Νο 7"].forEach(no => {
          if (exc[no] !== undefined) items.push({ item: `Γείωση πελάτη κατ' εξαίρεση – ${no}: ${exc[no]}`, unit: "κυψέλες", qty: Math.trunc(Number((counts || {})[no] || 0)), note: "μεγάλες παροχές – κατ' εξαίρεση αντί του μέγιστου " + `${fmtG(Number(E.max_mm2 !== undefined ? E.max_mm2 : 50))} mm² Cu` });
        });
      }
      return items;
    }

    function bom(counts, cableKey, L, supply, pole, protection, board, isolated, p, lengthParams, extras, removal, span, ug) {
      p = p || D.materials.defaults; supply = supply || "OH"; pole = pole || "POLE"; protection = protection || "fuse";
      const cl = clusterLoad(counts);
      const cab = resolveCable(cableKey);
      const items = [];
      const rem = removal || {}, rcounts = rem.counts || {};
      const rcab = rem.cable_key ? CAB[rem.cable_key] : null;
      const pv = k => (p[k] !== undefined && p[k] !== null && p[k] !== "") ? Number(p[k]) : D.materials.defaults[k];
      function add(item, qty, group, note, qtyRemove) {
        note = note || ""; qty = qty || 0; qtyRemove = qtyRemove || 0;
        if (qty <= 0 && qtyRemove <= 0) return;
        for (const it of items) {
          if (it.item === item && it.group === group) {
            it.qty = r2(it.qty + qty); it.qty_remove = r2(it.qty_remove + qtyRemove);
            if (note && it.note.indexOf(note) < 0) it.note = it.note ? it.note + " · " + note : note;
            return;
          }
        }
        let cls = "", unit = "";
        [D.materials.support, D.materials.main].forEach(lst => lst.forEach(m => { if (m.item === item) { cls = m.cls; unit = m.unit; } }));
        items.push({ item, cls, unit: unit || "τεμ.", qty, qty_remove: qtyRemove, group, note });
      }
      const rn = no => Math.trunc(num(rcounts[no]));
      const rN1 = rn("Νο 03") + rn("Νο 05");
      let rN3 = 0; D.supplies.forEach(s => { if (s.phases === 3) rN3 += rn(s.no); });
      const rprot = rem.protection || "fuse", rpole = rem.pole || "NONE";
      add("Κιβώτιο ΙΦ μετρητή πλήρες", cl.N1, "support", "", rN1);
      add("Κιβώτιο ΙΙΙΦ μετρητή πλήρες", cl.N3, "support", "", rN3);
      add("Κιβώτιο Ασφαλειών πλήρες", 0, "support", "", Math.trunc(num(rem.fuse_boxes)));
      D.supplies.forEach(s => {
        const n = Math.trunc(num(counts[s.no])), rnn = rn(s.no);
        if (!n && !rnn) return;
        add(s.meter_code, n, "main", `${s.no} – μετρητής ${s.meter}`, rnn);
        if (s.ct) add(s.ct.indexOf("200") >= 0 ? "Μ/Σ έντασης 200/5 (σετ 3)" : "Μ/Σ έντασης 400/5 (σετ 3)", n, "main", s.no, rnn);
        const skipNew = isolated && ["Νο 3", "Νο 4", "Νο 5", "Νο 6", "Νο 7"].indexOf(s.no) >= 0;
        if (s.mcb_item) add(s.mcb_item, (protection === "mcb" && !skipNew) ? n : 0, "main", `${s.no} – μικροαυτόματος ${s.meter_mcb} A`, rprot === "mcb" ? rnn : 0);
        if (s.fuse_item) {
          const useNew = (protection === "fuse" || !s.mcb_item) && !skipNew, useRem = (rprot === "fuse" || !s.mcb_item);
          add(s.fuse_item, useNew ? n : 0, "main", `${s.no} – ασφάλεια μετρητή ${s.meter_fuse} A`, useRem ? rnn : 0);
        }
      });
      add("Κιβώτιο Διανομέα", board ? board.n_distr : 0, "main", "κιβώτιο διακλάδωσης μετρητικής διάταξης (30×50 cm)", Math.trunc(num(rem.distributors)));
      const lt = board ? (board.link_box_type || "—") : "—";
      add(LINK_ITEM.U2B2, lt === "U2B2" ? 1 : 0, "main", "ΟΔ.45 §6 – κατασκευή U2B2", rem.link_box ? 1 : 0);
      add(LINK_ITEM.U2B4, lt === "U2B4" ? 1 : 0, "main", "ΟΔ.45 §6 – κατασκευή U2B4 (διασύνδεση με γειτονικά καλώδια / ιδιαίτερη αναχώρηση)", 0);
      const Lc = cableLength(L, lengthParams);
      const lp = lengthParams || {}, lr = D.materials.cable_length_rule;
      const lv = k => (lp[k] !== undefined && lp[k] !== null && lp[k] !== "") ? Number(lp[k]) : lr[k];
      const ltxt = `L=${L} m + ${lv("drop_m")} + ${lv("board_m")} + ${lv("termination_m")} m`;
      const cabItems = [];   // υπόγεια παροχή: Σ καλωδίων όλων των διατάξεων (ένα ή περισσότερα ανά διάταξη)
      if (ug && ug.per_arr && ug.items && ug.items.length) ug.items.forEach(it => cabItems.push([it.bom_item, it.parallel, ltxt + (it.parallel > 1 ? ` × ${it.parallel} καλώδια` : "") + (ug.n_arr > 1 ? ` (${ug.n_arr} διατάξεις – ένα καλώδιο ανά διανομέα)` : "")]));
      else if (cab) cabItems.push([cab.bom_item, cab.parallel, ltxt + (cab.parallel > 1 ? ` × ${cab.parallel} παράλληλα` : "")]);
      cabItems.forEach(([item, npar, note]) => add(item, r1(Lc * npar), "main", note, (rcab && rcab.bom_item === item) ? num(rem.cable_len_m) : 0));
      if (rcab && !cabItems.some(x => x[0] === rcab.bom_item)) add(rcab.bom_item, 0, "main", "υφιστάμενο καλώδιο προς αποξήλωση", num(rem.cable_len_m));
      add("Ράβδος γειώσεως 2,5μ.", pv("rods"), "main", "γείωση μετρητικής διάταξης (ΜΔ-1)", Math.trunc(num(rem.rods)));
      add("Αγωγός Cu16 Τ.Χ. μονόκλωνος", pv("earth_conductor_m"), "main", "αγωγός γείωσης 16 mm² Cu");
      add("Σωλήνας γαλβανισμ.1/2\"", pv("galv_pipe_m"), "main", "προστασία αγωγού γείωσης");
      const sup = Object.assign({}, SUPPORTS);
      const pipe4 = !!(span && span.applicable && span.pole_pipe === SR.pole_rules.pipe_big);
      sup.POLE = pipe4 ? SUPPORTS.POLE4 : SUPPORTS.POLE3;
      const newsup = supply === "OH" ? (sup[pole] || {}) : {}, remsup = sup[rpole] || {};
      const keys = []; Object.keys(newsup).concat(Object.keys(remsup)).forEach(k => { if (keys.indexOf(k) < 0) keys.push(k); });
      keys.forEach(k => add(k, newsup[k] || 0, "support", "", remsup[k] || 0));
      add("Υπόγειο κιβώτιο ευθύ", supply !== "OH" ? 1 : 0, "main", "σύνδεση στο υπόγειο δίκτυο / στύλο αναχώρησης", rem.ug_box ? 1 : 0);
      if (span && span.applicable && span.heavy_hook) add("Γάντζος βαρέως τύπου (άνοιγμα > τυποποιημένου, CS-3)", 1, "support", `L = ${L} m > ${span.std_span} m`);
      if (span && supply === "OH" && cab && span.messenger) add("Συρματόσχοινο ανάρτησης καλωδίου (m)", r1(num(L) + 2), "support", "ανάρτηση καλωδίου (L + 2 m)");
      (extras || []).forEach(e => add(e.item, e.qty, e.group || "main", e.note || ""));
      const cust = customerItems(board, ug, supply, counts);
      cust.forEach(c => { if (c.qty > 0) items.push({ item: c.item, cls: "", unit: c.unit, qty: r2(c.qty), qty_remove: 0, group: "customer", note: c.note }); });
      return { items, cable_length_m: Lc, cable: cab, customer: cust, earthing: customerEarthing(board) };
    }

    function stdFuse(I, minimum) { for (const f of FUSES) if (f >= I && (minimum === undefined || minimum === null || f >= minimum)) return f; return null; }

    const FEEDER_OH = ["SK_70", "SK_120"], FEEDER_UG = ["U_95", "U_150"];

    function feederSizing(cl, counts, isolated, irrigation) {
      const fr = D.feeder_rules, I = cl.I_B;
      if (I === null || I === undefined) return null;
      const S = (cl.phases === 3 ? Math.sqrt(3) * 400 * I : 230 * I) / 1000;
      const present = D.supplies.filter(s => Math.trunc(num((counts || {})[s.no])) > 0);
      const key = isolated ? "feeder_fuse_iso" : "feeder_fuse_net";
      const fuseMin = present.length ? Math.max(...present.map(s => s[key])) : 0;
      const fuseLoad = fr.fuse_margin * I;
      const fuseNeed = Math.max(fuseLoad, fuseMin);
      let fuse = stdFuse(fuseNeed);
      const fuseCapped = fuse === null;
      if (fuseCapped) fuse = FUSES[FUSES.length - 1];
      const STD = D.transformers.filter(t => t.standard);
      // αρδευτική παροχή Νο 4 – κανόνας γραφείου: μόνο Νο 4 στο συγκρότημα → Μ/Σ 50 kVA, ασφάλεια ≤ μέγ. ασφάλεια ΧΤ του (80 A)
      const irrigOnly = !!irrigation && present.length > 0 && present.every(s => s.no === "Νο 4");
      const tr50 = STD.find(t => t.kva === 50) || STD[0];
      let fuseIrrigCapped = false;
      if (irrigOnly && fuse > tr50.max_lv_fuse) { fuse = tr50.max_lv_fuse; fuseIrrigCapped = true; }
      const mkey = isolated ? "min_ms_kva_iso" : "min_ms_kva";   // Εγχ. Μελετών Δικτύων Διανομής Πίν. 1.1 / 1.2
      const msMin = present.length ? Math.max(...present.map(s => (irrigation && s.min_ms_kva_irrig !== undefined && s.min_ms_kva_irrig !== null) ? s.min_ms_kva_irrig : (s[mkey] === undefined ? s.min_ms_kva : s[mkey]))) : 0;
      const Sreq = S / fr.transformer_load_factor;
      const need = irrigOnly ? tr50.kva : Math.max(S, msMin);
      const msPower = irrigOnly ? tr50 : (STD.find(t => t.kva >= need) || null);
      const ms = irrigOnly ? tr50 : (STD.find(t => t.kva >= need && t.max_lv_fuse >= fuse) || null);
      const needGrowth = Math.max(Sreq, msMin);
      const msGrowth = STD.find(t => t.kva >= needGrowth && t.max_lv_fuse >= fuse) || null;
      const condOh = FEEDER_OH.map(k => COND[k]).find(c => c.I_max >= fuse) || null;
      const condUg = FEEDER_UG.map(k => COND[k]).find(c => c.I_max >= fuse) || null;
      const over = I > fuse;
      return { S_kva: S, S_req_kva: Sreq, fuse_load_A: fuseLoad, fuse_min_A: fuseMin, fuse_need_A: fuseNeed, fuse_A: fuse, fuse_capped: fuseCapped, fuse_over_load: over, fuse_max_A: FUSES[FUSES.length - 1],
        ms_min_kva: msMin, ms_need_kva: need, ms_kva: ms ? ms.kva : null, ms_max_fuse: ms ? ms.max_lv_fuse : null, ms_power_kva: msPower ? msPower.kva : null,
        ms_growth_kva: msGrowth ? msGrowth.kva : null, ms_growth_need_kva: needGrowth,
        ms_bumped: !!(ms && msPower && ms.kva > msPower.kva), fuse_governed_by: fuseMin > fuseLoad ? "min" : "load",
        ms_governed_by: irrigOnly ? "irrig" : (msMin > S ? "min" : "load"), irrigation: !!irrigation, irrig_only: irrigOnly, fuse_irrig_capped: fuseIrrigCapped, cond_oh: condOh ? condOh.name : null, cond_ug: condUg ? condUg.name : null, cond_oh_key: condOh ? condOh.key : null, cond_ug_key: condUg ? condUg.key : null };
    }

    function feederCheck(kva, condKey, Iexist, Inew, L, cosphi, fuseExisting, ItrExist, kDerate, loadFactor, duLimit, LpM) {
      const fr = D.feeder_rules;
      cosphi = cosphi === undefined || cosphi === null ? 0.9 : cosphi; kDerate = kDerate === undefined || kDerate === null ? 1 : kDerate;
      loadFactor = loadFactor || fr.transformer_load_factor; duLimit = duLimit || fr.voltage_drop_limit_pct;
      const Lp = (LpM === undefined || LpM === null) ? fr.supply_Lp_m : LpM;
      const tr = TR[Math.trunc(kva)], c = COND[condKey];
      const I3 = num(Iexist) + num(Inew), Imax = c.I_max * kDerate;
      const fuseReq = stdFuse(fr.fuse_margin * I3);
      const fuseLimit = Math.min(tr.max_lv_fuse, Imax);
      const fuseSel = fuseExisting ? fuseExisting : fuseReq;
      const okList = FUSES.filter(f => f <= fuseLimit); const fuseMaxOk = okList.length ? Math.max(...okList) : 0;
      const Lkm = num(L) / 1000;
      let Z = null, Isc = null, fuseScMax = null;
      if (tr.RM !== null && tr.RM !== undefined) {
        const R = tr.RM / 1000 + 2 * Lkm * c.R_sc + 2 * (Lp / 1000) * fr.supply_Rp_ohm_km, X = tr.XM / 1000 + 2 * Lkm * c.X_sc;
        Z = Math.sqrt(R * R + X * X); Isc = 230 / Z;
        const sl = FUSES.filter(f => fr.sc_factor * f <= Isc); fuseScMax = sl.length ? Math.max(...sl) : 0;
      }
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      const dU = 100 * Math.sqrt(3) * num(Inew) * Lkm * (c.R * cosphi + c.X * sinphi) / 400;
      const Itr = ((ItrExist === undefined || ItrExist === null || ItrExist === "") ? num(Iexist) : num(ItrExist)) + num(Inew);
      const Safter = Math.sqrt(3) * 400 * Itr / 1000, Sreq = Safter / loadFactor;
      const trOk = Sreq <= kva;
      const nextTr = (D.transformers.find(t => t.kva >= Sreq) || {}).kva || null;
      const res = { I3, I_max: Imax, fuse_req: fuseReq, fuse_sel: fuseSel, fuse_limit: fuseLimit, fuse_max_ok: fuseMaxOk,
        fuse_ok_load: fuseSel !== null && fuseSel >= fr.fuse_margin * I3, fuse_ok_cond: fuseSel !== null && fuseSel <= Imax, fuse_ok_tr: fuseSel !== null && fuseSel <= tr.max_lv_fuse,
        Z, Isc, fuse_sc_max: fuseScMax, sc_ok: Isc === null ? true : (fuseSel !== null && fr.sc_factor * fuseSel <= Isc), sc_applicable: Isc !== null,
        dU_pct: dU, du_ok: dU <= duLimit, du_limit: duLimit, S_after: Safter, S_req: Sreq, tr_ok: trOk, next_tr: nextTr, load_factor: loadFactor, max_lv_fuse: tr.max_lv_fuse, cond: c, tr };
      res.all_ok = res.fuse_ok_load && res.fuse_ok_cond && res.fuse_ok_tr && res.sc_ok && res.du_ok && res.tr_ok;
      return res;
    }

    function feederCapacity(kva, condKey, Iexist, kDerate, fuseExisting, loads) {
      const fr = D.feeder_rules, tr = TR[Math.trunc(kva)], c = COND[condKey];
      kDerate = kDerate === undefined || kDerate === null ? 1 : kDerate;
      let cap = Math.min(c.I_max * kDerate, tr.max_lv_fuse);
      if (fuseExisting) cap = Math.min(cap, fuseExisting);
      const Iavail = cap / fr.fuse_margin - num(Iexist);
      const out = { I_cap: cap, I_avail: Iavail, by_type: [] };
      loads = loads || {};
      D.supplies.forEach(s => {
        const A = (loads[s.no] !== undefined && loads[s.no] !== null && loads[s.no] !== "") ? Number(loads[s.no]) : s.load_A;
        const per = s.phases === 1 ? A / 3 : A;
        let nmax = 0;
        for (let n = 1; n <= 72; n++) { const k = kn(n); if (per * n * k <= Iavail) nmax = n; else break; }
        out.by_type.push({ no: s.no, A, per_phase: per, n_max: nmax, I_at_max: nmax ? per * nmax * (kn(nmax) || 1) : 0 });
      });
      return out;
    }

    function mvCustomer(kvaTotal, nTr, parallel, metering, network, futureAbove630, separateProtection, voltageKv, largestKva) {
      const m = D.mv, lim = m.limit_b1_kva, small = kvaTotal <= lim;
      nTr = nTr || 1; parallel = parallel === undefined ? true : !!parallel; metering = metering || "IN"; network = network || "UG"; voltageKv = voltageKv || 20;
      let t, why;
      if (metering === "OUT" && network === "OH") {
        t = small ? "A1" : "A2";
        why = small ? "Μέτρηση εξωτερικά από εναέριο δίκτυο· άθροισμα ισχύος Μ/Σ ≤ 630 kVA → Α1 (ασφαλειοαποζεύκτες)." :
          "Μέτρηση εξωτερικά από εναέριο δίκτυο· άθροισμα ισχύος > 630 kVA → Α2 (διακόπτης απομόνωσης)· απαιτείται δίκτυο με διακόπτες αυτόματης επαναφοράς.";
      } else if (small && (nTr <= 1 || parallel) && !futureAbove630 && !separateProtection) {
        t = "B1"; why = "Μέτρηση εσωτερικά· ένας Μ/Σ ≤ 630 kVA (ή ομάδα μόνιμα παράλληλων Μ/Σ με άθροισμα ≤ 630 kVA) → Β1 με πίνακα BKI (διακόπτης φορτίου + ασφάλειες ΜΤ).";
      } else {
        t = "B2"; const reasons = [];
        if (!small) reasons.push("ισχύς > 630 kVA");
        if (nTr > 1 && !parallel) reasons.push("περισσότεροι Μ/Σ μη παράλληλοι στη ΧΤ");
        if (futureAbove630) reasons.push("δηλωμένη μελλοντική αύξηση > 630 kVA");
        if (separateProtection) reasons.push("ιδιαίτερα μέσα προστασίας ανά Μ/Σ");
        why = "Μέτρηση εσωτερικά· " + reasons.join(", ") + " → Β2 με πίνακα BKII (διακόπτης ισχύος με Η/Ν φάσεων & γης).";
      }
      const panel = { A1: "— (Α/Ζ σε στύλο Ρ-43)", A2: "— (Δ/Α σε στύλο)", B1: "BKI", B2: "BKII" }[t];
      let lv;
      if (t === "B1") lv = kvaTotal <= m.limit_lv_fuses_kva ? "ασφάλειες υψηλής ισχύος διακοπής (ΧΤ)" : "αυτόματος διακόπτης ΧΤ με θερμικά & ηλεκτρομαγνητικά στοιχεία";
      else if (t === "B2") lv = "αυτόματος διακόπτης ΧΤ (γενικός)· ιδιαίτερη προστασία για Μ/Σ με In < 10 % της ρύθμισης Η/Ν του Δ/Ι";
      else lv = "γενικό μέσο ζεύξης/προστασίας ΜΤ του πελάτη σε συνεργασία με τα Α/Ζ (ΟΔ.34 §2.1)";
      const Imv = kvaTotal * 1000 / (Math.sqrt(3) * voltageKv * 1000);
      const mva = m.sc_mva[String(voltageKv).replace(".0", "")] || m.sc_mva["20"];
      const Ik = mva * 1e6 / (Math.sqrt(3) * voltageKv * 1000) / 1000;
      const lk = largestKva || kvaTotal;
      const trrow = D.transformers.find(x => x.kva >= lk) || null;
      return { type: t, panel, why, lv_protection: lv, I_mv_A: Imv, Ik_kA: Ik, sc_mva: mva, mv_fuse_row: trrow, S_total: kvaTotal, metering: mvMetering(kvaTotal, voltageKv, t, metering, network) };
    }
    // Μ/Σ μέτρησης (τάσεως / εντάσεως) – ΟΔ.34 §3.3: λόγος Μ/Σ εντάσεως = ο αμέσως ανώτερος τυποποιημένος από την ένταση της συμφωνημένης ισχύος· P-43 / P-42 (τέρμα), P-41 / P-40 (ευθυγραμμία)
    function mvMetering(kvaTotal, voltageKv, mvType, metering, network, crossarms, lineEnd) {
      crossarms = crossarms || "wood"; lineEnd = lineEnd === undefined ? true : !!lineEnd;
      const M = D.mv.metering || {};
      const ratios = M.ct_ratios_A || [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400];
      const sec = M.ct_secondary_A !== undefined ? M.ct_secondary_A : 5;
      const U = Number(voltageKv);
      const I = Number(kvaTotal) * 1000 / (Math.sqrt(3) * U * 1000);
      const ct = ratios.find(r => r >= I - 1e-9); const ctTxt = ct !== undefined ? `${fmtG(ct)}/${fmtG(sec)} A` : `> ${fmtG(ratios[ratios.length - 1])}/${fmtG(sec)} A – ιδιαίτερη μελέτη`;
      const kvKey = String(voltageKv).replace(/\.0$/, "");
      const vt = (M.vt_by_kv || {})[kvKey] || `${Math.trunc(U * 1000)}/100 V`;
      const outdoor = metering === "OUT" && network === "OH";
      const cons = (lineEnd ? M.construction_out : M.construction_in_line) || {};
      const constr = outdoor ? (cons[crossarms] || "P-43") : "πίνακας μέτρησης ΜΤ (εσωτερικά)";
      const nCt = Math.trunc(M.ct_count !== undefined ? M.ct_count : 2), nVt = Math.trunc(M.vt_count !== undefined ? M.vt_count : 2);
      const where = outdoor ? `μέτρηση σε στύλο – κατασκευή ${constr} (${crossarms === "wood" ? "ξύλινοι" : "χαλύβδινοι"} βραχίονες, ${lineEnd ? "τέρμα γραμμής" : "στύλος ευθυγραμμίας"})` : "μέτρηση εσωτερικά – στον πίνακα μέτρησης ΜΤ του Υ/Σ του πελάτη";
      const text = `${nVt} Μ/Σ τάσεως ${vt}` + (nVt === 2 ? " (σύνδεση V)" : "") + ` + ${nCt} Μ/Σ εντάσεως ${ctTxt}` + (nCt === 2 ? " (σύνδεση Aron)" : "") + ` – I = ${fmtG(kvaTotal)} kVA / (√3 · ${fmtG(U)} kV) = ${vf1(I, 1).replace(".", ",")} A → αμέσως ανώτερος λόγος ${ctTxt} (ΟΔ.34 §3.3)`;
      return { I_A: I, ct_ratio: ct === undefined ? null : ct, ct_text: ctTxt, ct_secondary_A: sec, ct_count: nCt, vt_text: vt, vt_count: nVt, construction: constr, outdoor, where, text, rule: M.rule || "", note: M.note || "" };
    }

    function interpSag(sags, L) {
      const pts = []; SPANS.forEach((sp, i) => { if (sags[i] !== null && sags[i] !== undefined) pts.push([sp, sags[i]]); });
      if (!pts.length || L > pts[pts.length - 1][0]) return null;
      if (L <= pts[0][0]) return r2(pts[0][1] * L / pts[0][0]);
      for (let i = 0; i + 1 < pts.length; i++) { const [s1, g1] = pts[i], [s2, g2] = pts[i + 1]; if (s1 <= L && L <= s2) return r2(g1 + (L - s1) * (g2 - g1) / (s2 - s1)); }
      return null;
    }

    function spanCheck(L, cable, pole, zone, supply, p) {
      p = p || SR; pole = pole || "POLE"; zone = zone || "LM"; supply = supply || "OH";
      const PR = p.pole_rules;
      const out = { applicable: false, std_span: null, heavy_hook: false, messenger: false, sag_m: null, tension_kg: null, weight_kg_m: null, total_weight_kg: null, messages: [], status: "", is_pole: pole !== "WALL",
        pole_limit: null, pole_ok: null, pole_pipe: null, pole_text: "—", hook_heavy: false, hook_messenger: false, messenger_limit: null, hook_text: "—", guy: false, eff_pole: pole };
      L = num(L);
      if (supply !== "OH" || !cable) { out.messages.push("Υπόγεια παροχή – δεν υπάρχει εναέριο άνοιγμα· οι πίνακες CS-3 δεν εφαρμόζονται."); out.status = "—"; return out; }
      out.applicable = true;
      cable = CAB[cable.key] || cable;
      if (cable.kind !== "conc") {
        out.messages.push("Μη αυτοφερόμενο καλώδιο (XLPE) – για εναέριο άνοιγμα απαιτείται ανάρτηση σε συρματόσχοινο.");
        out.messenger = out.hook_messenger = true; out.pole_ok = false; out.eff_pole = "WALL";
        out.pole_text = "μη αυτοφερόμενο καλώδιο – ανάρτηση σε συρματόσχοινο"; out.hook_text = p.messenger_msg + " (μη αυτοφερόμενο καλώδιο)"; out.status = p.messenger_msg;
        return out;
      }
      const mech = CS3[cable.short];
      if (!mech) { out.messages.push("Το καλώδιο δεν περιλαμβάνεται στον πίνακα CS-3."); return out; }
      const short = cable.short;
      const std = zone === "LM" ? mech.max_span_LM : mech.max_span_H;
      out.std_span = std; out.weight_kg_m = mech.kg_m; out.total_weight_kg = r1(mech.kg_m * L);
      const guy = L > std; out.guy = guy;
      const plim = PR.limit_by_cable_m[short] !== undefined ? PR.limit_by_cable_m[short] : std;
      const big = PR.big_cables.indexOf(short) >= 0;
      const poleOk = L <= plim;
      const pipe = (big && L > PR.pipe_big_from_m) ? PR.pipe_big : PR.pipe_min;
      out.pole_limit = plim; out.pole_ok = poleOk; out.pole_pipe = poleOk ? pipe : null;
      const mlim = p.messenger_by_cable_m[short] !== undefined ? p.messenger_by_cable_m[short] : p.messenger_span_m;
      const hookHeavy = guy, hookMess = L > mlim;
      out.hook_heavy = hookHeavy; out.hook_messenger = hookMess; out.messenger_limit = mlim;
      const Lt = String(L), gfmt = v => String(Number(v));
      if (poleOk) out.pole_text = `${p.pole_ok_msg} – στυλίσκος ${pipe} / ${gfmt(PR.height_m)} m (L = ${Lt} m ≤ ${gfmt(plim)} m` + (pipe === PR.pipe_big ? `, ${short} με L > ${gfmt(PR.pipe_big_from_m)} m → ${PR.pipe_big}` : "") + ")";
      else out.pole_text = `${p.pole_limit_msg} (L = ${Lt} m > ${gfmt(plim)} m για ${short}) → γάντζος βαρέως τύπου` + (hookMess ? " + συρματόσχοινο" : "");
      out.hook_text = (hookMess ? `ΓΑΝΤΖΟΣ – ${p.messenger_msg} (${short}: L = ${Lt} m > ${gfmt(mlim)} m)` : `ΓΑΝΤΖΟΣ – χωρίς συρματόσχοινο (L = ${Lt} m ≤ ${gfmt(mlim)} m)`) + (hookHeavy ? ` · γάντζος βαρέως τύπου (L > ${gfmt(std)} m, CS-3)` : " · κανονικός γάντζος");
      if (out.is_pole && poleOk) { out.heavy_hook = false; out.messenger = false; out.status = `${p.pole_ok_msg} ${pipe} / ${gfmt(PR.height_m)} m`; }
      else if (out.is_pole) { out.eff_pole = "WALL"; out.heavy_hook = true; out.messenger = hookMess; out.status = `${p.pole_limit_msg} – ${p.heavy_hook_msg}` + (hookMess ? " + ΣΥΡΜΑΤΟΣΧΟΙΝΟ" : ""); }
      else {
        out.heavy_hook = hookHeavy; out.messenger = hookMess;
        if (hookHeavy && hookMess) out.status = p.heavy_hook_msg + " + ΣΥΡΜΑΤΟΣΧΟΙΝΟ";
        else if (hookHeavy) out.status = p.heavy_hook_msg;
        else if (hookMess) out.status = p.messenger_msg;
        else out.status = "ΕΝΤΟΣ ΤΥΠΟΠΟΙΗΣΗΣ";
      }
      const sags = zone === "LM" ? mech.sag_LM : mech.sag_H;
      if (!guy) { out.sag_m = interpSag(sags, L); out.tension_kg = TYP.cs3_cu.max_tension_no_guy_kg; }
      else { const g = TYP.cs3_cu.sag_with_guy; out.sag_m = interpSag(SPANS.map(sp => g[String(sp)]), L); out.tension_kg = mech.tension_guy[zone === "LM" ? "M" : "H"]; }
      const msgs = [out.pole_text, out.hook_text];
      if (guy) msgs.push(`L = ${Lt} m > τυποποιημένο άνοιγμα ${std} m για ${short} (${zone === "LM" ? "ελαφριά/μέση" : "βαριά"} επιφόρτιση, CS-3 Πίν. Β.1): τάνυση κατά Πίν. Α.2 (με επίτονο / γάντζο βαρέως τύπου).`);
      else msgs.push(`Άνοιγμα εντός τυποποίησης CS-3: L = ${Lt} m ≤ ${std} m για ${short} – στήριξη χωρίς επίτονο (τάνυση ≤ 65 kg).`);
      if (L > p.max_table_span_m) msgs.push(`Άνοιγμα > ${p.max_table_span_m} m: εκτός πινάκων CS-3 – απαιτείται ιδιαίτερη μελέτη ανάρτησης / ενδιάμεσος στύλος.`);
      out.messages = msgs;
      return out;
    }

    const YS = D.ys, YS_ROWS = YS.fuse_table;
    const g1 = v => Number(v).toLocaleString("en-US", { maximumFractionDigits: 6 });   // like python :g (no thousands grouping issues below 1000)
    const fmtG = v => { const n = Number(v); return Number.isInteger(n) ? String(n) : String(n); };
    function ysRow(kva) { const k = Math.round(Number(kva)); return YS_ROWS.find(r => r.kva_num === k || r.kva_num2 === k) || null; }

    function ysFuses(kva, kv, fuseKind, upstream, singleCustomer, supplyNo, lvNetwork, indoor, branchLoadA) {
      kv = String(kv === undefined || kv === null ? "20" : kv).replace(",", ".");
      kv = (kv === "6.6" || kv === "6") ? "6.6" : (kv === "15" ? "15" : "20");
      const kvn = Number(kv), kvt = kv.replace(".", ",");
      fuseKind = fuseKind || "EXP"; upstream = upstream || "ED"; supplyNo = supplyNo || ""; lvNetwork = lvNetwork === undefined ? true : lvNetwork;
      const row = ysRow(kva);
      const out = { kva, kv, row, fuse_kind: fuseKind, upstream, notes: [], warnings: [] };
      if (!row) { out.warnings.push(`Μη τυποποιημένη ισχύς Μ/Σ ${kva} kVA – ο Πίν. Β2-8 καλύπτει 15…1000 kVA (τυποποιημένα 50/100/160/250/400/630/1000).`); return out; }
      const S = Number(kva), I_mv = S / (Math.sqrt(3) * kvn), I_lv = S / (Math.sqrt(3) * 0.4);
      out.I_mv_A = r2(I_mv); out.I_lv_A = Math.round(I_lv * 10) / 10; out.I_12In_A = Math.round(12 * I_mv * 10) / 10;
      const ekey = { "6.6": "exp_6_6", "15": "exp_15", "20": "exp_20" }[kv];
      const exp = row[ekey];
      const alt = YS.fuse_alt[`${row.kva_num}|${kv}`] || (kv !== "6.6" ? YS.fuse_alt[`${row.kva_num}|15_20`] : null) || null;
      let powder = kv === "6.6" ? row.powder_6_6 : row.powder_15_20;
      if (typeof powder === "number") powder = [powder];
      powder = powder ? powder.slice() : [];
      if (kv !== "6.6" && !powder.length && alt && alt.od22 && String(row.kva).indexOf("1000") >= 0) powder = [alt.od22];
      out.exp_fuse_A = exp === undefined ? null : exp; out.exp_alt = alt; out.powder_fuses_A = powder;
      out.max_lv_fuse_b28_A = row.max_lv_fuse;
      out.max_lv_fuse_A = (row.max_lv_fuse === null || row.max_lv_fuse === undefined) ? null : Math.min(row.max_lv_fuse, FUSES[FUSES.length - 1]);
      out.max_lv_fuse_capped = !!(row.max_lv_fuse !== null && row.max_lv_fuse !== undefined && row.max_lv_fuse > FUSES[FUSES.length - 1]);
      if (out.max_lv_fuse_capped) out.notes.push(`Μέγιστη ασφάλεια ΧΤ: ο Πίν. Β2-8 δίνει ${row.max_lv_fuse} A – δεν χρησιμοποιούνται φυσίγγια ${row.max_lv_fuse} A, μέγιστη τυποποιημένη ασφάλεια αναχώρησης ${FUSES[FUSES.length - 1]} A.`);
      out.RM_mohm = row.RM; out.XM_mohm = row.XM;
      if (row.RM !== null && row.RM !== undefined) { const z = Math.sqrt(row.RM * row.RM + row.XM * row.XM); out.Ik_lv_1f_A = Math.round(230.0 / z * 1000); } else out.Ik_lv_1f_A = null;
      const kind = (indoor || fuseKind === "POWDER") ? "POWDER" : "EXP";
      if (indoor && fuseKind !== "POWDER") out.notes.push("Υ/Σ εσωτερικού χώρου: απαγορεύονται οι ασφάλειες εκτόνωσης – τοποθετούνται πάντοτε ασφάλειες κόνεως (ΟΔ.21 §8β, Εγχειρίδιο §10.6.1).");
      const pj = powder.map(fmtG).join(" ή ");
      if (kind === "EXP") {
        if (exp) { out.fuse_A = exp; out.fuse_label = `${fmtG(exp)} K`; out.fuse_text = `Ασφάλεια εκτόνωσης με τηκτό ταχείας τήξης ${fmtG(exp)} K (${kvt} kV) – Πίν. Β2-8 / ΟΔ.22 Πίν. Ι`; }
        else { out.fuse_A = null; out.fuse_label = "—"; out.fuse_text = `Δεν προβλέπεται ασφάλεια εκτόνωσης για ${row.kva} kVA στα ${kvt} kV – ασφάλειες κόνεως` + (powder.length ? ` ${pj} A` : "") + " / ιδιαίτερη εξέταση (ΟΔ.22 §3)"; out.warnings.push(out.fuse_text); }
      } else {
        if (powder.length) { out.fuse_A = powder[0]; out.fuse_label = pj + " A (κόνεως)"; out.fuse_text = `Ασφάλεια κόνεως ${pj} A (${kv === "6.6" ? "6,6" : "15 ή 20"} kV) – Πίν. Β2-8`; }
        else { out.fuse_A = null; out.fuse_label = "—"; out.fuse_text = `Δεν προβλέπεται ασφάλεια κόνεως για ${row.kva} kVA στα ${kvt} kV στον Πίν. Β2-8` + (exp ? ` – ασφάλεια εκτόνωσης ${fmtG(exp)} K` : " – ιδιαίτερη εξέταση"); out.warnings.push(out.fuse_text); }
      }
      if (alt && kind === "EXP") out.notes.push("Πίν. Β2-8 / ΟΔ.22: " + alt.note + ".");
      out.fuse_ratio = out.fuse_A ? r2(out.fuse_A / I_mv) : null;
      if (out.fuse_A && out.fuse_ratio !== null && out.fuse_ratio < 2) out.notes.push(`Λόγος ασφάλειας / In = ${out.fuse_ratio.toFixed(2)} (< 2): μικρό περιθώριο υπερφόρτισης του Μ/Σ – ΟΔ.22 §2 κριτ. 2.`);
      out.notes.push(`Ρεύμα ζεύξης Μ/Σ: η ασφάλεια πρέπει να μην τήκεται σε 12 × In = ${(12 * I_mv).toFixed(1)} A για 0,1 s (ΟΔ.22 §2 κριτ. 3).`);
      const up = YS.upstream.find(u => u.code === upstream) || YS.upstream[0];
      out.branch_T_A = up.T; out.branch_label = `${up.T} T`;
      out.branch_text = `Ασφάλεια διακλάδωσης ΜΤ: τηκτό βραδείας τήξης ${up.T} T μετά από ${up.label} (ΟΔ.21 §11α)`;
      if (branchLoadA !== undefined && branchLoadA !== null && branchLoadA !== "" && Number(branchLoadA) > up.max_load_A) {
        out.branch_text += ` – φορτίο διακλάδωσης ${fmtG(Number(branchLoadA))} A > ${up.max_load_A} A: αντί Α/Ζ(Τ) διακόπτης απομόνωσης Δ/Α (ΟΔ.21 §9γ)`;
        out.warnings.push(`Φορτίο διακλάδωσης > ${up.max_load_A} A: προβλέπεται Δ/Α αντί ασφάλειας ${up.T} T.`);
      }
      const VA = YS.branch.table_V_A;
      let coord = null;
      if (kind === "EXP" && out.fuse_A) {
        const key = `K_${Math.trunc(out.fuse_A)}`, col = String(up.T);
        if (VA.downstream[key]) {
          coord = VA.downstream[key][col]; if (coord === undefined) coord = null;
          if (coord) out.coord_text = `Συνεργασία ${up.T} T (ανάντη) → ${Math.trunc(out.fuse_A)} K (Μ/Σ): εξασφαλίζεται για ρεύμα σφάλματος έως ${fmtG(coord)} A (ΟΔ.21 Πίν. V(Α))`;
          else { out.coord_text = `Συνεργασία ${up.T} T → ${Math.trunc(out.fuse_A)} K: ΔΕΝ εξασφαλίζεται (ΟΔ.21 Πίν. V(Α)) – π.χ. ασφάλειες Κ του Μ/Σ στην αρχή της διακλάδωσης (< 1000 m) ή τροποποίηση ρυθμίσεων· όχι μικρότερη ασφάλεια Μ/Σ`; out.warnings.push(out.coord_text); }
        } else out.coord_text = `Τηκτό ${Math.trunc(out.fuse_A)} K εκτός Πίν. V(Α) (3…25 K) – ιδιαίτερη εξέταση συνεργασίας (ΟΔ.22 §3: 40 K μόνο για 500 kVA)`;
      } else out.coord_text = "Ασφάλειες κόνεως: έλεγχος συνεργασίας με τις χαρακτηριστικές του κατασκευαστή (ΟΔ.21 §11στ)";
      out.coord_max_A = coord;
      const VB = YS.branch.table_V_B;
      const vb = VB.rows.find(r => String(r.T_link).replace(/[()]/g, "") === String(up.T));
      if (vb) out.transient_text = `Προστασία της ${up.T} T από τα στοιχεία στιγμιαίας λειτουργίας για παροδικά σφάλματα έως ${vb.E_D} A (Ε/Δ) / ${vb.D_AE} A (Δ/ΑΕ) (ΟΔ.21 Πίν. V(Β))`;
      const conds = [kind === "EXP", S >= 75, !!singleCustomer && ["Νο 5", "Νο 6", "Νο 7"].indexOf(supplyNo) >= 0, !lvNetwork];
      out.lv_omit_conditions = conds; out.lv_omit_ok = conds.every(c => c);
      const b214 = YS.b2_14.rows.find(r => ysRow(parseInt(String(r.kva).split("-")[0], 10)) === row) || null;
      out.b2_14 = b214;
      if (out.lv_omit_ok) {
        if (b214 && kv !== "6.6") out.lv_omit_text = `Οι ασφάλειες ΧΤ αναχώρησης μπορούν να παραληφθούν (ΟΔ.22 §7)· η γραμμή μετρητή–πίνακα προστατεύεται από τις ασφάλειες ΜΤ (${kv === "15" ? b214.mv_fuse_15kV_A : b214.mv_fuse_20kV_A} A) για διατομή ≤ ${b214.protected_section_mm2} mm² (Πίν. Β2-14)`;
        else out.lv_omit_text = "Οι ασφάλειες ΧΤ αναχώρησης μπορούν να παραληφθούν (ΟΔ.22 §7) – η προστατευόμενη διατομή του Πίν. Β2-14 δίνεται μόνο για 75–250 kVA στα 15/20 kV";
      } else out.lv_omit_text = "Απαιτούνται ασφάλειες ΧΤ αναχώρησης (ΟΔ.22 §4–§6): μαχαιρωτές GR-207 ≥ 1,3 × I φορτίου, ≤ " + String(out.max_lv_fuse_A === null ? "—" : out.max_lv_fuse_A) + " A (μέγ. ασφάλεια ΧΤ Πίν. Β2-8" + (out.max_lv_fuse_capped ? ` – ${row.max_lv_fuse} A στον πίνακα, χωρίς φυσίγγια ${row.max_lv_fuse} A` : "") + ")";
      out.lv_box_text = S <= 25 ? "Μ/Σ έως 25 kVA: μόνο κεντρικές ασφάλειες ΧΤ" : "Μ/Σ > 25 kVA: ασφάλειες ανά αναχώρηση ΧΤ στο ασφαλειοκιβώτιο (S-57…S-73 / S-157…S-175)";
      if (out.Ik_lv_1f_A && row.max_lv_fuse) out.sc_text = `Ενδεικτικό 1Φ βραχυκύκλωμα στους ακροδέκτες ΧΤ ≈ ${out.Ik_lv_1f_A} A (RM = ${row.RM} mΩ, XM = ${row.XM} mΩ)· συνθήκη 3 × Iασφ ≤ Iβρ στο άκρο του δικτύου ΧΤ (Εγχ. §10.7 / ΟΔ.22 §5.4)`;
      const pm = YS.pole_mounting.find(p => S <= p.kva_max) || YS.pole_mounting[YS.pole_mounting.length - 1];
      out.pole_text = pm.text;
      if (S > 630) out.warnings.push("Ισχύς > 630 kVA: δεν προβλέπεται εναέριος Υ/Σ.");
      out.placement_text = "Οι ασφάλειες ΜΤ τοποθετούνται στον στύλο / δίστυλο του Μ/Σ ή σε προηγούμενο στύλο της διακλάδωσης (Ρ-27Τ με διπλή στήριξη Ρ-3ΙΙ/Ρ-3ΑΙΙ)· διακλάδωση που τροφοδοτεί έναν μόνο Υ/Σ και μήκους < 1000 m προστατεύεται με τις Α/Ζ(Κ) του Μ/Σ στην αρχή της (ΟΔ.21 §9ε)· απόσταση έως 1200 m από τον Μ/Σ (Εγχ. §10.6.1).";
      const inr = YS.inrush_limits.values_A[String(row.kva_num)] || YS.inrush_limits.values_A[String(row.kva_num2)] || null;
      out.customer_switching_limit_A = inr;
      return out;
    }

    function serviceClearances(crossing, supply, pole) {
      const sc = TYP.service_clearances;
      const o = sc.crossing_options.find(x => x[0] === crossing) || sc.crossing_options[0];
      const rows = [];
      if (supply === "OH") {
        rows.push(["Ελάχιστο ύψος καλωδίου παροχής από το έδαφος – " + o[1], o[2], o[3]]);
        rows.push(["Επίτονος στυλίσκου πάνω από πεζοδρόμιο / οδό", `${sc.guy_sidewalk.toFixed(2)} / ${sc.guy_road.toFixed(2)}`, "C-3 II / I"]);
      }
      sc.building.forEach(b => rows.push([b[0], b[1], b[2]]));
      return { crossing: o[0], height_m: supply === "OH" ? o[2] : null, rows, note: sc.span_increase_note };
    }

    function design(inp) {
      // κανόνας γραφείου «2 × Νο 05»: τριφασική γραμμή + συγκεντρικό 4x16 + διανομέας (όταν η γραμμή είναι «Αυτόματα» ή 3Φ)
      const pair = pairSupplyException(inp.counts || {}, inp.extra_A || 0, inp.extra_A_coinc || 0, inp.line || "AUTO", inp.pair_supply_rule);
      let line = inp.line || "AUTO";
      if (pair && String(line).toUpperCase() === "AUTO") line = pair.line || "3F";
      const cl = clusterLoad(inp.counts || {}, inp.loads, line, inp.extra_A || 0, inp.extra_A_coinc || 0, inp.distribution || "WORST");
      cl.pair_rule = !!pair;
      const out = { cluster: cl };
      if (cl.I_B === null) { out.error = "Πλήθος μετρητών > 72: εκτός Πίν. ΙΙ ΟΔ.45 – χωρίστε σε δύο μετρητικά συγκροτήματα."; return out; }
      const margin = num(inp.margin_pct);
      const Ireq = cl.I_B * (1 + margin / 100);
      out.I_req = Ireq;
      const ph = cl.phases;
      const o = { basis: inp.basis || "od26", max_conc_ug: inp.max_conc_ug === undefined ? R45.max_conc_underground_default : inp.max_conc_ug,
        air_governs: inp.air_governs === undefined ? false : inp.air_governs, k_air: inp.k_air === undefined ? 1 : inp.k_air, k_ground: inp.k_ground === undefined ? 1 : inp.k_ground, k_pipe: inp.k_pipe === undefined ? 1 : inp.k_pipe, wall: !!inp.wall,
        ug_xlpe150: inp.ug_xlpe150 === undefined ? true : !!inp.ug_xlpe150 };
      const sel = {}; Object.keys(CASES).forEach(c => sel[c] = selectCable(Ireq, ph, Object.assign({ case: c }, o)));
      let exc = singleSupplyException(cl, inp.counts || {}, inp.single_supply_exceptions);
      if (pair) exc = { no: `${Math.trunc(pair.count || 2)} × ${pair.no}`, cable: pair.cable, note: pair.note || "", pair: true };
      const excCases = exc ? applyException(sel, exc) : [];
      out.selection = sel;
      const ohCase = inp.wall ? "OH_W" : "OH_F";
      const ohFeasible = sel[ohCase].chosen !== null;
      const network = inp.network || "OH";
      const [st, why] = supplyType(network, inp.request || "AUTO", cl.eq1f, ohFeasible);
      out.supply_type = st; out.supply_why = why;
      let caseK;
      if (st === "OH") caseK = ohCase; else if (network === "OH") caseK = "UG_OH"; else caseK = inp.pipe_gt6 ? "UG_P" : "UG_G";
      out.case = caseK; out.chosen = sel[caseK].chosen;
      out.exception = exc ? { no: exc.no, cable: exc.cable, note: exc.note, cases: excCases, applied: excCases.indexOf(caseK) >= 0, adequate: !!(out.chosen && out.chosen.I_z >= Ireq), pair: !!exc.pair } : null;
      out.board = meterBoard(cl, inp.counts || {}, inp.n_arr || 0, network, !!inp.pipe_gt6, inp.board_params, st, inp.link_box || "AUTO", !!pair);
      // υπόγεια παροχή: υπόγεια καλώδια ανά μετρητική διάταξη από τα φορτία των διατάξεων (κανόνας γραφείου – μπορεί να είναι > 2)
      out.ug_cables = (st === "UG" && cl.N > 0) ? ugCables(cl, out.board, inp.counts || {}, inp.loads, caseK, margin, out.chosen, inp.extra_A || 0, inp.extra_A_coinc || 0, inp.distribution || "WORST", o) : null;
      out.md = mdProposal(inp.use || "ΠΟΛΥΚΑΤΟΙΚΙΑ", cl, inp.counts || {}, out.board, st, network, inp.crossing || "SIDEWALK");
      out.sizing = feederSizing(cl, inp.counts || {}, !!inp.isolated, !!inp.irrigation);
      const ck = out.chosen ? out.chosen.key : null;
      const sup = st === "OH" ? "OH" : "UG";
      const pole = inp.pole || "POLE";
      out.span = spanCheck(num(inp.L_m), out.chosen, pole, inp.load_zone || "LM", sup);
      out.clearances = serviceClearances(inp.crossing || "SIDEWALK", sup, pole);
      out.bom = bom(inp.counts || {}, ck, num(inp.L_m), sup, out.span.eff_pole || pole, inp.protection || "fuse", out.board, !!inp.isolated, inp.material_params, inp.length_params, null, inp.removal, out.span, out.ug_cables);
      out.std = D.supplies.filter(s => Math.trunc(num((inp.counts || {})[s.no])) > 0);
      return out;
    }


    // ---------------------------------------------------------------- Πτώση τάσης (Εγχειρίδιο §10.3 / Πίν. Β2-6, Β2-6Α, Β2-7) + ουδετέρωση στο άκρο
    const VD = D.vdrop, VD_COND = {}, VD_VOLT = {};
    VD.conductors.forEach(c => { VD_COND[c.key] = c; });
    VD.voltages.forEach(v => { VD_VOLT[v.code] = v; });
    const vf = (v, d) => { const m = Math.pow(10, d); return (Math.floor(v * m + 0.5) / m).toFixed(d); };
    function vdK(cond, kv, cosphi) {
      const c = typeof cond === "string" ? VD_COND[cond] : cond;
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      return 10 * kv * kv / (c.R * cosphi + c.X * sinphi);
    }
    function vdrop(inp) {
      inp = inp || {};
      const V = VD_VOLT[inp.voltage] || VD_VOLT.XT;
      const kv = Number(V.kv), isXT = V.group === "XT";
      let cosphi = Number(inp.cosphi) || VD.cosphi_default; cosphi = Math.min(1, Math.max(0.1, cosphi));
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      const limit = Number(inp.limit_pct) || V.limit_pct;
      const unit = String(inp.unit || "kVA").toUpperCase() === "A" ? "A" : "kVA";
      const U = isXT ? 400 : kv * 1000;
      const secsIn = (inp.sections || []).filter(s => s && VD_COND[s.cond] && (Number(s.L_m) || 0) > 0).slice(0, VD.max_sections);
      const loads = secsIn.map(s => {
        let ph = isXT ? (parseInt(s.phases, 10) || 3) : 3; if (![1, 2, 3].includes(ph)) ph = 3;
        const load = Number(s.load) || 0;
        const S = unit === "A" ? (ph === 3 ? Math.sqrt(3) * U * load : (ph === 1 ? 230 * load : 2 * 230 * load)) / 1000 : load;
        return [ph, Math.max(0, S)];
      });
      const n = secsIn.length, sections = [];
      let cum = 0, sumX = 0, sumRsc = 0, sumXsc = 0, kvaKm = 0;
      secsIn.forEach((s, i) => {
        const c = VD_COND[s.cond]; const ph = loads[i][0], Snode = loads[i][1]; const dist = !!s.dist;
        const Lkm = Number(s.L_m) / 1000;
        let Sdown = 0; for (let j = i + 1; j < n; j++) Sdown += loads[j][1];
        const Sthrough = Sdown + Snode, Seff = Sdown + (dist ? Snode / 2 : Snode);
        const pf = isXT ? VD.phase_factor[String(ph)] : 1;
        const K = vdK(c, kv, cosphi), Keff = K / pf;
        const dU = Keff > 0 ? Seff * Lkm / Keff : 0; cum += dU;
        const I = Sthrough * 1000 / (ph === 3 ? Math.sqrt(3) * U : (ph === 1 ? 230 : 2 * 230));
        const over = (c.I_max !== null && c.I_max !== undefined) && I > c.I_max;
        sumX += Seff * Lkm * pf; kvaKm += Seff * Lkm;
        if (c.R_sc !== null && c.R_sc !== undefined) { sumRsc += Lkm * c.R_sc; sumXsc += Lkm * c.X_sc; }
        sections.push({ i: i + 1, cond: c.key, name: c.name, group: c.group, R: c.R, X: c.X, L_m: Number(s.L_m), L_km: Lkm, phases: ph, dist, S_node: Snode, S_down: Sdown, S_through: Sthrough, S_eff: Seff, pf,
          K, K_eff: Keff, I_A: I, I_max: c.I_max === undefined ? null : c.I_max, overload: over, dU, dU_cum: cum, ok: cum <= limit + 1e-9 });
      });
      let Stotal = 0; loads.forEach(x => { Stotal += x[1]; });
      const ph0 = loads.length ? loads[0][0] : 3;
      const Istart = loads.length ? Stotal * 1000 / (ph0 === 3 ? Math.sqrt(3) * U : (ph0 === 1 ? 230 : 2 * 230)) : 0;
      const dUtotal = cum;
      const alts = [];
      for (const c of VD.conductors) {
        if (c.group !== V.group) continue;
        const K = vdK(c, kv, cosphi); const dUa = n ? sumX / K : 0;
        alts.push({ key: c.key, name: c.name, K, dU: dUa, ok: dUa <= limit + 1e-9, I_max: c.I_max === undefined ? null : c.I_max, overload: (c.I_max !== null && c.I_max !== undefined) && Istart > c.I_max });
      }
      const firstOk = alts.find(a => a.ok && !a.overload) || null;
      let sc = null;
      const trKva = inp.tr_kva ? parseInt(inp.tr_kva, 10) : 0;
      if (isXT && trKva && TR[trKva] && TR[trKva].RM !== null && TR[trKva].RM !== undefined && TR[trKva].standard && n) {
        const fr = D.feeder_rules, tr = TR[trKva];
        const Lp = (inp.Lp_m === undefined || inp.Lp_m === null || inp.Lp_m === "") ? fr.supply_Lp_m : Number(inp.Lp_m);
        const R = tr.RM / 1000 + 2 * sumRsc + 2 * (Lp / 1000) * fr.supply_Rp_ohm_km;
        const X = tr.XM / 1000 + 2 * sumXsc;
        const Z = Math.sqrt(R * R + X * X), Isc = 230 / Z;
        let fuseMax = 0; for (const f of FUSES) if (fr.sc_factor * f <= Isc) fuseMax = Math.max(fuseMax, f);
        sc = { tr_kva: trKva, RM: tr.RM, XM: tr.XM, Lp_m: Lp, R, X, Z, Isc, fuse_max: fuseMax || null, ok: fuseMax > 0, max_lv_fuse: tr.max_lv_fuse,
          text: fuseMax ? `Ιβρ = ${vf(Isc, 0)} A στο άκρο → μεγαλύτερη τυποποιημένη ασφάλεια αναχώρησης για 3·Ιασφ ≤ Ιβρ: ${fuseMax} A` + (fuseMax > tr.max_lv_fuse ? ` (μέγ. ασφάλεια Μ/Σ ${tr.max_lv_fuse} A)` : "")
            : `Ιβρ = ${vf(Isc, 0)} A – ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ Η ΣΥΝΘΗΚΗ ΟΥΔΕΤΕΡΩΣΗΣ ΟΥΤΕ ΜΕ ΑΣΦΑΛΕΙΑ ΤΩΝ ${FUSES[0]} A (3 × ${FUSES[0]} = ${3 * FUSES[0]} A > Ιβρ)` };
      }
      const warnings = [];
      const g = v => Number.isInteger(v) ? String(v) : String(v);
      if (n && dUtotal > limit) warnings.push(`Υπέρβαση: συνολική πτώση τάσης ${vf(dUtotal, 2)} % > όριο ${g(limit)} % – ενίσχυση αγωγού` + (firstOk ? ` (π.χ. ${firstOk.name}: ${vf(firstOk.dU, 2)} %)` : "") + " ή νέα αναχώρηση / Μ/Σ πλησιέστερα στα φορτία.");
      if (sections.some(x => x.overload)) warnings.push("Υπέρβαση επιτρεπόμενης έντασης αγωγού (Ιεπ) σε τμήμα: " + sections.filter(x => x.overload).map(x => `${x.i}ο (${vf(x.I_A, 0)} A > ${x.I_max} A)`).join(", ") + ".");
      if (isXT && sections.some(x => x.phases !== 3) && sections.some(x => x.phases === 3)) warnings.push("Μικτή γραμμή: τριφασικά και μονοφασικά/διφασικά τμήματα – τα Κ των μονοφασικών τμημάτων διαιρούνται με 6 (διφασικών με 3) κατά τις παρατηρήσεις του Πίν. Β2-7.");
      if (!isXT && inp.tr_kva) warnings.push("Ο έλεγχος ουδετέρωσης (βραχυκύκλωμα στο άκρο) γίνεται μόνο για γραμμές ΧΤ.");
      const text = !n ? "Δεν έχουν οριστεί τμήματα γραμμής." : `ΔU = ${vf(dUtotal, 2)} % στο άκρο (${dUtotal <= limit + 1e-9 ? "≤" : ">"} ${g(limit)} %) · Σ φορτίων ${vf(Stotal, 1)} kVA · I αρχής ${vf(Istart, 1)} A · Σ(kVA·km) = ${vf(kvaKm, 2)}`;
      return { voltage: V.code, kv, group: V.group, is_xt: isXT, cosphi, sinphi, limit, unit, n, sections, dU_total: dUtotal, ok: n > 0 && dUtotal <= limit + 1e-9, S_total: Stotal, I_start: Istart, kva_km: kvaKm,
        sum_x: sumX, alternatives: alts, first_ok: firstOk, sc, warnings, text, table: V.table };
    }

    /* ---------------------------------------------------------------- Ουδετέρωση δικτύου ΧΤ – ΟΔ.119 (mirrors engine2.py neutral_earthing) */
    const EARTH = D.earthing, EARTH_YS = {};
    EARTH.ys_types.forEach(y => EARTH_YS[y.code] = y);
    const gf = v => String(Number(v));   // Python "%g"-like for the simple numbers used here (integers / short decimals)
    const ceilEps = x => Math.ceil(x - 1e-9);

    function rodResistance(rho, L, d) {
      const lim = EARTH.limits;
      L = (L === undefined || L === null) ? lim.rod_length_m : L; d = (d === undefined || d === null) ? lim.rod_diameter_m : d;
      return rho / (2 * Math.PI * L) * Math.log(4 * L / d);
    }

    function neutralEarthing(inp) {
      const lim = EARTH.limits;
      let ys = inp.ys || "OH_CONC"; if (!EARTH_YS[ys]) ys = "OH_CONC";
      const groundSwitch = !!inp.ground_switch, smallFuse = !!inp.small_fuse;
      const Loh = Math.max(0, num(inp.L_oh_m)), nEnds = Math.max(0, Math.trunc(num(inp.n_ends))), nPoles = Math.max(0, Math.trunc(num(inp.n_poles)));
      const nSup = Math.max(0, Math.trunc(num(inp.n_supplies))), Lsheath = Math.max(0, num(inp.L_sheath_m)), rho = num(inp.rho);
      let Re = num(inp.R_e), ReSrc = "μέτρηση";
      if (Re <= 0 && rho > 0) { Re = rodResistance(rho); ReSrc = `εκτίμηση από ρ = ${gf(rho)} Ω·m (ράβδος ${gf(lim.rod_length_m)} m)`; }
      if (Re <= 0) return { ok: false, error: "Δώστε τη μέση αντίσταση γειώσεως ενός ηλεκτροδίου (Ω) ή την ειδική αντίσταση του εδάφους (Ω·m)." };
      const ReSup = num(inp.R_e_sup) || Re;
      const nYs = Math.max(1, Math.trunc(num(inp.n_ys_rods) || 3));
      let Rys = num(inp.R_ys); if (Rys <= 0) Rys = Re / nYs;
      const nInt = Loh > 0 ? Math.max(0, ceilEps(Loh / lim.electrode_spacing_m) - nEnds) : 0;
      const nNetAuto = nEnds + nInt;
      const ovr = inp.n_net_override;
      let nNet = (ovr === undefined || ovr === null || ovr === "" || Number(ovr) === 0) ? nNetAuto : Math.max(0, Math.trunc(Number(ovr)));
      if (nPoles && nNet > nPoles) nNet = nPoles;
      const mtCable = ys === "OH_CABLE" || ys === "INDOOR";
      let limit = (ys === "OH_WOOD" && !mtCable) ? lim.common_wooden_ohm : lim.common_ohm;
      let limitWhy = limit === 2 ? "2 Ω – εναέριος Υ/Σ σε ξύλινους στύλους χωρίς υπόγειο καλώδιο ΜΤ" : (mtCable ? "1 Ω – καταλήγει υπόγειο καλώδιο ΜΤ (κίνδυνος υπερπηδήσεως στο ακροκιβώτιο)" : "1 Ω – στύλοι Ω.Σ.");
      if (smallFuse && limit < lim.common_small_fuse_ohm) { limit = lim.common_small_fuse_ohm; limitWhy = `2 Ω – ασφάλειες ≤ ${lim.small_fuse_A} A πριν από κάθε σημείο υπερπηδήσεως ΜΤ → «μεταλλικά»`; }
      const Gys = 1 / Rys, Gmand = Gys + nNet / Re + nSup / ReSup, Rmand = 1 / Gmand;
      const maxAdd = Math.max(0, nPoles - nNet);
      const Gall = Gmand + maxAdd / Re, Rall = 1 / Gall;
      const need = target => { const Greq = 1 / target; return Gmand >= Greq - 1e-12 ? 0 : ceilEps((Greq - Gmand) * Re); };
      const sheathOk = Lsheath > lim.sheath_length_m;
      let nAdd = 0, status, mode, Rfinal;
      const steps = [];
      steps.push(`Υποχρεωτικές γειώσεις ουδετέρου: Υ/Σ (${nYs} ηλεκτρ., R = ${vf(Rys, 2)} Ω) + ${nNet} στο δίκτυο (${nEnds} τέρματα + ${nInt} ενδιάμεσες ανά ${lim.electrode_spacing_m} m) + ${nSup} στα άκρα των παροχών.`);
      steps.push(`Μέση αντίσταση ηλεκτροδίου Re = ${vf(Re, 1)} Ω (${ReSrc}) · εκτιμώμενη συνολική αντίσταση με τις υποχρεωτικές γειώσεις Rολ = ${vf(Rmand, 2)} Ω.`);
      if (sheathOk) {
        status = "ΟΥΔΕΤΕΡΩΣΗ – ΚΟΙΝΗ ΓΕΙΩΣΗ"; mode = "COMMON"; Rfinal = Rmand;
        steps.push(`Υπόγεια καλώδια με μεταλλικό μανδύα συνολικού μήκους ${gf(Lsheath)} m > ${lim.sheath_length_m} m: η συνθήκη ≤ ${gf(limit)} Ω θεωρείται εξασφαλισμένη από τη φυσική γείωση του μανδύα → κοινή γείωση «μεταλλικών ΜΤ» και ουδετέρου.`);
      } else if (Rmand <= limit + 1e-9) {
        status = "ΟΥΔΕΤΕΡΩΣΗ – ΚΟΙΝΗ ΓΕΙΩΣΗ"; mode = "COMMON"; Rfinal = Rmand;
        steps.push(`Rολ = ${vf(Rmand, 2)} Ω ≤ ${gf(limit)} Ω (${limitWhy}) → δεν χρειάζεται καμία άλλη γείωση· κοινή γείωση «μεταλλικών ΜΤ» και ουδετέρου.`);
      } else {
        steps.push(`Rολ = ${vf(Rmand, 2)} Ω > ${gf(limit)} Ω (${limitWhy}).`);
        const n1 = need(limit);
        if (n1 <= maxAdd) {
          status = "ΟΥΔΕΤΕΡΩΣΗ – ΚΟΙΝΗ ΓΕΙΩΣΗ (με πρόσθετα ηλεκτρόδια)"; mode = "COMMON_ADD"; nAdd = n1; Rfinal = 1 / (Gmand + n1 / Re);
          steps.push(`Με ${n1} πρόσθετα ηλεκτρόδια ομοιόμορφα διασκορπισμένα στο δίκτυο (διαθέσιμοι στύλοι χωρίς γείωση: ${maxAdd}) → Rολ = ${vf(Rfinal, 2)} Ω ≤ ${gf(limit)} Ω → κοινή γείωση.`);
        } else {
          steps.push(`Ούτε με ηλεκτρόδιο σε κάθε στύλο (${nPoles} στύλοι → Rολ = ${vf(Rall, 2)} Ω) επιτυγχάνεται ≤ ${gf(limit)} Ω (θα χρειάζονταν ${n1} πρόσθετα).`);
          if (Rmand < lim.neutralization_max_ohm - 1e-9) {
            status = "ΟΥΔΕΤΕΡΩΣΗ – ΑΝΕΞΑΡΤΗΤΕΣ ΓΕΙΩΣΕΙΣ"; mode = "INDEP"; Rfinal = Rmand;
            steps.push(`Rολ = ${vf(Rmand, 2)} Ω < ${gf(lim.neutralization_max_ohm)} Ω → εφαρμόζεται ουδετέρωση χωρίς άλλα ηλεκτρόδια· ιδιαίτερη ανεξάρτητη γείωση «μεταλλικών ΜΤ» < ${gf(lim.mt_metal_independent_ohm)} Ω.`);
          } else {
            const n2 = need(lim.neutralization_max_ohm - 1e-6);
            if (n2 <= maxAdd) {
              status = "ΟΥΔΕΤΕΡΩΣΗ – ΑΝΕΞΑΡΤΗΤΕΣ ΓΕΙΩΣΕΙΣ (με πρόσθετα ηλεκτρόδια)"; mode = "INDEP_ADD"; nAdd = n2; Rfinal = 1 / (Gmand + n2 / Re);
              steps.push(`Με ${n2} πρόσθετα ηλεκτρόδια → Rολ = ${vf(Rfinal, 2)} Ω < ${gf(lim.neutralization_max_ohm)} Ω → ουδετέρωση με ανεξάρτητη γείωση «μεταλλικών ΜΤ» < ${gf(lim.mt_metal_independent_ohm)} Ω.`);
            } else {
              status = "ΔΕΝ ΕΦΑΡΜΟΖΕΤΑΙ ΟΥΔΕΤΕΡΩΣΗ"; mode = "NONE"; Rfinal = Rall;
              steps.push(`Ακόμη και με ηλεκτρόδιο σε κάθε στύλο Rολ = ${vf(Rall, 2)} Ω ≥ ${gf(lim.neutralization_max_ohm)} Ω → δεν είναι δυνατή η εφαρμογή ουδετέρωσης στο δίκτυο.`);
            }
          }
        }
      }
      const common = mode === "COMMON" || mode === "COMMON_ADD";
      let fig;
      if (mode === "NONE") fig = ys === "OH_CABLE" ? "Σχ. 8" : "—";
      else if (ys === "OH_WOOD") fig = common ? "Σχ. 4" : "Σχ. 5";
      else if (ys === "OH_CONC") fig = common ? "Σχ. 1" : (groundSwitch ? "Σχ. 3" : "Σχ. 2");
      else if (ys === "OH_CABLE") fig = common ? "Σχ. 6" : "Σχ. 7";
      else fig = common ? "Σχ. 9" : "Σχ. 10";
      const grid = !common && (groundSwitch || ys === "INDOOR");
      const measures = [];
      const n300 = Loh > 0 ? ceilEps(Loh / lim.no_neutralization_spacing_m) : 0;
      if (mode === "NONE") {
        measures.push(`Γείωση του ουδετέρου στον Υ/Σ και σε σημεία ανά ${lim.no_neutralization_spacing_m} m περίπου (≈ ${n300} θέσεις), όχι υποχρεωτικά στα άκρα· ΟΧΙ γείωση στις παροχές.`,
          "Ενημέρωση των καταναλωτών ότι δεν εφαρμόζεται ουδετέρωση (ΚΕΗΕ) – προστασία με άμεση γείωση στην εσωτερική εγκατάσταση.",
          "Στύλοι Ω.Σ. και μεταλλικά πλαίσια/στηρίγματα ΧΤ αγείωτα· μονωτήρας (ωοειδής) στα συρματόσχοινα επιτόνων.",
          "Πρόσθετη μόνωση μεταλλικών κιβωτίων (μετρητών, ασφαλειών, Μ/Σ έντασης) – διπλή μόνωση· φωτιστικά διπλής μόνωσης· χωρίς υπόγεια καλώδια με μεταλλικό μανδύα.",
          `Ανεξάρτητη γείωση «μεταλλικών ΜΤ» του Υ/Σ < ${gf(lim.mt_metal_independent_ohm)} Ω` + (groundSwitch ? " – πλέγμα (όργανο ζεύξεως με χειριστήριο από το έδαφος)." : "."));
      } else {
        measures.push(`Γειώσεις ουδετέρου: Υ/Σ, τέρματα γραμμών/διακλαδώσεων, ανά ${lim.electrode_spacing_m} m, άκρο κάθε παροχής (συνθήκη 3)` + (nAdd ? ` + ${nAdd} πρόσθετα ηλεκτρόδια ομοιόμορφα κατανεμημένα.` : "."));
        if (common) measures.push(`Κοινή γείωση «μεταλλικών ΜΤ» (αλεξικέραυνα, ακροκιβώτια ΜΤ, αγωγός γης) και ουδετέρου – ${fig}.`);
        else {
          measures.push(`Ανεξάρτητη γείωση «μεταλλικών ΜΤ» < ${gf(lim.mt_metal_independent_ohm)} Ω` + (grid ? " ως πλέγμα (αποτελεσματική γείωση)" : "") + `, σε απόσταση > ${lim.independent_distance_m} m από τη γείωση του ουδετέρου – ${fig}.`);
          if (ys === "OH_WOOD") measures.push("Η γείωση του ουδετέρου επιτρέπεται στον πρώτο στύλο κάθε εναέριας αναχώρησης ΧΤ· ασφαλειοκιβώτιο ΧΤ σε απόσταση από τον Υ/Σ.");
          if (ys === "INDOOR") measures.push("Γείωση ουδετέρου στη θέση του ασφαλειοκιβωτίου ΧΤ έξω από τον Υ/Σ, σε απόσταση από το πλέγμα γειώσεως του Υ/Σ.");
        }
        measures.push(`Όλα τα «μεταλλικά» ΧΤ και οι στύλοι Ω.Σ. συνδέονται στον ουδέτερο (Rολ ≤ ${gf(lim.neutralization_max_ohm)} Ω)· αγωγοί γειώσεως μονωμένοι/καλυμμένοι στο προσιτό τμήμα.`);
        measures.push("Ο ουδέτερος δεν διακόπτεται ποτέ από ασφάλειες/διακόπτες (συνθήκη 5)· έλεγχος 3·Ιασφ ≤ Ιβρ στο άκρο (συνθήκη 1 – καρτέλα «Πτώση τάσης»).");
      }
      const Rref = mode !== "NONE" ? Rfinal : Rall;
      const wOk = mode !== "NONE" && Rref <= lim.mixed_wooden_ohm + 1e-9, cOk = mode !== "NONE" && Rref <= lim.mixed_concrete_ohm + 1e-9;
      const mixed = { wooden_ok: wOk, concrete_ok: cOk,
        text: `Μικτές κατασκευές ΜΤ+ΧΤ σε κοινούς στύλους: ξύλινοι (παράλληλη όδευση) ${wOk ? "ΕΠΙΤΡΕΠΟΝΤΑΙ" : "ΟΧΙ"} (Rολ ≤ ${gf(lim.mixed_wooden_ohm)} Ω) · Ω.Σ. (όδευση ή διασταύρωση) ${cOk ? "ΕΠΙΤΡΕΠΟΝΤΑΙ" : "ΟΧΙ"} (Rολ ≤ ${gf(lim.mixed_concrete_ohm)} Ω) · διασταύρωση σε ξύλινους πάντοτε.` };
      const Rnat = lim.concrete_pole_natural_factor * Re, Rrod = lim.concrete_pole_electrode_factor * Re, Nwire = ceilEps(Rrod / lim.mt_metal_independent_ohm);
      const mtConc = { R_natural: Rnat, R_with_rod: Rrod, ok_natural: Rnat < lim.mt_metal_independent_ohm, ok_rod: Rrod < lim.mt_metal_independent_ohm, N_wire: Nwire,
        text: `Στύλος Ω.Σ. γραμμής ΜΤ: φυσική γείωση ≈ 150 % Re = ${vf(Rnat, 1)} Ω ${Rnat < 40 ? "<" : "≥"} 40 Ω` + (Rnat < 40 ? "" : ` → με ηλεκτρόδιο FCP-31A ≈ 50 % Re = ${vf(Rrod, 1)} Ω ${Rrod < 40 ? "<" : "≥"} 40 Ω` + (Rrod < 40 ? "" : ` → αγωγός γης: Rολ = R/N < 40 Ω με N ≥ ${Nwire} γειωμένους στύλους (Σχ. 11)`)) + "." };
      const text = `${status} · Rολ = ${vf(Rfinal, 2)} Ω (όριο κοινής γείωσης ${gf(limit)} Ω · ουδετέρωση έως ${gf(lim.neutralization_max_ohm)} Ω)` + (nAdd ? ` · ${nAdd} πρόσθετα ηλεκτρόδια` : "") + ` · ${fig}`;
      return { ok: true, ys, ys_label: EARTH_YS[ys].label, mt_cable: mtCable, ground_switch: groundSwitch, small_fuse: smallFuse, limit, limit_why: limitWhy,
        R_e: Re, R_e_src: ReSrc, R_e_sup: ReSup, R_ys: Rys, n_ys_rods: nYs, n_ends: nEnds, n_int: nInt, n_net_auto: nNetAuto, n_net: nNet, n_supplies: nSup, n_poles: nPoles,
        max_add: maxAdd, R_mand: Rmand, R_all: Rall, n_add: nAdd, R_final: Rfinal, sheath_ok: sheathOk, L_sheath_m: Lsheath,
        mode, status, common, grid, fig, steps, measures, mixed, mt_conc: mtConc, text,
        n_electrodes_total: nYs + (mode !== "NONE" ? nNet + nAdd + nSup : n300) };
    }

    // ---------------------------------------------------------------- Ουδετέρωση ΧΤ – συνθήκη βραχυκύκλωσης (Εγχ. §10.7 / ΟΔ.22 – οθόνη «Ουδετέρωση ΧΤ» Πυθαγόρα)
    const NZ = D.lv_neutral, NZ_SUP = {};
    NZ.supply_cables.forEach(c => { NZ_SUP[c.key] = c; });
    const NZ_COND = D.lv_feeder_conductors.filter(c => c.R_sc !== null && c.R_sc !== undefined);
    function lmaxSolve(R0, X0, r, x, Zreq) {
      const a = r * r + x * x, b = 2 * (R0 * r + X0 * x), c = R0 * R0 + X0 * X0 - Zreq * Zreq;
      if (c > 1e-15) return null;
      if (a <= 0) return Infinity;
      return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    }
    function lvNeutralization(inp) {
      const k = Number(NZ.sc_factor), U = Number(NZ.U_phase);
      const trKva = Math.trunc(Number(inp.tr_kva) || 0), tr = TR[trKva];
      if (!tr || tr.RM === null || tr.RM === undefined || !tr.standard) return { ok: false, tr_kva: trKva, text: "Επιλέξτε τυποποιημένο Μ/Σ δικτύου (50 / 100 / 160 / 250 / 400 / 630 / 1000 kVA)." };
      const sup = NZ_SUP[inp.supply || "C_2x6"] || NZ_SUP.C_2x6;
      const Lp = sup.key === "NONE" ? 0 : ((inp.Lp_m === null || inp.Lp_m === undefined) ? Number(NZ.Lp_default_m) : Math.max(0, Number(inp.Lp_m) || 0));
      const fuseIn = inp.fuse ? Math.trunc(Number(inp.fuse)) : null;
      const RM = tr.RM / 1000, XM = tr.XM / 1000;
      const secsIn = (inp.sections || []).filter(s => s && COND[s.cond] && COND[s.cond].R_sc !== null && COND[s.cond].R_sc !== undefined && (Number(s.L_m) || 0) > 0);
      const sections = []; let Rc = RM, Xc = XM, Ltot = 0;
      secsIn.forEach((s, i) => {
        const c = COND[s.cond], L = Number(s.L_m);
        const dR = 2 * L / 1000 * c.R_sc, dX = 2 * L / 1000 * c.X_sc;
        Rc += dR; Xc += dX; Ltot += L;
        const Zc = Math.sqrt(Rc * Rc + Xc * Xc), Ic = U / Zc;
        let fm = 0; for (const f of FUSES) if (k * f <= Ic + 1e-9) fm = Math.max(fm, f);
        sections.push({ i: i + 1, cond: c.key, name: c.name, L_m: L, R_sc: c.R_sc, X_sc: c.X_sc, dR, dX, R_cum: Rc, X_cum: Xc, Z_cum: Zc, Ik: Ic, fuse_max: fm || null, L_cum: Ltot });
      });
      const n = sections.length;
      const Rline = Rc - RM, Xline = Xc - XM;
      const Rsup = 2 * Lp / 1000 * sup.R, Xsup = 2 * Lp / 1000 * (sup.X || 0);
      const Rtot = Rc + Rsup, Xtot = Xc + Xsup;
      const Z = Math.sqrt(Rtot * Rtot + Xtot * Xtot), Ik = U / Z;
      let fuseMax = 0; for (const f of FUSES) if (k * f <= Ik + 1e-9) fuseMax = Math.max(fuseMax, f);
      const fuseTr = fuseMax ? Math.min(fuseMax, tr.max_lv_fuse) : 0;
      let fuseChk = null;
      if (fuseIn) fuseChk = { fuse: fuseIn, I_req: k * fuseIn, ok: k * fuseIn <= Ik + 1e-9, ratio: Ik / fuseIn, over_tr: fuseIn > tr.max_lv_fuse };
      const fRef = fuseIn || fuseTr;
      let Lextra = null;
      if (n && fRef) {
        const c = COND[sections[n - 1].cond];
        const Le = lmaxSolve(Rtot, Xtot, 2 * c.R_sc / 1000, 2 * c.X_sc / 1000, U / (k * fRef));
        Lextra = Le === null ? null : Math.max(0, Le);
      }
      const R0 = RM + Rsup, X0 = XM + Xsup;
      const lmax = NZ_COND.map(c => ({ cond: c.key, name: c.name, L: FUSES.map(f => lmaxSolve(R0, X0, 2 * c.R_sc / 1000, 2 * c.X_sc / 1000, U / (k * f))) }));
      const warnings = [];
      if (Ltot > NZ.max_length_m) warnings.push(`Μήκος γραμμής ${vf(Ltot, 0)} m > ${NZ.max_length_m} m (πρακτικό όριο δικτύων ΧΤ – Πίν. Β2-10).`);
      if (fuseMax && fuseMax > tr.max_lv_fuse) warnings.push(`Η ασφάλεια περιορίζεται από τον Μ/Σ ${trKva} kVA: μέγιστη ασφάλεια ΧΤ ${tr.max_lv_fuse} A (Πίν. Β2-8).`);
      if (fuseChk && fuseChk.over_tr) warnings.push(`Η ασφάλεια ${fuseIn} A υπερβαίνει τη μέγιστη ασφάλεια ΧΤ του Μ/Σ (${tr.max_lv_fuse} A).`);
      if (!n) warnings.push("Δεν έχουν οριστεί τμήματα γραμμής – ο έλεγχος αφορά βραχυκύκλωμα στον ζυγό ΧΤ του Μ/Σ (+ παροχή).");
      const status = fuseChk ? (fuseChk.ok ? "ΚΑΛΥΠΤΕΤΑΙ" : "ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ") : (fuseTr ? "ΚΑΛΥΠΤΕΤΑΙ" : "ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ");
      const supTxt = sup.key !== "NONE" ? `παροχή ${sup.label.split(" (")[0]} ${vf(Lp, 0)} m` : "χωρίς παροχή (βραχυκύκλωμα στο άκρο της γραμμής)";
      const res = fuseTr ? `Μεγαλύτερη τυποπ. ασφάλεια για τη συνθήκη ουδετέρωσης: ${fuseTr} A` + (fuseMax > tr.max_lv_fuse ? ` (από Ιβρ: ${fuseMax} A, όριο Μ/Σ ${tr.max_lv_fuse} A)` : "")
        : `ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ Η ΣΥΝΘΗΚΗ ΟΥΔΕΤΕΡΩΣΗΣ ΟΥΤΕ ΜΕ ΑΣΦΑΛΕΙΑ ΤΩΝ ${FUSES[0]} Α (3 × ${FUSES[0]} = ${Math.trunc(k * FUSES[0])} A > Ιβρ)`;
      const text = `Μ/Σ ${trKva} kVA · ${n} τμήμα${n !== 1 ? "τα" : ""} ${vf(Ltot, 0)} m · ${supTxt} → Z = ${vf(Z, 4)} Ω, Ιβρ = ${vf(Ik, 0)} A · ${res}`
        + (fuseChk ? ` · υπάρχουσα ασφάλεια ${fuseIn} A: ${fuseChk.ok ? "ΚΑΛΥΠΤΕΤΑΙ" : "ΔΕΝ ΚΑΛΥΠΤΕΤΑΙ"} (3 × ${fuseIn} = ${Math.trunc(k * fuseIn)} A ${fuseChk.ok ? "≤" : ">"} ${vf(Ik, 0)} A)` : "");
      const steps = [`RM + jXM του Μ/Σ ${trKva} kVA = ${vf(RM * 1000, 1)} + j${vf(XM * 1000, 1)} mΩ (Πίν. Β2-9Α).`];
      for (const x of sections)
        steps.push(`Τμήμα ${x.i}: ${x.name} ${vf(x.L_m, 0)} m → R = 2·${vf(x.L_m / 1000, 3)}·${gf(x.R_sc)} = ${vf(x.dR * 1000, 1)} mΩ, X = 2·${vf(x.L_m / 1000, 3)}·${gf(x.X_sc)} = ${vf(x.dX * 1000, 1)} mΩ `
          + `→ στο άκρο του τμήματος Z = ${vf(x.Z_cum, 4)} Ω, Ιβρ = ${vf(x.Ik, 0)} A` + (x.fuse_max ? ` (ασφάλεια ≤ ${x.fuse_max} A)` : " (καμία ασφάλεια)") + ".");
      if (sup.key !== "NONE") steps.push(`Παροχή ${sup.label} ${vf(Lp, 0)} m: R = 2·${vf(Lp / 1000, 3)}·${gf(sup.R)} = ${vf(Rsup * 1000, 1)} mΩ` + (Xsup ? `, X = ${vf(Xsup * 1000, 1)} mΩ` : " (X αμελητέα)") + ".");
      steps.push(`Σύνολο: R = ${vf(Rtot * 1000, 1)} mΩ, X = ${vf(Xtot * 1000, 1)} mΩ → Z = √(R² + X²) = ${vf(Z, 4)} Ω → Ιβρ = ${gf(U)} / Z = ${vf(Ik, 0)} A.`);
      steps.push(`Συνθήκη Ιβρ ≥ ${gf(k)}·Ιασφ → Ιασφ ≤ ${vf(Ik / k, 0)} A → ` + (fuseMax ? `μεγαλύτερη τυποποιημένη ασφάλεια ${fuseMax} A` + (fuseTr !== fuseMax ? `, περιορισμός Μ/Σ → ${fuseTr} A` : "") : `δεν καλύπτεται ούτε η ασφάλεια ${FUSES[0]} A`) + ".");
      if (Lextra !== null && n) steps.push(`Με ασφάλεια ${fRef} A η γραμμή μπορεί να επεκταθεί με ${sections[n - 1].name} κατά ≤ ${vf(Lextra, 0)} m ακόμη (ίδια παροχή στο άκρο).`);
      return { ok: true, tr_kva: trKva, RM: tr.RM, XM: tr.XM, max_lv_fuse: tr.max_lv_fuse, supply: sup.key, supply_label: sup.label, Rp: sup.R, Xp: sup.X || 0, Lp_m: Lp,
        n, sections, L_total: Ltot, R_line: Rline, X_line: Xline, R_sup: Rsup, X_sup: Xsup, R: Rtot, X: Xtot, Z, Ik, k,
        fuse_max: fuseMax || null, fuse_tr: fuseTr || null, fuse_check: fuseChk, f_ref: fRef || null, L_extra: Lextra, status, result: res,
        lmax, fuses: FUSES.slice(), warnings, steps, text };
    }

    return { D, SUP, CAB, COND, TR, CASES, MD, USE_TYPES, LINK_ITEM, LINK_OPTIONS, kn, worstPhase1f, clusterLoad, selectCable, resolveCable, cableUnit, ugCables, supplyType, meterBoard, mdProposal, cableLength, bom, stdFuse, feederSizing, feederCheck, feederCapacity, mvCustomer, mvMetering, spanCheck, serviceClearances, ysFuses, VD, VD_COND, VD_VOLT, vdK, vdrop, EARTH, rodResistance, neutralEarthing, NZ, lvNeutralization, design };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { makeEngine2 };
  else root.ENGINE2 = { makeEngine2 };
})(typeof self !== "undefined" ? self : this);
