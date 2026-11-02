/* Αναγνώριση κατασκευής στύλου από φωτογραφία πεδίου – Connexion Engineering.
   Μηχανή συμπερασμού MobileNetV2 (ImageNet, ONNX model zoo) σε καθαρή JavaScript (χωρίς WebAssembly / εξωτερικές βιβλιοθήκες – δουλεύει
   σε file://, http://localhost και στη δημοσιευμένη σελίδα): το διάνυσμα χαρακτηριστικών 1280-δ της φωτογραφίας συγκρίνεται (συνημίτονο) με
   τα διανύσματα των 65 φωτογραφιών των «Συνηθέστερων κατασκευών» (ΔΕΔΔΗΕ GIS 11/2022) → πιο όμοιες κατασκευές, κωδικοί ΕΤΚΔ και πιθανός
   συνδυασμός ΜΤ + ΧΤ στον στύλο. Προαιρετικά συνεργάζεται με AI agent (Anthropic Claude – Messages API, κλειδί του χρήστη).
   Αρχεία: vision/mnv2.json + vision/mnv2.bin (βάρη int8/κανάλι, κλίμακες & πολώσεις float32 – από το src/build_vision.py), vision/refs.json.
   Ο έλεγχος JS ↔ onnxruntime γίνεται από το src/verify_vision.py. */
(function () {
  "use strict";
  const V = window.VISION = {};
  const l2n = v => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[i]; s = Math.sqrt(s) || 1; const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] / s; return o; };
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const ROOT = (typeof document !== "undefined" && document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, "") : "";
  const url = f => (ROOT ? ROOT : "") + "vision/" + f;
  let META = null, BIN = null, REFS = null, LAYERS = null, MU = null;
  /** Αποκωδικοποίηση διανύσματος {s: κλίμακα, b: base64 int8} (ή απλής λίστας). */
  function dq(e) {
    if (Array.isArray(e)) return Float32Array.from(e);
    const bin = atob(e.b), n = bin.length, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let c = bin.charCodeAt(i); if (c > 127) c -= 256; out[i] = c * e.s; }
    return out;
  }
  V.dq = dq;
  const cen = v => { if (!v) return null; if (!MU) return l2n(v); const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] - MU[i]; return l2n(o); };
  V.state = { loaded: false, loading: false };

  // ---------------------------------------------------------------- φόρτωση (fetch → XHR για file://)
  function xhr(u, type) {
    return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open("GET", u); x.responseType = type; x.onload = () => (x.status === 200 || x.status === 0) && x.response ? res(x.response) : rej(new Error("HTTP " + x.status)); x.onerror = () => rej(new Error("xhr")); x.send(); });
  }
  async function getBin(u) { try { const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); return await r.arrayBuffer(); } catch (e) { return xhr(u, "arraybuffer"); } }
  async function getJson(u) { try { const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); } catch (e) { return xhr(u, "json"); } }
  function prepare(meta, bin, refs) {
    META = meta; BIN = bin; REFS = refs;
    LAYERS = meta.layers.map(L => {
      if (L.t !== "conv") return Object.assign({}, L);
      const q = new Int8Array(bin, L.w_off, L.w_len);
      const sc = new Float32Array(bin.slice(L.sc_off, L.sc_off + 4 * L.o));
      const b = new Float32Array(bin.slice(L.b_off, L.b_off + 4 * L.o));
      const per = L.w_len / L.o;                       // βάρη ανά κανάλι εξόδου (I/g · k · k)
      const w = new Float32Array(L.w_len);
      for (let oc = 0; oc < L.o; oc++) { const s = sc[oc], base = oc * per; for (let j = 0; j < per; j++) w[base + j] = q[base + j] * s; }
      return Object.assign({}, L, { w, b });
    });
    // πόσες φορές χρησιμοποιείται κάθε τανυστής (για απελευθέρωση μνήμης)
    const uses = {};
    LAYERS.forEach(L => (Array.isArray(L.in) ? L.in : [L.in]).forEach(n => uses[n] = (uses[n] || 0) + 1));
    LAYERS.uses = uses;
    if (REFS) {
      // κεντράρισμα (αφαίρεση του μέσου διανύσματος των αναφορών) – αυξάνει τη διακριτική ικανότητα του συνημιτόνου
      MU = REFS.mu ? dq(REFS.mu) : null;
      REFS.items.forEach(it => { it.v = cen(dq(it.emb)); it.vt = it.emb_top ? cen(dq(it.emb_top)) : it.v; it.vs = Object.values(it.views || {}).map(e => cen(dq(e))).concat([it.vt]); });
    }
    V.state.loaded = true; V.state.loading = false;
  }
  V.prepare = prepare;
  function b64bin(b64) { const bin = atob(b64), n = bin.length, out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i); return out.buffer; }
  function loadScript(u) {
    return new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = u; sc.async = true; sc.onload = () => res(true); sc.onerror = () => rej(new Error("script " + u)); document.head.appendChild(sc); });
  }
  V.load = async function (progress) {
    if (V.state.loaded) return true;
    if (V.state.loading) { while (V.state.loading) await new Promise(r => setTimeout(r, 120)); return V.state.loaded; }
    V.state.loading = true;
    try {
      progress && progress("φόρτωση μοντέλου (3 MB)…", 0.05);
      if (!window.VISION_DATA) {
        try { await loadScript(url("mnv2_data.js")); } catch (e) { /* fallback: ξεχωριστά αρχεία */ }
      }
      let meta, bin, refs;
      if (window.VISION_DATA) { meta = window.VISION_DATA.meta; refs = window.VISION_DATA.refs; progress && progress("αποκωδικοποίηση βαρών…", 0.18); bin = b64bin(window.VISION_DATA.bin); window.VISION_DATA = null; }
      else { [meta, bin, refs] = await Promise.all([getJson(url("mnv2.json")), getBin(url("mnv2.bin")), getJson(url("refs.json"))]); }
      progress && progress("προετοιμασία βαρών…", 0.25);
      prepare(meta, bin, refs);
      return true;
    } catch (e) { V.state.loading = false; V.state.error = String(e && e.message || e); return false; }
  };

  // ---------------------------------------------------------------- συνέλιξη
  function conv(x, L) {
    const O = L.o, I = L.i, k = L.k, s = L.s, p = L.p, g = L.g, H = x.h, Wd = x.w, cin = x.c, xd = x.d, wgt = L.w, bias = L.b;
    const Ho = Math.floor((H + 2 * p - k) / s) + 1, Wo = Math.floor((Wd + 2 * p - k) / s) + 1;
    const out = new Float32Array(O * Ho * Wo);
    if (k === 1 && g === 1 && s === 1) {
      const hw = H * Wd;
      for (let oc = 0; oc < O; oc++) {
        const ob = oc * hw, bo = bias[oc], wb = oc * I;
        out.fill(bo, ob, ob + hw);
        for (let ic = 0; ic < I; ic++) {
          const wv = wgt[wb + ic]; if (wv === 0) continue;
          const ib = ic * hw;
          for (let q = 0; q < hw; q++) out[ob + q] += wv * xd[ib + q];
        }
      }
    } else if (g === cin && g === O) {
      for (let c = 0; c < O; c++) {
        const ib = c * H * Wd, ob = c * Ho * Wo, wb = c * k * k, bo = bias[c];
        for (let oy = 0; oy < Ho; oy++) {
          const iy0 = oy * s - p;
          for (let ox = 0; ox < Wo; ox++) {
            const ix0 = ox * s - p; let acc = bo;
            for (let ky = 0; ky < k; ky++) {
              const iy = iy0 + ky; if (iy < 0 || iy >= H) continue;
              const rb = ib + iy * Wd, wr = wb + ky * k;
              for (let kx = 0; kx < k; kx++) { const ix = ix0 + kx; if (ix < 0 || ix >= Wd) continue; acc += wgt[wr + kx] * xd[rb + ix]; }
            }
            out[ob + oy * Wo + ox] = acc;
          }
        }
      }
    } else {
      const ipg = cin / g, opg = O / g;
      for (let oc = 0; oc < O; oc++) {
        const grp = Math.floor(oc / opg), ob = oc * Ho * Wo, bo = bias[oc];
        for (let oy = 0; oy < Ho; oy++) for (let ox = 0; ox < Wo; ox++) {
          let acc = bo;
          for (let icl = 0; icl < ipg; icl++) {
            const ic = grp * ipg + icl, ib = ic * H * Wd, wb = (oc * ipg + icl) * k * k;
            for (let ky = 0; ky < k; ky++) {
              const iy = oy * s - p + ky; if (iy < 0 || iy >= H) continue;
              for (let kx = 0; kx < k; kx++) { const ix = ox * s - p + kx; if (ix < 0 || ix >= Wd) continue; acc += wgt[wb + ky * k + kx] * xd[ib + iy * Wd + ix]; }
            }
          }
          out[ob + oy * Wo + ox] = acc;
        }
      }
    }
    return { c: O, h: Ho, w: Wo, d: out };
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /** Εκτέλεση του δικτύου σε κανονικοποιημένο τανυστή NCHW (Float32Array 3·S·S) → Float32Array(1280). */
  V.forward = async function (input, progress) {
    const S = META.size;
    const T = new Map(); T.set(META.input, { c: 3, h: S, w: S, d: input });
    const left = Object.assign({}, LAYERS.uses);
    const take = n => { const t = T.get(n); if (--left[n] <= 0) T.delete(n); return t; };
    let out = null;
    for (let li = 0; li < LAYERS.length; li++) {
      const L = LAYERS[li];
      let y;
      if (L.t === "conv") y = conv(take(L.in), L);
      else if (L.t === "clip") { const x = take(L.in); const d = x.d, lo = L.lo, hi = L.hi; for (let i = 0; i < d.length; i++) { const v = d[i]; d[i] = v < lo ? lo : (v > hi ? hi : v); } y = x; }
      else if (L.t === "add") { const a = take(L.in[0]), b = take(L.in[1]); const d = new Float32Array(a.d.length); for (let i = 0; i < d.length; i++) d[i] = a.d[i] + b.d[i]; y = { c: a.c, h: a.h, w: a.w, d }; }
      else if (L.t === "gap") { const x = take(L.in); const hw = x.h * x.w, d = new Float32Array(x.c); for (let c = 0; c < x.c; c++) { let acc = 0; const b = c * hw; for (let q = 0; q < hw; q++) acc += x.d[b + q]; d[c] = acc / hw; } y = { c: x.c, h: 1, w: 1, d }; out = d; }
      T.set(L.out, y);
      if (progress && (li % 9 === 0)) { progress(null, li / LAYERS.length); await sleep(0); }
    }
    return out;
  };

  /** Καθρέφτης (αριστερά–δεξιά) πίνακα εικόνας S·S με stride κανάλια. */
  V.flip = function (rgb, stride) {
    const S = META.size, out = new Uint8ClampedArray(rgb.length);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = (y * S + x) * stride, b = (y * S + (S - 1 - x)) * stride; for (let c = 0; c < stride; c++) out[a + c] = rgb[b + c]; }
    return out;
  };
  /** RGB (Uint8ClampedArray S·S·3 ή S·S·4) → NCHW κανονικοποιημένο. */
  V.normalize = function (rgb, stride) {
    const S = META.size, n = S * S, out = new Float32Array(3 * n), m = META.mean, sd = META.std;
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgb[i * stride + c] / 255 - m[c]) / sd[c];
    return out;
  };
  V.l2n = l2n; V.dot = dot; V.cen = v => cen(v);

  // ---------------------------------------------------------------- αποκόμματα εικόνας (canvas)
  function cropTo(img, sx, sy, sw, sh) {
    const S = META.size, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, S, S);
    return ctx.getImageData(0, 0, S, S).data;      // RGBA
  }
  /** Τα αποκόμματα της φωτογραφίας: center / top / squash (όπως στο build_vision.py). */
  V.crops = function (img, focus) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(w, h);
    const out = {};
    out.center = cropTo(img, (w - s) / 2, (h - s) / 2, s, s);
    out.top = h > w ? cropTo(img, (w - s) / 2, 0, s, s) : out.center;
    out.squash = cropTo(img, 0, 0, w, h);
    if (focus === "upper") out.upper = h > w ? cropTo(img, (w - s) / 2, 0, s, Math.max(s * 0.6, h * 0.55)) : cropTo(img, w / 2 - h * 0.35, 0, h * 0.7, h * 0.7);
    return out;
  };

  // ---------------------------------------------------------------- ομοιότητα με τις κατασκευές αναφοράς
  const MV_SECS = [0, 1];
  V.match = function (q, k, filter) {
    // ομοιότητα = το μέγιστο συνημίτονο μεταξύ των διανυσμάτων της φωτογραφίας (μέσος όρος, κορυφή) και των όψεων της αναφοράς (μέσος όρος, κέντρο, κορυφή, όλη, κάτω)
    const res = REFS.items.map(it => { let s = dot(q.avg, it.v); (it.vs || []).forEach(v => { s = Math.max(s, dot(q.avg, v)); if (q.top) s = Math.max(s, dot(q.top, v)); }); return { it, s, sa: dot(q.avg, it.v), st: q.top ? dot(q.top, it.vt) : null }; })
      .filter(r => !filter || filter(r.it)).sort((a, b) => b.s - a.s);
    // μία γραμμή ανά κατασκευή (οι δεύτερες φωτογραφίες -b συγχωνεύονται)
    const seen = new Set(), out = [];
    for (const r of res) { const key = r.it.sec + ":" + r.it.idx; if (seen.has(key)) continue; seen.add(key); out.push(r); if (out.length >= (k || 6)) break; }
    return out;
  };
  /** Πλήρης ανάλυση: embeddings των αποκομμάτων → κατάταξη + συνδυασμός ΜΤ / ΧΤ. */
  V.analyze = async function (img, opts, progress) {
    opts = opts || {};
    const cr = V.crops(img, opts.focus);
    const want = opts.focus === "whole" ? ["squash", "center"] : (opts.focus === "upper" ? ["upper", "top"] : ["center", "top"]);
    const embs = {};
    let i = 0;
    const steps = want.length * (opts.flip === false ? 1 : 2);
    let st = 0;
    for (const name of want) {
      const views = opts.flip === false ? [cr[name]] : [cr[name], V.flip(cr[name], 4)];
      const acc = new Float32Array(META.dim);
      for (const rgb of views) {
        progress && progress(`ανάλυση αποκόμματος «${name}»${views.length > 1 ? (rgb === cr[name] ? "" : " (καθρέφτης)") : ""} (${st + 1}/${steps})…`, 0.3 + 0.6 * st / steps);
        const e = l2n(await V.forward(V.normalize(rgb, 4), (msg, f) => progress && progress(null, 0.3 + 0.6 * (st + f) / steps)));
        for (let j = 0; j < e.length; j++) acc[j] += e[j];
        st++;
      }
      embs[name] = l2n(acc);
      i++;
    }
    const sum = new Float32Array(META.dim); Object.values(embs).forEach(e => { for (let j = 0; j < e.length; j++) sum[j] += e[j]; });
    const q = { avg: cen(l2n(sum)), top: cen(embs.top || embs.upper || null), raw: { avg: l2n(sum) }, embs };
    const ranked = V.match(q, opts.k || 6);
    const mv = V.match({ avg: q.top || q.avg, top: q.top }, 3, it => MV_SECS.includes(it.sec));
    const lv = V.match({ avg: q.avg, top: null }, 3, it => !MV_SECS.includes(it.sec));
    return { ranked, mv, lv, q, crops: cr, used: want };
  };
  V.refs = () => REFS;
  V.meta = () => META;
  V.MV_SECS = MV_SECS;

  // ---------------------------------------------------------------- AI agent (Anthropic Claude – Messages API, κλειδί του χρήστη)
  V.aiPrompt = function (analysis, pole) {
    const cat = REFS.items.filter(it => !/-b$/.test(it.id)).map(it => `${it.code} [${it.sec_title}] – ${it.desc} (ΕΤΚΔ: ${(it.etkd || []).join(", ")})`).join("\n");
    const hints = analysis ? analysis.ranked.map(r => `${r.it.code} (ομοιότητα ${r.s.toFixed(2)})`).join(", ") : "—";
    return `Είσαι μηχανικός δικτύων διανομής ΔΕΔΔΗΕ. Στη φωτογραφία πεδίου φαίνεται στύλος (ή τμήμα) δικτύου ΜΤ / ΧΤ. Αναγνώρισε τις τυποποιημένες κατασκευές του ΕΤΚΔ που φαίνονται (ΜΤ: P-…, ΧΤ: S-…, υπόγεια U-…, μετασχηματιστές/Υ-Σ, επίτονοι, παροχές, φωτιστικά) χρησιμοποιώντας ΜΟΝΟ τον παρακάτω κατάλογο των συνηθέστερων κατασκευών (κωδικός [ενότητα] – περιγραφή (σχέδια ΕΤΚΔ)). Κανόνες: ξύλινος στύλος → βασικοί κωδικοί, τσιμεντένιος → +100 (P-3II → P-103II, S-13 → S-113)· «II» = διπλή στήριξη σε 2 μονωτήρες ανά αγωγό· μεταλλικοί βραχίονες σε ξύλινο → +400 (P-403II)· στη ΧΤ το 5x = πλήθος αγωγών. Στύλος κατά τον χρήστη: ${pole || "άγνωστο"}. Ενδείξεις από την ανάλυση ομοιότητας της εφαρμογής (ImageNet features, μόνο ως υπόδειξη): ${hints}.
Απάντησε ΑΥΣΤΗΡΑ σε JSON (χωρίς άλλο κείμενο) με τη μορφή:
{"pole": {"material": "ξύλινος|τσιμεντένιος|μεταλλικός|άγνωστο", "type": "σύντομη περιγραφή του στύλου"},
 "constructions": [{"code": "κωδικός από τον κατάλογο", "etkd": ["σχέδια ΕΤΚΔ"], "confidence": 0.0-1.0, "evidence": "τι φαίνεται στη φωτογραφία που το στηρίζει"}],
 "combination": "ο πιθανός συνδυασμός κατασκευών στον στύλο σε μία γραμμή (π.χ. P-3II + 5x(S-3) + S-25A)",
 "uncertain": "τι δεν διακρίνεται / τι να φωτογραφηθεί καλύτερα",
 "notes": "σύντομες παρατηρήσεις (μονωτήρες, βραχίονες, επίτονοι, Μ/Σ, ΣΚ, παροχές)"}
ΚΑΤΑΛΟΓΟΣ:
${cat}`;
  };
  V.askAI = async function (dataUrl, analysis, cfg) {
    const key = (cfg.key || "").trim(), model = (cfg.model || "claude-sonnet-5-5").trim();
    if (!key) throw new Error("Δώστε κλειδί API (Anthropic).");
    const b64 = dataUrl.split(",")[1], mime = (dataUrl.match(/^data:([^;]+);/) || [])[1] || "image/jpeg";
    const body = { model, max_tokens: 1500, system: "Απαντάς μόνο με έγκυρο JSON, στα ελληνικά, χωρίς markdown.",
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: b64 } }, { type: "text", text: V.aiPrompt(analysis, cfg.pole) }] }] };
    const r = await fetch((cfg.endpoint || "https://api.anthropic.com") + "/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(body) });
    const txt = await r.text();
    if (!r.ok) throw new Error(`API ${r.status}: ${txt.slice(0, 300)}`);
    const j = JSON.parse(txt);
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    const m = text.match(/\{[\s\S]*\}/);
    let parsed = null; try { parsed = m ? JSON.parse(m[0]) : null; } catch (e) { parsed = null; }
    return { text, parsed, usage: j.usage || null, model: j.model || model };
  };
})();
