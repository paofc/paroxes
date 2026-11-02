/* Reference tabs: ΕΤΚΔ drawings viewer (app/etkd), common pole constructions (ΔΕΔΔΗΕ GIS, 11/2022) and the general-information
   summaries of the distribution directives (ΟΔ.41, ΟΔ.48, ΟΔ.119, ΟΔ.5). Data: window.ETKD_INDEX (etkd/index.js) and window.OD26_DATA. */
(function () {
  "use strict";
  const D = window.OD26_DATA;
  const $ = id => document.getElementById(id);
  const esc = s => String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ART = !!window.ARTIFACT_MODE;
  const IX = window.ETKD_INDEX || { chapters: [] };
  // Greek capitals that look like Latin ones → Latin, so «Τ-1», «P-3II», «S-25Α» all match
  const G2L = { "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X" };
  const norm = s => String(s || "").toUpperCase().replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, c => G2L[c]).replace(/\s+/g, "").replace(/–/g, "-");
  // for titles / free-text search: also strip accents & breathings (τέρμα → ΤΕΡΜΑ, Ἡ → Η)
  const normT = s => norm(String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  // ---------------------------------------------------------------- full-screen image viewer (shared)
  const FSV = { items: null, i: 0, zoom: 1, onNav: null };
  const fsvEl = () => $("fsv");
  function fsvApply() {
    const body = $("fsv_body"), img = $("fsv_img");
    if (!body) return;
    body.classList.toggle("free", FSV.zoom !== 1);
    img.style.width = FSV.zoom === 1 ? "100%" : (body.clientWidth * FSV.zoom) + "px";
  }
  function fsvZoom(f) { FSV.zoom = Math.max(1, Math.min(8, f === 0 ? 1 : FSV.zoom * f)); fsvApply(); }
  function fsvShow(o) {
    // o: {src, title, ttl, sub, href, canPrev, canNext, onPrev, onNext}
    if (!fsvEl()) return;
    $("fsv_img").src = o.src || ""; $("fsv_title").textContent = o.title || ""; $("fsv_ttl").textContent = o.ttl || ""; $("fsv_sub").textContent = o.sub || "";
    $("fsv_open").href = o.href || o.src || "#"; $("fsv_open").classList.toggle("hidden", !(o.href || o.src));
    $("fsv_prev").disabled = !o.onPrev; $("fsv_next").disabled = !o.onNext;
    FSV.onNav = { prev: o.onPrev || null, next: o.onNext || null };
    FSV.zoom = 1; fsvApply();
    fsvEl().classList.remove("hidden"); document.body.style.overflow = "hidden";
    $("fsv_body").scrollTop = 0;
  }
  function fsvClose() { if (!fsvEl()) return; fsvEl().classList.add("hidden"); document.body.style.overflow = ""; $("fsv_img").removeAttribute("src"); FSV.onNav = null; }
  if (fsvEl()) {
    $("fsv_close").addEventListener("click", fsvClose);
    $("fsv_zin").addEventListener("click", () => fsvZoom(1.5)); $("fsv_zout").addEventListener("click", () => fsvZoom(1 / 1.5)); $("fsv_zfit").addEventListener("click", () => fsvZoom(0));
    $("fsv_prev").addEventListener("click", () => FSV.onNav && FSV.onNav.prev && FSV.onNav.prev()); $("fsv_next").addEventListener("click", () => FSV.onNav && FSV.onNav.next && FSV.onNav.next());
    $("fsv_img").addEventListener("dblclick", e => { const body = $("fsv_body"); const rx = (e.pageX - body.getBoundingClientRect().left + body.scrollLeft) / body.scrollWidth, ry = (e.pageY - body.getBoundingClientRect().top + body.scrollTop) / body.scrollHeight; fsvZoom(FSV.zoom === 1 ? 2.5 : 0); body.scrollLeft = rx * body.scrollWidth - body.clientWidth / 2; body.scrollTop = ry * body.scrollHeight - body.clientHeight / 2; });
    $("fsv_body").addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault(); fsvZoom(e.deltaY < 0 ? 1.25 : 0.8); } }, { passive: false });
    // pinch zoom (two fingers) – rescale around the centre, keep the scroll position proportional
    let pinch = null, lastTap = 0;
    $("fsv_body").addEventListener("touchstart", e => {
      if (e.touches.length === 2) { pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: FSV.zoom }; }
      else if (e.touches.length === 1) { const t = Date.now(); if (t - lastTap < 300) { fsvZoom(FSV.zoom === 1 ? 2.5 : 0); } lastTap = t; }
    }, { passive: true });
    $("fsv_body").addEventListener("touchmove", e => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const body = $("fsv_body"), rx = (body.scrollLeft + body.clientWidth / 2) / body.scrollWidth, ry = (body.scrollTop + body.clientHeight / 2) / body.scrollHeight;
        FSV.zoom = Math.max(1, Math.min(8, pinch.z * d / pinch.d)); fsvApply();
        body.scrollLeft = rx * body.scrollWidth - body.clientWidth / 2; body.scrollTop = ry * body.scrollHeight - body.clientHeight / 2;
      }
    }, { passive: false });
    $("fsv_body").addEventListener("touchend", () => { pinch = null; }, { passive: true });
    document.addEventListener("keydown", e => {
      if (fsvEl().classList.contains("hidden")) return;
      if (e.key === "Escape") fsvClose();
      else if (e.key === "ArrowLeft" && FSV.onNav && FSV.onNav.prev) FSV.onNav.prev();
      else if (e.key === "ArrowRight" && FSV.onNav && FSV.onNav.next) FSV.onNav.next();
      else if (e.key === "+" || e.key === "=") fsvZoom(1.5);
      else if (e.key === "-") fsvZoom(1 / 1.5);
      else return;
      e.preventDefault();
    });
  }
  const isMobile = () => window.innerWidth < 1100;
  // zoom helper for the in-page viewers (#k_wrap, #ce_wrap, #c_wrap): zoom 1 = fit width
  function wrapZoom(wrap, z) {
    const img = wrap.querySelector("img");
    wrap.classList.toggle("zoom", z !== 1);
    img.style.width = z === 1 ? "100%" : (wrap.clientWidth * z) + "px";
  }

  // ---------------------------------------------------------------- ΕΤΚΔ
  const CH_SHORT = { G: "Γενικά", C: "Αποστάσεις – κλάσεις", CS: "Τανύσεις", FC: "Εξαρτ. αγωγών", FCP: "Εξαρτ. στύλων Ω.Σ.", F: "Εξαρτ. ξύλινων στύλων", P: "Μέση τάση", S: "Χαμηλή τάση", T: "Υ/Σ εναέριοι", U: "Υπόγεια – Υ/Σ" };
  const K = { items: [], byNorm: new Map(), chapter: null, cur: -1, page: 0, zoom: 1, view: "grid", limit: 240, recent: [], favs: [] };
  try { const st = JSON.parse(localStorage.getItem("etkd_state_v1") || "null"); if (st) { K.recent = st.recent || []; K.favs = st.favs || []; K.view = st.view || "grid"; } } catch (e) { /* ignore */ }
  const kSave = () => { try { localStorage.setItem("etkd_state_v1", JSON.stringify({ recent: K.recent.slice(0, 12), favs: K.favs, view: K.view })); } catch (e) { /* ignore */ } };
  const thumbOf = it => "etkd/thumbs/" + it.key + "/" + it.pagesRaw[0].replace(/\.\w+$/, "") + ".jpg";
  IX.chapters.forEach(ch => ch.items.forEach(it => {
    const o = { key: ch.key, title: ch.title, n: it.n, code: it.code, ttl: it.title || it.desc || "", pagesRaw: it.pages, pages: it.pages.map(p => "etkd/" + ch.key + "/" + p), src: it.src,
      status: it.status || (ch.status || ""), note: it.status_note || ch.status_note || "", rev: it.rev || "", isNew: it.new || "", desc: it.desc || "" };
    o.norm = norm(o.code);
    o.tnorm = normT(o.ttl);
    o.base = (o.code.match(/^[A-ZΑ-Ω]+\s?-?\s?\d+/) || [o.code])[0];
    K.items.push(o);
    if (!K.byNorm.has(o.norm)) K.byNorm.set(o.norm, o);
  }));
  const kItem = n => K.items.find(x => x.n === n);
  const kStatusClass = it => it.status === "abolished" ? " abolished" : (it.status === "revise" ? " revise" : (it.isNew ? " isnew" : ""));
  const kBadge = it => it.status === "abolished" ? `<span class="badge no" title="${esc(it.note)}">ΚΑΤΑΡΓΗΘΗΚΕ</span>` : (it.status === "revise" ? `<span class="badge warn" title="${esc(it.note)}">ΠΡΟΣ ΤΡΟΠΟΠΟΙΗΣΗ</span>` : "") + (it.isNew ? `<span class="badge ok" title="${esc(it.isNew)}">ΝΕΑ 2026</span>` : "") + (it.rev ? `<span class="badge info" title="${esc(it.rev)}">ΑΝΑΘ. ΦΕΒ 2026</span>` : "");
  const CC0 = D.common_constructions;
  const ccAll = CC0 ? CC0.sections.flatMap((s, si) => s.items.map((c, ci) => ({ c, si, ci }))) : [];
  // search: code (normalised, Greek look-alikes → Latin) or words of the OCR title (all words must match)
  function kMatch(it, q) {
    if (!q) return true;
    const qn = norm(q);
    if (it.norm.includes(qn)) return true;
    const words = String(q).split(/[\s,;]+/).filter(Boolean).map(normT);
    return words.length > 0 && words.every(w => it.tnorm.includes(w));
  }
  function kFiltered() {
    const q = $("k_search").value.trim();
    let items = K.items.filter(it => (K.chapter === null || it.key === K.chapter) && kMatch(it, q));
    if (q && !items.length) items = K.items.filter(it => kMatch(it, q));
    if (q && !items.length) { const r = kResolve(q); if (r) items = [r]; }
    return items;
  }
  function kChapters() {
    const el = $("k_chapters"); if (!el) return;
    el.innerHTML = `<button data-ch="" class="${K.chapter === null ? "active" : ""}">Όλα <span class="muted">${K.items.length}</span></button>` +
      IX.chapters.map(ch => `<button data-ch="${esc(ch.key)}" class="${K.chapter === ch.key ? "active" : ""}" title="${esc(ch.title)}"><b>${esc(ch.key)}</b>${esc(CH_SHORT[ch.key] || ch.title)} <span class="muted">${ch.items.length}</span></button>`).join("");
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { K.chapter = b.dataset.ch || null; K.limit = 240; kChapters(); kList(); }));
  }
  function kRecent() {
    const el = $("k_recent"); if (!el) return;
    const favs = K.favs.map(kItem).filter(Boolean), rec = K.recent.map(kItem).filter(Boolean).filter(it => !K.favs.includes(it.n)).slice(0, 8);
    let h = "";
    if (favs.length) h += `<span class="lab">★ Αγαπημένα</span>` + favs.map(it => `<button class="fav" data-n="${it.n}" title="${esc(it.ttl)}">${esc(it.code)}</button>`).join("");
    if (rec.length) h += `<span class="lab">Πρόσφατα</span>` + rec.map(it => `<button data-n="${it.n}" title="${esc(it.ttl)}">${esc(it.code)}</button>`).join("");
    el.innerHTML = h;
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => kShow(+b.dataset.n, 0, true)));
  }
  function kTile(it) {
    const img = ART ? `<div class="ph">${esc(it.code)}</div>` : `<img src="${thumbOf(it)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;ph&quot;>${esc(it.code)}</div>'">`;
    const st = it.status === "abolished" ? " · ΚΑΤΑΡΓΗΘΗΚΕ" : (it.status === "revise" ? " · προς τροποποίηση" : (it.isNew ? " · νέα 2026" : (it.rev ? " · αναθ. ΦΕΒ 2026" : "")));
    return `<button class="it${kStatusClass(it)} ${it.n === K.cur ? "active" : ""}" data-n="${it.n}" title="${esc(it.code)}${it.ttl ? " – " + esc(it.ttl) : ""}${st}">${K.view === "grid" ? img : ""}<span class="code">${esc(it.code)}${it.status === "abolished" ? ' <span class="mark no">✕</span>' : (it.status === "revise" ? ' <span class="mark warn">!</span>' : (it.isNew ? ' <span class="mark ok">ΝΕΟ</span>' : ""))}</span><span class="ch">${it.pages.length > 1 ? it.pages.length + " σελ. · " : ""}#${it.n}</span>${it.ttl ? `<span class="ttl">${esc(it.ttl)}</span>` : ""}</button>`;
  }
  function kList() {
    const el = $("k_list"); if (!el) return;
    const all = kFiltered();
    const items = all.slice(0, K.limit);
    el.className = "etkd-list " + K.view;
    let h = "", last = null;
    items.forEach(it => {
      if (it.key !== last && (K.chapter === null)) { h += `<div class="grp">${esc(it.key)} – ${esc(it.title)}</div>`; last = it.key; }
      h += kTile(it);
    });
    if (all.length > items.length) h += `<button class="more" data-more="1">Εμφάνιση περισσότερων (${all.length - items.length} ακόμη) …</button>`;
    const chb = K.chapter ? IX.chapters.find(c => c.key === K.chapter) : null;
    const banner = chb && chb.status_note ? `<div class="chbanner ${chb.status === "abolished" ? "no" : "info"}">${esc(chb.status_note)}</div>` : "";
    el.innerHTML = banner + (h || `<div class="muted small" style="padding:10px;grid-column:1/-1">Δεν βρέθηκε κωδικός ή τίτλος για «${esc($("k_search").value)}».</div>`);
    $("k_count").textContent = `${all.length} σχέδι${all.length === 1 ? "ο" : "α"}${K.chapter ? " – " + K.chapter : ""}${$("k_search").value.trim() ? " για «" + $("k_search").value.trim() + "»" : ""}`;
    el.querySelectorAll("button.it").forEach(b => b.addEventListener("click", () => kShow(+b.dataset.n, 0, true)));
    const more = el.querySelector("button.more"); if (more) more.addEventListener("click", () => { K.limit += 240; kList(); });
  }
  function kRelated(it) {
    const el = $("k_related"); if (!el) return;
    const rel = K.items.filter(x => x.base === it.base && x.n !== it.n).slice(0, 14);
    const cc = ccAll.filter(x => x.c.etkd.some(code => norm(code) === it.norm || (kResolve(code) || {}).n === it.n));
    let h = "";
    if (it.status || it.isNew || it.rev) h += `<div class="stnote ${it.status === "abolished" ? "no" : (it.status === "revise" ? "warn" : "ok")}">${kBadge(it)} ${esc(it.note || it.isNew || it.rev)}</div>`;
    if (rel.length) h += `<span class="lab">Συναφή</span>` + rel.map(x => `<button data-n="${x.n}" class="${x.status === "abolished" ? "abol" : ""}" title="${esc(x.ttl)}${x.status === "abolished" ? " – ΚΑΤΑΡΓΗΘΗΚΕ" : ""}">${esc(x.code)}</button>`).join("");
    if (cc.length) h += `<span class="lab">Κατασκευές</span>` + cc.map(x => `<button class="cc" data-cc="${x.si}:${x.ci}" title="Εμφάνιση στις Συνηθέστερες κατασκευές">${esc(x.c.code)} ↗</button>`).join("");
    // photos of those constructions (from the GIS presentation)
    const phs = cc.filter(x => x.c.photo);
    if (phs.length) h += `<div class="k-photos">` + phs.map(x => `<figure data-cc="${x.si}:${x.ci}" title="${esc(x.c.code)} – φωτογραφία από το έντυπο ΔΕΔΔΗΕ-GIS (σελ. ${x.c.page})"><img src="${esc(x.c.photo)}" alt="" loading="lazy"><figcaption>${esc(x.c.code)} · σελ. ${x.c.page}</figcaption></figure>`).join("") + `</div>`;
    el.innerHTML = h;
    el.querySelectorAll("button[data-n]").forEach(b => b.addEventListener("click", () => kShow(+b.dataset.n, 0, true)));
    el.querySelectorAll("button[data-cc]").forEach(b => b.addEventListener("click", () => { const [si, ci] = b.dataset.cc.split(":").map(Number); if (window.CONSTR) window.CONSTR.open(si, ci); }));
    el.querySelectorAll(".k-photos figure").forEach(f => f.addEventListener("click", () => { const [si, ci] = f.dataset.cc.split(":").map(Number); const c = CC0.sections[si].items[ci]; fsvShow({ src: c.photo, title: c.code, ttl: c.desc, sub: `Φωτογραφία από το έντυπο ΔΕΔΔΗΕ-GIS v2.3 (11/2022), σελ. ${c.page}`, href: c.photo }); }));
  }
  function kFsv(it, page) {
    const list = kFiltered(); const li = list.findIndex(x => x.n === it.n);
    const nav = d => { const nx = li >= 0 ? list[li + d] : null; if (nx) { kShow(nx.n, 0, false); kFsv(nx, 0); } };
    fsvShow({ src: it.pages[page], title: it.code + (it.status === "abolished" ? " – ΚΑΤΑΡΓΗΘΗΚΕ" : (it.status === "revise" ? " – προς τροποποίηση" : "")), ttl: it.ttl, sub: `${it.key} – ${it.title}${it.pages.length > 1 ? ` · σελίδα ${page + 1}/${it.pages.length}` : ""}`, href: it.pages[page],
      onPrev: (li > 0) ? () => nav(-1) : null, onNext: (li >= 0 && li < list.length - 1) ? () => nav(1) : null });
  }
  function kShow(n, page, user) {
    const it = kItem(n); if (!it) return;
    K.cur = n; K.page = Math.max(0, Math.min(page || 0, it.pages.length - 1)); K.zoom = 1;
    $("k_title").innerHTML = esc(it.code) + " " + kBadge(it); $("k_ttl").textContent = it.ttl;
    $("k_wrap").className = "etkd-img" + (it.status === "abolished" ? " abolished" : (it.status === "revise" ? " revise" : ""));
    $("k_sub").textContent = `${it.key} – ${it.title} · σχέδιο #${it.n}${it.pages.length > 1 ? (it.rev ? (K.page === 0 ? " · ΦΕΒ 2026 (νέα έκδοση) – 2η σελίδα: παλαιά έκδοση" : " · παλαιά έκδοση (ΜΑΪ 1977 / ΙΟΥΛ 1990)") : ` · σελίδα ${K.page + 1}/${it.pages.length}`) : ""} · ${it.src}`;
    const src = it.pages[K.page];
    $("k_img").style.display = ART ? "none" : "";
    if (ART) { $("k_img").removeAttribute("src"); $("k_empty").style.display = "flex"; $("k_empty").textContent = `${it.code}${it.ttl ? " – " + it.ttl : ""}: τα σχέδια του ΕΤΚΔ (1.083 εικόνες, 76 MB) περιλαμβάνονται στην εφαρμογή Windows (.exe) και Android (.apk), όχι στη διαδικτυακή έκδοση.`; }
    else { $("k_img").src = src; $("k_empty").style.display = "none"; wrapZoom($("k_wrap"), 1); }
    $("k_open").href = ART ? "#" : src; $("k_open").classList.toggle("hidden", ART);
    $("k_pprev").classList.toggle("hidden", it.pages.length < 2); $("k_pnext").classList.toggle("hidden", it.pages.length < 2);
    $("k_fav").textContent = K.favs.includes(n) ? "★" : "☆"; $("k_fav").classList.toggle("on", K.favs.includes(n));
    $("k_list").querySelectorAll("button.it").forEach(b => b.classList.toggle("active", +b.dataset.n === n));
    const act = $("k_list").querySelector("button.it.active"); if (act && act.scrollIntoView && user) act.scrollIntoView({ block: "nearest" });
    kRelated(it);
    if (user) { K.recent = [n].concat(K.recent.filter(x => x !== n)).slice(0, 12); kSave(); kRecent(); }
    if (user && isMobile() && !ART) kFsv(it, K.page);
  }
  function kStep(d) {
    const list = kFiltered();
    const li = list.findIndex(x => x.n === K.cur);
    const next = li >= 0 ? list[li + d] : list[0];
    if (next) kShow(next.n, 0, true);
  }
  // resolve a construction code to a drawing: exact code, else the sheet of its base code (S-233A → S-233, P-3II → P-3, S-31Γ → S-31)
  function kResolve(code) {
    let q = norm(code).replace(/\(.*\)$/, "");
    while (q.length >= 3) {
      const it = K.byNorm.get(q);
      if (it) return it;
      if (!/[A-ZΑ-ΩIVX]$/.test(q)) break;
      q = q.slice(0, -1);
    }
    return null;
  }
  // open a code from another tab (common constructions, Pythagoras results …)
  function kOpen(code) {
    const it = kResolve(code) || K.items.find(x => x.norm.startsWith(norm(code)));
    if (!it) { K.chapter = null; $("k_search").value = code; switchTab("etkd"); kChapters(); kList(); return false; }
    K.chapter = it.key; $("k_search").value = "";
    switchTab("etkd"); kChapters(); kList(); kShow(it.n, 0, true);
    return true;
  }
  function switchTab(name) {
    if (window.APP_SWITCH_TAB) { window.APP_SWITCH_TAB(name); return; }
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
    window.scrollTo(0, 0);
  }
  if ($("k_list")) {
    $("k_viewmode").querySelectorAll("button").forEach(b => { b.classList.toggle("active", b.dataset.v === K.view); b.addEventListener("click", () => { K.view = b.dataset.v; $("k_viewmode").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b)); kSave(); kList(); }); });
    kChapters(); kRecent(); kList();
    $("k_search").addEventListener("input", () => { if ($("k_search").value.trim()) K.chapter = null; K.limit = 240; kChapters(); kList(); });
    $("k_clear").addEventListener("click", () => { $("k_search").value = ""; K.limit = 240; kChapters(); kList(); $("k_search").focus(); });
    $("k_prev").addEventListener("click", () => kStep(-1)); $("k_next").addEventListener("click", () => kStep(1));
    $("k_pprev").addEventListener("click", () => kShow(K.cur, K.page - 1)); $("k_pnext").addEventListener("click", () => kShow(K.cur, K.page + 1));
    const kz = f => { K.zoom = Math.max(1, Math.min(6, f === 0 ? 1 : K.zoom * f)); wrapZoom($("k_wrap"), K.zoom); };
    $("k_zin").addEventListener("click", () => kz(1.5)); $("k_zout").addEventListener("click", () => kz(1 / 1.5)); $("k_zfit").addEventListener("click", () => kz(0));
    $("k_img").addEventListener("click", () => { const it = kItem(K.cur); if (it) kFsv(it, K.page); });
    $("k_full").addEventListener("click", () => { const it = kItem(K.cur); if (it && !ART) kFsv(it, K.page); });
    $("k_fav").addEventListener("click", () => { if (K.cur < 0) return; K.favs = K.favs.includes(K.cur) ? K.favs.filter(x => x !== K.cur) : K.favs.concat([K.cur]); kSave(); kRecent(); $("k_fav").textContent = K.favs.includes(K.cur) ? "★" : "☆"; });
    $("k_open").addEventListener("click", e => { if (!$("k_open").getAttribute("href") || $("k_open").getAttribute("href") === "#") e.preventDefault(); });
    document.addEventListener("keydown", e => {
      if (!document.getElementById("tab-etkd").classList.contains("active") || !fsvEl().classList.contains("hidden")) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowLeft") kStep(-1); else if (e.key === "ArrowRight") kStep(1); else if (e.key === "+" || e.key === "=") kz(1.5); else if (e.key === "-") kz(1 / 1.5); else return;
      e.preventDefault();
    });
    const first = K.items.find(x => x.key === "C" && /^C-?3$/.test(x.norm)) || K.items.find(x => x.key === "C");
    if (first) kShow(first.n, 0, false);
  }
  window.ETKD = { open: kOpen, has: code => !!kResolve(code), resolve: kResolve, item: kItem, thumb: thumbOf, updates: IX.updates || [], list: () => K.items };

  // ---------------------------------------------------------------- Συνηθέστερες κατασκευές (GIS)
  const CC = D.common_constructions;
  const C = { sec: null, page: 1, cur: null, codes: [], ci: 0, view: "page" };
  const cPageSrc = p => CC.img.replace("{:02d}", String(p).padStart(2, "0"));
  const cThumbSrc = p => CC.img.replace("p-{:02d}", "t-" + String(p).padStart(2, "0"));
  function cView(v) {
    C.view = v;
    document.querySelectorAll("#c_views button").forEach(b => b.classList.toggle("active", b.dataset.cv === v));
    document.querySelectorAll("#tab-constr .cv").forEach(d => d.classList.toggle("hidden", d.dataset.cv !== v));
  }
  function cPage(p, user) {
    C.page = Math.max(1, Math.min(CC.pages, p));
    const src = cPageSrc(C.page);
    $("c_img").src = src; $("c_open").href = src;
    $("c_title").textContent = `Σελίδα ${C.page} / ${CC.pages}`;
    const sec = CC.sections.find(s => C.page >= s.pages[0] && C.page <= s.pages[1]);
    const here = CC.sections.flatMap(s => s.items).filter(it => it.page === C.page).map(it => it.code);
    $("c_sub").textContent = (sec ? sec.title : (C.page === 1 ? "Εξώφυλλο" : "")) + (here.length ? " · " + here.join(", ") : "");
    document.querySelectorAll("#c_strip button").forEach(b => b.classList.toggle("active", +b.dataset.p === C.page));
    const act = document.querySelector("#c_strip button.active"); if (act && act.scrollIntoView && user) act.scrollIntoView({ block: "nearest", inline: "center" });
    if (user) cView("page");
  }
  function cFsvPage() {
    fsvShow({ src: cPageSrc(C.page), title: `Σελίδα ${C.page} / ${CC.pages}`, ttl: $("c_sub").textContent, sub: CC.source, href: cPageSrc(C.page),
      onPrev: C.page > 1 ? () => { cPage(C.page - 1, false); cFsvPage(); } : null, onNext: C.page < CC.pages ? () => { cPage(C.page + 1, false); cFsvPage(); } : null });
  }
  function cStrip() {
    const el = $("c_strip"); if (!el) return;
    let h = "";
    for (let p = 1; p <= CC.pages; p++) h += `<button data-p="${p}" class="${p === C.page ? "active" : ""}" title="Σελίδα ${p}"><img src="${cThumbSrc(p)}" alt="" loading="lazy" onerror="this.style.display='none'">${p}</button>`;
    el.innerHTML = h;
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { cPage(+b.dataset.p, true); if (isMobile()) cFsvPage(); }));
  }
  function cSections() {
    const el = $("c_sections"); if (!el) return;
    const short = t => t.split(" – ")[0].replace(/Συνηθέστερες [Κκ]ατασκευές /, "").replace("Διασύνδεση υπογείου με εναέριο στη ΜΤ", "Υπόγειο ↔ εναέριο ΜΤ").replace("Σύνδεση συνεστραμμένων καλωδίων με γυμνούς αγωγούς", "ΣΚ ↔ γυμνοί αγωγοί");
    el.innerHTML = `<button data-s="" class="${C.sec === null ? "active" : ""}">Όλες</button>` + CC.sections.map((s, i) => `<button data-s="${i}" class="${C.sec === i ? "active" : ""}" title="${esc(s.title)} (σελ. ${s.pages[0]}–${s.pages[1]})">${esc(short(s.title))} <span class="muted">${s.items.length}</span></button>`).join("");
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { C.sec = b.dataset.s === "" ? null : +b.dataset.s; cSections(); cList(); if (C.sec !== null) cPage(CC.sections[C.sec].pages[0], false); }));
  }
  function cShowDrawing(codes, idx, user) {
    C.codes = codes; C.ci = Math.max(0, Math.min(idx, codes.length - 1));
    const code = codes[C.ci], it = window.ETKD.resolve(code);
    $("ce_codes").innerHTML = codes.map((c, i) => { const r = window.ETKD.resolve(c); return `<button data-i="${i}" class="${i === C.ci ? "active" : ""}${r ? (r.status === "abolished" ? " abol" : (r.status === "revise" ? " rev" : "")) : " na"}">${esc(c)}${r && r.status === "abolished" ? " ✕" : ""}</button>`; }).join("");
    $("ce_codes").querySelectorAll("button").forEach(b => b.addEventListener("click", () => cShowDrawing(C.codes, +b.dataset.i, true)));
    $("ce_prev").disabled = C.ci <= 0; $("ce_next").disabled = C.ci >= codes.length - 1;
    if (!it) {
      $("ce_title").textContent = code; $("ce_ttl").textContent = ""; $("ce_sub").textContent = "δεν βρέθηκε στο ΕΤΚΔ 15.09.2025";
      $("ce_img").removeAttribute("src"); $("ce_img").style.display = "none"; $("ce_empty").style.display = "flex"; $("ce_empty").textContent = `${code}: δεν υπάρχει σχέδιο με αυτόν τον κωδικό στο ΕΤΚΔ 15.09.2025.`;
      cView("etkd"); return;
    }
    $("ce_title").innerHTML = esc(it.code + (norm(it.code) !== norm(code) ? ` (${code})` : "")) + " " + (it.status === "abolished" ? `<span class="badge no" title="${esc(it.note)}">ΚΑΤΑΡΓΗΘΗΚΕ</span>` : (it.status === "revise" ? `<span class="badge warn" title="${esc(it.note)}">ΠΡΟΣ ΤΡΟΠΟΠΟΙΗΣΗ</span>` : ""));
    $("ce_ttl").textContent = it.ttl; $("ce_sub").textContent = `${it.key} – ${it.title} · σχέδιο #${it.n}` + (it.status ? " · " + it.note : "");
    $("ce_wrap").className = "etkd-img" + (it.status === "abolished" ? " abolished" : (it.status === "revise" ? " revise" : ""));
    if (ART) { $("ce_img").removeAttribute("src"); $("ce_img").style.display = "none"; $("ce_empty").style.display = "flex"; $("ce_empty").textContent = `${it.code}${it.ttl ? " – " + it.ttl : ""}: τα σχέδια του ΕΤΚΔ περιλαμβάνονται στην εφαρμογή Windows / Android.`; }
    else { $("ce_img").src = it.pages[0]; $("ce_img").style.display = ""; $("ce_empty").style.display = "none"; wrapZoom($("ce_wrap"), 1); }
    cView("etkd");
    if (user && isMobile() && !ART) cFsvDrawing();
  }
  function cFsvDrawing() {
    const it = window.ETKD.resolve(C.codes[C.ci]); if (!it) return;
    fsvShow({ src: it.pages[0], title: it.code, ttl: it.ttl, sub: `${it.key} – ${it.title}`, href: it.pages[0],
      onPrev: C.ci > 0 ? () => { cShowDrawing(C.codes, C.ci - 1, false); cFsvDrawing(); } : null, onNext: C.ci < C.codes.length - 1 ? () => { cShowDrawing(C.codes, C.ci + 1, false); cFsvDrawing(); } : null });
  }
  function cFsvPhoto(it, which) {
    const srcs = [it.photo, it.photo2].filter(Boolean); const i = Math.max(0, Math.min(which || 0, srcs.length - 1));
    fsvShow({ src: srcs[i], title: it.code, ttl: it.desc, sub: `Φωτογραφία από το έντυπο ΔΕΔΔΗΕ-GIS v2.3 (11/2022), σελ. ${it.page}${srcs.length > 1 ? ` · ${i + 1}/${srcs.length}` : ""}`, href: srcs[i],
      onPrev: i > 0 ? () => cFsvPhoto(it, i - 1) : null, onNext: i < srcs.length - 1 ? () => cFsvPhoto(it, i + 1) : null });
  }
  function cPhotoPanel(it) {
    const el = $("c_photo"); if (!el) return;
    if (!it) { el.innerHTML = ""; el.classList.add("hidden"); return; }
    const srcs = [it.photo, it.photo2].filter(Boolean);
    el.classList.remove("hidden");
    el.innerHTML = `<div class="c-ph-head"><b>${esc(it.code)}</b> <span class="muted small">${esc(it.desc)} · φωτογραφία από το έντυπο, σελ. ${it.page}</span></div>` +
      (srcs.length ? `<div class="c-ph-imgs">${srcs.map((src, i) => `<img src="${esc(src)}" alt="" data-i="${i}" title="Πατήστε για πλήρη οθόνη">`).join("")}</div>` : `<div class="muted small">Δεν υπάρχει φωτογραφία για την κατασκευή στο έντυπο.</div>`);
    el.querySelectorAll("img").forEach(im => im.addEventListener("click", () => cFsvPhoto(it, +im.dataset.i)));
  }
  function cSelect(si, ci, user) {
    const it = CC.sections[si].items[ci];
    C.cur = `${si}:${ci}`;
    document.querySelectorAll("#c_list .constr").forEach(c => c.classList.toggle("active", c.dataset.k === C.cur));
    cPhotoPanel(it);
    cPage(it.page, user);
    const el = document.querySelector(`#c_list .constr[data-k="${C.cur}"]`); if (el && el.scrollIntoView && user) el.scrollIntoView({ block: "nearest" });
    if (user && isMobile()) cFsvPage();
  }
  function cList() {
    const el = $("c_list"); if (!el) return;
    const q = $("c_search").value.trim().toLowerCase(), qn = norm(q);
    let h = "", n = 0;
    CC.sections.forEach((s, si) => {
      if (C.sec !== null && C.sec !== si) return;
      const items = s.items.map((it, ci) => ({ it, ci })).filter(({ it }) => !q || norm(it.code).includes(qn) || (it.desc + " " + it.notes.join(" ") + " " + it.draw).toLowerCase().includes(q) || it.etkd.some(c => norm(c).includes(qn)));
      if (!items.length) return;
      h += `<div class="grp">${esc(s.title)} <span class="muted">σελ. ${s.pages[0]}–${s.pages[1]}</span></div>`;
      items.forEach(({ it, ci }) => {
        n++;
        const k = `${si}:${ci}`;
        const links = it.etkd.map((c, i) => { const r = window.ETKD.resolve(c); return r ? `<button data-code="${i}" class="${r.status === "abolished" ? "abol" : (r.status === "revise" ? "rev" : "")}" title="Σχέδιο ${esc(c)} – ${esc(r.ttl || "")}${r.status === "abolished" ? " – ΚΑΤΑΡΓΗΘΗΚΕ" : (r.status === "revise" ? " – προς τροποποίηση" : "")}">📐 ${esc(c)}${r.status === "abolished" ? " ✕" : ""}</button>` : `<button class="na" title="δεν βρέθηκε στο ΕΤΚΔ 15.09.2025">${esc(c)}</button>`; }).join("");
        const main = window.ETKD.resolve(it.etkd[0] || "");
        const abol = main && main.status === "abolished", rev = main && main.status === "revise";
        const photo = it.photo ? `<img src="${esc(it.photo)}" alt="" loading="lazy" title="Φωτογραφία από το έντυπο (σελ. ${it.page}) – πατήστε για μεγέθυνση">` : `<div class="ph">—</div>`;
        h += `<div class="constr${abol ? " abolished" : (rev ? " revise" : "")} ${k === C.cur ? "active" : ""}" data-k="${k}"><div class="c-main"><div class="c-head"><span class="code">${esc(it.code)}</span><span class="c-pg">σελ. ${it.page}</span></div>` +
          (abol ? `<div class="stline no">ΚΑΤΑΡΓΗΘΗΚΕ στο ΕΤΚΔ – η κατασκευή παραμένει για αναφορά</div>` : (rev ? `<div class="stline warn">Σχέδιο ΕΤΚΔ προς τροποποίηση</div>` : "")) +
          `<div class="desc">${esc(it.desc)}</div>${it.draw ? `<div class="draw">GIS: ${esc(it.draw)}</div>` : ""}` +
          (it.notes.length ? `<ul class="notes">${it.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "") + `</div><div class="c-thumb" data-photo="1">${photo}</div>` +
          `<div class="links"><span class="pg" title="Σελίδα ${it.page} της παρουσίασης">📄 σελ. ${it.page}</span>${links}</div></div>`;
      });
    });
    el.innerHTML = h || `<div class="muted small">Δεν βρέθηκε κατασκευή για «${esc(q)}».</div>`;
    $("c_count").textContent = `${n} κατασκευ${n === 1 ? "ή" : "ές"}${q ? " για «" + q + "»" : ""} · πατήστε την κάρτα για τη σελίδα της παρουσίασης, έναν κωδικό 📐 για το σχέδιο ΕΤΚΔ`;
    el.querySelectorAll(".constr").forEach(card => {
      const [si, ci] = card.dataset.k.split(":").map(Number);
      const it = CC.sections[si].items[ci];
      card.addEventListener("click", e => {
        const b = e.target.closest("button[data-code]");
        if (b) { e.stopPropagation(); C.cur = card.dataset.k; el.querySelectorAll(".constr").forEach(c => c.classList.toggle("active", c === card)); cShowDrawing(it.etkd, +b.dataset.code, true); return; }
        if (e.target.closest(".c-thumb[data-photo]") && it.photo) { e.stopPropagation(); cSelect(si, ci, false); cFsvPhoto(it); return; }
        if (e.target.closest("button.na")) { e.stopPropagation(); return; }
        cSelect(si, ci, true);
      });
    });
  }
  function cOpen(si, ci) { C.sec = null; $("c_search").value = ""; switchTab("constr"); cSections(); cList(); cSelect(si, ci, true); }
  if ($("c_list")) {
    $("c_general").innerHTML = CC.general.map(t => `<li>${esc(t)}</li>`).join("") + (window.ETKD.updates || []).map(u => `<li class="warn"><b>${esc(u.doc)}:</b> ${esc(u.what)}</li>`).join("") + `<li class="muted">Πηγή: ${esc(CC.source)}. ${esc(CC.photos_note || "")}</li>`;
    cSections(); cStrip(); cList(); cPage(2, false);
    $("c_search").addEventListener("input", cList);
    $("c_clear").addEventListener("click", () => { $("c_search").value = ""; cList(); $("c_search").focus(); });
    $("c_prev").addEventListener("click", () => cPage(C.page - 1, true)); $("c_next").addEventListener("click", () => cPage(C.page + 1, true));
    $("c_full").addEventListener("click", cFsvPage); $("c_img").addEventListener("click", cFsvPage);
    $("ce_prev").addEventListener("click", () => cShowDrawing(C.codes, C.ci - 1, true)); $("ce_next").addEventListener("click", () => cShowDrawing(C.codes, C.ci + 1, true));
    $("ce_full").addEventListener("click", cFsvDrawing); $("ce_img").addEventListener("click", cFsvDrawing);
    $("ce_goto").addEventListener("click", () => { if (C.codes.length) window.ETKD.open(C.codes[C.ci]); });
    document.querySelectorAll("#c_views button").forEach(b => b.addEventListener("click", () => cView(b.dataset.cv)));
  }
  window.CONSTR = { open: cOpen };
  window.FSV_SHOW = fsvShow;   // κοινός προβολέας πλήρους οθόνης (χρησιμοποιείται και από την καρτέλα «Αποστάσεις ασφαλείας»)

  // ---------------------------------------------------------------- Γενικές πληροφορίες
  const GI = D.general_info || [];
  const I = { doc: null };
  function iTabs() {
    const el = $("i_tabs"); if (!el) return;
    el.innerHTML = `<button data-d="" class="${I.doc === null ? "active" : ""}">Όλες</button>` + GI.map((g, i) => `<button data-d="${i}" class="${I.doc === i ? "active" : ""}">${esc(g.code)}</button>`).join("");
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { I.doc = b.dataset.d === "" ? null : +b.dataset.d; iTabs(); iBody(); }));
  }
  function hi(text, q) {
    if (!q) return esc(text);
    const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return esc(text).replace(re, "<mark>$1</mark>");
  }
  function iBody() {
    const el = $("i_body"); if (!el) return;
    const q = $("i_search").value.trim();
    const ql = q.toLowerCase();
    let h = "";
    GI.forEach((g, gi) => {
      if (I.doc !== null && I.doc !== gi) return;
      let n = 0, body = "";
      (g.sections || []).forEach(sec => {
        const bl = (sec.bullets || []).filter(b => !ql || b.toLowerCase().includes(ql) || sec.title.toLowerCase().includes(ql));
        if (!bl.length) return;
        body += `<h3>${hi(sec.title, q)}</h3><ol start="${n + 1}">${bl.map(b => `<li>${hi(b, q)}</li>`).join("")}</ol>`;
        n += bl.length;
      });
      (g.tables || []).forEach(t => {
        const rows = t.rows || [];
        if (ql && !(t.title.toLowerCase().includes(ql) || rows.some(r => r.join(" ").toLowerCase().includes(ql)))) return;
        body += `<h3>${hi(t.title, q)}</h3><div class="tw"><table class="grid">${rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${hi(c, q)}</th>` : `<td class="l">${hi(c, q)}</td>`).join("")}</tr>`).join("")}</table></div>`;
      });
      if (!body) return;
      h += `<div class="card doc info-doc"><h2>${esc(g.code)} – ${esc(g.title)}</h2><div class="meta">${esc(g.issuer || "")}${g.edition ? " · " + esc(g.edition) : ""}${g.scope ? "<br>" + esc(g.scope) : ""}</div>${body}</div>`;
    });
    el.innerHTML = h || `<div class="card muted">Δεν βρέθηκε «${esc(q)}» στις περιλήψεις.</div>`;
  }
  if ($("i_body")) {
    iTabs(); iBody();
    $("i_search").addEventListener("input", iBody);
  }
  window.INFO = { search: q => { if (!$("i_search")) return; I.doc = null; $("i_search").value = q || ""; iTabs(); iBody(); } };
})();
