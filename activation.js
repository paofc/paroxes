/* Ενεργοποίηση εφαρμογής (μία φορά ανά συσκευή) – Connexion Engineering.
   Στην πρώτη εκκίνηση (κινητό, υπολογιστής, σελίδα) η εφαρμογή κλειδώνει: ο χρήστης δίνει όνομα και email, η συσκευή παράγει
   «κωδικό αίτησης» και στέλνεται email έγκρισης στον διαχειριστή (ADMIN_EMAIL) – ο διαχειριστής απαντά με τον «κωδικό έγκρισης»
   (HMAC-SHA256 του κωδικού αίτησης· παράγεται από το πάνελ διαχειριστή της εφαρμογής ή από το src/activation_code.py).
   Μόλις εισαχθεί σωστός κωδικός αποθηκεύεται στη συσκευή (localStorage) και δεν ξαναζητείται.
   Χωρίς εξάρτηση από τα υπόλοιπα αρχεία· window.ACTIVATION = { approvalCode, isActive, info, reset, requestCode }. */
(function () {
  "use strict";
  const ADMIN_EMAIL = "dvrouvas@gmail.com";
  const APP_NAME = "Επιλογή Παροχής ΧΤ – Connexion Engineering";
  const VERSION = "7.3";
  const KEY = "connexion_activation", KEY_REQ = "connexion_act_req";
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";      // 32 σύμβολα χωρίς I/O/0/1
  const SALT = "cx-act-salt-2026";
  const MASTER_HASH = "45f35d531156f3ec5788837065b02ac2230326617fd2b4f9df4274c477c374cf";   // sha256(SALT + master password)
  const SP = [50, 78, 55, 85, 57, 81, 119, 69, 102, 110, 87, 77, 86, 82, 83, 80, 75, 115, 100, 120, 80, 107, 80, 95, 87, 45, 72, 112, 81, 122, 102, 73, 76, 109, 103, 102, 99, 52, 76, 115];
  const SECRET = String.fromCharCode.apply(null, SP);

  // ---------------------------------------------------------------- SHA-256 / HMAC (καθαρή JS – δουλεύει και σε file:// / WebView)
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    const u = unescape(encodeURIComponent(s)), out = new Uint8Array(u.length);
    for (let i = 0; i < u.length; i++) out[i] = u.charCodeAt(i);
    return out;
  }
  function sha256(bytes) {
    const l = bytes.length, padLen = (((l + 9) + 63) >> 6) << 6;
    const m = new Uint8Array(padLen); m.set(bytes); m[l] = 0x80;
    const bits = l * 8;
    m[padLen - 4] = (bits >>> 24) & 255; m[padLen - 3] = (bits >>> 16) & 255; m[padLen - 2] = (bits >>> 8) & 255; m[padLen - 1] = bits & 255;
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let i = 0; i < padLen; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = (m[i + 4 * t] << 24) | (m[i + 4 * t + 1] << 16) | (m[i + 4 * t + 2] << 8) | m[i + 4 * t + 3];
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = [(H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0, (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0];
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) { out[4 * i] = (H[i] >>> 24) & 255; out[4 * i + 1] = (H[i] >>> 16) & 255; out[4 * i + 2] = (H[i] >>> 8) & 255; out[4 * i + 3] = H[i] & 255; }
    return out;
  }
  const hex = b => Array.from(b, x => (x < 16 ? "0" : "") + x.toString(16)).join("");
  function hmac(keyStr, msgStr) {
    let key = utf8(keyStr);
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key);
    const ip = new Uint8Array(64), op = new Uint8Array(64);
    for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    const msg = utf8(msgStr);
    const inner = new Uint8Array(64 + msg.length); inner.set(ip); inner.set(msg, 64);
    const ih = sha256(inner);
    const outer = new Uint8Array(96); outer.set(op); outer.set(ih, 64);
    return sha256(outer);
  }

  // ---------------------------------------------------------------- κωδικοί
  const norm = s => String(s || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
  const group = (s, n) => s.replace(new RegExp(`(.{${n}})(?=.)`, "g"), "$1-");
  function newRequestCode() {
    const b = new Uint8Array(10);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b); else for (let i = 0; i < 10; i++) b[i] = Math.floor(Math.random() * 256);
    let s = "";
    for (let i = 0; i < 10; i++) s += ALPHA[b[i] & 31];
    return s;                                             // 10 σύμβολα, εμφάνιση CX-XXXXX-XXXXX
  }
  const fmtReq = r => "CX-" + group(norm(r).replace(/^CX/, "").slice(0, 10), 5);
  function approvalCode(req) {
    const r = norm(req).replace(/^CX/, "");
    if (r.length !== 10) return "";
    const h = hmac(SECRET, "CONNEXION-ACT-v1|" + r);
    let s = "";
    for (let i = 0; i < 8; i++) s += ALPHA[h[i] & 31];
    return group(s, 4);                                    // XXXX-XXXX
  }
  const sameCode = (a, b) => norm(a) === norm(b) && norm(a).length === 8;

  // ---------------------------------------------------------------- αποθήκευση
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  function readToken() {
    try { const t = JSON.parse(store.get(KEY) || "null"); return t && t.req && t.code && sameCode(approvalCode(t.req), t.code) ? t : null; } catch (e) { return null; }
  }
  function pendingRequest() {
    let r = norm(store.get(KEY_REQ) || "").replace(/^CX/, "");
    if (r.length !== 10) { r = newRequestCode(); store.set(KEY_REQ, r); }
    return r;
  }
  function activate(req, code, name, email, via) {
    const t = { v: 1, req: norm(req).replace(/^CX/, ""), code: norm(code), name: String(name || "").trim(), email: String(email || "").trim(), via: via || "code", date: new Date().toISOString(), app: VERSION };
    if (!sameCode(approvalCode(t.req), t.code)) return false;
    store.set(KEY, JSON.stringify(t)); store.del(KEY_REQ);
    return true;
  }
  const isActive = () => !!readToken();
  const info = () => readToken();
  function reset() { store.del(KEY); store.del(KEY_REQ); if (typeof document !== "undefined") showOverlay(); }
  const deviceLabel = () => { const ua = (typeof navigator !== "undefined" && navigator.userAgent) || ""; const m = /Android|iPhone|iPad|Windows|Mac OS|Linux/.exec(ua); return (m ? m[0] : "συσκευή") + (/Android/.test(ua) ? " (εφαρμογή / κινητό)" : ""); };

  // ---------------------------------------------------------------- οθόνη ενεργοποίησης
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
  function mailText(req, name, email) {
    return `Αίτηση ενεργοποίησης – ${APP_NAME} (έκδοση ${VERSION})\n\nΚωδικός αίτησης: ${fmtReq(req)}\nΧρήστης: ${name}\nEmail χρήστη: ${email}\nΣυσκευή: ${deviceLabel()}\nΗμερομηνία: ${new Date().toLocaleString("el-GR")}\n\nΠαρακαλώ στείλτε μου τον κωδικό έγκρισης για την ενεργοποίηση της εφαρμογής.`;
  }
  function mailtoUrl(req, name, email) {
    const subj = `Connexion – Αίτηση ενεργοποίησης ${fmtReq(req)} (${name})`;
    return `mailto:${ADMIN_EMAIL}?cc=${encodeURIComponent(email)}&subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(mailText(req, name, email))}`;
  }
  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, () => false); } catch (e) { /* fallthrough */ }
    try { const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return Promise.resolve(ok); } catch (e) { return Promise.resolve(false); }
  }
  function showOverlay() {
    if (document.getElementById("act_overlay")) return;
    const req = pendingRequest();
    const saved = (() => { try { return JSON.parse(store.get("connexion_act_form") || "{}"); } catch (e) { return {}; } })();
    const ov = document.createElement("div");
    ov.id = "act_overlay"; ov.setAttribute("lang", "el");
    ov.innerHTML = `<div class="act-card" role="dialog" aria-modal="true" aria-labelledby="act_title">
      <div class="act-head"><div class="act-logo">CX</div><div><div class="act-title" id="act_title">Ενεργοποίηση εφαρμογής</div><div class="act-sub">${esc(APP_NAME)} · έκδοση ${VERSION}</div></div></div>
      <p class="act-p">Η εφαρμογή ενεργοποιείται <b>μία φορά</b> σε κάθε συσκευή (κινητό ή υπολογιστή). Συμπληρώστε τα στοιχεία σας, στείλτε την αίτηση έγκρισης στον διαχειριστή (<b>${esc(ADMIN_EMAIL)}</b>) και εισάγετε τον κωδικό έγκρισης που θα λάβετε. Μετά δεν θα ξαναζητηθεί.</p>
      <div class="act-grid">
        <label>Όνομα χρήστη / γραφείου<input id="act_name" type="text" maxlength="60" placeholder="π.χ. Γραφείο Πολύγυρος – Γιώργος" value="${esc(saved.name || "")}"></label>
        <label>Email χρήστη (για την αποστολή της έγκρισης)<input id="act_email" type="email" maxlength="80" placeholder="name@example.gr" value="${esc(saved.email || "")}"></label>
        <label>Κωδικός αίτησης της συσκευής<span class="act-req" id="act_req">${esc(fmtReq(req))}</span></label>
      </div>
      <div class="act-btns">
        <a class="btn" id="act_mail" href="#" role="button">✉ Αποστολή email έγκρισης στον διαχειριστή</a>
        <button type="button" class="btn secondary" id="act_copy">Αντιγραφή κειμένου αίτησης</button>
      </div>
      <div class="act-hint" id="act_hint">Το κουμπί ανοίγει την εφαρμογή αλληλογραφίας της συσκευής με έτοιμο μήνυμα (προς ${esc(ADMIN_EMAIL)}, με κοινοποίηση σε εσάς)· πατήστε «Αποστολή». Αν δεν υπάρχει εφαρμογή email, αντιγράψτε το κείμενο και στείλτε το με όποιον τρόπο θέλετε.</div>
      <div class="act-grid act-code">
        <label>Κωδικός έγκρισης (από τον διαχειριστή)<input id="act_code" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX"></label>
        <button type="button" class="btn" id="act_go">Ενεργοποίηση</button>
      </div>
      <div class="act-msg" id="act_msg"></div>
      <div class="act-foot"><span class="muted">COPYRIGHT © Δημήτρης Βρούβας (φιλική συμμετοχή Αθηνά)</span><button type="button" class="act-link" id="act_adm_btn">Διαχειριστής</button></div>
      <div class="act-admin hidden" id="act_admin">
        <label>Κωδικός διαχειριστή<input id="act_master" type="password" autocomplete="off" placeholder="master password"></label>
        <div class="act-admin-panel hidden" id="act_admin_panel">
          <label>Κωδικός αίτησης χρήστη<input id="act_adm_req" type="text" maxlength="16" autocapitalize="characters" spellcheck="false" placeholder="CX-XXXXX-XXXXX"></label>
          <div class="act-adm-out">Κωδικός έγκρισης: <b id="act_adm_code">—</b> <button type="button" class="mini" id="act_adm_copy">αντιγραφή</button></div>
          <div class="act-btns"><button type="button" class="btn secondary" id="act_adm_self">Ενεργοποίηση αυτής της συσκευής (διαχειριστής)</button></div>
          <div class="act-hint">Δώστε στον χρήστη τον κωδικό έγκρισης που αντιστοιχεί στον κωδικό αίτησής του (απάντηση στο email του). Ο ίδιος κωδικός παράγεται και με το script src/activation_code.py.</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    document.documentElement.classList.add("act-locked");
    const $ = id => document.getElementById(id);
    const msg = (t, cls) => { const m = $("act_msg"); m.textContent = t; m.className = "act-msg " + (cls || ""); };
    const saveForm = () => store.set("connexion_act_form", JSON.stringify({ name: $("act_name").value.trim(), email: $("act_email").value.trim() }));
    const formOk = () => { const n = $("act_name").value.trim(), e = $("act_email").value.trim(); if (!n) { msg("Συμπληρώστε το όνομα χρήστη / γραφείου.", "warn"); $("act_name").focus(); return false; } if (!emailOk(e)) { msg("Συμπληρώστε έγκυρο email χρήστη.", "warn"); $("act_email").focus(); return false; } return true; };
    // πραγματικός σύνδεσμος mailto: (δουλεύει σε Safari iPhone / PWA, Chrome, WebView Android, παράθυρο εφαρμογής Windows)
    const updMail = () => { $("act_mail").href = mailtoUrl(req, $("act_name").value.trim(), $("act_email").value.trim()); };
    ["act_name", "act_email"].forEach(id => $(id).addEventListener("input", updMail));
    updMail();
    $("act_mail").addEventListener("click", e => {
      if (!formOk()) { e.preventDefault(); return; }
      saveForm(); updMail();
      msg("Άνοιγμα της εφαρμογής αλληλογραφίας… Στείλτε το μήνυμα και περιμένετε τον κωδικό έγκρισης στο email σας. (Αν δεν άνοιξε τίποτα: «Αντιγραφή κειμένου αίτησης».)", "ok");
    });
    $("act_copy").addEventListener("click", () => {
      if (!formOk()) return;
      saveForm();
      copyText(`Προς: ${ADMIN_EMAIL}\n` + mailText(req, $("act_name").value.trim(), $("act_email").value.trim())).then(ok => msg(ok ? "Το κείμενο της αίτησης αντιγράφηκε – επικολλήστε το σε email / μήνυμα προς τον διαχειριστή." : "Η αντιγραφή δεν υποστηρίζεται – σημειώστε τον κωδικό αίτησης " + fmtReq(req) + ".", ok ? "ok" : "warn"));
    });
    const tryActivate = () => {
      const code = $("act_code").value;
      if (norm(code).length !== 8) { msg("Ο κωδικός έγκρισης έχει 8 χαρακτήρες (XXXX-XXXX).", "warn"); return; }
      if (!activate(req, code, $("act_name").value, $("act_email").value, "code")) { msg("Λάθος κωδικός έγκρισης για αυτή τη συσκευή (κωδικός αίτησης " + fmtReq(req) + "). Ελέγξτε τον κωδικό ή ζητήστε νέο από τον διαχειριστή.", "warn"); return; }
      done();
    };
    $("act_go").addEventListener("click", tryActivate);
    $("act_code").addEventListener("keydown", e => { if (e.key === "Enter") tryActivate(); });
    $("act_code").addEventListener("input", () => { const v = norm($("act_code").value).slice(0, 8); $("act_code").value = group(v, 4); });
    // διαχειριστής
    $("act_adm_btn").addEventListener("click", () => { $("act_admin").classList.toggle("hidden"); if (!$("act_admin").classList.contains("hidden")) $("act_master").focus(); });
    const unlock = () => {
      const ok = hex(sha256(utf8(SALT + $("act_master").value))) === MASTER_HASH;
      $("act_admin_panel").classList.toggle("hidden", !ok);
      if (!ok && $("act_master").value) msg("Λάθος κωδικός διαχειριστή.", "warn");
      if (ok) { msg("Πάνελ διαχειριστή.", "ok"); $("act_adm_req").value = fmtReq(req); updAdm(); }
    };
    $("act_master").addEventListener("keydown", e => { if (e.key === "Enter") unlock(); });
    $("act_master").addEventListener("change", unlock);
    const updAdm = () => { const c = approvalCode($("act_adm_req").value); $("act_adm_code").textContent = c || "—"; };
    $("act_adm_req").addEventListener("input", updAdm);
    $("act_adm_copy").addEventListener("click", () => { const c = $("act_adm_code").textContent; if (c && c !== "—") copyText(c).then(ok => msg(ok ? "Ο κωδικός έγκρισης αντιγράφηκε." : c, "ok")); });
    $("act_adm_self").addEventListener("click", () => { if (!$("act_admin_panel").classList.contains("hidden")) { activate(req, approvalCode(req), $("act_name").value || "Διαχειριστής", $("act_email").value || ADMIN_EMAIL, "admin"); done(); } });
    function done() {
      document.documentElement.classList.remove("act-locked");
      ov.remove();
      try { window.dispatchEvent(new CustomEvent("connexion-activated", { detail: info() })); } catch (e) { /* ignore */ }
    }
    setTimeout(() => { try { ($("act_name").value ? ($("act_email").value ? $("act_code") : $("act_email")) : $("act_name")).focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function init() {
    if (isActive()) return;
    showOverlay();
  }
  window.ACTIVATION = { approvalCode, isActive, info, reset, requestCode: () => fmtReq(pendingRequest()), adminEmail: ADMIN_EMAIL, _sha256hex: s => hex(sha256(utf8(s))) };
  if (typeof document !== "undefined" && document.body !== undefined) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
})();
