/* ΟΔ.26 (3η έκδοση 07/2025) – LV cable selection engine (JavaScript).
   Mirrors engine.py exactly. Data object D is injected (data.json). */
(function (root) {
  "use strict";

  function makeEngine(D) {
    const FAM = {}, MET = {}, XVII = {}, XVIII = {};
    D.families.forEach(f => FAM[f.code] = f);
    D.methods.forEach(m => MET[m.code] = m);
    D.table_XVII.methods.forEach(m => XVII[m.code] = m);
    D.table_XVIII.methods.forEach(m => XVIII[m.code] = m);

    const key = v => {
      const n = Number(v);
      if (!isNaN(n) && Number.isInteger(n)) return String(n);
      return String(v);
    };

    function airGroupFactor(famCode, mode, trays, circuits) {
      const fam = FAM[famCode];
      if (!mode || mode === "NONE") return [1.0, ""];
      if (famCode === "F5") return [1.0, "Η ΟΔ.26 δεν προβλέπει συντελεστή ομαδοποίησης για συνεστραμμένα καλώδια (Πίν. VII) – εφαρμόστηκε 1,00."];
      const tab = fam.multicore ? D.table_XVII : D.table_XVIII;
      const mm = fam.multicore ? XVII : XVIII;
      const name = fam.multicore ? "XVII" : "XVIII";
      if (!mm[mode]) return [null, `Η διάταξη ${mode} δεν ανήκει στον Πίνακα ${name} για αυτή την οικογένεια καλωδίων.`];
      const row = mm[mode].trays[key(trays)];
      if (!row) return [null, `Πίν. ${name}: δεν δίνεται τιμή για ${trays} σχάρες στη διάταξη αυτή.`];
      const ci = tab.circuits.indexOf(Number(circuits));
      if (ci < 0) return [null, `Πίν. ${name}: δεν δίνεται τιμή για ${circuits} κυκλώματα.`];
      const val = row[ci];
      if (val === null || val === undefined) return [null, `Πίν. ${name}: δεν δίνεται τιμή για ${circuits} κυκλώματα σε ${trays} σχάρες (–).`];
      return [val, ""];
    }

    function baseCurrent(famCode, sz, metCode, nPipes) {
      const fam = FAM[famCode], m = MET[metCode];
      if (m.column === "ground") {
        return [sz.ground, 1.0, sz.ground === null ? "Δεν δίνεται τιμή «στο έδαφος» στην ΟΔ.26 για τη διατομή αυτή." : ""];
      }
      if (m.column === "pipe") {
        if (sz.ground === null) return [null, null, "Δεν προβλέπεται υπόγεια τοποθέτηση για τη διατομή/οικογένεια αυτή."];
        const k = D.table_XVI[key(nPipes)];
        if (fam.multicore) {
          if (Number(nPipes) === 1) {
            if (sz.pipe1 === null) return [null, null, "Δεν δίνεται τιμή «σε σωλήνα > 6 m» στην ΟΔ.26 για τη διατομή αυτή."];
            return [sz.pipe1, 1.0, "Τιμή στήλης «σε σωλήνες > 6 m» του πίνακα (= έδαφος × 0,82, Πίν. XVI)."];
          }
          if (k === undefined) return [null, null, "Πίν. XVI: δεν δίνεται συντελεστής για αυτό το πλήθος σωλήνων."];
          return [sz.ground, k, `Έδαφος × συντελεστής Πίν. XVI για ${nPipes} σωλήνες (${k}).`];
        }
        if (k === undefined) return [null, null, "Πίν. XVI: δεν δίνεται συντελεστής για αυτό το πλήθος σωλήνων."];
        return [sz.ground, D.single_core_touching_factor * k, `Μονοπολικά σε σωλήνα: 0,85 (ομάδα σε επαφή) × Πίν. XVI (${k}).`];
      }
      if (m.column === "air_free") {
        if (sz.air_free === null) return [null, null, "Δεν δίνεται τιμή «στον αέρα» για τη διατομή αυτή."];
        return [sz.air_free, 1.0, ""];
      }
      if (m.column === "air_wall") {
        if (sz.air_wall === null) return [null, null, "Η ΟΔ.26 δεν δίνει τιμή «επιτοίχια» για αυτή την οικογένεια – επιλέξτε «Στον αέρα – ελεύθερα»."];
        return [sz.air_wall, 1.0, ""];
      }
      throw new Error(metCode);
    }

    function kShortCircuit(ins, mat, preload, theta0) {
      const a2 = D.table_A2[ins], xx = D.table_XX[mat];
      if (preload === null || preload === undefined || preload >= 1.0 || theta0 === null || theta0 === undefined) {
        return [a2.K[mat], a2.theta_a, "Πίν. Α2"];
      }
      const theta1 = theta0 + (a2.theta_a - theta0) * preload * preload;
      const K = xx.K1 * Math.pow(Math.log((a2.theta_t + xx.B0) / (theta1 + xx.B0)), -0.5);
      return [K, theta1, "Τύπος (7.9) με θ1 από (7.7)"];
    }

    function timeConstantMin(mat, s) {
      const v = D.table_A1_minutes[mat][key(s)];
      return v === undefined ? null : v;
    }

    function overloadCheck(Iz, Tmin, Iov, t, Ipre) {
      const out = { applicable: false };
      if (Iz === null || Tmin === null || Iov === null || Iov === undefined || t === null || t === undefined || !(t > 0)) return out;
      const T = Tmin * 60.0, nReq = Iov / Iz, a = (Ipre || 0) / Iz;
      Object.assign(out, { applicable: true, T_min: Tmin, n_req: nReq, a });
      if (a >= 1.0) { Object.assign(out, { ok: false, n_allowed: null, t_allowed_s: 0, note: "Η προφόρτιση υπερβαίνει την επιτρεπόμενη ένταση." }); return out; }
      const e = Math.exp(-t / T);
      const nAllowed = Math.sqrt(a * a + (1 - a * a) / (1 - e));
      let tAllowed;
      if (nReq <= 1.0) tAllowed = Infinity;
      else { const x = (1 - a * a) / (nReq * nReq - a * a); tAllowed = x < 1 ? -T * Math.log(1 - x) : Infinity; }
      Object.assign(out, { ok: nReq <= nAllowed, n_allowed: nAllowed, t_allowed_s: tAllowed, note: "" });
      return out;
    }

    function periodicCheck(Iz, Tmin, I, t1, t0) {
      const out = { applicable: false };
      if (Iz === null || Tmin === null || I === null || I === undefined || !t1 || !t0 || t1 > t0) return out;
      const T = Tmin * 60.0, sigma = 100.0 * t1 / t0;
      let n, rule;
      if (t0 <= T / 3 && t1 <= T / 20) { n = Math.sqrt(100.0 / sigma); rule = "(6.7): t0 ≤ T/3 και t1 ≤ T/20"; }
      else { n = Math.sqrt((1 - Math.exp(-t0 / T)) / (1 - Math.exp(-(sigma / 100.0) * (t0 / T)))); rule = "n² = (1−e^(−t0/T)) / (1−e^(−(σ/100)(t0/T)))"; }
      Object.assign(out, { applicable: true, T_min: Tmin, sigma_pct: sigma, n, I_allowed: n * Iz, ok: I <= n * Iz, rule });
      return out;
    }

    function voltageDrop(famCode, sz, phases, I, Lm, cosphi, Xassumed) {
      const fam = FAM[famCode], mat = fam.material, ins = fam.insulation;
      const theta = ins === "XLPE" ? D.meta.base_conditions.max_conductor_temp_XLPE_C : D.meta.base_conditions.max_conductor_temp_EPR_C;
      let xix = null;
      if (famCode === "F2") xix = D.table_XIX["3x150 Al + 50 Cu XLPE"];
      else if (famCode === "F5" && sz.s_phase === 70) xix = D.table_XIX["3x70 Al + 54,6 AAAC ΣΚ"];
      else if (famCode === "F5" && sz.s_phase === 120) xix = D.table_XIX["4x120 Al ΣΚ"];
      let R, X, src;
      if (xix) { R = xix.R; X = xix.X; src = "Πίν. XIX ΟΔ.26"; }
      else {
        const R20 = D.iec60228_R20_ohm_per_km[mat][key(sz.s_phase)];
        if (R20 === undefined) return { applicable: false };
        R = R20 * (1 + D.table_XX[mat].alpha20 * (theta - 20));
        X = (Xassumed === null || Xassumed === undefined) ? D.default_reactance_ohm_per_km : Xassumed;
        src = `R: IEC 60228 (R20=${R20} Ω/km) στους ${theta} °C με α20 Πίν. XX· X: παραδοχή ${X} Ω/km`;
      }
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi)), Lkm = Lm / 1000.0;
      let dU, Un;
      if (Number(phases) === 3) { dU = Math.sqrt(3) * I * Lkm * (R * cosphi + X * sinphi); Un = 400; }
      else { dU = 2 * I * Lkm * (R * cosphi + X * sinphi); Un = 230; }
      return { applicable: true, R, X, dU_V: dU, dU_pct: 100 * dU / Un, source: src, theta };
    }

    function loadFromMeters(countsRes, countsCom) {
      const ls = D.load_sheet;
      let resTotal = 0, comTotal = 0, Nres = 0, Ncom = 0;
      ls.types.forEach(t => {
        const cr = Number(countsRes[t.type] || 0), cc = Number(countsCom[t.type] || 0);
        resTotal += cr * t.res_A_per_phase; comTotal += cc * t.com_A_per_phase; Nres += cr; Ncom += cc;
      });
      let kRes, kCom;
      if (Nres === 0) kRes = 1.0; else if (Nres <= 72) kRes = ls.coincidence_residential[String(Nres)]; else kRes = null;
      const cc = ls.coincidence_commercial;
      if (Ncom <= cc.max_count_factor_1) kCom = 1.0; else if (Ncom <= cc.max_count) kCom = cc.factor_above; else kCom = null;
      const IB = (kRes === null || kCom === null) ? null : resTotal * kRes + comTotal * kCom;
      return { res_total: resTotal, com_total: comTotal, N_res: Nres, N_com: Ncom, k_res: kRes, k_com: kCom,
        res_with_k: kRes === null ? null : resTotal * kRes, com_with_k: kCom === null ? null : comTotal * kCom, I_B: IB };
    }

    function requiredCurrent(mode, phases, value, cosphi, supplyNo) {
      phases = Number(phases);
      if (mode === "L2") return Number(value);
      if (mode === "L3") return phases === 3 ? value * 1000 / (Math.sqrt(3) * 400) : value * 1000 / 230;
      if (mode === "L4") return phases === 3 ? value * 1000 / (Math.sqrt(3) * 400 * cosphi) : value * 1000 / (230 * cosphi);
      if (mode === "L5") { const s = D.standard_supplies.find(x => x.no === supplyNo); if (!s) throw new Error(supplyNo); return s.fuse_A; }
      throw new Error(mode);
    }

    function evaluate(inp) {
      const fam = FAM[inp.family], met = MET[inp.method], env = met.env;
      const notes = [];
      let kTemp, kSoil, kGroup, tempSrc, soilSrc, groupSrc;
      if (env === "ground") {
        kTemp = D.table_VIII.ground[key(inp.ground_temp)];
        kSoil = D.table_XIII[key(inp.soil_rho)];
        if (met.column === "ground") {
          if (fam.multicore) { kGroup = D.table_XIV[key(inp.n_trench || 1)]; groupSrc = `Πίν. XIV (${inp.n_trench || 1} καλώδια στο χαντάκι)`; }
          else {
            const touching = (inp.sc_touching === undefined) ? true : !!inp.sc_touching;
            const kt = touching ? D.single_core_touching_factor : 1.0;
            kGroup = kt * D.table_XV[key(inp.n_groups || 1)];
            groupSrc = `${kt !== 1 ? "0,85 (σε επαφή) × " : ""}Πίν. XV (${inp.n_groups || 1} ομάδες)`;
          }
        } else { kGroup = 1.0; groupSrc = "Πίν. XVI (μέσω της βασικής έντασης)"; }
        tempSrc = `Πίν. VIII – θ εδάφους ${inp.ground_temp} °C`;
        soilSrc = `Πίν. XIII – ρ εδάφους ${inp.soil_rho} K·m/W`;
      } else {
        kTemp = D.table_VIII.air[key(inp.air_temp)];
        kSoil = 1.0;
        const mode = inp.air_group_mode || "NONE";
        const [kg, gnote] = airGroupFactor(inp.family, mode, inp.air_trays || 1, inp.air_circuits || 1);
        kGroup = kg; if (gnote) notes.push(gnote);
        groupSrc = mode === "NONE" ? "χωρίς ομαδοποίηση" : (fam.multicore ? "Πίν. XVII" : "Πίν. XVIII");
        tempSrc = `Πίν. VIII – θ αέρα ${inp.air_temp} °C`;
        soilSrc = "—";
      }
      if (fam.code === "F5" && env === "ground") notes.push("Τα συνεστραμμένα καλώδια (Πίν. VII) δίνονται μόνο για τοποθέτηση στον αέρα.");
      if (kTemp === undefined || kSoil === undefined) throw new Error("Μη έγκυρη θερμοκρασία ή θερμική αντίσταση (εκτός πίνακα).");

      const margin = Number(inp.margin_pct || 0), IB = Number(inp.I_B), nPar = Math.max(1, parseInt(inp.n_par || 1, 10)), Ireq = IB * (1 + margin / 100) / nPar, phases = Number(inp.phases || 3);
      const sc = inp.sc || {}, ov = inp.ov || {}, per = inp.per || {}, vd = inp.vd || {};
      let K = null, Smin = null, scInfo = {};
      if (sc.enabled) {
        const theta0 = env === "ground" ? Number(inp.ground_temp) : Number(inp.air_temp);
        const r = (sc.mode || "A2") === "FORMULA" ? Number(sc.preload_ratio === undefined ? 1 : sc.preload_ratio) : 1.0;
        const [kk, theta1, ksrc] = kShortCircuit(fam.insulation, fam.material, r, theta0);
        K = kk; Smin = K * Number(sc.Ik_kA) * Math.sqrt(Number(sc.t_s));
        scInfo = { K, theta1, K_source: ksrc, S_min: Smin };
      }
      const rows = [];
      fam.sizes.forEach(sz => {
        const [base, kPipe, bnote] = baseCurrent(fam.code, sz, met.code, inp.n_pipes || 1);
        const row = { size: sz.size, s_phase: sz.s_phase, phases: sz.phases, selectable: sz.selectable, base, k_pipe: kPipe, note: bnote, d_ext_mm: sz.d_ext_mm, pipe_dia_mm: sz.pipe_dia_mm };
        if (base === null || kGroup === null) Object.assign(row, { I_z: null, util: null, amp_ok: null });
        else { const Iz = base * kPipe * kTemp * kSoil * kGroup; Object.assign(row, { I_z: Iz, util: Iz ? Ireq / Iz : null, amp_ok: Iz >= Ireq }); }
        row.sc_ok = (sc.enabled && Smin !== null) ? sz.s_phase >= Smin : null;
        const Tmin = timeConstantMin(fam.material, sz.s_phase);
        row.T_min = Tmin;
        row.ov = (ov.enabled && row.I_z) ? overloadCheck(row.I_z, Tmin, Number(ov.I_ov), Number(ov.t_s), Number(ov.I_pre || 0)) : { applicable: false };
        row.per = (per.enabled && row.I_z) ? periodicCheck(row.I_z, Tmin, Number(per.I), Number(per.t1_s), Number(per.t0_s)) : { applicable: false };
        if (vd.enabled) {
          row.vd = voltageDrop(fam.code, sz, phases, IB, Number(vd.L_m || 0), Number(vd.cosphi === undefined ? 1 : vd.cosphi), vd.X_assumed === undefined ? null : vd.X_assumed);
          const lim = vd.limit_pct;
          row.vd.ok = (row.vd.applicable && lim !== null && lim !== undefined && lim !== "" && Number(lim) !== 0) ? row.vd.dU_pct <= Number(lim) : null;
        } else row.vd = { applicable: false };
        let ok = row.amp_ok === true && sz.selectable && sz.phases === phases;
        if (ok && row.sc_ok === false) ok = false;
        if (ok && row.ov.applicable && row.ov.ok === false) ok = false;
        if (ok && per.enabled && row.per.applicable && row.per.ok === false) ok = false;
        if (ok && row.vd.ok === false) ok = false;
        if (ok && ov.enabled && !row.ov.applicable) ok = false;
        if (ok && per.enabled && !row.per.applicable) ok = false;
        row.all_ok = ok;
        rows.push(row);
      });
      const cands = rows.filter(r => r.all_ok).sort((a, b) => (a.s_phase - b.s_phase) || (fam.sizes.findIndex(s => s.size === a.size) - fam.sizes.findIndex(s => s.size === b.size)));
      const rec = cands.length ? cands[0] : null;
      if (!rows.some(r => r.phases === phases && r.selectable)) notes.push("Η οικογένεια αυτή δεν διαθέτει διατομές για το επιλεγμένο πλήθος φάσεων.");
      let sel = null;
      if (inp.manual_size) sel = rows.find(r => r.size === inp.manual_size) || null;
      return { family: fam, method: met, env, I_B: IB, I_req: Ireq, margin_pct: margin, phases, n_par: nPar, k_temp: kTemp, k_soil: kSoil, k_group: kGroup,
        temp_src: tempSrc, soil_src: soilSrc, group_src: groupSrc, sc: scInfo, rows, recommended: rec, selected: sel || rec, notes };
    }

    return { D, FAM, MET, evaluate, loadFromMeters, requiredCurrent, kShortCircuit, overloadCheck, periodicCheck, voltageDrop, airGroupFactor, timeConstantMin };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { makeEngine };
  else root.OD26 = { makeEngine };
})(typeof self !== "undefined" ? self : this);
