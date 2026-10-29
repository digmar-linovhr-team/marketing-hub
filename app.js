/* Marketing Hub LinovHR — aplikasi utama (vanilla JS, tanpa build step) */
(function () {
  'use strict';

  var CFG = window.MHUB_CONFIG || {};
  var DEMO = !CFG.API_URL;
  var root = document.getElementById('root');
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  var state = {
    token: LS.get('mhub_token'),
    user: JSON.parse(LS.get('mhub_user') || 'null'),
    users: [],
    cache: {}
  };

  var CONTENT_STATUS = ['Ide', 'Brief', 'Menulis', 'Review', 'Terbit'];
  var CONTENT_TYPES = ['Artikel Baru', 'Update Artikel', 'Landing Page', 'Terjemahan'];

  // ==================== API ====================
  function api(action, data) {
    var payload = Object.assign({ action: action, token: state.token }, data || {});
    var p = DEMO ? window.MockAPI(action, payload) :
      fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); });
    return p.then(function (res) {
      if (!res.ok) {
        if (res.error === 'SESSION_EXPIRED') { logout(true); throw new Error('Sesi berakhir, silakan login lagi'); }
        throw new Error(res.error || 'Terjadi kesalahan');
      }
      if (MUTATIONS[action]) cacheClear();
      return res;
    });
  }

  // ---- Cache data di perangkat: halaman tampil seketika dari data terakhir, lalu diperbarui di latar ----
  var READS = ['dashboard', 'gsc', 'ads', 'competitors', 'contentList', 'wpList', 'users'];
  var MUTATIONS = { contentSave: 1, contentDelete: 1, briefSave: 1, settingsSave: 1, competitorSave: 1, competitorDelete: 1, keywordsSave: 1, runJob: 1, wpReschedule: 1, wpUnschedule: 1 };
  var FRESH_MS = 60 * 1000;
  var memCache = {};
  var routeGen = 0;
  function ckey(a) { return 'mhub_c_' + (state.user ? state.user.email : '') + '_' + a; }
  function cacheGet(a) {
    if (memCache[a]) return memCache[a];
    try { var raw = localStorage.getItem(ckey(a)); if (raw) { memCache[a] = JSON.parse(raw); return memCache[a]; } } catch (e) { /* abaikan */ }
    return null;
  }
  function cacheSet(a, data) {
    var entry = { t: Date.now(), d: data };
    memCache[a] = entry;
    try { localStorage.setItem(ckey(a), JSON.stringify(entry)); } catch (e) { /* penyimpanan penuh → cukup di memori */ }
  }
  function cacheClear(list) {
    (list || READS).forEach(function (a) { delete memCache[a]; try { localStorage.removeItem(ckey(a)); } catch (e) { /* abaikan */ } });
  }
  function sameData(a, b) {
    function strip(k, v) { return k === 'now' || k === 'ok' ? undefined : v; }
    return JSON.stringify(a, strip) === JSON.stringify(b, strip);
  }
  // Baca data: pakai cache bila ada (langsung tampil), lalu segarkan di latar bila sudah > 1 menit
  function read(action) {
    var c = cacheGet(action);
    function fetchFresh() {
      return api(action).then(function (res) {
        var changed = !c || !sameData(c.d, res);
        cacheSet(action, res);
        return { res: res, changed: changed };
      });
    }
    if (c) {
      if (Date.now() - c.t > FRESH_MS) {
        var gen = routeGen;
        fetchFresh().then(function (o) {
          if (o.changed && gen === routeGen && !document.querySelector('.modal-bg')) route(true);
        }).catch(function () {});
      }
      return Promise.resolve(c.d);
    }
    return fetchFresh().then(function (o) { return o.res; });
  }
  // Setelah login, muat data semua halaman di latar supaya perpindahan menu instan
  function prefetch() {
    READS.forEach(function (a) {
      if (a === 'users') return;
      var c = cacheGet(a);
      if (!c || Date.now() - c.t > FRESH_MS) api(a).then(function (res) { cacheSet(a, res); }).catch(function () {});
    });
  }

  // ==================== HELPER ====================
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n, d) { return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 0 : d }); }
  function rp(n) { return 'Rp' + num(Math.round(n || 0)); }
  function rpShort(n) {
    n = Math.round(n || 0); var a = Math.abs(n);
    if (a >= 1e9) return 'Rp' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
    if (a >= 1e6) return 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
    if (a >= 1e5) return 'Rp' + (n / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' rb';
    return 'Rp' + num(n);
  }
  function pctTxt(n) { return (n * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function path(url) { return String(url || '').replace(/^https?:\/\/[^/]+/, '') || '/'; }
  function initials(name) { return String(name || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function userName(email) { var u = state.users.filter(function (x) { return x.email === email; })[0]; return u ? u.name : (email || '-'); }
  function dateID(s) {
    if (!s) return '-';
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? Number(p[2]) + ' ' + m[Number(p[1]) - 1] + ' ' + p[0] : s;
  }
  // lowerIsBetter untuk posisi & CPA
  function delta(cur, prev, lowerIsBetter, mode) {
    if (!prev && prev !== 0 || prev === 0 && cur === 0) return '<span class="delta flat">–</span>';
    var diff, txt;
    if (mode === 'abs') { diff = cur - prev; txt = (diff > 0 ? '+' : '') + num(diff, 1); }
    else { if (!prev) return '<span class="delta flat">baru</span>'; diff = (cur - prev) / prev; txt = (diff > 0 ? '+' : '') + (diff * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'; }
    if (Math.abs(diff) < (mode === 'abs' ? 0.05 : 0.005)) return '<span class="delta flat">' + txt + '</span>';
    var good = lowerIsBetter ? diff < 0 : diff > 0;
    return '<span class="delta ' + (good ? 'up' : 'down') + '">' + (diff > 0 ? '▲' : '▼') + ' ' + txt + '</span>';
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function loading(el) { el.innerHTML = '<div class="loader"><div class="spin"></div>Memuat data…</div>'; }
  function errorBox(el, err) { el.innerHTML = '<div class="card"><div class="empty">Gagal memuat: ' + esc(err.message) + '</div></div>'; }
  function statusBadge(s) {
    var cls = { Decay: 'bad', Naik: 'good', Baru: 'info', Stabil: '' }[s] || '';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }
  function contentBadge(s) {
    var cls = { Terbit: 'good', Review: 'warn', Menulis: 'info' }[s] || '';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }
  function copyText(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text).then(function () { toast('Disalin ke clipboard'); });
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast('Disalin ke clipboard');
  }

  var ICON = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    gsc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 13l2-2 2 2 3-3"/></svg>',
    ads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    comp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    content: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h5M8 17h8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>'
  };

  var ROUTES = [
    { id: 'dashboard', title: 'Dashboard', short: 'Dashboard', icon: ICON.dashboard, view: viewDashboard },
    { id: 'gsc', title: 'Search Console', short: 'SEO', icon: ICON.gsc, view: viewGSC },
    { id: 'ads', title: 'Google Ads', short: 'Ads', icon: ICON.ads, view: viewAds },
    { id: 'kompetitor', title: 'Monitor Kompetitor', short: 'Kompetitor', icon: ICON.comp, view: viewCompetitors },
    { id: 'konten', title: 'Kalender Konten', short: 'Konten', icon: ICON.content, view: viewContent },
    { id: 'pengaturan', title: 'Pengaturan', short: 'Atur', icon: ICON.settings, view: viewSettings, admin: true }
  ];

  // ==================== TEMA ====================
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function getTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function setTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    LS.set('mhub_theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1319' : '#255473');
    syncThemeUI();
  }
  function syncThemeUI() {
    var t = getTheme();
    document.querySelectorAll('[data-theme-set]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-theme-set') === t); });
    document.querySelectorAll('.theme-mobile').forEach(function (b) {
      b.innerHTML = t === 'dark' ? SUN : MOON;
      b.setAttribute('aria-label', t === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
      b.title = b.getAttribute('aria-label');
    });
  }
  function themeSwitch() {
    return '<div class="theme-switch" role="group" aria-label="Tema tampilan">' +
      '<button type="button" data-theme-set="light">' + SUN + 'Terang</button>' +
      '<button type="button" data-theme-set="dark">' + MOON + 'Gelap</button></div>';
  }
  function bindTheme(scope) {
    scope.querySelectorAll('[data-theme-set]').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-set')); }); });
    scope.querySelectorAll('.theme-mobile').forEach(function (b) { b.addEventListener('click', function () { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }); });
    syncThemeUI();
  }
  function brand(big) {
    return '<div class="brand' + (big ? ' big' : '') + '"><img src="icons/icon-192.png" alt=""><div><b>' + esc(CFG.APP_NAME || 'Marketing Hub') + '</b><small>Linov<strong>HR</strong></small></div></div>';
  }

  // ==================== AUTH ====================
  function renderLogin() {
    root.innerHTML =
      '<div class="login-wrap"><div class="login-theme">' + themeSwitch() + '</div><form class="login-card" id="loginForm">' +
      brand(true) +
      '<h1>Masuk</h1>' +
      '<p>Masuk untuk memantau SEO, iklan, kompetitor, dan konten.</p>' +
      (DEMO ? '<div class="alert-box" style="margin-bottom:14px">Mode demo — isi email & PIN apa saja.</div>' : '') +
      '<div class="field"><label for="email">Email kantor</label><input id="email" type="email" autocomplete="username" required placeholder="nama@linovhr.com"></div>' +
      '<div class="field"><label for="pin">PIN</label><input id="pin" type="password" autocomplete="current-password" required minlength="' + (DEMO ? 1 : 6) + '"></div>' +
      '<button class="btn btn-primary btn-block" type="submit" id="loginBtn">Masuk</button>' +
      '<div class="error-text" id="loginErr"></div></form></div>';
    bindTheme(root);
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('loginBtn'), err = document.getElementById('loginErr');
      btn.disabled = true; btn.textContent = 'Memeriksa…'; err.textContent = '';
      api('login', { email: document.getElementById('email').value, pin: document.getElementById('pin').value })
        .then(function (res) {
          state.token = res.token; state.user = res.user;
          LS.set('mhub_token', res.token); LS.set('mhub_user', JSON.stringify(res.user));
          if (!location.hash) location.hash = '#dashboard';
          boot();
        })
        .catch(function (e2) { err.textContent = e2.message; btn.disabled = false; btn.textContent = 'Masuk'; });
    });
  }

  function logout(silent) {
    if (!silent && state.token) api('logout').catch(function () {});
    cacheClear(); memCache = {};
    state.token = null; state.user = null; state.cache = {};
    LS.del('mhub_token'); LS.del('mhub_user');
    renderLogin();
  }

  // ==================== SHELL ====================
  function currentRoute() {
    var id = (location.hash || '#dashboard').slice(1).split('?')[0];
    var r = ROUTES.filter(function (x) { return x.id === id; })[0] || ROUTES[0];
    if (r.admin && state.user.role !== 'admin') r = ROUTES[0];
    return r;
  }

  function renderShell() {
    var routes = ROUTES.filter(function (r) { return !r.admin || state.user.role === 'admin'; });
    var nav = routes.map(function (r) { return '<a href="#' + r.id + '" data-r="' + r.id + '">' + r.icon + '<span>' + r.title + '</span></a>'; }).join('');
    var bnav = routes.map(function (r) { return '<a href="#' + r.id + '" data-r="' + r.id + '">' + r.icon + '<span>' + r.short + '</span></a>'; }).join('');
    root.innerHTML =
      '<div class="app">' +
      '<aside class="sidebar">' + brand(false) +
      '<nav class="nav">' + nav + '</nav>' +
      '<div class="sidebar-foot"><div style="margin-bottom:12px">' + themeSwitch() + '</div><div class="user-chip"><div class="avatar">' + esc(initials(state.user.name)) + '</div>' +
      '<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(state.user.name) + '</div>' +
      '<div class="muted small">' + esc(state.user.jabatan || state.user.role) + '</div></div>' +
      '<button class="icon-btn" id="logoutBtn" title="Keluar" aria-label="Keluar">' + ICON.logout + '</button></div></div></aside>' +
      '<main class="main">' + (DEMO ? '<div class="demo-banner">Mode demo: data contoh. Isi API_URL di config.js untuk memakai data asli.</div>' : '') +
      '<div class="topbar"><div><h2 id="pageTitle"></h2><div class="sub" id="pageSub"></div></div><div class="topbar-right"><div id="pageActions" class="toolbar" style="margin:0"></div><button type="button" class="icon-btn theme-mobile"></button></div></div>' +
      '<div class="content" id="view"></div></main>' +
      '<nav class="bottom-nav">' + bnav + '</nav></div>';
    document.getElementById('logoutBtn').addEventListener('click', function () { if (confirm('Keluar dari Marketing Hub?')) logout(); });
    bindTheme(root);
  }

  function route(quiet) {
    if (!state.token) return renderLogin();
    if (!document.getElementById('view')) renderShell();
    if (quiet !== true) routeGen++;
    var r = currentRoute();
    document.querySelectorAll('[data-r]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-r') === r.id); });
    document.getElementById('pageTitle').textContent = r.title;
    document.getElementById('pageSub').textContent = '';
    document.getElementById('pageActions').innerHTML = '';
    document.title = r.title + ' · ' + (CFG.APP_NAME || 'Marketing Hub');
    var v = document.getElementById('view');
    if (quiet !== true) { loading(v); window.scrollTo(0, 0); }
    var y = window.scrollY;
    r.view(v).then(function () { if (quiet === true) window.scrollTo(0, y); }).catch(function (e) { errorBox(v, e); });
  }

  function setSub(txt) { var el = document.getElementById('pageSub'); if (el) el.textContent = txt; }
  function setActions(html) { var el = document.getElementById('pageActions'); if (el) el.innerHTML = html; return el; }

  // ==================== DASHBOARD ====================
  // Kelompok angka utama: satu kartu, satu periode, beberapa metrik sejajar
  function stat(label, value, deltaHtml) { return { label: label, value: value, delta: deltaHtml }; }
  function statGroup(title, caption, stats, cls) {
    return '<section class="card stat-group ' + (cls || '') + '"><header class="sg-head"><h3>' + title + '</h3>' + (caption ? '<span class="sg-cap">' + caption + '</span>' : '') + '</header>' +
      '<div class="sg-row">' + stats.map(function (st) {
        return '<div class="stat"><div class="stat-label">' + st.label + '</div><div class="stat-value" title="' + esc(String(st.value).replace(/<[^>]+>/g, '')) + '">' + st.value + '</div>' +
          '<div class="stat-foot">' + (st.delta || '<span class="delta flat">–</span>') + '</div></div>';
      }).join('') + '</div></section>';
  }

  function viewDashboard(v) {
    return read('dashboard').then(function (d) {
      setSub('Sinkron terakhir — GSC: ' + (d.sync.gsc || 'belum') + ' · Ads: ' + (d.sync.ads || 'belum') + ' · Kompetitor: ' + (d.sync.competitors || 'belum'));
      var a = d.ads.cur, ap = d.ads.prev;
      var cpa = a.conversions ? a.cost / a.conversions : 0, cpaP = ap.conversions ? ap.cost / ap.conversions : 0;
      var today_ = today();
      v.innerHTML =
        '<div class="grid grid-2">' +
        statGroup('Organik', '28 hari vs 28 hari sebelumnya', [
          stat('Klik', num(d.gsc.clicks), delta(d.gsc.clicks, d.gsc.prevClicks)),
          stat('Impresi', MChart.shortNum(d.gsc.impressions), delta(d.gsc.impressions, d.gsc.prevImpressions)),
          stat('Posisi rata-rata', num(d.gsc.position, 1), delta(d.gsc.position, d.gsc.prevPosition, true, 'abs'))
        ]) +
        statGroup('Google Ads', '7 hari vs 7 hari sebelumnya', [
          stat('Biaya', rpShort(a.cost), a.cost || ap.cost ? delta(a.cost, ap.cost, true) : ''),
          stat('Konversi', num(a.conversions, 1), a.conversions || ap.conversions ? delta(a.conversions, ap.conversions) : ''),
          stat('CPA', cpa ? rpShort(cpa) : '–', cpa && cpaP ? delta(cpa, cpaP, true) : '')
        ]) +
        '</div>' +
        '<div class="card section"><h3>Klik organik harian <span class="muted">90 hari terakhir</span></h3><div id="chClicks"></div></div>' +
        '<div class="grid grid-2 section">' +
        '<div class="card"><h3>Artikel perlu di-refresh <a class="small" href="#gsc?tab=pages&f=Decay">' + d.decayCount + ' decay →</a></h3>' +
        (d.decay.length ? '<ul class="list">' + d.decay.map(function (p) {
          return '<li><div class="main-txt"><a href="' + esc(p.page) + '" target="_blank" rel="noopener">' + esc(path(p.page)) + '</a><div class="muted small">Klik ' + num(p.prev_clicks) + ' → ' + num(p.clicks) + ' · posisi ' + num(p.prev_position, 1) + ' → ' + num(p.position, 1) + '</div></div>' +
            '<span class="delta down nowrap">' + num(p.delta_clicks_pct, 1) + '%</span></li>';
        }).join('') + '</ul>' : '<div class="empty">Tidak ada artikel yang turun signifikan</div>') + '</div>' +
        '<div class="card"><h3>Keyword pantauan turun posisi</h3>' +
        (d.watchDrops.length ? '<ul class="list">' + d.watchDrops.map(function (w) {
          return '<li><div class="main-txt"><b>' + esc(w.keyword) + '</b><div class="muted small">Posisi ' + num(w.prev, 1) + ' → ' + num(w.position, 1) + '</div></div><span class="delta down nowrap">▼ ' + num(w.delta, 1) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty">Semua keyword pantauan aman</div>') + '</div>' +
        '<div class="card"><h3>Artikel baru kompetitor (relevan) <a class="small" href="#kompetitor">' + d.competitors.newCount + ' URL baru 7 hari →</a></h3>' +
        (d.competitors.relevant.length ? '<ul class="list">' + d.competitors.relevant.map(function (r) {
          return '<li><div class="main-txt"><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title || path(r.url)) + '</a><div class="muted small">' + esc(r.competitor) + ' · ' + dateID(r.first_seen) + '</div></div><span class="badge info">' + esc(r.matched_keyword) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty">Belum ada artikel relevan minggu ini</div>') + '</div>' +
        '<div class="card"><h3>Konten <a class="small" href="#konten">Buka kalender →</a></h3>' +
        (d.wp && d.wp.configured ? '<div class="tags" style="margin-bottom:10px"><span class="badge info">WordPress · ' + d.wp.week + ' terjadwal 7 hari</span><span class="badge">' + d.wp.drafts + ' draft</span>' + (d.wp.missed ? '<span class="badge bad">' + d.wp.missed + ' gagal terbit</span>' : '') + (d.wp.notLive ? '<span class="badge warn">' + d.wp.notLive + ' belum tayang</span>' : '') + '</div>' : '') +
        '<div class="tags" style="margin-bottom:10px">' + d.content.byStatus.map(function (s) { return '<span class="badge">' + s.status + ' · ' + s.count + '</span>'; }).join('') + '</div>' +
        (d.content.overdue.length + d.content.dueSoon.length ? '<ul class="list">' + d.content.overdue.concat(d.content.dueSoon).map(function (c) {
          var late = c.due_date < today_;
          return '<li><div class="main-txt"><b>' + esc(c.title) + '</b><div class="muted small">' + esc(userName(c.pic)) + ' · ' + esc(c.status) + '</div></div>' +
            '<span class="badge ' + (late ? 'bad' : 'warn') + '">' + (late ? 'Terlambat · ' : '') + dateID(c.due_date) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty">Tidak ada konten jatuh tempo minggu ini</div>') + '</div>' +
        '</div>';
      MChart.line(document.getElementById('chClicks'), d.gsc.daily.map(function (r) { return { x: r.date, y: Number(r.clicks) }; }), { label: 'Klik', height: 230 });
    });
  }

  // ==================== SEARCH CONSOLE ====================
  function hashParams() {
    var q = (location.hash.split('?')[1] || '');
    var o = {}; q.split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); o[p[0]] = decodeURIComponent(p[1] || ''); } });
    return o;
  }

  function sortableTable(cols, rows, opts) {
    // cols: [{k, label, num, render, lowerIsBetter}]
    opts = opts || {};
    var id = 't' + Math.random().toString(36).slice(2, 8);
    var st = { k: opts.sortKey || cols[1].k, dir: opts.sortDir || -1, limit: opts.limit || 100 };
    function html() {
      var sorted = rows.slice().sort(function (a, b) {
        var x = a[st.k], y = b[st.k];
        if (x === '' || x == null) return 1; if (y === '' || y == null) return -1;
        return (typeof x === 'number' || !isNaN(x) && x !== '' ? (Number(x) - Number(y)) : String(x).localeCompare(String(y))) * st.dir;
      });
      var shown = sorted.slice(0, st.limit);
      return '<div class="table-wrap"><table><thead><tr>' + cols.map(function (c) {
        return '<th class="sortable ' + (c.num ? 'num' : '') + '" data-k="' + c.k + '">' + c.label + (st.k === c.k ? (st.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>';
      }).join('') + (opts.action ? '<th></th>' : '') + '</tr></thead><tbody>' +
        (shown.length ? shown.map(function (r, i) {
          return '<tr>' + cols.map(function (c) { return '<td class="' + (c.num ? 'num nowrap' : '') + (c.cls ? ' ' + c.cls : '') + '">' + (c.render ? c.render(r) : esc(r[c.k])) + '</td>'; }).join('') +
            (opts.action ? '<td class="nowrap">' + opts.action(r, i) + '</td>' : '') + '</tr>';
        }).join('') : '<tr><td colspan="' + (cols.length + 1) + '"><div class="empty">Tidak ada data</div></td></tr>') +
        '</tbody></table></div>' +
        (sorted.length > st.limit ? '<div style="text-align:center;margin-top:10px"><button class="btn btn-sm" data-more>Tampilkan lebih banyak (' + (sorted.length - st.limit) + ' lagi)</button></div>' : '') +
        '<div class="muted small" style="margin-top:8px">' + num(sorted.length) + ' baris</div>';
    }
    function mount(container) {
      container.innerHTML = html();
      container.querySelectorAll('th.sortable').forEach(function (th) {
        th.addEventListener('click', function () {
          var k = th.getAttribute('data-k');
          if (st.k === k) st.dir *= -1; else { st.k = k; st.dir = -1; }
          mount(container);
        });
      });
      var more = container.querySelector('[data-more]');
      if (more) more.addEventListener('click', function () { st.limit += 200; mount(container); });
      if (opts.onMount) opts.onMount(container, rows);
    }
    return { mount: mount, id: id };
  }

  function viewGSC(v) {
    return read('gsc').then(function (d) {
      var r = d.ranges || {};
      setSub('Periode ' + dateID(r.curStart) + ' – ' + dateID(r.curEnd) + ' dibanding ' + dateID(r.prevStart) + ' – ' + dateID(r.prevEnd) + ' · sinkron ' + (d.lastPull || 'belum'));
      var params = hashParams();
      var tab = params.tab || 'pages';
      var filt = params.f || 'Semua';
      var watchSet = {}; d.watch.forEach(function (w) { watchSet[String(w.keyword).toLowerCase()] = w; });
      var pages = d.pages.map(function (p) { p.clicks = Number(p.clicks); p.impressions = Number(p.impressions); p.position = Number(p.position); p.prev_clicks = Number(p.prev_clicks); p.ctr = Number(p.ctr); return p; });
      var queries = d.queries.map(function (q) { ['clicks', 'impressions', 'position', 'ctr', 'prev_position', 'prev_clicks'].forEach(function (k) { q[k] = Number(q[k]); }); return q; });

      v.innerHTML =
        '<div class="grid grid-2">' +
        '<div class="card"><h3>Klik harian</h3><div id="chC"></div></div>' +
        '<div class="card"><h3>Impresi harian</h3><div id="chI"></div></div></div>' +
        '<div class="card section"><div class="toolbar"><div class="seg" id="tabs">' +
        '<button data-t="pages">Halaman</button><button data-t="queries">Query</button><button data-t="watch">Keyword pantauan</button></div>' +
        '<div class="spacer"></div><div class="select-wrap" id="fStatusWrap"><span class="select-label">Status</span><select id="fStatus" aria-label="Status halaman"><option>Semua</option><option>Decay</option><option>Naik</option><option>Baru</option><option>Stabil</option></select></div>' +
        '<input type="search" id="fSearch" placeholder="Cari…"></div><div id="tbl"></div></div>';

      MChart.line(document.getElementById('chC'), d.daily.map(function (x) { return { x: x.date, y: Number(x.clicks) }; }), { label: 'Klik' });
      MChart.line(document.getElementById('chI'), d.daily.map(function (x) { return { x: x.date, y: Number(x.impressions) }; }), { label: 'Impresi' });

      var fStatus = document.getElementById('fStatus'), fSearch = document.getElementById('fSearch');
      fStatus.value = filt;

      function draw() {
        document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-t') === tab); });
        document.getElementById('fStatusWrap').classList.toggle('hidden', tab !== 'pages');
        var s = fSearch.value.trim().toLowerCase();
        var tbl = document.getElementById('tbl');
        if (tab === 'pages') {
          var rows = pages.filter(function (p) { return (fStatus.value === 'Semua' || p.status === fStatus.value) && (!s || p.page.toLowerCase().indexOf(s) > -1); });
          sortableTable([
            { k: 'page', label: 'Halaman', cls: 'url-cell', render: function (p) { return '<a href="' + esc(p.page) + '" target="_blank" rel="noopener">' + esc(path(p.page)) + '</a>'; } },
            { k: 'clicks', label: 'Klik', num: true, render: function (p) { return num(p.clicks); } },
            { k: 'delta_clicks_pct', label: 'Δ Klik', num: true, render: function (p) { return p.delta_clicks_pct === '' ? '<span class="muted">–</span>' : delta(p.clicks, p.prev_clicks); } },
            { k: 'impressions', label: 'Impresi', num: true, render: function (p) { return num(p.impressions); } },
            { k: 'ctr', label: 'CTR', num: true, render: function (p) { return pctTxt(p.ctr); } },
            { k: 'position', label: 'Posisi', num: true, render: function (p) { return num(p.position, 1) + (p.prev_position ? ' ' + delta(p.position, Number(p.prev_position), true, 'abs') : ''); } },
            { k: 'status', label: 'Status', render: function (p) { return statusBadge(p.status); } }
          ], rows, {
            sortKey: fStatus.value === 'Decay' ? 'delta_clicks_pct' : 'clicks', sortDir: fStatus.value === 'Decay' ? 1 : -1,
            action: function (p, i) { return p.status === 'Decay' ? '<button class="btn btn-sm" data-refresh="' + esc(p.page) + '">+ Jadwalkan refresh</button>' : ''; },
            onMount: function (c) {
              c.querySelectorAll('[data-refresh]').forEach(function (b) {
                b.addEventListener('click', function () {
                  var url = b.getAttribute('data-refresh');
                  var kw = path(url).replace(/^\/(blog\/)?|\/$/g, '').replace(/-/g, ' ');
                  openContentModal({ title: 'Refresh: ' + path(url), target_keyword: kw, type: 'Update Artikel', status: 'Ide', url: url, due_date: addDays(today(), 7), notes: 'Klik turun dari data Search Console. Perbarui data, tambah bagian baru, cek intent SERP.' });
                });
              });
            }
          }).mount(tbl);
        } else if (tab === 'queries') {
          var qrows = queries.filter(function (q) { return !s || q.query.indexOf(s) > -1; });
          sortableTable([
            { k: 'query', label: 'Query', render: function (q) { return esc(q.query) + (watchSet[q.query] ? ' <span class="badge info">pantau</span>' : ''); } },
            { k: 'clicks', label: 'Klik', num: true, render: function (q) { return num(q.clicks) + ' ' + delta(q.clicks, q.prev_clicks); } },
            { k: 'impressions', label: 'Impresi', num: true, render: function (q) { return num(q.impressions); } },
            { k: 'ctr', label: 'CTR', num: true, render: function (q) { return pctTxt(q.ctr); } },
            { k: 'position', label: 'Posisi', num: true, render: function (q) { return num(q.position, 1); } },
            { k: 'delta_position', label: 'Δ Posisi', num: true, render: function (q) { return q.prev_position ? delta(q.position, q.prev_position, true, 'abs') : '<span class="muted">baru</span>'; } }
          ], qrows, { sortKey: 'clicks' }).mount(tbl);
        } else {
          var wrows = d.watch.map(function (w) {
            var q = queries.filter(function (x) { return x.query === String(w.keyword).toLowerCase(); })[0];
            return { keyword: w.keyword, prioritas: w.prioritas, position: q ? q.position : '', prev_position: q ? q.prev_position : '', clicks: q ? q.clicks : '', impressions: q ? q.impressions : '', delta_position: q && q.prev_position ? q.position - q.prev_position : '' };
          }).filter(function (w) { return !s || w.keyword.indexOf(s) > -1; });
          sortableTable([
            { k: 'keyword', label: 'Keyword', render: function (w) { return '<b>' + esc(w.keyword) + '</b>' + (w.prioritas === 'Tinggi' ? ' <span class="badge warn">prioritas</span>' : ''); } },
            { k: 'position', label: 'Posisi', num: true, render: function (w) { return w.position === '' ? '<span class="muted">tidak muncul</span>' : num(w.position, 1); } },
            { k: 'delta_position', label: 'Δ Posisi', num: true, render: function (w) { return w.prev_position ? delta(w.position, w.prev_position, true, 'abs') : '<span class="muted">–</span>'; } },
            { k: 'clicks', label: 'Klik', num: true, render: function (w) { return w.clicks === '' ? '–' : num(w.clicks); } },
            { k: 'impressions', label: 'Impresi', num: true, render: function (w) { return w.impressions === '' ? '–' : num(w.impressions); } }
          ], wrows, { sortKey: 'position', sortDir: 1 }).mount(tbl);
          if (!d.watch.length) tbl.innerHTML = '<div class="empty">Belum ada keyword pantauan. Admin bisa menambahkannya di Pengaturan.</div>';
        }
      }
      document.querySelectorAll('#tabs button').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); draw(); }); });
      fStatus.addEventListener('change', draw);
      fSearch.addEventListener('input', draw);
      draw();
    });
  }

  // ==================== GOOGLE ADS ====================
  function viewAds(v) {
    return read('ads').then(function (d) {
      setSub('Sinkron terakhir: ' + (d.lastSync || 'belum') + ' · data sampai kemarin');
      var rows = d.rows.map(function (r) { ['impressions', 'clicks', 'cost', 'conversions'].forEach(function (k) { r[k] = Number(r[k] || 0); }); return r; });
      var range = Number(LS.get('mhub_ads_range') || 30);
      var act = setActions('<div class="seg" id="rangeSeg"><button data-d="7">7 hari</button><button data-d="30">30 hari</button><button data-d="90">90 hari</button></div>');

      function agg(list) {
        var o = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
        list.forEach(function (r) { o.impressions += r.impressions; o.clicks += r.clicks; o.cost += r.cost; o.conversions += r.conversions; });
        o.ctr = o.impressions ? o.clicks / o.impressions : 0; o.cpc = o.clicks ? o.cost / o.clicks : 0; o.cpa = o.conversions ? o.cost / o.conversions : 0;
        return o;
      }

      function draw() {
        act.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', Number(b.getAttribute('data-d')) === range); });
        var t = today(), from = addDays(t, -range), pfrom = addDays(t, -range * 2);
        var cur = rows.filter(function (r) { return r.date >= from && r.date < t; });
        var prev = rows.filter(function (r) { return r.date >= pfrom && r.date < from; });
        var a = agg(cur), p = agg(prev);
        var byDate = {};
        cur.forEach(function (r) { byDate[r.date] = byDate[r.date] || { cost: 0, clicks: 0, conversions: 0 }; byDate[r.date].cost += r.cost; byDate[r.date].clicks += r.clicks; byDate[r.date].conversions += r.conversions; });
        var dates = Object.keys(byDate).sort();
        var camps = {};
        cur.forEach(function (r) { (camps[r.campaign] = camps[r.campaign] || []).push(r); });
        var prevCamps = {};
        prev.forEach(function (r) { (prevCamps[r.campaign] = prevCamps[r.campaign] || []).push(r); });
        var crows = Object.keys(camps).map(function (k) {
          var x = agg(camps[k]), y = agg(prevCamps[k] || []);
          return { campaign: k, type: camps[k][0].campaign_type, impressions: x.impressions, clicks: x.clicks, ctr: x.ctr, cpc: x.cpc, cost: x.cost, conversions: x.conversions, cpa: x.cpa, prevCost: y.cost, prevConv: y.conversions, prevCpa: y.cpa };
        });

        v.innerHTML = (rows.length ? '' : '<div class="alert-box" style="margin-bottom:16px">Belum ada data Ads. Data akan masuk otomatis setelah laporan terjadwal Google Ads "Marketing Hub Ads" terkirim ke email dan diimpor (setiap 4 jam).</div>') +
          '<div class="grid grid-2">' +
          statGroup('Jangkauan', range + ' hari vs ' + range + ' hari sebelumnya', [
            stat('Biaya', rpShort(a.cost), delta(a.cost, p.cost, true)),
            stat('Klik', num(a.clicks), delta(a.clicks, p.clicks)),
            stat('CTR', pctTxt(a.ctr), delta(a.ctr, p.ctr))
          ]) +
          statGroup('Efisiensi', range + ' hari vs ' + range + ' hari sebelumnya', [
            stat('CPC', rpShort(a.cpc), delta(a.cpc, p.cpc, true)),
            stat('Konversi', num(a.conversions, 1), delta(a.conversions, p.conversions)),
            stat('CPA', a.cpa ? rpShort(a.cpa) : '–', a.cpa && p.cpa ? delta(a.cpa, p.cpa, true) : '')
          ]) +
          '</div>' +
          '<div class="grid grid-2 section"><div class="card"><h3>Biaya harian</h3><div id="chCost"></div></div>' +
          '<div class="card"><h3>Konversi harian</h3><div id="chConv"></div></div></div>' +
          '<div class="card section"><h3>Per campaign <span class="muted">' + range + ' hari terakhir</span></h3><div id="campTbl"></div></div>';

        MChart.bar(document.getElementById('chCost'), dates.map(function (k) { return { x: k, y: byDate[k].cost }; }), { label: 'Biaya', format: rp });
        MChart.bar(document.getElementById('chConv'), dates.map(function (k) { return { x: k, y: Math.round(byDate[k].conversions * 10) / 10 }; }), { label: 'Konversi', format: function (n) { return num(n, 1); } });
        sortableTable([
          { k: 'campaign', label: 'Campaign', render: function (c) { return '<b>' + esc(c.campaign) + '</b><div class="muted small">' + esc(String(c.type || '').replace(/_/g, ' ').toLowerCase()) + '</div>'; } },
          { k: 'impressions', label: 'Impresi', num: true, render: function (c) { return num(c.impressions); } },
          { k: 'clicks', label: 'Klik', num: true, render: function (c) { return num(c.clicks); } },
          { k: 'ctr', label: 'CTR', num: true, render: function (c) { return pctTxt(c.ctr); } },
          { k: 'cpc', label: 'CPC', num: true, render: function (c) { return rp(c.cpc); } },
          { k: 'cost', label: 'Biaya', num: true, render: function (c) { return rp(c.cost) + '<br>' + delta(c.cost, c.prevCost, true); } },
          { k: 'conversions', label: 'Konversi', num: true, render: function (c) { return num(c.conversions, 1) + '<br>' + delta(c.conversions, c.prevConv); } },
          { k: 'cpa', label: 'CPA', num: true, render: function (c) { return c.cpa ? rp(c.cpa) + '<br>' + (c.prevCpa ? delta(c.cpa, c.prevCpa, true) : '') : '–'; } }
        ], crows, { sortKey: 'cost' }).mount(document.getElementById('campTbl'));
      }
      act.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { range = Number(b.getAttribute('data-d')); LS.set('mhub_ads_range', range); draw(); }); });
      draw();
    });
  }

  // ==================== KOMPETITOR ====================
  var compFilter = { comp: '', rel: true, q: '' };
  function viewCompetitors(v) {
    return read('competitors').then(function (d) {
      setSub('Cek sitemap harian · terakhir ' + (d.lastCheck || 'belum'));
      if (!d.competitors.length) {
        v.innerHTML = '<div class="card"><div class="empty">Belum ada kompetitor. ' + (state.user.role === 'admin' ? '<a href="#pengaturan">Tambahkan di Pengaturan →</a>' : 'Minta admin menambahkannya.') + '</div></div>';
        return;
      }
      if (compFilter.comp && !d.competitors.some(function (c) { return c.id === compFilter.comp; })) compFilter.comp = '';
      var usePills = d.competitors.length <= 6;
      v.innerHTML =
        '<div class="card"><div class="toolbar filter-bar"><div id="compFilter" class="pills" role="tablist" aria-label="Filter kompetitor"></div>' +
        '<span class="vsep" aria-hidden="true"></span>' +
        '<label class="switch"><input type="checkbox" id="fRel"' + (compFilter.rel ? ' checked' : '') + '><span class="track" aria-hidden="true"></span>Hanya relevan</label>' +
        '<div class="spacer"></div><input type="search" id="fQ" placeholder="Cari judul atau URL" value="' + esc(compFilter.q) + '"></div><div id="artTbl"></div></div>';

      function base() { return d.articles.filter(function (a) { return !compFilter.rel || a.relevant === 'Y'; }); }
      function drawFilter() {
        var list = base();
        var count = function (id) { return list.filter(function (a) { return !id || a.competitor_id === id; }).length; };
        var box = document.getElementById('compFilter');
        if (usePills) {
          box.innerHTML = [{ id: '', name: 'Semua' }].concat(d.competitors).map(function (c) {
            var on = compFilter.comp === c.id;
            return '<button type="button" role="tab" aria-selected="' + on + '" class="pill' + (on ? ' on' : '') + '" data-comp="' + esc(c.id) + '">' + esc(c.name) + '<span class="n">' + num(count(c.id)) + '</span></button>';
          }).join('');
          box.querySelectorAll('[data-comp]').forEach(function (b) {
            b.addEventListener('click', function () { compFilter.comp = b.getAttribute('data-comp'); drawFilter(); drawTable(); });
          });
        } else {
          box.innerHTML = '<div class="select-wrap"><span class="select-label">Kompetitor</span><select id="fComp" aria-label="Kompetitor">' +
            [{ id: '', name: 'Semua' }].concat(d.competitors).map(function (c) {
              return '<option value="' + esc(c.id) + '"' + (compFilter.comp === c.id ? ' selected' : '') + '>' + esc(c.name) + ' (' + num(count(c.id)) + ')</option>';
            }).join('') + '</select></div>';
          document.getElementById('fComp').addEventListener('change', function (e) { compFilter.comp = e.target.value; drawTable(); });
        }
      }
      function drawTable() {
        var q = compFilter.q.trim().toLowerCase();
        var rows = base().filter(function (a) {
          return (!compFilter.comp || a.competitor_id === compFilter.comp) && (!q || (a.title + ' ' + a.url).toLowerCase().indexOf(q) > -1);
        });
        sortableTable([
          { k: 'first_seen', label: 'Terdeteksi', render: function (a) { return '<span class="nowrap">' + dateID(a.first_seen) + '</span>'; } },
          { k: 'competitor', label: 'Kompetitor', render: function (a) { return esc(a.competitor); } },
          { k: 'title', label: 'Artikel', cls: 'url-cell', render: function (a) { return '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.title || path(a.url)) + '</a>' + (a.title ? '<div class="muted small">' + esc(path(a.url)) + '</div>' : ''); } },
          { k: 'matched_keyword', label: 'Keyword', render: function (a) { return a.matched_keyword ? '<span class="badge info">' + esc(a.matched_keyword) + '</span>' : '<span class="muted">–</span>'; } }
        ], rows, {
          sortKey: 'first_seen',
          action: function (a, i) { return '<button class="btn btn-sm" data-counter="' + i + '">+ Konten tandingan</button>'; },
          onMount: function (cont) {
            cont.querySelectorAll('[data-counter]').forEach(function (b) {
              b.addEventListener('click', function () {
                var link = b.closest('tr').querySelector('a').getAttribute('href');
                var a = rows.filter(function (x) { return x.url === link; })[0] || {};
                openContentModal({ title: a.title || '', target_keyword: a.matched_keyword || '', type: 'Artikel Baru', status: 'Ide', due_date: addDays(today(), 14), notes: 'Referensi kompetitor: ' + a.url });
              });
            });
          }
        }).mount(document.getElementById('artTbl'));
        if (!rows.length) document.getElementById('artTbl').innerHTML = '<div class="empty">' + (compFilter.rel ? 'Belum ada artikel baru yang relevan. Matikan "Hanya relevan" untuk melihat semua URL baru.' : 'Belum ada URL baru.') + '</div>';
      }
      document.getElementById('fRel').addEventListener('change', function (e) { compFilter.rel = e.target.checked; drawFilter(); drawTable(); });
      document.getElementById('fQ').addEventListener('input', function (e) { compFilter.q = e.target.value; drawTable(); });
      drawFilter();
      drawTable();
    });
  }

  // ==================== KONTEN ====================
  var calMonth = null;
  var WP_FILTER_DEFAULT = { future: true, publish: true, plan: false };
  function wpTime(p) { return String(p.date || '').slice(11, 16); }
  function wpDay(p) { return String(p.date || '').slice(0, 10); }
  function wpMissed(p, now) { return p.status === 'future' && p.date < now; }
  function wpNotLive(p) { return p.status === 'publish' && p.live && p.live !== 'live'; }

  function viewContent(v) {
    return Promise.all([read('contentList'), read('wpList').catch(function () { return { configured: false, posts: [], canManage: false }; })]).then(function (res) {
      var d = res[0], wp = res[1];
      state.cache.content = d.items;
      var mode = LS.get('mhub_content_mode') || 'calendar';
      var act = setActions('<div class="seg" id="modeSeg"><button data-m="calendar">Kalender</button><button data-m="board">Rencana</button><button data-m="list">List</button></div><button class="btn btn-primary" id="addContent">+ Rencana</button>');
      act.querySelector('#addContent').addEventListener('click', function () { openContentModal({ status: 'Ide', type: 'Artikel Baru', due_date: addDays(today(), 7) }); });
      var items = d.items;
      var t = today();
      var now = t + ' ' + new Date().toTimeString().slice(0, 5);
      var posts = wp.posts || [];
      var filt;
      try { filt = Object.assign({}, WP_FILTER_DEFAULT, JSON.parse(LS.get('mhub_wp_filter') || '{}')); } catch (e) { filt = Object.assign({}, WP_FILTER_DEFAULT); }
      if (!wp.configured) filt.plan = true;

      function setCalSub() {
        if (mode === 'calendar') {
          var fut = posts.filter(function (p) { return p.status === 'future'; });
          setSub(wp.configured ? fut.length + ' post terjadwal di WordPress · sinkron ' + (wp.lastSync || 'belum') : 'WordPress belum terhubung');
        } else {
          setSub(items.filter(function (c) { return c.status !== 'Terbit' && c.due_date && c.due_date < t; }).length + ' rencana terlambat · ' + items.filter(function (c) { return c.status !== 'Terbit'; }).length + ' sedang berjalan');
        }
      }

      function card(c) {
        var late = c.status !== 'Terbit' && c.due_date && c.due_date < t;
        return '<div class="kcard" data-id="' + esc(c.id) + '"><div class="t">' + esc(c.title) + '</div><div class="m">' +
          (c.target_keyword ? '<span>' + esc(c.target_keyword) + '</span>' : '') + '<span>' + esc(c.type) + '</span>' +
          '<span class="' + (late ? 'late' : '') + '">' + (c.status === 'Terbit' ? 'Terbit ' + dateID(c.publish_date) : 'Due ' + dateID(c.due_date)) + '</span>' +
          '<span>' + esc(userName(c.pic)) + '</span></div></div>';
      }

      function bindPlanClicks() {
        v.querySelectorAll('[data-id], [data-open]').forEach(function (n) {
          n.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            var id = n.getAttribute('data-id') || n.getAttribute('data-open');
            var it = items.filter(function (c) { return c.id === id; })[0];
            if (it) openContentModal(it);
          });
        });
      }

      function drawCalendar() {
        var base = calMonth || t.slice(0, 7);
        var y = Number(base.slice(0, 4)), mo = Number(base.slice(5, 7)) - 1;
        var first = new Date(y, mo, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
        var monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        var canDrag = wp.canManage;
        var cells = '';
        for (var i = 0; i < 42; i++) {
          var dd = new Date(start); dd.setDate(start.getDate() + i);
          var ds = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
          var dayPosts = posts.filter(function (p) { return wpDay(p) === ds && filt[p.status]; })
            .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          var dayPlans = filt.plan ? items.filter(function (c) { return (c.status === 'Terbit' ? (c.publish_date || c.due_date) : c.due_date) === ds; }) : [];
          cells += '<div class="day' + (dd.getMonth() !== mo ? ' other' : '') + (ds === t ? ' today' : '') + '" data-date="' + ds + '"><div class="dnum">' + dd.getDate() + '</div>' +
            dayPosts.map(function (p) {
              var missed = wpMissed(p, now), notLive = wpNotLive(p);
              var cls = missed ? 'wp-missed' : notLive ? 'wp-notlive' : 'wp-' + p.status;
              var drag = canDrag && p.status === 'future' ? ' draggable="true"' : '';
              return '<span class="chip ' + cls + '" data-wp="' + esc(p.id) + '"' + drag + ' title="' + esc(wpTime(p) + ' · ' + p.title + ' · ' + (missed ? 'Gagal terbit' : notLive ? 'Terbit di WordPress, belum tayang di website' : p.status_label)) + '"><span class="tm">' + esc(wpTime(p)) + '</span>' + (p.lang && p.lang !== 'id' ? '<span class="lang">' + esc(String(p.lang).toUpperCase()) + '</span>' : '') + esc(p.title) + '</span>';
            }).join('') +
            dayPlans.map(function (c) { return '<span class="chip plan st-' + esc(c.status) + '" data-id="' + esc(c.id) + '" title="' + esc('Rencana: ' + c.title + ' · ' + c.status) + '">' + esc(c.title) + '</span>'; }).join('') + '</div>';
          if (i >= 34 && dd.getMonth() !== mo && dd.getDay() === 0) break;
        }
        var drafts = posts.filter(function (p) { return p.status === 'draft' || p.status === 'pending'; })
          .sort(function (a, b) { return String(b.modified).localeCompare(String(a.modified)); });
        var missedList = posts.filter(function (p) { return wpMissed(p, now); });
        var notLiveList = posts.filter(wpNotLive);

        v.innerHTML =
          (!wp.configured ? '<div class="alert-box" style="margin-bottom:16px">WordPress belum dihubungkan. ' + (state.user.role === 'admin' ? 'Di spreadsheet, jalankan menu <b>Marketing Hub → 3. Hubungkan WordPress</b> lalu pasang snippet-nya.' : 'Minta admin menghubungkannya.') + ' Sementara ini kalender menampilkan rencana internal.</div>' : '') +
          (missedList.length ? '<div class="alert-box bad" style="margin-bottom:16px"><b>' + missedList.length + ' post gagal terbit</b> — jadwalnya sudah lewat tapi statusnya masih terjadwal di WordPress. Cek post tersebut di WordPress.</div>' : '') +
          (notLiveList.length ? '<div class="alert-box" style="margin-bottom:16px"><b>' + notLiveList.length + ' post belum tayang di website</b> — sudah terbit di WordPress, tetapi URL-nya di www.linovhr.com belum bisa diakses (' + esc(notLiveList.map(function (p) { return p.live; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ')) + '). Biasanya perlu rebuild/revalidate Next.js.</div>' : '') +
          '<div class="card"><div class="cal-head"><button class="btn btn-sm" id="prevM" aria-label="Bulan sebelumnya">‹</button><h4>' + monthNames[mo] + ' ' + y + '</h4><button class="btn btn-sm" id="nextM" aria-label="Bulan berikutnya">›</button><button class="btn btn-sm" id="todayM">Hari ini</button>' +
          '<div class="spacer"></div>' +
          '<div class="filter-chips">' +
          '<label class="fchip f-future"><input type="checkbox" data-f="future"' + (filt.future ? ' checked' : '') + '> Terjadwal</label>' +
          '<label class="fchip f-publish"><input type="checkbox" data-f="publish"' + (filt.publish ? ' checked' : '') + '> Terbit</label>' +
          '<label class="fchip f-plan"><input type="checkbox" data-f="plan"' + (filt.plan ? ' checked' : '') + '> Rencana internal</label></div>' +
          (wp.configured ? '<button class="btn btn-sm" id="wpSync">' + ICON.refresh + ' Sinkron</button>' : '') + '</div>' +
          '<div class="cal">' + ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(function (x) { return '<div class="dow">' + x + '</div>'; }).join('') + cells + '</div>' +
          '<div class="muted small" style="margin-top:10px">Data diambil dari WordPress (otomatis tiap jam). Klik post untuk detail' + (canDrag ? '; seret post terjadwal ke tanggal lain untuk menggeser jadwal' : '') + '. Jadwal baru dibuat di WordPress.</div></div>' +
          (wp.configured ? '<div class="card section"><h3>Draft & menunggu review di WordPress <span class="muted">' + drafts.length + ' post</span></h3>' +
            (drafts.length ? '<ul class="list">' + drafts.slice(0, 30).map(function (p) {
              return '<li><div class="main-txt"><a href="' + esc(p.edit_link) + '" target="_blank" rel="noopener"><b>' + esc(p.title) + '</b></a>' + (p.lang && p.lang !== 'id' ? ' <span class="badge">' + esc(String(p.lang).toUpperCase()) + '</span>' : '') + '<div class="muted small">' + esc(p.author || '-') + (p.categories ? ' · ' + esc(p.categories) : '') + ' · diubah ' + dateID(p.modified) + '</div></div>' +
                '<span class="badge ' + (p.status === 'pending' ? 'warn' : '') + '">' + esc(p.status_label) + '</span></li>';
            }).join('') + '</ul>' : '<div class="empty">Tidak ada draft</div>') + '</div>' : '');

        document.getElementById('prevM').onclick = function () { var d2 = new Date(y, mo - 1, 1); calMonth = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0'); drawCalendar(); };
        document.getElementById('nextM').onclick = function () { var d2 = new Date(y, mo + 1, 1); calMonth = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0'); drawCalendar(); };
        document.getElementById('todayM').onclick = function () { calMonth = null; drawCalendar(); };
        v.querySelectorAll('[data-f]').forEach(function (cb) {
          cb.addEventListener('change', function () { filt[cb.getAttribute('data-f')] = cb.checked; LS.set('mhub_wp_filter', JSON.stringify(filt)); drawCalendar(); });
        });
        var syncBtn = document.getElementById('wpSync');
        if (syncBtn) syncBtn.addEventListener('click', function () {
          syncBtn.disabled = true; syncBtn.textContent = 'Menyinkronkan…';
          api('wpSync').then(function (r) { cacheSet('wpList', r); wp = r; posts = r.posts || []; toast('Data WordPress diperbarui'); setCalSub(); drawCalendar(); })
            .catch(function (e) { toast(e.message); syncBtn.disabled = false; syncBtn.innerHTML = ICON.refresh + ' Sinkron'; });
        });
        v.querySelectorAll('[data-wp]').forEach(function (n) {
          n.addEventListener('click', function (e) {
            e.stopPropagation();
            var p = posts.filter(function (x) { return x.id === n.getAttribute('data-wp'); })[0];
            if (p) openWpModal(p, wp.canManage, now);
          });
          n.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', n.getAttribute('data-wp')); e.dataTransfer.effectAllowed = 'move'; n.classList.add('dragging'); });
          n.addEventListener('dragend', function () { n.classList.remove('dragging'); });
        });
        if (canDrag) v.querySelectorAll('.day').forEach(function (cell) {
          cell.addEventListener('dragover', function (e) { e.preventDefault(); cell.classList.add('drop-ok'); });
          cell.addEventListener('dragleave', function () { cell.classList.remove('drop-ok'); });
          cell.addEventListener('drop', function (e) {
            e.preventDefault(); cell.classList.remove('drop-ok');
            var id = e.dataTransfer.getData('text/plain');
            var p = posts.filter(function (x) { return x.id === id; })[0];
            if (!p || p.status !== 'future') return;
            var target = cell.getAttribute('data-date') + ' ' + wpTime(p);
            if (cell.getAttribute('data-date') === wpDay(p)) return;
            if (target <= now) { toast('Tanggal tujuan sudah lewat'); return; }
            if (!confirm('Geser jadwal "' + p.title + '"\n' + dateID(wpDay(p)) + ' ' + wpTime(p) + '  →  ' + dateID(cell.getAttribute('data-date')) + ' ' + wpTime(p) + '?')) return;
            api('wpReschedule', { id: id, date: target }).then(function (r) { toast(r.message); route(); }).catch(function (er) { toast(er.message); });
          });
        });
        bindPlanClicks();
      }

      function draw() {
        act.querySelectorAll('#modeSeg button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-m') === mode); });
        act.querySelector('#addContent').classList.toggle('hidden', mode === 'calendar');
        setCalSub();
        if (mode === 'board') {
          v.innerHTML = '<div class="board">' + CONTENT_STATUS.map(function (s) {
            var list = items.filter(function (c) { return c.status === s; }).sort(function (a, b) { return String(a.due_date).localeCompare(String(b.due_date)); });
            return '<div class="col"><h5><span>' + s + '</span><span>' + list.length + '</span></h5>' + list.map(card).join('') + '</div>';
          }).join('') + '</div>';
          bindPlanClicks();
        } else if (mode === 'list') {
          v.innerHTML = '<div class="card"><div id="cList"></div></div>';
          sortableTable([
            { k: 'title', label: 'Judul', render: function (c) { return '<a href="#" data-open="' + esc(c.id) + '"><b>' + esc(c.title) + '</b></a><div class="muted small">' + esc(c.target_keyword || '') + '</div>'; } },
            { k: 'type', label: 'Tipe' },
            { k: 'status', label: 'Status', render: function (c) { return contentBadge(c.status); } },
            { k: 'pic', label: 'PIC', render: function (c) { return esc(userName(c.pic)); } },
            { k: 'due_date', label: 'Deadline', render: function (c) { var late = c.status !== 'Terbit' && c.due_date && c.due_date < t; return '<span class="nowrap ' + (late ? 'delta down' : '') + '">' + dateID(c.due_date) + '</span>'; } },
            { k: 'publish_date', label: 'Terbit', render: function (c) { return c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + dateID(c.publish_date) + '</a>' : dateID(c.publish_date); } }
          ], items, { sortKey: 'due_date', sortDir: 1 }).mount(document.getElementById('cList'));
          bindPlanClicks();
        } else {
          drawCalendar();
        }
      }
      act.querySelectorAll('#modeSeg button').forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); LS.set('mhub_content_mode', mode); draw(); }); });
      draw();
    });
  }

  function openWpModal(p, canManage, now) {
    var missed = wpMissed(p, now), notLive = wpNotLive(p);
    var isFuture = p.status === 'future';
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    var statusBadge = missed ? '<span class="badge bad">Gagal terbit</span>' : notLive ? '<span class="badge good">Terbit</span> <span class="badge warn">Belum tayang di website</span>' :
      '<span class="badge ' + ({ future: 'info', publish: 'good', pending: 'warn' }[p.status] || '') + '">' + esc(p.status_label) + '</span>';
    bg.innerHTML =
      '<div class="modal modal-sm" role="dialog" aria-modal="true"><div class="modal-head"><h3>Post WordPress</h3><button class="icon-btn" data-close aria-label="Tutup">' + ICON.close + '</button></div>' +
      '<div class="modal-body"><h4 class="wp-title">' + esc(p.title) + '</h4><div class="tags" style="margin-bottom:14px">' + statusBadge + '</div>' +
      '<dl class="kv">' +
      '<dt>' + (isFuture ? 'Jadwal terbit' : p.status === 'publish' ? 'Terbit' : 'Tanggal') + '</dt><dd>' + dateID(wpDay(p)) + ' · ' + esc(wpTime(p)) + '</dd>' +
      '<dt>Penulis</dt><dd>' + esc(p.author || '-') + '</dd>' +
      '<dt>Kategori</dt><dd>' + esc(p.categories || '-') + '</dd>' +
      (p.lang ? '<dt>Bahasa</dt><dd>' + esc(String(p.lang).toUpperCase()) + '</dd>' : '') +
      '<dt>Terakhir diubah</dt><dd>' + dateID(p.modified) + ' · ' + esc(String(p.modified || '').slice(11, 16)) + '</dd>' +
      (p.status === 'publish' && p.live ? '<dt>Di website</dt><dd>' + (p.live === 'live' ? '<span class="badge good">Tayang</span>' : '<span class="badge warn">Belum tayang · ' + esc(p.live) + '</span>') + '</dd>' : '') +
      '</dl>' +
      '<div class="toolbar" style="margin:16px 0 0"><a class="btn" href="' + esc(p.edit_link) + '" target="_blank" rel="noopener">Edit di WordPress</a>' +
      (p.status === 'publish' && p.public_url ? '<a class="btn" href="' + esc(p.public_url) + '" target="_blank" rel="noopener">Lihat di website</a>' : '') + '</div>' +
      (isFuture && canManage ?
        '<div class="brief-box"><h5 style="margin-top:0">Geser jadwal</h5><div class="form-grid" style="grid-template-columns:1fr 1fr auto;align-items:end">' +
        '<div><label for="wpDate">Tanggal</label><input id="wpDate" type="date" value="' + esc(wpDay(p)) + '"></div>' +
        '<div><label for="wpTime">Jam</label><input id="wpTime" type="time" value="' + esc(wpTime(p)) + '"></div>' +
        '<div><button class="btn btn-primary" id="wpMove">Simpan</button></div></div>' +
        '<div class="muted small" style="margin-top:6px">Jam mengikuti zona waktu situs WordPress.</div></div>' : '') +
      (isFuture && !canManage ? '<div class="muted small" style="margin-top:14px">Hanya admin yang bisa menggeser atau membatalkan jadwal.</div>' : '') +
      '</div>' +
      '<div class="modal-foot">' + (isFuture && canManage ? '<button class="btn btn-danger" id="wpCancel" style="margin-right:auto">Batalkan jadwal</button>' : '') +
      '<button class="btn" data-close>Tutup</button></div></div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    var mv = bg.querySelector('#wpMove');
    if (mv) mv.addEventListener('click', function () {
      var dt = bg.querySelector('#wpDate').value + ' ' + bg.querySelector('#wpTime').value;
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dt)) { toast('Isi tanggal dan jam'); return; }
      if (dt <= now) { toast('Jadwal baru harus di masa depan'); return; }
      mv.disabled = true; mv.textContent = 'Menyimpan…';
      api('wpReschedule', { id: p.id, date: dt }).then(function (r) { toast(r.message); close(); route(); })
        .catch(function (e) { toast(e.message); mv.disabled = false; mv.textContent = 'Simpan'; });
    });
    var cn = bg.querySelector('#wpCancel');
    if (cn) cn.addEventListener('click', function () {
      if (!confirm('Batalkan jadwal "' + p.title + '"?\nPost akan kembali menjadi draft di WordPress dan tidak terbit otomatis.')) return;
      cn.disabled = true; cn.textContent = 'Membatalkan…';
      api('wpUnschedule', { id: p.id }).then(function (r) { toast(r.message); close(); route(); })
        .catch(function (e) { toast(e.message); cn.disabled = false; cn.textContent = 'Batalkan jadwal'; });
    });
  }

  function briefToText(c, b) {
    var lines = ['SEO BRIEF — ' + (c.title || ''), '', 'Target keyword: ' + b.keyword, 'Search intent: ' + b.intent, 'Target panjang: ±' + b.word_count + ' kata', 'Deadline: ' + dateID(c.due_date), 'PIC: ' + userName(c.pic), ''];
    if (b.cannibal && b.cannibal.length > 1) { lines.push('⚠ Kanibalisasi: ' + b.cannibal.length + ' halaman sudah ranking untuk keyword ini:'); b.cannibal.forEach(function (p) { lines.push('  - ' + p.page); }); lines.push(''); }
    lines.push('OUTLINE', b.outline || '', '');
    if (b.related_queries && b.related_queries.length) { lines.push('KEYWORD TURUNAN (masukkan secara natural)'); b.related_queries.slice(0, 15).forEach(function (q) { lines.push('  - ' + q.query); }); lines.push(''); }
    if (b.internal_links && b.internal_links.length) { lines.push('INTERNAL LINK'); b.internal_links.forEach(function (l) { lines.push('  - ' + l.page + '  (anchor: ' + l.anchor + ')'); }); lines.push(''); }
    if (b.competitor_refs && b.competitor_refs.length) { lines.push('REFERENSI KOMPETITOR (pelajari, jangan disalin)'); b.competitor_refs.forEach(function (r) { lines.push('  - ' + r.competitor + ': ' + r.url); }); lines.push(''); }
    if (b.notes) lines.push('CATATAN', b.notes);
    return lines.join('\n');
  }

  function openContentModal(item) {
    item = Object.assign({}, item);
    var isNew = !item.id;
    var canEdit = isNew || state.user.role === 'admin' || item.created_by === state.user.email || item.pic === state.user.email;
    var brief = null;
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    var userOpts = state.users.map(function (u) { return '<option value="' + esc(u.email) + '"' + ((item.pic || state.user.email) === u.email ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('');
    bg.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>' + (isNew ? 'Konten baru' : 'Detail konten') + '</h3><button class="icon-btn" data-close aria-label="Tutup">' + ICON.close + '</button></div>' +
      '<div class="modal-body"><div class="form-grid">' +
      '<div class="full"><label>Judul</label><input id="cTitle" value="' + esc(item.title) + '" placeholder="Judul artikel / halaman"></div>' +
      '<div><label>Target keyword</label><input id="cKw" value="' + esc(item.target_keyword) + '" placeholder="mis. software hris"></div>' +
      '<div><label>Tipe</label><select id="cType">' + CONTENT_TYPES.map(function (x) { return '<option' + (item.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div><label>PIC</label><select id="cPic">' + userOpts + '</select></div>' +
      '<div><label>Status</label><select id="cStatus">' + CONTENT_STATUS.map(function (x) { return '<option' + (item.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Deadline</label><input id="cDue" type="date" value="' + esc(item.due_date) + '"></div>' +
      '<div><label>URL (jika sudah terbit / artikel yang di-update)</label><input id="cUrl" value="' + esc(item.url) + '" placeholder="https://www.linovhr.com/blog/…"></div>' +
      '<div class="full"><label>Catatan</label><textarea id="cNotes" rows="3">' + esc(item.notes) + '</textarea></div></div>' +
      '<div class="brief-box" id="briefBox"></div></div>' +
      '<div class="modal-foot">' + (!isNew && canEdit ? '<button class="btn btn-danger" id="cDel" style="margin-right:auto">Hapus</button>' : '') +
      '<button class="btn" data-close>Batal</button>' + (canEdit ? '<button class="btn btn-primary" id="cSave">Simpan</button>' : '') + '</div></div>';
    document.body.appendChild(bg);
    if (!canEdit) bg.querySelectorAll('input, select, textarea').forEach(function (n) { n.disabled = true; });

    function close() { bg.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-close]')) close(); });

    function collect() {
      return Object.assign(item, {
        title: bg.querySelector('#cTitle').value.trim(), target_keyword: bg.querySelector('#cKw').value.trim().toLowerCase(),
        type: bg.querySelector('#cType').value, pic: bg.querySelector('#cPic').value, status: bg.querySelector('#cStatus').value,
        due_date: bg.querySelector('#cDue').value, url: bg.querySelector('#cUrl').value.trim(), notes: bg.querySelector('#cNotes').value
      });
    }

    var box = bg.querySelector('#briefBox');
    function renderBrief() {
      if (!brief) {
        box.innerHTML = '<h4>SEO Brief</h4><p class="muted" style="margin:0 0 10px">Brief dibuat dari data Search Console (query terkait, halaman sendiri) dan artikel kompetitor yang terpantau.</p>' +
          (canEdit ? '<button class="btn" id="genBrief">✨ Buat brief dari target keyword</button>' : '<div class="empty">Belum ada brief</div>');
        var g = box.querySelector('#genBrief');
        if (g) g.addEventListener('click', generate);
        return;
      }
      var b = brief;
      box.innerHTML =
        '<h4><span>SEO Brief · <span class="badge info">' + esc(b.intent) + '</span> <span class="badge">±' + num(b.word_count) + ' kata</span></span>' +
        '<span class="toolbar" style="margin:0"><button class="btn btn-sm" id="copyBrief">Salin brief</button>' + (canEdit ? '<button class="btn btn-sm" id="regenBrief">' + ICON.refresh + ' Buat ulang</button>' : '') + '</span></h4>' +
        (b.cannibal && b.cannibal.length > 1 ? '<div class="alert-box"><b>Potensi kanibalisasi:</b> ' + b.cannibal.length + ' halaman sudah muncul untuk "' + esc(b.keyword) + '". Pertimbangkan update/gabungkan, bukan artikel baru.<ul style="margin:6px 0 0;padding-left:18px">' +
          b.cannibal.map(function (p) { return '<li>' + esc(path(p.page)) + ' — posisi terbaik ' + num(p.best, 1) + ', ' + num(p.impressions) + ' impresi</li>'; }).join('') + '</ul></div>' : '') +
        '<h5>Outline (bisa diedit)</h5><textarea class="outline" id="bOutline"' + (canEdit ? '' : ' disabled') + '>' + esc(b.outline) + '</textarea>' +
        '<h5>Keyword turunan dari Search Console</h5>' +
        (b.related_queries.length ? '<div class="tags">' + b.related_queries.map(function (q) { return '<span class="badge" title="' + num(q.impressions) + ' impresi · posisi ' + num(q.position, 1) + '">' + esc(q.query) + ' · ' + MChart.shortNum(q.impressions) + '</span>'; }).join('') + '</div>' : '<div class="muted small">Belum ada query terkait di data GSC.</div>') +
        '<h5>Saran internal link</h5>' +
        (b.internal_links.length ? '<ul class="list">' + b.internal_links.map(function (l) { return '<li><div class="main-txt"><a href="' + esc(l.page) + '" target="_blank" rel="noopener">' + esc(path(l.page)) + '</a><div class="muted small">anchor: ' + esc(l.anchor) + '</div></div></li>'; }).join('') + '</ul>' : '<div class="muted small">Tidak ada halaman terkait.</div>') +
        '<h5>Referensi artikel kompetitor</h5>' +
        (b.competitor_refs.length ? '<ul class="list">' + b.competitor_refs.map(function (r) { return '<li><div class="main-txt"><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title || path(r.url)) + '</a><div class="muted small">' + esc(r.competitor) + '</div></div></li>'; }).join('') + '</ul>' : '<div class="muted small">Belum ada artikel kompetitor terkait.</div>') +
        '<h5>Catatan untuk penulis</h5><textarea id="bNotes" rows="3"' + (canEdit ? '' : ' disabled') + '>' + esc(b.notes) + '</textarea>';
      box.querySelector('#copyBrief').addEventListener('click', function () { syncBrief(); copyText(briefToText(collect(), brief)); });
      var rg = box.querySelector('#regenBrief');
      if (rg) rg.addEventListener('click', function () { if (confirm('Buat ulang brief? Outline yang sudah diedit akan diganti.')) generate(); });
    }
    function syncBrief() {
      if (!brief) return;
      var o = box.querySelector('#bOutline'), n = box.querySelector('#bNotes');
      if (o) brief.outline = o.value; if (n) brief.notes = n.value;
    }
    function generate() {
      var kw = bg.querySelector('#cKw').value.trim();
      if (!kw) { toast('Isi target keyword dulu'); bg.querySelector('#cKw').focus(); return; }
      box.innerHTML = '<div class="loader"><div class="spin"></div>Menyusun brief…</div>';
      api('briefGenerate', { keyword: kw }).then(function (r) { brief = r.brief; renderBrief(); })
        .catch(function (e) { toast(e.message); brief = null; renderBrief(); });
    }

    if (!isNew) {
      box.innerHTML = '<div class="loader"><div class="spin"></div>Memuat brief…</div>';
      api('briefGet', { contentId: item.id }).then(function (r) { brief = r.brief; renderBrief(); }).catch(function () { renderBrief(); });
    } else renderBrief();

    var saveBtn = bg.querySelector('#cSave');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var it = collect();
      if (!it.title) { toast('Judul wajib diisi'); return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…';
      syncBrief();
      api('contentSave', { item: it }).then(function (r) {
        if (brief) {
          brief.content_id = r.id;
          if (it.status === 'Ide') it.status = 'Brief';
          return api('briefSave', { brief: brief });
        }
      }).then(function () {
        toast('Konten tersimpan'); close();
        if (currentRoute().id === 'konten') route();
      }).catch(function (e) { toast(e.message); saveBtn.disabled = false; saveBtn.textContent = 'Simpan'; });
    });
    var delBtn = bg.querySelector('#cDel');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (!confirm('Hapus "' + item.title + '" beserta brief-nya?')) return;
      api('contentDelete', { id: item.id }).then(function () { toast('Konten dihapus'); close(); route(); }).catch(function (e) { toast(e.message); });
    });
    setTimeout(function () { var f = bg.querySelector('#cTitle'); if (f && !f.disabled && isNew) f.focus(); }, 50);
  }

  // ==================== PENGATURAN ====================
  function viewSettings(v) {
    return api('settingsGet').then(function (d) {
      var s = d.settings;
      setSub('Hanya admin. Pengguna & PIN dikelola dari spreadsheet (menu Marketing Hub).');
      v.innerHTML =
        '<div class="grid grid-2">' +
        '<div class="card"><h3>Umum</h3><div class="form-grid">' +
        '<div class="full"><label>Property Search Console</label><input id="sSite" value="' + esc(s.site_url) + '"><div class="muted small" style="margin-top:4px">Domain property: <code>sc-domain:linovhr.com</code> · URL prefix: <code>https://www.linovhr.com/</code></div></div>' +
        '<div class="full"><label>Email penerima alert (pisahkan koma)</label><input id="sEmails" value="' + esc(s.alert_emails) + '"></div>' +
        '<div><label>Batas decay (% turun klik)</label><input id="sDecay" type="number" min="5" max="90" value="' + esc(s.decay_pct) + '"></div>' +
        '<div><label>Minimal klik sebelumnya</label><input id="sMin" type="number" min="0" value="' + esc(s.decay_min_clicks) + '"></div>' +
        '<div><label>Alert jika posisi turun ≥</label><input id="sPos" type="number" min="1" step="0.5" value="' + esc(s.pos_drop_alert) + '"></div>' +
        '</div><div style="margin-top:14px"><button class="btn btn-primary" id="saveSet">Simpan pengaturan</button></div></div>' +
        '<div class="card"><h3>Keyword pantauan <span class="muted">satu per baris</span></h3>' +
        '<p class="muted small" style="margin-top:0">Dipakai untuk alert penurunan posisi dan menandai artikel kompetitor yang relevan.</p>' +
        '<textarea id="sKw" rows="10">' + esc(d.keywords.map(function (k) { return k.keyword; }).join('\n')) + '</textarea>' +
        '<div style="margin-top:10px"><button class="btn btn-primary" id="saveKw">Simpan keyword</button></div></div>' +
        '</div>' +
        '<div class="card section"><h3>Kompetitor</h3><div id="compList"></div>' +
        '<div class="form-grid" style="margin-top:14px;grid-template-columns:1fr 1fr 1.4fr auto;align-items:end">' +
        '<div><label>Nama</label><input id="nName" placeholder="mis. Talenta"></div>' +
        '<div><label>Domain</label><input id="nDomain" placeholder="www.talenta.co"></div>' +
        '<div><label>URL sitemap (opsional)</label><input id="nSitemap" placeholder="otomatis: https://domain/sitemap.xml"></div>' +
        '<div><button class="btn btn-primary" id="addComp">Tambah</button></div></div></div>' +
        '<div class="card section"><h3>Jalankan manual</h3><p class="muted small" style="margin-top:0">Semua job berjalan otomatis setiap hari. Gunakan tombol ini setelah mengubah pengaturan.</p>' +
        '<div class="toolbar"><button class="btn" data-job="gsc">' + ICON.refresh + ' Tarik data Search Console</button><button class="btn" data-job="competitors">' + ICON.refresh + ' Cek kompetitor</button><button class="btn" data-job="digest">Kirim ringkasan mingguan</button></div></div>';

      function drawComps() {
        var el = document.getElementById('compList');
        el.innerHTML = d.competitors.length ? '<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Domain</th><th>Sitemap</th><th></th></tr></thead><tbody>' +
          d.competitors.map(function (c) { return '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.domain) + '</td><td class="url-cell small">' + esc(c.sitemap_url) + '</td><td><button class="btn btn-sm btn-danger" data-del="' + esc(c.id) + '">Hapus</button></td></tr>'; }).join('') +
          '</tbody></table></div>' : '<div class="empty">Belum ada kompetitor</div>';
        el.querySelectorAll('[data-del]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-del');
            if (!confirm('Hapus kompetitor ini?')) return;
            api('competitorDelete', { id: id }).then(function () { d.competitors = d.competitors.filter(function (c) { return c.id !== id; }); drawComps(); toast('Kompetitor dihapus'); }).catch(function (e) { toast(e.message); });
          });
        });
      }
      drawComps();

      document.getElementById('saveSet').addEventListener('click', function () {
        api('settingsSave', { settings: { site_url: val('sSite'), alert_emails: val('sEmails'), decay_pct: val('sDecay'), decay_min_clicks: val('sMin'), pos_drop_alert: val('sPos') } })
          .then(function () { toast('Pengaturan tersimpan'); }).catch(function (e) { toast(e.message); });
      });
      document.getElementById('saveKw').addEventListener('click', function () {
        var list = val('sKw').split('\n').map(function (x) { return x.trim(); }).filter(String);
        api('keywordsSave', { keywords: list }).then(function (r) { toast(r.count + ' keyword tersimpan'); }).catch(function (e) { toast(e.message); });
      });
      document.getElementById('addComp').addEventListener('click', function () {
        var c = { name: val('nName'), domain: val('nDomain'), sitemap_url: val('nSitemap') };
        if (!c.name || !c.domain) { toast('Nama dan domain wajib diisi'); return; }
        api('competitorSave', { competitor: c }).then(function (r) {
          var domain = c.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          d.competitors.push({ id: r.id, name: c.name, domain: domain, sitemap_url: c.sitemap_url || 'https://' + domain + '/sitemap.xml' });
          ['nName', 'nDomain', 'nSitemap'].forEach(function (id) { document.getElementById(id).value = ''; });
          drawComps(); toast('Kompetitor ditambahkan. Run pertama hanya menyimpan baseline.');
        }).catch(function (e) { toast(e.message); });
      });
      v.querySelectorAll('[data-job]').forEach(function (b) {
        b.addEventListener('click', function () {
          var label = b.innerHTML; b.disabled = true; b.textContent = 'Berjalan…';
          api('runJob', { job: b.getAttribute('data-job') }).then(function (r) { toast(r.message || 'Selesai'); })
            .catch(function (e) { toast(e.message); }).then(function () { b.disabled = false; b.innerHTML = label; });
        });
      });
    });
    function val(id) { return document.getElementById(id).value.trim(); }
  }

  // ==================== BOOT ====================
  function boot() {
    if (!state.token) return renderLogin();
    root.innerHTML = '';
    read('users').then(function (r) { state.users = r.users; }).catch(function () {}).then(function () { route(); setTimeout(prefetch, 1500); });
  }

  window.addEventListener('hashchange', function () { if (state.token) route(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  boot();
})();
