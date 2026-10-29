// Mode demo: meniru API backend dengan data contoh, dipakai jika API_URL kosong.
(function () {
  function seeded(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
  var rnd = seeded(42);
  function fmt(d) { return d.toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function round(n, p) { var m = Math.pow(10, p || 0); return Math.round(n * m) / m; }
  var today = new Date();
  var SITE = 'https://www.linovhr.com';

  var users = [
    { email: 'digmar@linovhr.com', name: 'Digital Marketing Lead', role: 'admin', jabatan: 'Digital Marketing Lead' },
    { email: 'content@linovhr.com', name: 'Rina (Content)', role: 'member', jabatan: 'Content Writer' },
    { email: 'seo@linovhr.com', name: 'Dimas (SEO)', role: 'member', jabatan: 'SEO Specialist' }
  ];

  // --- GSC harian 90 hari ---
  var end = addDays(today, -3);
  var daily = [];
  for (var i = 89; i >= 0; i--) {
    var d = addDays(end, -i);
    var wk = d.getDay() === 0 || d.getDay() === 6 ? 0.55 : 1;
    var trend = 1 + (89 - i) * 0.004;
    var clicks = Math.round((520 + rnd() * 90) * wk * trend);
    var imp = Math.round(clicks * (34 + rnd() * 6));
    daily.push({ date: fmt(d), clicks: clicks, impressions: imp, ctr: round(clicks / imp, 4), position: round(14 - (89 - i) * 0.02 + rnd(), 1) });
  }

  var pageDefs = [
    ['/blog/cara-menghitung-pph-21/', 'Decay'], ['/blog/bpjs-ketenagakerjaan/', 'Stabil'], ['/blog/thr-karyawan/', 'Naik'],
    ['/blog/contoh-slip-gaji/', 'Decay'], ['/blog/aplikasi-absensi-online/', 'Naik'], ['/blog/software-hris-terbaik/', 'Stabil'],
    ['/blog/cuti-tahunan/', 'Stabil'], ['/blog/uang-lembur/', 'Decay'], ['/blog/kpi-karyawan/', 'Stabil'],
    ['/blog/pesangon-phk/', 'Naik'], ['/blog/payroll-adalah/', 'Stabil'], ['/blog/ump-2026/', 'Baru'],
    ['/blog/sistem-penggajian/', 'Decay'], ['/blog/onboarding-karyawan/', 'Stabil'], ['/hr-software/', 'Naik'],
    ['/aplikasi-payroll/', 'Stabil'], ['/blog/perjanjian-kerja-waktu-tertentu/', 'Stabil'], ['/blog/tunjangan-karyawan/', 'Decay'],
    ['/', 'Stabil'], ['/blog/appraisal-karyawan/', 'Stabil']
  ];
  var pages = pageDefs.map(function (p) {
    var prev = Math.round(300 + rnd() * 2500);
    var f = { Decay: 0.55 + rnd() * 0.2, Naik: 1.3 + rnd() * 0.5, Stabil: 0.9 + rnd() * 0.2, Baru: 0 }[p[1]];
    var cur = p[1] === 'Baru' ? Math.round(200 + rnd() * 400) : Math.round(prev * f);
    var prevPos = round(3 + rnd() * 12, 1);
    var pos = round(p[1] === 'Decay' ? prevPos + 1 + rnd() * 4 : p[1] === 'Naik' ? Math.max(1.2, prevPos - 1 - rnd() * 3) : prevPos + (rnd() - 0.5), 1);
    var imp = Math.round(cur * (25 + rnd() * 20));
    return {
      page: SITE + p[0], clicks: cur, impressions: imp, ctr: round(cur / Math.max(imp, 1), 4), position: pos,
      prev_clicks: p[1] === 'Baru' ? 0 : prev, prev_impressions: p[1] === 'Baru' ? 0 : Math.round(prev * 32), prev_position: p[1] === 'Baru' ? 0 : prevPos,
      delta_clicks_pct: p[1] === 'Baru' ? '' : round((cur - prev) / prev * 100, 1), status: p[1]
    };
  });

  var queryDefs = ['hr software', 'software hris', 'aplikasi payroll', 'cara menghitung pph 21', 'pph 21', 'bpjs ketenagakerjaan', 'thr karyawan',
    'contoh slip gaji', 'slip gaji', 'aplikasi absensi online', 'absensi online', 'software hris terbaik', 'aplikasi hris', 'cuti tahunan',
    'uang lembur', 'cara menghitung uang lembur', 'kpi karyawan', 'contoh kpi karyawan', 'pesangon phk', 'cara menghitung pesangon',
    'payroll adalah', 'apa itu payroll', 'ump 2026', 'sistem penggajian', 'aplikasi penggajian', 'onboarding karyawan', 'pkwt',
    'tunjangan karyawan', 'jenis tunjangan karyawan', 'appraisal karyawan', 'hr software indonesia', 'aplikasi hr', 'sistem hris',
    'berapa pph 21 gaji 10 juta', 'bagaimana cara menghitung thr', 'apa itu hris', 'harga software hris', 'software payroll terbaik',
    'aplikasi absensi karyawan', 'cara membuat slip gaji'];
  var queries = queryDefs.map(function (q, i) {
    var imp = Math.round(800 + rnd() * 30000 / (1 + i * 0.15));
    var pos = round(1.5 + rnd() * 18, 1);
    var clicks = Math.round(imp * Math.max(0.005, 0.3 / pos));
    var prevPos = round(pos + (rnd() - 0.55) * 6, 1);
    if (q === 'hr software') { pos = 8.4; prevPos = 5.1; }
    if (q === 'software hris') { pos = 6.2; prevPos = 3.0; }
    var prevClicks = Math.round(clicks * (0.7 + rnd() * 0.6));
    return { query: q, clicks: clicks, impressions: imp, ctr: round(clicks / imp, 4), position: pos, prev_clicks: prevClicks,
      prev_impressions: Math.round(imp * (0.8 + rnd() * 0.4)), prev_position: Math.max(1, prevPos),
      delta_clicks_pct: prevClicks ? round((clicks - prevClicks) / prevClicks * 100, 1) : '', delta_position: round(pos - Math.max(1, prevPos), 1) };
  });

  // page x query: pasangkan query ke halaman berdasarkan kata
  var pageQuery = [];
  queries.forEach(function (q) {
    var words = q.query.split(' ').filter(function (w) { return w.length > 2 || /^\d+$/.test(w); });
    pages.forEach(function (p) {
      var hit = words.filter(function (w) { return p.page.indexOf(w) > -1; }).length;
      if (hit === words.length) pageQuery.push({ page: p.page, query: q.query, clicks: Math.round(q.clicks * 0.6), impressions: Math.round(q.impressions * 0.6), position: q.position });
    });
  });
  pageQuery.push({ page: SITE + '/blog/software-hris-terbaik/', query: 'hr software', clicks: 40, impressions: 2100, position: 11.2 });
  pageQuery.push({ page: SITE + '/hr-software/', query: 'hr software', clicks: 160, impressions: 6400, position: 8.4 });

  // --- Ads harian 120 hari ---
  var campaigns = [['Search - Brand LinovHR', 'SEARCH', 900000], ['Search - HRIS Generic', 'SEARCH', 2400000], ['Search - Payroll', 'SEARCH', 1500000], ['PMax - Demo Request', 'PERFORMANCE_MAX', 1800000]];
  var ads = [];
  for (var j = 120; j >= 1; j--) {
    var dd = fmt(addDays(today, -j));
    campaigns.forEach(function (c) {
      var cost = Math.round(c[2] * (0.75 + rnd() * 0.5));
      var cpc = c[0].indexOf('Brand') > -1 ? 2500 : 9000 + rnd() * 6000;
      var clicks = Math.round(cost / cpc);
      var imp = Math.round(clicks * (12 + rnd() * 20));
      var conv = round(clicks * (c[0].indexOf('Brand') > -1 ? 0.09 : 0.025) * (0.6 + rnd() * 0.8), 2);
      ads.push({ date: dd, campaign: c[0], campaign_type: c[1], status: 'ENABLED', impressions: imp, clicks: clicks, cost: cost, conversions: conv, conv_value: 0 });
    });
  }

  // --- Kompetitor ---
  var competitors = [
    { id: 'c1', name: 'Talenta', domain: 'www.talenta.co', sitemap_url: 'https://www.talenta.co/sitemap.xml', active: 'TRUE' },
    { id: 'c2', name: 'Gadjian', domain: 'www.gadjian.com', sitemap_url: 'https://www.gadjian.com/sitemap.xml', active: 'TRUE' },
    { id: 'c3', name: 'LinovHR Pesaing X', domain: 'www.contoh-hris.id', sitemap_url: 'https://www.contoh-hris.id/sitemap.xml', active: 'TRUE' }
  ];
  var compSlugs = [['c1', 'cara-menghitung-pph-21-terbaru', 'Cara Menghitung PPh 21 Terbaru dan Contohnya', 'pph 21'],
    ['c2', 'software-hris-terbaik-indonesia', '10 Software HRIS Terbaik di Indonesia', 'software hris'],
    ['c1', 'thr-karyawan-kontrak', 'THR untuk Karyawan Kontrak: Aturan Lengkap', 'thr karyawan'],
    ['c3', 'aplikasi-payroll-gratis', 'Aplikasi Payroll Gratis untuk UMKM', 'aplikasi payroll'],
    ['c2', 'tips-wawancara-kerja', 'Tips Wawancara Kerja untuk HR', ''],
    ['c1', 'hr-software-untuk-startup', 'HR Software untuk Startup', 'hr software'],
    ['c3', 'kebijakan-wfh', 'Contoh Kebijakan WFH Perusahaan', ''],
    ['c2', 'uang-lembur-hari-libur', 'Perhitungan Uang Lembur Hari Libur', 'uang lembur'],
    ['c1', 'employee-engagement', 'Cara Meningkatkan Employee Engagement', ''],
    ['c3', 'bpjs-ketenagakerjaan-2026', 'Iuran BPJS Ketenagakerjaan 2026', 'bpjs ketenagakerjaan']];
  var compUrls = compSlugs.map(function (s, i) {
    var c = competitors.filter(function (x) { return x.id === s[0]; })[0];
    return { competitor_id: c.id, competitor: c.name, url: 'https://' + c.domain + '/blog/' + s[1] + '/', title: s[2],
      lastmod: fmt(addDays(today, -Math.floor(i * 1.6))), first_seen: fmt(addDays(today, -Math.floor(i * 1.6))),
      baseline: 'FALSE', relevant: s[3] ? 'Y' : 'N', matched_keyword: s[3] };
  });

  var keywords = ['hr software', 'software hris', 'aplikasi payroll', 'pph 21', 'thr karyawan', 'bpjs ketenagakerjaan', 'uang lembur', 'aplikasi absensi online']
    .map(function (k) { return { keyword: k, prioritas: k === 'hr software' ? 'Tinggi' : 'Normal' }; });

  var statuses = ['Ide', 'Brief', 'Menulis', 'Review', 'Terbit'];
  var content = [
    ['Software HRIS Terbaik 2026 (update)', 'software hris terbaik', 'Update Artikel', 'content@linovhr.com', 'Menulis', 2],
    ['Cara Menghitung PPh 21 TER 2026', 'cara menghitung pph 21', 'Update Artikel', 'content@linovhr.com', 'Review', -1],
    ['HR Software: Panduan Lengkap', 'hr software', 'Artikel Baru', 'seo@linovhr.com', 'Brief', 6],
    ['Aplikasi Payroll untuk UMKM', 'aplikasi payroll', 'Artikel Baru', 'content@linovhr.com', 'Ide', 12],
    ['Contoh Slip Gaji Excel & PDF', 'contoh slip gaji', 'Update Artikel', 'content@linovhr.com', 'Ide', 9],
    ['UMP 2026 Seluruh Provinsi', 'ump 2026', 'Artikel Baru', 'seo@linovhr.com', 'Terbit', -6],
    ['HR Software (EN translation)', 'hr software indonesia', 'Terjemahan', 'content@linovhr.com', 'Menulis', 4],
    ['Uang Lembur Hari Libur Nasional', 'uang lembur', 'Artikel Baru', 'content@linovhr.com', 'Ide', 16],
    ['Landing Page Aplikasi Absensi', 'aplikasi absensi online', 'Landing Page', 'digmar@linovhr.com', 'Brief', 10],
    ['THR Karyawan Kontrak', 'thr karyawan', 'Update Artikel', 'seo@linovhr.com', 'Terbit', -12]
  ].map(function (c, i) {
    return { id: 'k' + i, title: c[0], target_keyword: c[1], type: c[2], pic: c[3], status: c[4], due_date: fmt(addDays(today, c[5])),
      publish_date: c[4] === 'Terbit' ? fmt(addDays(today, c[5])) : '', url: c[4] === 'Terbit' ? SITE + '/blog/' + c[1].replace(/ /g, '-') + '/' : '',
      notes: '', created_by: 'digmar@linovhr.com', updated_at: fmt(today) + ' 09:00' };
  });
  var briefs = {};
  var settings = { site_url: 'https://www.linovhr.com/', alert_emails: 'digmar@linovhr.com', decay_pct: '20', decay_min_clicks: '20', pos_drop_alert: '3' };
  var stamp = fmt(today) + ' 07:00';
  function nowStr() { var d = new Date(); return fmt(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  var WP_LABEL = { future: 'Terjadwal', publish: 'Terbit', draft: 'Draft', pending: 'Menunggu review' };
  var wpPosts = [
    ['Software HRIS Terbaik 2026: Perbandingan Lengkap', 'future', 2, '09:00', 'Rina', 'HRIS'],
    ['Cara Menghitung PPh 21 TER untuk Karyawan Baru', 'future', 4, '10:00', 'Dimas', 'Payroll'],
    ['Talent Management: Pengertian, Proses, dan Contoh', 'future', 7, '09:00', 'Rina', 'Talent'],
    ['Aplikasi Absensi Online untuk Tim Lapangan', 'future', 9, '13:00', 'Dimas', 'Absensi'],
    ['Succession Planning: Panduan untuk HR', 'future', 14, '09:00', 'Rina', 'Talent'],
    ['UMP 2027 Seluruh Provinsi', 'future', -1, '08:00', 'Dimas', 'Payroll'],
    ['THR Karyawan Kontrak: Aturan Lengkap', 'publish', -3, '09:00', 'Rina', 'Payroll'],
    ['Contoh KPI Karyawan per Divisi', 'publish', -6, '10:00', 'Dimas', 'Performance'],
    ['Apa Itu Payroll? Pengertian dan Prosesnya', 'publish', -10, '09:00', 'Rina', 'Payroll'],
    ['Performance Appraisal: Metode dan Contoh', 'publish', -13, '09:00', 'Dimas', 'Performance'],
    ['Competency Management untuk Perusahaan', 'draft', -2, '00:00', 'Rina', 'Talent'],
    ['LMS Software Terbaik untuk Training Karyawan', 'pending', -1, '00:00', 'Dimas', 'Learning'],
    ['Employee Self Service: Manfaat bagi HR', 'draft', -5, '00:00', 'Rina', 'HRIS']
  ].map(function (w, i) {
    var day = fmt(addDays(today, w[2]));
    var slug = w[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { id: String(500 + i), title: w[0], status: w[1], date: day + ' ' + w[3], link: 'https://wp.linovhr.com/' + slug + '/', author: w[4], categories: w[5],
      slug: slug, public_url: SITE + '/blog/' + slug + '/', live: w[1] === 'publish' ? (i === 6 ? 'HTTP 404' : 'live') : '',
      modified: fmt(addDays(today, Math.min(0, w[2]))) + ' 15:20', status_label: WP_LABEL[w[1]], edit_link: 'https://wp.linovhr.com/wp-admin/post.php?post=' + (500 + i) + '&action=edit' };
  });
  function wpListRes() { return { configured: true, posts: wpPosts, lastSync: stamp, canManage: true, now: nowStr() }; }

  // --- Brief generator (sama dengan backend) ---
  function tokens(t) { return String(t).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 || /^\d+$/.test(w); }); }
  function detectIntent(kw) {
    if (/\b(harga|biaya|tarif|price|pricing)\b/.test(kw)) return 'Harga';
    if (/\b(vs|versus|perbandingan|bandingkan|beda|perbedaan)\b/.test(kw)) return 'Perbandingan';
    if (/\b(cara|langkah|tutorial|panduan|how to|tips)\b/.test(kw)) return 'How-to';
    if (/\b(terbaik|rekomendasi|best|top|aplikasi|software|sistem|tools)\b/.test(kw)) return 'Komersial';
    return 'Informasional';
  }
  var ACR = { thr: 'THR', pph: 'PPh', bpjs: 'BPJS', hris: 'HRIS', hr: 'HR', kpi: 'KPI', ump: 'UMP', pkwt: 'PKWT', pkwtt: 'PKWTT', phk: 'PHK', umk: 'UMK', ptkp: 'PTKP', ter: 'TER', umkm: 'UMKM', erp: 'ERP' };
  function titleCase(kw) { return kw.split(' ').map(function (w) { return ACR[w] || w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function outline(kw, intent, faqs) {
    var K = titleCase(kw);
    var o = {
      'Komersial': ['## Apa Itu ' + K + '?', '## Manfaat ' + K + ' untuk Perusahaan', '## Fitur Wajib yang Harus Dimiliki', '## Rekomendasi ' + K + ' Terbaik', '### 1. LinovHR', '### 2. …', '## Cara Memilih ' + K + ' yang Tepat', '## Kesimpulan & CTA Demo LinovHR'],
      'How-to': ['## Apa yang Perlu Disiapkan', '## ' + K + ': Langkah demi Langkah', '### Langkah 1', '### Langkah 2', '### Langkah 3', '## Kesalahan yang Sering Terjadi', '## Cara Lebih Mudah dengan LinovHR', '## Kesimpulan'],
      'Harga': ['## Kisaran ' + K, '## Faktor yang Mempengaruhi Harga', '## Model Harga: Per Karyawan vs Paket', '## Perbandingan Harga Beberapa Penyedia', '## Biaya Tersembunyi yang Perlu Diwaspadai', '## Harga LinovHR & CTA Konsultasi'],
      'Perbandingan': ['## Ringkasan Perbandingan (tabel)', '## Kelebihan & Kekurangan Masing-masing', '## Kapan Memilih yang Mana', '## Alternatif: LinovHR', '## Kesimpulan'],
      'Informasional': ['## Pengertian ' + K, '## Tujuan & Manfaat ' + K, '## Dasar Hukum / Regulasi Terkait (jika ada)', '## Jenis-jenis / Komponen ' + K, '## Contoh ' + K, '## Cara Mengelola ' + K + ' dengan Software HR', '## Kesimpulan']
    }[intent];
    if (faqs.length) { o = o.concat(['## FAQ'], faqs.slice(0, 6).map(function (q) { return '### ' + q.charAt(0).toUpperCase() + q.slice(1) + '?'; })); }
    return o.join('\n');
  }
  function generateBrief(keyword) {
    keyword = String(keyword || '').trim().toLowerCase();
    if (!keyword) throw new Error('Target keyword wajib diisi');
    var kt = tokens(keyword), need = Math.max(1, Math.ceil(kt.length / 2));
    function score(t) { t = ' ' + String(t).toLowerCase() + ' '; return kt.filter(function (w) { return t.indexOf(w) > -1; }).length; }
    var related = queries.filter(function (q) { return q.query !== keyword && score(q.query) >= need; })
      .sort(function (a, b) { return b.impressions - a.impressions; }).slice(0, 20)
      .map(function (q) { return { query: q.query, impressions: q.impressions, clicks: q.clicks, position: q.position }; });
    var faqs = related.map(function (r) { return r.query; }).filter(function (q) { return /^(apa|apakah|bagaimana|berapa|kenapa|mengapa|kapan|siapa|cara|bisakah)\b/.test(q); });
    var exact = {};
    pageQuery.forEach(function (r) { if (score(r.query) === kt.length) { var p = exact[r.page] || (exact[r.page] = { page: r.page, clicks: 0, impressions: 0, best: 999 }); p.clicks += r.clicks; p.impressions += r.impressions; p.best = Math.min(p.best, r.position); } });
    var cannibal = Object.keys(exact).map(function (k) { return exact[k]; }).filter(function (p) { return p.impressions >= 10; }).sort(function (a, b) { return b.impressions - a.impressions; });
    var lm = {};
    pageQuery.forEach(function (r) { if (score(r.query) >= need && !exact[r.page]) { var l = lm[r.page] || (lm[r.page] = { page: r.page, clicks: 0, anchor: r.query }); l.clicks += r.clicks; } });
    var internal = Object.keys(lm).map(function (k) { return lm[k]; }).sort(function (a, b) { return b.clicks - a.clicks; }).slice(0, 8);
    var refs = compUrls.map(function (r) { return { competitor: r.competitor, url: r.url, title: r.title, s: score(r.url.replace(/[-/]/g, ' ') + ' ' + r.title) }; })
      .filter(function (r) { return r.s >= need; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    var intent = detectIntent(keyword);
    return { keyword: keyword, intent: intent, word_count: { 'Komersial': 2000, 'How-to': 1500, 'Harga': 1200, 'Perbandingan': 1800, 'Informasional': 1500 }[intent],
      related_queries: related, outline: outline(keyword, intent, faqs), internal_links: internal, competitor_refs: refs, cannibal: cannibal.slice(0, 5), notes: '' };
  }

  function sum(arr, k) { return arr.reduce(function (s, r) { return s + Number(r[k] || 0); }, 0); }
  function watchDrops() {
    var thr = Number(settings.pos_drop_alert);
    return keywords.map(function (w) {
      var q = queries.filter(function (x) { return x.query === w.keyword; })[0];
      return q ? { keyword: w.keyword, position: q.position, prev: q.prev_position, delta: q.delta_position } : null;
    }).filter(function (x) { return x && x.prev && x.delta >= thr; }).sort(function (a, b) { return b.delta - a.delta; });
  }

  var handlers = {
    login: function (r) {
      var u = users.filter(function (x) { return x.email === String(r.email).toLowerCase(); })[0] || users[0];
      return { token: 'demo-token', user: u };
    },
    me: function () { return { user: users[0] }; },
    logout: function () { return {}; },
    users: function () { return { users: users }; },
    dashboard: function () {
      var n = daily.length, cur = daily.slice(n - 28), prev = daily.slice(n - 56, n - 28);
      var t = fmt(today), d7 = fmt(addDays(today, -7)), d14 = fmt(addDays(today, -14)), we = fmt(addDays(today, 7));
      function adsSum(a, b) { var rows = ads.filter(function (r) { return r.date >= a && r.date < b; }); return { cost: sum(rows, 'cost'), clicks: sum(rows, 'clicks'), impressions: sum(rows, 'impressions'), conversions: sum(rows, 'conversions') }; }
      var decay = pages.filter(function (p) { return p.status === 'Decay'; }).sort(function (a, b) { return (b.prev_clicks - b.clicks) - (a.prev_clicks - a.clicks); });
      var newC = compUrls.filter(function (r) { return r.first_seen >= d7; });
      return {
        gsc: { clicks: sum(cur, 'clicks'), prevClicks: sum(prev, 'clicks'), impressions: sum(cur, 'impressions'), prevImpressions: sum(prev, 'impressions'),
          position: round(sum(cur, 'position') / cur.length, 1), prevPosition: round(sum(prev, 'position') / prev.length, 1), daily: daily },
        decay: decay.slice(0, 8), decayCount: decay.length, watchDrops: watchDrops(),
        ads: { cur: adsSum(d7, t), prev: adsSum(d14, d7) },
        competitors: { newCount: newC.length, relevant: newC.filter(function (r) { return r.relevant === 'Y'; }) },
        content: {
          dueSoon: content.filter(function (c) { return c.status !== 'Terbit' && c.due_date >= t && c.due_date <= we; }),
          overdue: content.filter(function (c) { return c.status !== 'Terbit' && c.due_date && c.due_date < t; }),
          byStatus: statuses.map(function (s) { return { status: s, count: content.filter(function (c) { return c.status === s; }).length }; })
        },
        wp: { configured: true, week: wpPosts.filter(function (p) { return p.status === 'future' && p.date >= nowStr() && p.date <= fmt(addDays(today, 7)) + ' 23:59'; }).length,
          missed: wpPosts.filter(function (p) { return p.status === 'future' && p.date < nowStr(); }).length,
          drafts: wpPosts.filter(function (p) { return p.status === 'draft' || p.status === 'pending'; }).length,
          notLive: wpPosts.filter(function (p) { return p.status === 'publish' && p.live && p.live !== 'live'; }).length },
        sync: { gsc: stamp, ads: stamp, competitors: stamp, wp: stamp }
      };
    },
    gsc: function () {
      return { ranges: { curStart: daily[62].date, curEnd: daily[89].date, prevStart: daily[34].date, prevEnd: daily[61].date },
        daily: daily, pages: pages, queries: queries, watch: keywords, lastPull: stamp };
    },
    ads: function () { return { rows: ads, lastSync: stamp }; },
    competitors: function () { return { competitors: competitors, articles: compUrls.slice().sort(function (a, b) { return a.first_seen < b.first_seen ? 1 : -1; }), lastCheck: stamp }; },
    contentList: function () { return { items: content }; },
    contentSave: function (r, u) {
      var it = Object.assign({}, r.item);
      if (!it.title) throw new Error('Judul wajib diisi');
      var idx = content.findIndex(function (c) { return c.id === it.id; });
      if (it.status === 'Terbit' && !it.publish_date) it.publish_date = fmt(today);
      it.updated_at = fmt(today);
      if (idx > -1) content[idx] = Object.assign(content[idx], it);
      else { it.id = 'k' + Date.now(); it.created_by = u.email; it.pic = it.pic || u.email; it.status = it.status || 'Ide'; content.push(it); }
      return { id: it.id };
    },
    contentDelete: function (r) { content = content.filter(function (c) { return c.id !== r.id; }); delete briefs[r.id]; return {}; },
    briefGet: function (r) { return { brief: briefs[r.contentId] || null }; },
    briefGenerate: function (r) { return { brief: generateBrief(r.keyword) }; },
    briefSave: function (r, u) {
      briefs[r.brief.content_id] = Object.assign({}, r.brief, { updated_by: u.email, updated_at: fmt(today) });
      var c = content.filter(function (x) { return x.id === r.brief.content_id; })[0];
      if (c && c.status === 'Ide') c.status = 'Brief';
      return {};
    },
    settingsGet: function () { return { settings: settings, competitors: competitors, keywords: keywords }; },
    settingsSave: function (r) { Object.assign(settings, r.settings); return {}; },
    competitorSave: function (r) {
      var c = r.competitor;
      var domain = String(c.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      var row = { id: c.id || 'c' + Date.now(), name: c.name, domain: domain, sitemap_url: c.sitemap_url || 'https://' + domain + '/sitemap.xml', active: 'TRUE' };
      var i = competitors.findIndex(function (x) { return x.id === row.id; });
      if (i > -1) competitors[i] = row; else competitors.push(row);
      return { id: row.id };
    },
    competitorDelete: function (r) { competitors = competitors.filter(function (c) { return c.id !== r.id; }); return {}; },
    keywordsSave: function (r) { keywords = r.keywords.map(function (k) { return { keyword: String(k).toLowerCase(), prioritas: 'Normal' }; }); return { count: keywords.length }; },
    runJob: function (r) { return { message: 'Mode demo: job "' + r.job + '" disimulasikan' }; },
    wpList: function () { return wpListRes(); },
    wpSync: function () { return wpListRes(); },
    wpReschedule: function (r) {
      var p = wpPosts.filter(function (x) { return x.id === r.id; })[0];
      if (!p || p.status !== 'future') throw new Error('Post ini tidak berstatus terjadwal');
      if (r.date <= nowStr()) throw new Error('Jadwal baru harus di masa depan');
      p.date = r.date; return { message: 'Jadwal dipindah ke ' + r.date };
    },
    wpUnschedule: function (r) {
      var p = wpPosts.filter(function (x) { return x.id === r.id; })[0];
      if (!p || p.status !== 'future') throw new Error('Post ini tidak berstatus terjadwal');
      p.status = 'draft'; p.status_label = 'Draft'; return { message: 'Jadwal dibatalkan, post kembali menjadi draft' };
    }
  };

  window.MockAPI = function (action, data) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        try {
          if (!handlers[action]) throw new Error('Aksi tidak dikenal: ' + action);
          var res = handlers[action](data || {}, users[0]);
          res.ok = true;
          resolve(JSON.parse(JSON.stringify(res)));
        } catch (e) { resolve({ ok: false, error: e.message }); }
      }, 180);
    });
  };
})();
