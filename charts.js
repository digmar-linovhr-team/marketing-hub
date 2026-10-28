// Chart SVG ringan tanpa library: garis (dengan crosshair) dan batang (dengan tooltip per batang).
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  function shortNum(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' M';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' jt';
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' rb';
    return String(Math.round(n * 10) / 10);
  }

  function shortDate(s) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var p = String(s).split('-');
    return p.length === 3 ? Number(p[2]) + ' ' + m[Number(p[1]) - 1] : s;
  }

  function draw(container, data, opts) {
    opts = opts || {};
    var fmt = opts.format || function (v) { return Number(v).toLocaleString('id-ID'); };
    var label = opts.label || '';
    container.innerHTML = '';
    container.classList.add('chart');
    if (!data || !data.length) { container.innerHTML = '<div class="empty">Belum ada data</div>'; return; }

    var W = Math.max(container.clientWidth || 600, 280);
    var H = opts.height || 220;
    var m = { t: 10, r: 8, b: 26, l: 44 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var maxV = niceMax(Math.max.apply(null, data.map(function (d) { return d.y; })) * 1.05);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.aria || label }, container);
    var g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, svg);

    // grid + sumbu Y
    for (var i = 0; i <= 4; i++) {
      var yv = maxV / 4 * i, yy = ih - ih * i / 4;
      el('line', { x1: 0, x2: iw, y1: yy, y2: yy, class: 'gridline' }, g);
      var t = el('text', { x: -8, y: yy + 3, 'text-anchor': 'end', class: 'tick' }, g);
      t.textContent = shortNum(yv);
    }

    var n = data.length;
    var isBar = opts.type === 'bar';
    var step = isBar ? iw / n : (n > 1 ? iw / (n - 1) : iw);
    function xAt(i) { return isBar ? step * i + step / 2 : step * i; }
    function yAt(v) { return ih - (v / maxV) * ih; }

    // label sumbu X (maks ±6)
    var every = Math.max(1, Math.ceil(n / 6));
    data.forEach(function (d, i) {
      if (i % every !== 0 && i !== n - 1) return;
      if (i === n - 1 && i % every !== 0 && (n - 1) % every < every / 2) return;
      var tx = el('text', { x: xAt(i), y: ih + 18, 'text-anchor': 'middle', class: 'tick' }, g);
      tx.textContent = opts.xFormat ? opts.xFormat(d.x) : shortDate(d.x);
    });

    var tip = document.createElement('div');
    tip.className = 'tooltip hidden';
    container.appendChild(tip);
    function showTip(i, px, py) {
      var d = data[i];
      tip.innerHTML = (opts.xFormat ? opts.xFormat(d.x) : shortDate(d.x)) + (label ? ' · ' + label : '') + '<br><b>' + fmt(d.y) + '</b>';
      tip.style.left = (px / W * 100) + '%';
      tip.style.top = (py / H * container.querySelector('svg').getBoundingClientRect().height) + 'px';
      tip.classList.remove('hidden');
    }

    if (isBar) {
      var bw = Math.max(2, Math.min(28, step - 2));
      var bars = data.map(function (d, i) {
        var h = Math.max(0, ih - yAt(d.y));
        var x = xAt(i) - bw / 2, y = yAt(d.y);
        var r = Math.min(4, bw / 2, h);
        // batang dengan ujung atas membulat, menempel di baseline
        var p = 'M' + x + ',' + ih + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + ih + 'Z';
        return el('path', { d: h > 0 ? p : 'M0,0', class: 'bar' }, g);
      });
      // area hover lebih besar dari batang
      data.forEach(function (d, i) {
        var hit = el('rect', { x: xAt(i) - step / 2, y: 0, width: step, height: ih, fill: 'transparent' }, g);
        hit.addEventListener('mouseenter', function () { bars[i].classList.add('hl'); showTip(i, m.l + xAt(i), m.t + yAt(d.y)); });
        hit.addEventListener('mouseleave', function () { bars[i].classList.remove('hl'); tip.classList.add('hidden'); });
        hit.addEventListener('touchstart', function () { bars.forEach(function (b) { b.classList.remove('hl'); }); bars[i].classList.add('hl'); showTip(i, m.l + xAt(i), m.t + yAt(d.y)); }, { passive: true });
      });
    } else {
      var pts = data.map(function (d, i) { return [xAt(i), yAt(d.y)]; });
      var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
      el('path', { d: path + 'L' + pts[n - 1][0] + ',' + ih + 'L0,' + ih + 'Z', class: 'area' }, g);
      el('path', { d: path, class: 'line' }, g);
      var cross = el('line', { y1: 0, y2: ih, class: 'crosshair', visibility: 'hidden' }, g);
      var dot = el('circle', { r: 4.5, class: 'dot', visibility: 'hidden' }, g);
      var overlay = el('rect', { x: 0, y: 0, width: iw, height: ih, fill: 'transparent' }, g);
      function move(clientX) {
        var rect = svg.getBoundingClientRect();
        var x = (clientX - rect.left) * (W / rect.width) - m.l;
        var i = Math.max(0, Math.min(n - 1, Math.round(x / step)));
        cross.setAttribute('x1', xAt(i)); cross.setAttribute('x2', xAt(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', xAt(i)); dot.setAttribute('cy', yAt(data[i].y)); dot.setAttribute('visibility', 'visible');
        showTip(i, m.l + xAt(i), m.t + yAt(data[i].y));
      }
      function hide() { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); }
      overlay.addEventListener('mousemove', function (e) { move(e.clientX); });
      overlay.addEventListener('mouseleave', hide);
      overlay.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
      overlay.addEventListener('touchstart', function (e) { move(e.touches[0].clientX); }, { passive: true });
      overlay.addEventListener('touchend', function () { setTimeout(hide, 1500); });
    }
  }

  // Render ulang saat ukuran kontainer berubah
  var registry = new Map();
  var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function (entries) {
    entries.forEach(function (en) {
      var args = registry.get(en.target);
      if (args && Math.abs((args.w || 0) - en.contentRect.width) > 4) { args.w = en.contentRect.width; draw(en.target, args.data, args.opts); }
    });
  }) : null;

  window.MChart = {
    line: function (c, data, opts) { opts = Object.assign({}, opts, { type: 'line' }); draw(c, data, opts); if (ro) { registry.set(c, { data: data, opts: opts, w: c.clientWidth }); ro.observe(c); } },
    bar: function (c, data, opts) { opts = Object.assign({}, opts, { type: 'bar' }); draw(c, data, opts); if (ro) { registry.set(c, { data: data, opts: opts, w: c.clientWidth }); ro.observe(c); } },
    shortDate: shortDate,
    shortNum: shortNum
  };
})();
