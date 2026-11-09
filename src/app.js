(function () {
  'use strict';
  var root = document.documentElement;
  var VH = innerHeight; window.addEventListener('resize', function () { VH = innerHeight; });
  try { if (window.top !== window.self) { root.style.display = 'none'; window.top.location = window.location.href; } } catch (e) { root.style.display = 'none'; }
  ['#g-input'].forEach(function (s) { var i = document.querySelector(s); if (i) i.maxLength = 200; });
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var motionLevel = (function () {
    try {
      var v = localStorage.getItem('motionLevel');
      if (v === '0' || v === '1' || v === '2') return +v;
      var old = localStorage.getItem('motion');
      if (old === 'full') return 1;
      if (old === 'reduced') return 0;
    } catch (e) {}
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1; } catch (e) { return 1; }
  })();
  var MOTION_NAMES = ['reduced', 'full', 'max'], MOTION_LABELS = ['Calm', 'Dynamic', 'Max'];
  var motion = motionLevel > 0;
  var motionScale = motionLevel === 2 ? 1.6 : 1;
  root.setAttribute('data-motion', MOTION_NAMES[motionLevel]);
  root.style.setProperty('--mscale', motionScale);
  var PAL = { dark: { node: '201,209,217', link: '127,168,204', hot: '180,35,44', wire: '127,168,204', wireHot: '194,104,108', halo: '13,17,23' }, light: { node: '31,35,40', link: '63,110,154', hot: '176,74,79', wire: '63,110,154', wireHot: '176,74,79', halo: '250,251,253' } };
  function pal() { return PAL[root.getAttribute('data-theme') === 'light' ? 'light' : 'dark']; }

  /* ---------- day / night mode ---------- */
  var tBtn = $('#theme'), tMeta = $('#tcolor');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    if (tMeta) tMeta.setAttribute('content', t === 'light' ? '#f6f8fa' : '#0d1117');
    tBtn.setAttribute('aria-label', t === 'light' ? 'Switch to night mode' : 'Switch to day mode');
    drawGlobe(); drawBg();
  }
  applyTheme(root.getAttribute('data-theme') || 'dark');
  tBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition) {
      root.classList.add('theming'); applyTheme(next); setTimeout(function () { root.classList.remove('theming'); }, 800); return;
    }
    var r = tBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('no-tr'); root.style.setProperty('--vx', x + 'px'); root.style.setProperty('--vy', y + 'px');
    var applied = false, vt = document.startViewTransition(function () { applied = true; applyTheme(next); });
    setTimeout(function () { if (!applied) { try { vt.skipTransition(); } catch (e) {} applyTheme(next); root.classList.remove('no-tr'); } }, 1500);
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 950, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('no-tr'); }, function () { root.classList.remove('no-tr'); });
  });

  /* ---------- motion dial: Calm / Dynamic / Max, not a binary switch ---------- */
  var mBtn = $('#motion-toggle'), mLabel = mBtn && mBtn.querySelector('.mt-label');
  if (mBtn) {
    mBtn.setAttribute('aria-label', 'Motion level: ' + MOTION_LABELS[motionLevel] + '. Click to change.');
    if (mLabel) mLabel.textContent = MOTION_LABELS[motionLevel];
    mBtn.addEventListener('click', function () {
      var next = (motionLevel + 1) % 3;
      try { localStorage.setItem('motionLevel', String(next)); } catch (e) {}
      root.classList.add('motion-switching');
      root.setAttribute('data-motion', MOTION_NAMES[next]);
      setTimeout(function () { location.reload(); }, 180);
    });
  }

  /* ---------- split headings into letters ---------- */
  $$('.split').forEach(function (el) {
    var t = el.textContent; el.setAttribute('aria-label', t); el.textContent = '';
    t.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span'); w.style.display = 'inline-block'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (c, i) { var s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i + wi * 3); s.textContent = c; w.appendChild(s); });
      el.appendChild(w); if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- the globe: assembles during loading, then stays as the page background ---------- */
  var sy = 0;
  var gl = $('#globe'), gctx = gl && gl.getContext('2d'), GW = 0, GH = 0, gp = [], glk = [];
  var G = { assemble: 0, grow: 0, rot: 0, tilt: 0.35, mx: 0, my: 0, running: false, show: true, t0: performance.now(), links: 0 };
  function ease3(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function buildGlobe() {
    var n = innerWidth < 760 ? 70 : 120, i; gp = []; glk = [];
    for (i = 0; i < n; i++) { var k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i; gp.push({ x: Math.cos(th) * Math.sin(phi), y: Math.cos(phi), z: Math.sin(th) * Math.sin(phi), sx: Math.random(), sy: Math.random(), hot: i % 19 === 0, delay: Math.random() * 0.25 }); }
    for (i = 0; i < n; i++) for (var q = i + 1; q < n; q++) { var dx = gp[i].x - gp[q].x, dy = gp[i].y - gp[q].y, dz = gp[i].z - gp[q].z; if (dx * dx + dy * dy + dz * dz < 0.36) glk.push([i, q]); }
    G.links = glk.length;
  }
  function sizeGlobe() { if (!gl) return; var d = Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 1.25 : 1.5); GW = innerWidth; GH = innerHeight; gl.width = GW * d; gl.height = GH * d; gctx.setTransform(d, 0, 0, d, 0, 0); }
  function drawGlobe() {
    if (!gctx || !GW) return; gctx.clearRect(0, 0, GW, GH);
    var P = pal(), small = GW < 760, m = Math.min(GW, GH), e = ease3(G.grow);
    var cx = GW / 2, cy = GH * 0.42 + (GH * (small ? 0.36 : 0.46) - GH * 0.42) * e;
    var R = m * 0.27 + ((small ? Math.min(GW * 0.56, GH * 0.34) : m * 0.46) - m * 0.27) * e;
    R *= 1 + Math.min(sy / Math.max(VH, 1), 1.4) * 0.22;
    var cyaw = Math.cos(G.rot), syaw = Math.sin(G.rot), cp = Math.cos(G.tilt), sp = Math.sin(G.tilt), pr = [], t = performance.now() / 1000, i;
    for (i = 0; i < gp.length; i++) {
      var o = gp[i], x = o.x * cyaw + o.z * syaw, z = -o.x * syaw + o.z * cyaw, y = o.y * cp - z * sp; z = o.y * sp + z * cp;
      var s = 1 / (1.9 - z * 0.5), tx = cx + x * R * s * 1.9, ty = cy + y * R * s * 1.9;
      var f = Math.min(1, Math.max(0, (G.assemble * 1.25 - o.delay) / 0.75)); f = ease3(f);
      pr.push({ x: o.sx * GW + (tx - o.sx * GW) * f, y: o.sy * GH + (ty - o.sy * GH) * f, z: z, s: s, f: f });
    }
    var la = Math.min(1, Math.max(0, (G.assemble - 0.5) / 0.4));
    gctx.lineWidth = 1;
    for (i = 0; i < glk.length; i++) {
      var a = pr[glk[i][0]], b = pr[glk[i][1]], al = (0.05 + ((a.z + b.z) / 2 + 1) * 0.1) * la * Math.min(a.f, b.f); if (al < 0.01) continue;
      gctx.strokeStyle = 'rgba(' + P.link + ',' + al.toFixed(3) + ')'; gctx.beginPath(); gctx.moveTo(a.x, a.y); gctx.lineTo(b.x, b.y); gctx.stroke();
    }
    var ra = ease3(G.grow);
    if (ra > 0.02) {
      var rings = [[1.28, 1.15, 0.5, 0.0004, 5], [1.55, 0.55, -0.9, -0.0003, 3.2]];
      for (var ri = 0; ri < rings.length; ri++) {
        var rg = rings[ri], seg = 72, last = null, ang0 = t * rg[3] * 1000;
        for (var sg = 0; sg <= seg; sg++) {
          var th2 = sg / seg * 6.283, ox = Math.cos(th2) * rg[0], oz = Math.sin(th2) * rg[0], oy = 0;
          var y1 = oy * Math.cos(rg[1]) - oz * Math.sin(rg[1]), z1 = oy * Math.sin(rg[1]) + oz * Math.cos(rg[1]), x1 = ox;
          var x2 = x1 * Math.cos(rg[2]) - y1 * Math.sin(rg[2]), y2 = x1 * Math.sin(rg[2]) + y1 * Math.cos(rg[2]);
          var x3 = x2 * cyaw + z1 * syaw, z3 = -x2 * syaw + z1 * cyaw, y3 = y2 * cp - z3 * sp; z3 = y2 * sp + z3 * cp;
          var s3 = 1 / (1.9 - z3 * 0.5), px = cx + x3 * R * s3 * 1.9, py = cy + y3 * R * s3 * 1.9;
          if (last) { gctx.strokeStyle = 'rgba(' + (ri ? P.hot : P.link) + ',' + (0.1 * ra * (0.4 + (z3 + 1) / 2)).toFixed(3) + ')'; gctx.beginPath(); gctx.moveTo(last[0], last[1]); gctx.lineTo(px, py); gctx.stroke(); }
          last = [px, py];
        }
        var sat = (t * rg[4] * 0.2) % 6.283, sx = Math.cos(sat) * rg[0], sz = Math.sin(sat) * rg[0], sy1 = sz * Math.sin(rg[1]), sz1 = sz * Math.cos(rg[1]), sx2 = sx * Math.cos(rg[2]) - (-sy1 * 0 + (0 * Math.cos(rg[1]) - sz * Math.sin(rg[1]))) * Math.sin(rg[2]);
        var yy1 = 0 * Math.cos(rg[1]) - sz * Math.sin(rg[1]), yy2 = sx * Math.sin(rg[2]) + yy1 * Math.cos(rg[2]), xx2 = sx * Math.cos(rg[2]) - yy1 * Math.sin(rg[2]);
        var xx3 = xx2 * cyaw + sz1 * syaw, zz3 = -xx2 * syaw + sz1 * cyaw, yy3 = yy2 * cp - zz3 * sp; zz3 = yy2 * sp + zz3 * cp;
        var ss = 1 / (1.9 - zz3 * 0.5);
        gctx.fillStyle = 'rgba(' + (ri ? P.hot : P.node) + ',' + (0.8 * ra).toFixed(2) + ')'; gctx.beginPath(); gctx.arc(cx + xx3 * R * ss * 1.9, cy + yy3 * R * ss * 1.9, 3.2, 0, 6.283); gctx.fill();
      }
    }
    for (i = 0; i < pr.length; i++) {
      var q2 = pr[i], dep = (q2.z + 1) / 2;
      if (gp[i].hot) { var pulse = 0.6 + Math.sin(t * 2 + i) * 0.4; gctx.fillStyle = 'rgba(' + P.hot + ',' + (0.35 + dep * 0.55).toFixed(2) + ')'; gctx.beginPath(); gctx.arc(q2.x, q2.y, (2.4 + pulse * 1.2) * q2.s * 1.4, 0, 6.283); gctx.fill(); }
      else { gctx.fillStyle = 'rgba(' + P.node + ',' + (0.2 + dep * 0.6).toFixed(2) + ')'; gctx.beginPath(); gctx.arc(q2.x, q2.y, 1.4 + dep * 1.4, 0, 6.283); gctx.fill(); }
    }
  }
  var gTog = 0;
  function gframe() {
    if (!G.running) return;
    if (GW < 760 && (gTog ^= 1)) { requestAnimationFrame(gframe); return; }
    G.rot += 0.0016 + sy * 0.0000012 + G.mx * 0.002; G.tilt += ((0.35 + G.my * 0.5) - G.tilt) * 0.04;
    drawGlobe(); requestAnimationFrame(gframe);
  }
  function startGlobe() { if (!gl || !gctx || G.running || !G.show || document.hidden) return; G.running = true; requestAnimationFrame(gframe); }
  buildGlobe(); sizeGlobe(); drawGlobe(); if (motion) startGlobe();
  window.addEventListener('resize', function () { sizeGlobe(); buildGlobe(); drawGlobe(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) G.running = false; else if (motion) startGlobe(); });
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { G.mx = e.clientX / innerWidth - 0.5; G.my = e.clientY / innerHeight - 0.5; } }, { passive: true });

  /* ---------- loader: counter drives the globe assembling ---------- */
  var seen = false;
  try { seen = sessionStorage.getItem('seen') === '1'; if (localStorage.getItem('introAt')) seen = true; } catch (e) {}
  var pctEl = $('.ld-pct'), barEl = $('.ld-bar span'), msgEl = $('.ld-msg');
  function growGlobe() {
    var g0 = null, dur = seen ? 1300 : 1700;
    (function step(t) { if (!g0) g0 = t; G.grow = Math.min((t - g0) / dur, 1); if (G.grow < 1) requestAnimationFrame(step); })(performance.now());
  }
  function finishLoader() {
    root.classList.add('loaded'); G.assemble = 1;
    if (motion) growGlobe(); else { G.grow = 1; drawGlobe(); }
    try { sessionStorage.setItem('seen', '1'); localStorage.setItem('introAt', String(Date.now())); } catch (e) {}
    setTimeout(begin, seen ? 550 : 650);
    setTimeout(function () { root.classList.remove('loading'); root.classList.add('done'); }, seen ? 1500 : 1700);
  }
  var minMs = seen ? (innerWidth < 760 ? 1300 : 1700) : (innerWidth < 760 ? 1300 : 2000), t0 = performance.now(), loaded = document.readyState === 'complete';
  window.addEventListener('load', function () { loaded = true; });
  (function tick(now) {
    var p = Math.min((now - t0) / minMs, 1), shown = Math.round((loaded ? p : Math.min(p, 0.92)) * 100);
    G.assemble = shown / 100;
    if (pctEl) pctEl.textContent = shown + '%';
    if (barEl) barEl.style.transform = 'scaleX(' + shown / 100 + ')';
    if (msgEl) msgEl.textContent = shown < 34 ? 'scanning network' : shown < 70 ? 'mapping nodes' : shown < 100 ? 'locking on' : 'ready';
    if (p >= 1 && loaded) finishLoader(); else requestAnimationFrame(tick);
  })(t0);

  /* ---------- everything that waits for the loader ---------- */
  var began = false;
  function begin() {
    if (began) return; began = true;
    var els = $$('[data-reveal], .title');
    if ('IntersectionObserver' in window && motion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in'); io.unobserve(e.target); countUp(e.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -3% 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add('is-in'); countUp(el); }); }
    roleCycle(); termDemo(); hudTick();
  }
  if (!motion) begin();

  function countUp(scope) {
    var list = $$('[data-count]', scope); if (scope.hasAttribute && scope.hasAttribute('data-count')) list.push(scope);
    list.forEach(function (b) {
      if (b.dataset.done) return; b.dataset.done = 1;
      var end = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '', t0 = null, dur = 1000;
      function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3); b.textContent = pre + Math.round(end * e) + suf; if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }


  /* ---------- hero: lab terminal demo and live readout ---------- */
  function termLoop(box, scripts, cap, pause) {
    if (!box) return; var si = 0, live = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { live = e[0].isIntersecting; }).observe(box);
    function line(cls) { var d = document.createElement('div'); d.className = cls; box.appendChild(d); while (box.children.length > cap) box.removeChild(box.firstChild); return d; }
    function wait(fn, ms) { setTimeout(function () { if (live) fn(); else wait(fn, 400); }, ms); }
    function typeCmd(txt, done) { var d = line('cmd'), i = 0; (function t() { d.textContent = '$ ' + txt.slice(0, i++); if (i <= txt.length) wait(t, 38); else wait(done, 380); })(); }
    function out(arr, i, done) { if (i >= arr.length) return wait(done, pause); var d = line(arr[i].indexOf('[+]') === 0 ? 'ok' : 'out'); d.textContent = arr[i]; wait(function () { out(arr, i + 1, done); }, 420); }
    if (!motion) { var s0 = scripts[0]; typeCmd(s0[0], function () { out(s0[1], 0, function () {}); }); return; }
    (function run() { var s = scripts[si++ % scripts.length]; typeCmd(s[0], function () { out(s[1], 0, run); }); })();
  }
  function termDemo() {
    termLoop($('.termcard .term-body'), [
      ['nmap -sC -sV 10.10.10.5', ['22/tcp  open  ssh   OpenSSH 8.2', '80/tcp  open  http  Apache 2.4.41', '[+] 2 services, 1 outdated']],
      ['ffuf -u http://lab/FUZZ -w common.txt', ['admin     [Status: 301]', 'uploads   [Status: 200]', '[+] 2 paths found']],
      ['sqlmap -u "http://lab/item?id=1" --batch', ['[*] testing parameter id', '[+] id is injectable (boolean-based)']],
      ['hashcat -m 0 hash.txt rockyou.txt', ['5f4dcc3b5aa765d61d8327deb882cf99:password', '[+] 1/1 hashes cracked']]
    ], 7, 2200);
  }
  var upT0 = performance.now();
  function hudTick() {
    var n = $('#hud-nodes'), l = $('#hud-links'), u = $('#hud-up'); if (!n) return;
    n.textContent = gp.length; l.textContent = G.links;
    (function t() { var s = Math.floor((performance.now() - upT0) / 1000); u.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); setTimeout(t, 1000); })();
  }

  /* ---------- role word typewriter ---------- */
  function roleCycle() {
    var el = $('#roleword'); if (!el || !motion) return;
    var words = ['Penetration Tester', 'Web and API Security', 'CTF Player', 'Python Tool Builder'], wi = 0, ci = words[0].length, dir = -1, hold = 30;
    (function loop() {
      if (!motion) { el.textContent = words[0]; return; }
      if (hold > 0) { hold--; return setTimeout(loop, 60); }
      ci += dir; el.textContent = words[wi].slice(0, ci);
      if (dir === 1 && ci === words[wi].length) { dir = -1; hold = 30; }
      else if (dir === -1 && ci === 0) { dir = 1; wi = (wi + 1) % words.length; }
      setTimeout(loop, dir === 1 ? 85 : 45);
    })();
  }

  /* ---------- live badge: load TryHackMe's script only when the section is near ---------- */
  (function () {
    var host = $('.thm-badge'); if (!host) return;
    function load() { var s = document.createElement('script'); s.src = host.getAttribute('data-src'); s.async = true; host.appendChild(s); }
    if ('IntersectionObserver' in window) { var o = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { o.disconnect(); load(); } }, { rootMargin: '700px' }); o.observe(host.parentNode); } else load();
  })();

  /* ---------- live badge fallback ---------- */
  var live = $('.live-card'), badge = $('.thm-badge');
  function rendered() { return Array.prototype.some.call(badge.children, function (c) { return c.tagName !== 'SCRIPT' && c.offsetHeight > 20; }); }
  if (live && badge && 'MutationObserver' in window) {
    new MutationObserver(function () { if (rendered()) live.classList.add('has-live'); }).observe(badge, { childList: true, subtree: true });
    window.addEventListener('load', function () { setTimeout(function () { if (rendered()) live.classList.add('has-live'); }, 1500); });
  }

  /* ---------- navbar: indicator, mobile menu, scroll state ---------- */
  var nav = $('#nav'), pill = $('.nav-pill'), links = $$('#navlinks a'), ind = $('.indicator'), prog = $('.b-prog'), bar = $('#progress');
  var active = null, fineMouse = false;
  function moveInd(a) {
    if (!ind) return; if (!a) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  links.forEach(function (a) { a.addEventListener('mouseenter', function () { moveInd(a); }); a.addEventListener('focus', function () { moveInd(a); }); });
  $('#navlinks').addEventListener('mouseleave', function () { moveInd(active); });
  window.addEventListener('resize', function () { moveInd(active); });
  $('#burger').addEventListener('click', function () { var o = pill.classList.toggle('open'); this.setAttribute('aria-expanded', o); });

  var TITLES = { about: 'About', journey: 'Journey', arch: 'Arch', tools: 'Tools', projects: 'Projects', proof: 'Proof of work', live: 'Live stats', contact: 'Contact' }, appTitle = $('#apptitle'), curTitle = 'Farhan';
  function setTitle(id) {
    var t = TITLES[id] || 'Farhan'; if (!appTitle || t === curTitle) return; curTitle = t;
    var b = document.createElement('b'); b.textContent = t; appTitle.innerHTML = ''; appTitle.appendChild(b);
  }
  var tabInd = $('.tabind');
  function moveTabInd() {
    if (!tabInd) return; var a = $('.tabbar a.on:not(.fab)');
    if (!a || !a.offsetWidth) { tabInd.style.opacity = 0; return; }
    tabInd.style.opacity = 1; tabInd.style.width = a.offsetWidth + 'px'; tabInd.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  window.addEventListener('resize', moveTabInd);
  var secs = links.map(function (a) { return { a: a, s: document.getElementById(a.dataset.nav) }; });
  var hero = $('#hero'), copy = $('.hero-copy'), medalWrap = $('.hero-medal'), medal = $('.medal-stage');
  var sy = 0, ticking = false, lastY = 0, navHold = 0;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - VH, frac = h > 0 ? y / h : 0, cur = null;
    secs.forEach(function (o) { if (o.s && o.s.getBoundingClientRect().top < VH * 0.45) cur = o; });
    sy = y;
    if (bar) bar.style.transform = 'scaleX(' + frac + ')';
    if (prog) prog.style.strokeDashoffset = 119.4 * (1 - frac);
    root.style.setProperty('--scroll', y);
    nav.classList.toggle('scrolled', y > 30);
    nav.style.transform = (performance.now() > navHold && y > lastY && y > 500 && !pill.classList.contains('open')) ? 'translateY(-90px)' : '';
    if (medal && !fineMouse) medal.style.setProperty('--my', Math.min(y / 14, 24) + 'deg');
    G.show = y < VH * 1.5; if (G.show && motion) startGlobe(); else G.running = false;
    if (!motion && gl) { drawGlobe(); gl.style.opacity = y < VH * 0.7 ? '' : '0'; }
    lastY = y;
    var nxt = cur ? cur.a : null;
    if (nxt !== active) { active = nxt; links.forEach(function (a) { a.classList.toggle('on', a === active); }); moveInd(active); $$('.tabbar a').forEach(function (a) { a.classList.toggle('on', !!active && a.dataset.nav === active.dataset.nav); }); setTitle(active ? active.dataset.nav : ''); moveTabInd(); }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  var ssy = 0, plxDone = false;
  if (motion) (function plx() {
    if (Math.abs(sy - ssy) < 0.05 && plxDone) { requestAnimationFrame(plx); return; }
    ssy += (sy - ssy) * 0.32; plxDone = Math.abs(sy - ssy) < 0.05;
    var h = VH, k = Math.min(ssy / h, 1.4), fade = Math.max(0, 1 - ssy / (h * 0.7)).toFixed(3);
    if (copy) { copy.style.transform = 'translate3d(0,' + (-ssy * 0.14).toFixed(2) + 'px,0)'; copy.style.opacity = fade; }
    if (medalWrap) { medalWrap.style.transform = 'translate3d(0,' + (-ssy * 0.22).toFixed(2) + 'px,0) scale(' + Math.max(1 - k * 0.1, 0.75).toFixed(4) + ')'; medalWrap.style.opacity = fade; }
    if (gl) gl.style.opacity = Math.max(0.5 - k * 0.5, 0).toFixed(3);
    requestAnimationFrame(plx);
  })();

  /* ---------- section transitions: a quick, quiet scroll ---------- */
  var busy = false;
  function go(id, label) {
    var target = id === 'top' ? document.body : document.getElementById(id); if (!target) return;
    var y = id === 'top' ? 0 : Math.round(target.getBoundingClientRect().top + window.scrollY);
    pill.classList.remove('open');
    if (busy) return;
    busy = true; navHold = performance.now() + 2600; nav.style.transform = '';
    glide(y, function () {
      var t = target.querySelector && target.querySelector('.title');
      if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }
      busy = false; navHold = performance.now() + 1200; nav.style.transform = '';
      try { history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id); } catch (e) {}
    });
  }
  function glide(y, done) {
    var y0 = window.scrollY, d = y - y0, dur = Math.min(850, Math.max(420, 300 + Math.abs(d) * 0.15)), t0 = performance.now();
    var finished = false;
    function finish() { if (finished) return; finished = true; clearTimeout(guard); window.scrollTo(0, y); done(); }
    var guard = setTimeout(finish, dur + 700);
    if (document.hidden) { finish(); return; }
    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    (function frame(now) {
      if (finished) return;
      var p = Math.min((now - t0) / dur, 1), e = ease(p);
      window.scrollTo(0, y0 + d * e);
      if (p < 1) requestAnimationFrame(frame); else finish();
    })(t0);
  }
  $$('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var id = a.dataset.go, name = id === 'top' ? 'Top' : (a.textContent.trim() || id);
      go(id, name.charAt(0).toUpperCase() + name.slice(1));
    });
  });

  /* ---------- smooth wheel scrolling (mouse notches glide, trackpads stay native) ---------- */
  var sT = 0, sC = 0, sOn = false;
  function sClamp(v) { return Math.max(0, Math.min(v, document.documentElement.scrollHeight - innerHeight)); }
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || busy || !motion) return;
    var inner = e.target.closest && e.target.closest('.g-out'); if (inner && inner.scrollHeight > inner.clientHeight + 1) return;
    var d = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (!sOn && Math.abs(d) < 40) return;
    e.preventDefault();
    if (!sOn) { sC = window.scrollY; sT = sC; }
    sT = sClamp(sT + d); sOn = true;
  }, { passive: false });
  (function sLoop() {
    if (sOn) { sC += (sT - sC) * 0.38; if (Math.abs(sT - sC) < 0.4) { sC = sT; sOn = false; } window.scrollTo(0, sC); }
    requestAnimationFrame(sLoop);
  })();
  window.addEventListener('keydown', function () { sOn = false; });

  /* ---------- cursor: reticle, target lock, trail, click burst, idle roamers ---------- */
  var dot = $('.cursor-dot'), ring = $('.cursor-ring'), tag = $('.cursor-tag'), lock = $('.cur-lock'), fx = $('#curfx'), fctx = fx && fx.getContext('2d');
  var corners = $$('.cur-lock i'), CS = 13, QS = new URLSearchParams(location.search), IDLE = +QS.get('idle') || 3000;
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, cursorOn = false, lockEl = null, trail = [], C = null, spinAnim = null, popT = null, lastMove = performance.now(), roam = null, fr = 0, pcache = [], pc = 0;
  function sizeFx() { if (!fx) return; fx.width = innerWidth; fx.height = innerHeight; }
  sizeFx(); window.addEventListener('resize', sizeFx);
  function targetOf(t) { var a = t && t.closest && t.closest('a,button,.tilt'); if (!a) return null; return (a.offsetWidth > 700 || a.offsetHeight > 520) ? null : a; }
  function tagText(a) {
    var l = a.getAttribute('data-cursor');
    if (l === null) l = a.hasAttribute('data-go') ? 'Go' : (a.tagName === 'A' && a.target === '_blank' ? 'Open' : '');
    return l;
  }
  function ringPop() { ring.classList.remove('pop'); void ring.offsetWidth; ring.classList.add('pop'); clearTimeout(popT); popT = setTimeout(function () { ring.classList.remove('pop'); }, 850); }
  function setLock(a) {
    if (a === lockEl) return; var had = !!lockEl; lockEl = a;
    lock.classList.toggle('on', !!a); ring.classList.toggle('hot', !!a); dot.classList.toggle('hot', !!a);
    var tx = a ? tagText(a) : ''; tag.textContent = tx; tag.classList.toggle('on', !!tx);
    if (!a && had) setTimeout(ringPop, 140);
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    fineMouse = true;
    if (!cursorOn && motion) { cursorOn = true; root.classList.add('has-cursor'); rx = e.clientX; ry = e.clientY; startCursor(); }
    mx = e.clientX; my = e.clientY; lastMove = performance.now(); needMove = false;
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    var txt = !!(e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]')); dot.classList.toggle('txt', txt); ring.classList.toggle('txt', txt);
    if (roam) endRoam(); else setLock(txt ? null : targetOf(e.target));
  }, { passive: true });

  /* ---------- idle story (desktop only): an asteroid becomes your ship, spots a threat, dogfights, duels as mechs, wins, patrols ---------- */
  function deskOK() { return matchMedia('(pointer: fine)').matches && innerWidth > 820; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clampV(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeIO(t) { t = clampV(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
  var AST = [], ST = null, needMove = false, FEET = 23, fought = false;
  function COLS(P, side) { return side === 'f' ? { s: P.hot, f: P.hot, h: P.wireHot, fl: P.hot } : { s: P.node, f: P.link, h: P.node, fl: P.link }; }

  /* background asteroids */
  function mkAsteroid(rad) {
    var k = 9 + Math.floor(Math.random() * 4), poly = [], crk = [], j, q;
    for (j = 0; j < k; j++) { var an = j / k * 6.2832, rr = rad * (0.74 + Math.random() * 0.36); poly.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
    for (j = 0; j < 5; j++) { var ca = Math.random() * 6.28, pts = [[0, 0]]; for (q = 1; q <= 3; q++) { var rr2 = rad * q / 3 * 0.96, aa = ca + rnd(-0.4, 0.4); pts.push([Math.cos(aa) * rr2, Math.sin(aa) * rr2]); } crk.push(pts); }
    return { poly: poly, crk: crk, r: rad, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.004, cr: [[-0.3 * rad, -0.2 * rad, 0.22 * rad], [0.25 * rad, 0.15 * rad, 0.16 * rad]], hide: false };
  }
  function mkAst() {
    AST = []; if (!deskOK()) return;
    var IH = innerHeight, docH = Math.max(document.documentElement.scrollHeight, IH * 4), span = (docH - IH) * 0.2 + IH, n = Math.min(18, Math.max(8, Math.round(span / 260))), i;
    for (i = 0; i < n; i++) { var a = mkAsteroid(14 + Math.random() * 30); a.x = 0.04 + Math.random() * 0.92; a.base = (i + Math.random() * 0.8) / n * span; a.depth = 0.2; AST.push(a); }
  }
  function astXY(a) { return a.tmp ? { x: a.px, y: a.py } : { x: a.x * innerWidth + bmx * 22, y: a.base - sy * a.depth }; }
  function drawAst(ctx, P, a, x, y, scale, alpha, strong) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot); ctx.scale(scale, scale); ctx.globalAlpha = alpha; ctx.lineJoin = 'round';
    ctx.beginPath(); a.poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.fillStyle = 'rgba(' + P.link + ',' + (strong ? 0.2 : 0.07) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(' + (strong ? P.node : P.link) + ',' + (strong ? 0.9 : 0.5) + ')'; ctx.lineWidth = strong ? 1.8 : 1.1; ctx.stroke();
    a.cr.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 6.283); ctx.stroke(); });
    ctx.restore();
  }
  function drawAstBg(ctx, P) {
    for (var i = 0; i < AST.length; i++) { var a = AST[i]; if (a.hide) continue; var q = astXY(a); if (q.y < -60 || q.y > innerHeight + 60) continue; drawAst(ctx, P, a, q.x, q.y, 1, 0.6, false); }
  }
  function drawCracks(ctx, a, x, y, scale, prog, col) {
    if (prog <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot); ctx.scale(scale, scale); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[7, 0.35, col], [1.6, 0.95, '255,255,255']].forEach(function (st) {
      ctx.strokeStyle = 'rgba(' + st[2] + ',' + st[1] + ')'; ctx.lineWidth = st[0];
      a.crk.forEach(function (c) { var n = (c.length - 1) * prog, i; ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (i = 1; i < c.length && i - 1 < n; i++) { var t = Math.min(1, n - (i - 1)); ctx.lineTo(c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t); } ctx.stroke(); });
    });
    ctx.restore();
  }
  function drawGlow(ctx, x, y, r, col, k) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + col + ',' + (0.55 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
  function drawHalf(ctx, P, a, h, alpha) {
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(-90, h.side > 0 ? 0 : -90, 180, 90); ctx.clip(); ctx.lineJoin = 'round';
    ctx.beginPath(); a.poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.fillStyle = 'rgba(' + P.link + ',.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(' + P.node + ',.9)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(' + P.hot + ',.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.stroke();
    ctx.restore();
  }
  function shardBurst(a, x, y, n, P) {
    for (var i = 0; i < n; i++) { var k = a.poly.length, i0 = Math.floor(Math.random() * k), p0 = a.poly[i0], p1 = a.poly[(i0 + 1) % k], an = Math.atan2(p0[1] + p1[1], p0[0] + p1[0]) + rnd(-0.3, 0.3), sp = rnd(0.07, 0.24); ST.parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: rnd(1100, 1800), max: 1800, kind: 'shard', pts: [[p0[0] * 0.55, p0[1] * 0.55], [p1[0] * 0.55, p1[1] * 0.55], [0, 0]], rot: a.rot, vr: rnd(-0.008, 0.008), col: P.node }); }
  }
  function visAst(excl, fromX, fromY, minD) {
    return AST.filter(function (a) { if (a.hide || a === excl) return false; var q = astXY(a); return q.x > 90 && q.x < innerWidth - 90 && q.y > 120 && q.y < innerHeight - 120 && (!minD || Math.hypot(q.x - fromX, q.y - fromY) > minD); });
  }
  function tmpAsteroid(x, y) { var a = mkAsteroid(rnd(20, 32)); a.tmp = true; a.px = x; a.py = y; a.hide = true; return a; }
  function restoreAst() { AST.forEach(function (a) { a.hide = false; }); }

  /* units */
  function mkUnit(side, x, y, ang) { return { side: side, x: x, y: y, vx: 0, vy: 0, tx: x, ty: y, tt: 0, ang: ang, spd: 0, bank: 0, jink: 0, jdir: 1, seed: Math.random() * 6, dodgeAt: 0, stag: 0, yo: 0, hp: 100, hpS: 100, m: 0, dir: side === 'f' ? 1 : -1, ph: 0, flash: 0, atk: 0, aim: 0, air: false, vyy: 0, sq: 0, sc: 1, al: 1, alive: true, trail: [], cool: rnd(500, 900), roll: 0, kx: 0, mode: 'walk', mt: 0, want: 150, after: '', hitNext: false, tr: null, jump: null, wave: 0, burst: 0, atkT: 0, struck: false, charge: 0, guard: 0, dive: 0, up: false }; }
  function flyTo(u, tx, ty, dt, maxSp, k) {
    var dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(maxSp, d * 1.8), f = Math.min(1, dt * (k || 0.0035));
    u.vx += (dx / d * sp - u.vx) * f; u.vy += (dy / d * sp - u.vy) * f; u.x += u.vx * dt / 1000; u.y += u.vy * dt / 1000;
    if (Math.hypot(u.vx, u.vy) > 25) u.ang += angDiff(u.ang, Math.atan2(u.vy, u.vx)) * Math.min(1, dt * 0.012);
    u.trail.push({ x: u.x, y: u.y }); if (u.trail.length > 22) u.trail.shift();
    return d;
  }

  /* particles and lasers */
  function burst(x, y, n, kind, col, spd, life) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.2832, s = rnd(spd * 0.3, spd); ST.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(life * 0.6, life), max: life, kind: kind, col: col, r: rnd(1.5, 4), rot: Math.random() * 6, vr: rnd(-0.01, 0.01) }); }
  }
  function ringFx(x, y, col, r1) { ST.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 520, max: 520, kind: 'ring', col: col, r: r1 || 40 }); }
  function boom(x, y, big, P) {
    var s = big ? 1 : 0.5; burst(x, y, Math.round(26 * s), 'spark', P.hot, 0.55, 700); burst(x, y, Math.round(14 * s), 'debris', P.node, 0.35, 1400); burst(x, y, Math.round(8 * s), 'smoke', P.link, 0.12, 1500);
    ST.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 700, max: 700, kind: 'fire', col: P.hot, r: 46 * (big ? 1.3 : 0.7) }); ringFx(x, y, P.node, 60 * (big ? 1.4 : 0.8));
  }
  function stepParts(dt) {
    var ps = ST.parts, i, p;
    for (i = ps.length - 1; i >= 0; i--) { p = ps[i]; p.life -= dt; if (p.life <= 0) { ps.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'debris') { p.vy += 0.0004 * dt; p.rot += p.vr * dt; } else if (p.kind === 'shard') { p.rot += p.vr * dt; p.vx *= 0.996; p.vy *= 0.996; } else if (p.kind === 'spark') { p.vx *= 0.985; p.vy *= 0.985; } }
  }
  function drawParts(ctx, P) {
    ST.parts.forEach(function (p) {
      var q = p.life / p.max; ctx.save(); ctx.globalAlpha = Math.min(1, q * 1.4);
      if (p.kind === 'spark') { ctx.strokeStyle = 'rgba(' + p.col + ',1)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 60, p.y - p.vy * 60); ctx.stroke(); }
      else if (p.kind === 'debris') { ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = 'rgba(' + p.col + ',.9)'; ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); }
      else if (p.kind === 'shard') { ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); ctx.lineTo(p.pts[1][0], p.pts[1][1]); ctx.lineTo(p.pts[2][0], p.pts[2][1]); ctx.closePath(); ctx.fillStyle = 'rgba(' + P.link + ',.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(' + p.col + ',.9)'; ctx.lineWidth = 1.3; ctx.stroke(); }
      else if (p.kind === 'smoke') { ctx.fillStyle = 'rgba(' + p.col + ',' + (0.25 * q).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (1 - q) * 22, 0, 6.283); ctx.fill(); }
      else if (p.kind === 'ring') { ctx.strokeStyle = 'rgba(' + p.col + ',1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - q) + 6, 0, 6.283); ctx.stroke(); }
      else if (p.kind === 'fire') { var rr = p.r * (0.5 + (1 - q) * 0.9), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr); g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * q).toFixed(2) + ')'); g.addColorStop(0.4, 'rgba(' + p.col + ',' + (0.7 * q).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + p.col + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill(); }
      ctx.restore();
    });
  }
  /* the exact point drawShipU paints the wingtip cannon's muzzle at, in world space, so a bolt never appears to come from empty air */
  function shipMuzzle(u, side) {
    var scl = (u.sc || 1) * 1.25, a0 = u.ang, px = -1 * scl, py = side * 13.5 * scl;
    return { x: u.x + px * Math.cos(a0) - py * Math.sin(a0), y: u.y + px * Math.sin(a0) + py * Math.cos(a0) };
  }
  function fireShip(u, v, hit, dmg, big) {
    var a0 = u.ang, side = (u.fs = -(u.fs || 1)), ang = a0 + (hit ? 0 : (Math.random() < 0.5 ? -1 : 1) * rnd(0.2, 0.34)), tip = shipMuzzle(u, side), ox = tip.x, oy = tip.y, sp = big ? 1.05 : 0.82;
    ST.lasers.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, side: u.side, hit: hit, dmg: dmg, tgt: v, home: hit, life: 2300, big: !!big });
    if (big) { burst(ox, oy, 10, 'spark', '255,255,255', 0.4, 300); ringFx(ox, oy, u.side === 'f' ? '180,35,44' : '127,168,204', 26); }
    burst(ox, oy, 3, 'spark', '255,255,255', 0.2, 180);
  }
  function jinkShip(u, p) { if (Math.random() < p && u.jink <= 0) { u.jink = 560; u.jdir = Math.random() < 0.5 ? -1 : 1; if (u.roll <= 0) u.roll = 0.01; } }
  /* the exact point drawMechU paints the gun barrel's muzzle at, in world space -- mirrors the hx2/hy2/ga pose math used there */
  function mechMuzzle(u) {
    var aim = u.aim, hx2 = 11 + aim * 3, hy2 = -15 - aim * 6, ga = 0.5 * (1 - aim);
    var sc2 = 1.1 * (u.sc || 1) * (0.5 + 0.5 * u.m), mlx = hx2 + 16 * Math.cos(ga), mly = hy2 + 16 * Math.sin(ga);
    return { x: u.x + mlx * sc2 * u.dir, y: u.y + FEET + mly * sc2 };
  }
  function mechFire(s, u, v, hit, dmg, big) {
    var tip = mechMuzzle(u), mx = tip.x, my = tip.y, ty = v.y + FEET - 22, dist = Math.max(40, Math.abs(v.x - u.x));
    if (hit) ST.nfire = (ST.nfire || 0) + 1;
    ST.lasers.push({ x: mx, y: my, vx: u.dir * 0.95, vy: hit ? (ty - my) / (dist / 0.95) : 0, side: u.side, hit: hit, dmg: dmg, tgt: v, home: false, life: 1600, mech: true, big: !!big });
    if (big) { burst(mx, my, 10, 'spark', '255,255,255', 0.4, 300); ringFx(mx, my, '255,255,255', 30); }
    burst(mx, my, 4, 'spark', '255,255,255', 0.25, 170); ringFx(mx, my, u.side === 'f' ? '180,35,44' : '127,168,204', 12); u.x -= u.dir * 2;
    if (!hit) v.dodgeAt = s.clk + Math.max(0, dist / 0.95 - 230);
  }
  function applyHit(u, dmg, P, big) {
    if (!u.alive) return;
    /* an active shield actually blocks now: most of the damage and all of the knockback/stagger are absorbed, and a good block is rewarded with a follow-up counter-swing (see mechStep's 'guard' branch) */
    var blocked = u.guard > 0.3;
    if (blocked) { ringFx(u.x + u.dir * 16, u.y + FEET - 22, '255,255,255', 46); burst(u.x + u.dir * 16, u.y + FEET - 22, 14, 'shard', '255,255,255', 0.4, 520); dmg *= 0.15; u.blockedHit = true; }
    u.guard = 0; u.charge = 0; ST.nhit = (ST.nhit || 0) + 1; u.hp = Math.max(u.side === 'f' ? 35 : 0, u.hp - dmg); u.flash = 1;
    if (!blocked) { u.kx += (u.side === 'f' ? -1 : 1) * 40; if (u.m > 0.5) { u.stag = 260; u.kx += (u.side === 'f' ? -1 : 1) * 60; } burst(u.x, u.y, big ? 16 : 8, 'spark', P.hot, big ? 0.55 : 0.4, 420); }
    if (big) ST.slow = Math.max(ST.slow || 0, 110);
    if (u.side === 'e' && u.hp <= 0) ST.killed = true;
  }
  function stepLasers(dt, P) {
    var ls = ST.lasers, i, l;
    for (i = ls.length - 1; i >= 0; i--) {
      l = ls[i]; l.life -= dt;
      if (l.home && l.tgt.alive) { var want = Math.atan2(l.tgt.y - l.y, l.tgt.x - l.x), cur = Math.atan2(l.vy, l.vx), sp = Math.hypot(l.vx, l.vy), na = cur + angDiff(cur, want) * Math.min(1, dt * 0.012); l.vx = Math.cos(na) * sp; l.vy = Math.sin(na) * sp; }
      l.x += l.vx * dt; l.y += l.vy * dt;
      if (l.hit && l.tgt.alive) {
        var ty = l.mech ? l.tgt.y + FEET - 22 : l.tgt.y;
        var sx = l.x - l.vx * dt, sy2 = l.y - l.vy * dt, vx = l.x - sx, vy = l.y - sy2, ll = vx * vx + vy * vy || 1, tt = clampV(((l.tgt.x - sx) * vx + (ty - sy2) * vy) / ll, 0, 1);
        if (Math.hypot(sx + vx * tt - l.tgt.x, sy2 + vy * tt - ty) < (l.mech ? 14 : 17)) { applyHit(l.tgt, l.dmg, P, l.big); ls.splice(i, 1); continue; }
      }
      if (l.life <= 0 || l.x < -40 || l.x > innerWidth + 40 || l.y < -40 || l.y > innerHeight + 40) { if (l.hit && ST.plan && l.tgt.alive) { if (l.side === 'f') ST.plan.ei = Math.max(0, ST.plan.ei - 1); else ST.plan.fi = Math.max(0, ST.plan.fi - 1); } ls.splice(i, 1); }
    }
  }
  function drawLasers(ctx, P) {
    ST.lasers.forEach(function (l) {
      var c = l.side === 'f' ? P.hot : P.link, len = 22, m = Math.hypot(l.vx, l.vy) || 1;
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(' + c + ',.25)'; ctx.lineWidth = l.big ? 12 : 6; if (l.big) len = 48; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x - l.vx / m * len, l.y - l.vy / m * len); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = l.big ? 3.6 : 2; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x - l.vx / m * len, l.y - l.vy / m * len); ctx.stroke();
    });
  }
  /* a lobbed explosive: a slower, dodgeable finisher with real weight when it lands */
  function mechBomb(s, u, v, hit, dmg) {
    var tip = mechMuzzle(u), mx = tip.x, my = tip.y, tx = hit ? v.x : v.x + (Math.random() < 0.5 ? -1 : 1) * rnd(55, 95), ty = v.y + FEET - 22;
    ST.bombs.push({ x: mx, y: my, x0: mx, y0: my, tx: tx, ty: ty, t: 0, dur: 820, side: u.side, hit: hit, dmg: dmg, tgt: v });
    if (!hit) v.dodgeAt = s.clk + 560;
    burst(mx, my, 4, 'smoke', u.side === 'f' ? '180,35,44' : '127,168,204', 0.14, 320);
  }
  function stepBombs(dt, P) {
    var bs = ST.bombs, i, b;
    for (i = bs.length - 1; i >= 0; i--) {
      b = bs[i]; b.t += dt; var p = Math.min(1, b.t / b.dur);
      b.x = b.x0 + (b.tx - b.x0) * p; b.y = b.y0 + (b.ty - b.y0) * p - Math.sin(Math.PI * p) * 95;
      if (Math.random() < 0.45) burst(b.x, b.y, 1, 'smoke', '201,209,217', 0.04, 280);
      if (p >= 1) {
        boom(b.x, b.y, true, P); ringFx(b.x, b.y, P.hot, 64);
        if (b.hit && b.tgt.alive) applyHit(b.tgt, b.dmg, P, true);
        bs.splice(i, 1);
      }
    }
  }
  function drawBombs(ctx, P) {
    ST.bombs.forEach(function (b) {
      var c = b.side === 'f' ? P.hot : P.link, pulse = 0.6 + Math.sin(b.t / 60) * 0.4;
      ctx.save(); ctx.fillStyle = 'rgba(' + c + ',' + (0.55 + pulse * 0.4).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    });
  }

  /* drawing the ships and the cute mechs */
  function drawBar(ctx, P, u, yo) {
    u.hpS += (u.hp - u.hpS) * 0.12; if (u.hpS < 0.5 && !u.alive) return;
    var w = 30, x = u.x - w / 2, y = u.y - yo; ctx.save(); ctx.globalAlpha = 0.8 * u.al; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 1, y - 1, w + 2, 5); ctx.fillStyle = 'rgba(' + (u.side === 'f' ? P.hot : P.link) + ',.95)'; ctx.fillRect(x, y, w * Math.max(0, u.hpS) / 100, 3); ctx.restore();
  }
  function drawShipU(ctx, P, u, now) {
    var al = u.al * (1 - u.m); if (al <= 0.02) return;
    var c = COLS(P, u.side), blink = (now % 900) < 450, spd = Math.min(1, Math.hypot(u.vx, u.vy) / 260), fl = 9 + Math.random() * 9, sc = u.sc * 1.25;
    var jx = 0, jy = 0; if (u.charge > 0.03) { var sh = u.charge * 3.2; jx = (Math.random() - 0.5) * sh; jy = (Math.random() - 0.5) * sh; }
    ctx.save(); ctx.globalAlpha = al; ctx.translate(u.x + jx, u.y + jy); ctx.rotate(u.ang); ctx.scale(sc * (1 - u.m * 0.5), sc * (1 + u.m * 0.2) * Math.cos(u.roll) * (1 - Math.abs(u.bank) * 0.16)); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var wf = 1 - u.m * 0.7, hg = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); hg.addColorStop(0, 'rgba(' + P.halo + ',.78)'); hg.addColorStop(0.6, 'rgba(' + P.halo + ',.4)'); hg.addColorStop(1, 'rgba(' + P.halo + ',0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(' + c.s + ',.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(-13, 0, 2.6, 5.4, 0, 0, 6.283); ctx.stroke();
    var gr = ctx.createRadialGradient(-14, 0, 1, -14, 0, 20); gr.addColorStop(0, 'rgba(' + c.fl + ',' + (0.35 + spd * 0.3).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + c.fl + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(-14, 0, 20, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(' + c.fl + ',.9)'; ctx.beginPath(); ctx.moveTo(-13, -2.6); ctx.lineTo(-13 - fl * (0.6 + spd * 0.6), 0); ctx.lineTo(-13, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-13, -1.2); ctx.lineTo(-13 - fl * 0.38 * (0.6 + spd * 0.6), 0); ctx.lineTo(-13, 1.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(' + c.s + ',.95)'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(' + c.f + ',.34)';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.moveTo(8, sd * 4); ctx.lineTo(-6, sd * 18 * wf); ctx.lineTo(-13, sd * 18 * wf); ctx.lineTo(-10, sd * 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, sd * 4); ctx.lineTo(4, sd * 6.5); ctx.lineTo(-2, sd * 6); ctx.lineTo(2, sd * 4.2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, sd * 14 * wf); ctx.lineTo(10, sd * 14 * wf); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, sd * 10 * wf); ctx.lineTo(1, sd * 9 * wf); ctx.stroke();
      ctx.fillStyle = blink === (sd > 0) ? 'rgba(' + c.h + ',1)' : 'rgba(' + c.f + ',.7)'; ctx.beginPath(); ctx.arc(-12, sd * 18 * wf, 1.7, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(' + c.f + ',.34)';
      ctx.strokeStyle = 'rgba(' + c.s + ',.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, sd * 15 * wf); ctx.lineTo(-1, sd * 13.5 * wf); ctx.stroke();
      ctx.beginPath(); ctx.arc(-1, sd * 13.5 * wf, 1.6, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(' + c.h + ',.85)'; ctx.beginPath(); ctx.arc(-1, sd * 13.5 * wf, 0.9, 0, 6.283); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(' + c.s + ',.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(29, 0); ctx.lineTo(24, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + c.s + ',.95)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(14, -4); ctx.lineTo(-6, -6.5); ctx.lineTo(-13, -4); ctx.lineTo(-13, 4); ctx.lineTo(-6, 6.5); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(' + c.f + ',.34)'; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-15, -11); ctx.lineTo(-11, -3.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-15, 11); ctx.lineTo(-11, 3.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(' + c.f + ',.3)'; ctx.beginPath(); ctx.moveTo(4, 5.5); ctx.lineTo(-4, 9); ctx.lineTo(-7, 5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = al * 0.45; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-11, 0); ctx.moveTo(-2, -6); ctx.lineTo(-2, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -2.6); ctx.lineTo(4, -5); ctx.moveTo(10, 2.6); ctx.lineTo(4, 5); ctx.stroke(); ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(' + c.h + ',.4)'; ctx.beginPath(); ctx.ellipse(8, 0, 6, 3.2, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(5.5, -1.6); ctx.lineTo(9.5, 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + c.s + ',.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(8, 3); ctx.stroke();
    [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(-3, sd * 3.2); ctx.lineTo(1.5, sd * 3.2); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(' + c.s + ',.95)';
    ctx.fillStyle = 'rgba(' + c.h + ',.95)'; ctx.beginPath(); ctx.arc(22, 0, 1.4, 0, 6.283); ctx.fill();
    if (u.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (u.flash * 0.7).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  function drawMechU(ctx, P, u, now) {
    var al = u.al * u.m; if (al <= 0.02) return;
    var c = COLS(P, u.side), s = 1.1 * u.sc * (0.5 + 0.5 * u.m), sq = 1 - u.sq * 0.12, walk = !u.air && (u.mode === 'walk' || u.mode === 'strafe'), pulse = 0.55 + Math.sin(now / 260) * 0.35, flick = (now % 4200) < 90, ph = u.ph, dir = u.dir, foe = u.side === 'e';
    var body = 'rgba(' + c.f + ',.36)', plate = 'rgba(' + c.f + ',.5)', hot = 'rgba(' + c.h + ',.95)', line = 'rgba(' + c.s + ',.95)';
    function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); }
    var jx = 0, jy = 0; if (u.charge > 0.03) { var sh = u.charge * 3.2; jx = (Math.random() - 0.5) * sh; jy = (Math.random() - 0.5) * sh; }
    ctx.save(); ctx.globalAlpha = al; ctx.translate(u.x + jx, u.y + FEET + jy); if (u.dive) ctx.rotate(-dir * 0.55 * u.dive); ctx.scale(s * dir, s * sq);
    var hg = ctx.createRadialGradient(0, -22, 6, 0, -22, 46); hg.addColorStop(0, 'rgba(' + P.halo + ',.8)'); hg.addColorStop(0.6, 'rgba(' + P.halo + ',.42)'); hg.addColorStop(1, 'rgba(' + P.halo + ',0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -22, 46, 0, 6.283); ctx.fill();
    ctx.lineJoin = 'miter'; ctx.lineCap = 'square'; ctx.lineWidth = 1.5; ctx.strokeStyle = line;
    if (!u.air && u.m > 0.9) { ctx.fillStyle = 'rgba(' + c.f + ',.14)'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 2, 0, 0, 6.283); ctx.fill(); }
    [-1, 1].forEach(function (side) {
      var pp = ph + (side > 0 ? Math.PI : 0), swg = u.air ? 0 : Math.sin(pp) * 5 * (walk ? 1 : 0), lift = u.air ? 5 : Math.max(0, Math.cos(pp)) * 3 * (walk ? 1 : 0), hx = side * 4, fx2 = hx + swg;
      ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(hx, -11); ctx.lineTo(hx + swg * 0.5 + side * 1.5, -6 - lift * 0.6); ctx.lineTo(fx2, -lift - 1.5); ctx.stroke();
      var kneeX = hx + swg * 0.5 + side * 1.5, kneeY = -6 - lift * 0.6, shinX = (kneeX + fx2) / 2, shinY = (kneeY + (-lift - 1.5)) / 2;
      ctx.fillStyle = plate; ctx.beginPath(); ctx.ellipse(kneeX, kneeY, 1.6, 2, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = plate; ctx.beginPath(); ctx.ellipse(shinX, shinY, 1.7, 1.2, 0.3 * side, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.fillStyle = plate; poly([[fx2 - 4, -lift], [fx2 + 5, -lift], [fx2 + 5, -lift - 3.2], [fx2 - 2, -lift - 3.2]]); ctx.fill(); ctx.stroke();
    });
    var sw = walk ? Math.sin(ph) * 3 : -2;
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-8, -23); ctx.lineTo(-11 + sw * 0.3, -17); ctx.lineTo(-10 + sw, -12 + (u.air ? -4 : 0)); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.fillStyle = body; poly([[-8, -26], [8, -26], [6.5, -10], [-6.5, -10]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = plate; poly([[-8, -26], [8, -26], [7.4, -20], [-7.4, -20]]); ctx.fill();
    var cg = ctx.createRadialGradient(0, -15, 0, 0, -15, 5.5); cg.addColorStop(0, 'rgba(' + c.h + ',' + pulse.toFixed(2) + ')'); cg.addColorStop(1, 'rgba(' + c.h + ',0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -15, 5.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = hot; poly([[0, -17.4], [2, -16.2], [2, -13.8], [0, -12.6], [-2, -13.8], [-2, -16.2]]); ctx.fill();
    ctx.fillStyle = plate; ctx.lineWidth = 1.5; poly([[-15, -29], [-6, -30], [-6, -19], [-14, -20]]); ctx.fill(); ctx.stroke(); poly([[15, -29], [6, -30], [6, -19], [14, -20]]); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + c.h + ',.8)'; ctx.lineWidth = 1.1; poly([[-14, -28], [-7.5, -28.8], [-7.5, -20.5], [-13, -21.3]]); ctx.stroke(); poly([[14, -28], [7.5, -28.8], [7.5, -20.5], [13, -21.3]]); ctx.stroke(); ctx.strokeStyle = line;
    ctx.fillStyle = 'rgba(' + c.h + ',.22)'; poly([[-6, -24], [0, -14], [6, -24]]); ctx.fill(); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, -11.5); ctx.stroke();
    ctx.fillStyle = plate; poly([[-7, -10], [-3, -10], [-4, -5], [-7.5, -6]]); ctx.fill(); ctx.stroke(); poly([[-2, -10], [2, -10], [2, -4], [-2, -4]]); ctx.fill(); ctx.stroke(); poly([[7, -10], [3, -10], [4, -5], [7.5, -6]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = plate; ctx.lineWidth = 1.1; poly([[-13.5, -24.5], [-9.5, -24.8], [-9.5, -19.5], [-13.5, -19.5]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hot; [0, 1, 2].forEach(function (k) { ctx.beginPath(); ctx.arc(-12.8 + k * 1.5, -22, 0.55, 0, 6.283); ctx.fill(); });
    var aim = u.aim, bash = u.atk, hx2 = 11 + aim * 3, hy2 = -15 - aim * 6, ga = 0.5 * (1 - aim);
    if (bash > 0.02 || bash < -0.02) { var bp = bash > 0 ? bash : bash * 0.9; hx2 = 12 + bp * 6; hy2 = -26 + (bp + 0.8) * 9; ga = -1.25 + (bp + 0.8) * 1.45; }
    else if (u.wave > 0) { hx2 = 10; hy2 = -33 + Math.sin(now / 90) * 1.5; ga = -1.4; }
    var meleeActive = bash > 0.02 || bash < -0.02;
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -23); ctx.lineTo(hx2, hy2); ctx.stroke();
    ctx.save(); ctx.translate(hx2, hy2); ctx.rotate(ga);
    if (meleeActive) {
      ctx.lineWidth = 1; ctx.fillStyle = 'rgba(' + c.s + ',.92)'; poly([[-4, 2.8], [18, 0.7], [18, -0.7], [-4, -2.8], [-6.5, 0]]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = hot; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(16, 0); ctx.stroke(); ctx.strokeStyle = line;
      ctx.lineWidth = 1.2; ctx.fillStyle = plate; ctx.fillRect(-5.5, -4, 2.2, 8);
      ctx.fillStyle = plate; ctx.fillRect(-8.5, -1.6, 3.2, 3.2);
    } else {
      ctx.lineWidth = 1.2; ctx.fillStyle = 'rgba(' + c.s + ',.9)'; ctx.fillRect(-6, -1.6, 12, 3.2); ctx.strokeRect(-6, -1.6, 12, 3.2);
      ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, 0); ctx.stroke(); ctx.fillStyle = hot; ctx.fillRect(14.5, -1.6, 2.4, 3.2); ctx.fillStyle = plate; ctx.fillRect(-2, 1.6, 3, 3.2); ctx.fillRect(-4, -3.4, 5, 1.8);
    }
    ctx.restore();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -26); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.fillStyle = body; poly([[-5.5, -40], [5.5, -40], [8, -35], [7, -28.5], [-7, -28.5], [-8, -35]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = plate; poly([[-5.5, -40], [5.5, -40], [6.4, -37.5], [-6.4, -37.5]]); ctx.fill();
    ctx.fillStyle = 'rgba(' + c.h + ',.25)'; ctx.fillRect(-6.5, -35, 13, 5.6);
    ctx.fillStyle = flick ? 'rgba(255,255,255,.95)' : hot; ctx.fillRect(-5.8, -33.4, 11.6, 2.4);
    ctx.fillStyle = hot; ctx.lineWidth = 1.4; poly([[-1.3, -40], [1.3, -40], [0, -47.5]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = plate; poly([[-8, -33], [-6, -33], [-6, -29], [-8.6, -30.2]]); ctx.fill(); ctx.stroke(); poly([[8, -33], [6, -33], [6, -29], [8.6, -30.2]]); ctx.fill(); ctx.stroke();
    if (foe) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, -39); ctx.lineTo(-9, -45); ctx.moveTo(5, -39); ctx.lineTo(9, -45); ctx.stroke(); }
    if (u.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (u.flash * 0.6).toFixed(2) + ')'; poly([[-8, -40], [8, -40], [8, -10], [-8, -10]]); ctx.fill(); }
    if (u.charge > 0.02) { var cx2 = 14 + aim * 2, cy2 = -15 - aim * 6, cr = 3 + u.charge * 9, cgl = ctx.createRadialGradient(cx2 + 10, cy2, 0, cx2 + 10, cy2, cr); cgl.addColorStop(0, 'rgba(255,255,255,.95)'); cgl.addColorStop(0.4, 'rgba(' + c.h + ',.8)'); cgl.addColorStop(1, 'rgba(' + c.h + ',0)'); ctx.fillStyle = cgl; ctx.beginPath(); ctx.arc(cx2 + 10, cy2, cr, 0, 6.283); ctx.fill(); }
    if (u.guard > 0.02) {
      ctx.globalAlpha = al * u.guard; ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(' + c.h + ',.95)'; ctx.fillStyle = 'rgba(' + c.f + ',.5)';
      poly([[8, -39], [22, -30], [20, -10], [8, -4], [-4, -10], [-6, -30]]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -36); ctx.lineTo(8, -7); ctx.stroke();
      /* a clear boss/emblem in the middle so the plate reads as a shield, not just a glow panel */
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(8, -22, 3.4, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.8; ctx.stroke();
      if (u.blockedHit) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; [0, 1, 2].forEach(function (k) { var rr = 6 + k * 5; ctx.beginPath(); ctx.arc(8, -22, rr, 0, 6.283); ctx.globalAlpha = al * u.guard * (1 - k / 3); ctx.stroke(); }); ctx.globalAlpha = al; }
      ctx.globalAlpha = al;
    }
    if (u.m < 0.97 && u.m > 0.03) { var sy4 = -46 * u.m; ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-16, sy4); ctx.lineTo(16, sy4); ctx.stroke(); ctx.strokeStyle = 'rgba(' + c.h + ',.8)'; [[-15, -2], [15, -2]].forEach(function (b) { ctx.beginPath(); ctx.moveTo(b[0], -48); ctx.lineTo(b[0] + b[0] / 15 * -4, -48); ctx.moveTo(b[0], -48); ctx.lineTo(b[0], -43); ctx.moveTo(b[0], -2); ctx.lineTo(b[0] + b[0] / 15 * -4, -2); ctx.moveTo(b[0], -2); ctx.lineTo(b[0], -7); ctx.stroke(); }); }
    ctx.restore();
  }
  /* speech bubbles for both pilots */
  var sayF = document.createElement('div'), sayE = document.createElement('div');
  sayF.className = 'rsay'; sayE.className = 'rsay foe';
  [sayF, sayE].forEach(function (b) { b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<span class="rbody"><span class="rtxt"></span><i class="tail"></i></span>'; document.body.appendChild(b); });
  var sayUntil = { f: 0, e: 0 };
  function sayAs(side, text, ms) { var b = side === 'f' ? sayF : sayE; b.querySelector('.rtxt').textContent = text; b.classList.add('on'); sayUntil[side] = performance.now() + (ms || 2600); }
  function hideSay() { sayF.classList.remove('on'); sayE.classList.remove('on'); sayUntil.f = sayUntil.e = 0; }
  function posSay(now) {
    /* the bubble is centered over whoever is speaking, with a tail that slides to keep pointing at them even when the bubble is clamped to the screen edge */
    [['f', sayF], ['e', sayE]].forEach(function (p) {
      var side = p[0], b = p[1], u = ST && (side === 'f' ? ST.f : ST.e); if (!b.classList.contains('on')) return;
      if (now > sayUntil[side] || !u || !u.alive) { b.classList.remove('on'); return; }
      var up = u.m > 0.5 ? 80 : 42, w = b.offsetWidth, h = b.offsetHeight, cx = u.x, bx = clampV(cx - w / 2, 8, innerWidth - w - 8), by = Math.max(8, u.y - up - h);
      b.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
      b.style.setProperty('--tx', Math.max(18, Math.min(cx - bx, w - 18)).toFixed(1) + 'px');
    });
  }
  var PATROL = ['Scanning the sector...', 'All quiet. Too quiet.', 'No contacts. Staying sharp.', 'Radar looks clear.', 'Patrolling sector About.', 'Nothing here but rocks.'];

  /* stage caption: the fight follows the real stages of a test */
  /* the bottom-left stage caption ("01 RECON scanning the page" etc) was removed;
     setCap/hideCap stay as no-ops so the rest of the story code doesn't need to change */
  function setCap() {}
  function hideCap() {}
  function stageFor(ph, st) {
    if (ph === 'morph' || ph === 'patrol') return [1, 'Recon', 'scanning the page'];
    if (ph === 'detect') return [1, 'Recon', 'threat located'];
    if (ph === 'ambush') return [2, 'Exploit', 'engaging the threat'];
    if (ph === 'dog') return [2, 'Exploit', 'engaging the threat' + (st && st.win > 1 ? ' | round ' + st.round + '/' + st.win : '')];
    if (ph === 'toShip' && st && st.killed) return [4, 'Report', 'finding closed'];
    if (ph === 'duel' && st && st.rdur) { var q = st.rt / st.rdur, rn = st.win > 1 ? ' | round ' + st.round + '/' + st.win : ''; return [3, 'Escalate', (q < 0.3 ? 'foothold: closing in' : q < 0.62 ? 'lateral movement: trading blows' : 'privilege escalation: finishing move') + rn]; }
    if (ph === 'toMech') return [3, 'Escalate', 'pivoting to the host: transforming'];
    if (ph === 'toShip') return [3, 'Escalate', 'pulling out'];
    if (ph === 'victory') return [4, 'Report', 'finding closed'];
    return [4, 'Report', 'all clear'];
  }
  function FOUGHT() { return fought; }
  /* the ship's only job after a win is to go back to patrolling/roaming and repeat -- no more flying to Contact to pitch itself */
  function afterWin(s, now) { s.quiet = true; sayAs('f', 'Back on patrol.', 1800); s.ph = 'roam'; s.pt = 0; s.roamEnd = 20000; s.nextSay = now + 1500; }

  /* the story */
  function startRoam() {
    if (!deskOK() || needMove) return;
    hideNudge();
    var P0 = pal(), vis = visAst(null, 0, 0, 0), a, q;
    if (vis.length) { a = vis[Math.floor(Math.random() * vis.length)]; q = astXY(a); a.px = q.x; a.py = q.y; } else { a = tmpAsteroid(rnd(160, innerWidth - 160), rnd(160, innerHeight - 160)); }
    a.hide = true;
    var win = +QS.get('win') || (function () { var r = Math.random(); return r < 0.4 ? 2 : r < 0.75 ? 3 : 4; })(), f = mkUnit('f', a.px || q.x, a.py || q.y, -1.5708);
    f.m = 0; f.sc = 0.2; f.al = 0;
    ST = { ph: 'morph', pt: 0, win: win, round: 1, f: f, e: null, A0: a, T: null, parts: [], lasers: [], bombs: [], plan: null, rt: 0, rdur: 0, cx: 0, cy: 0, th: 0, om: 0.002, born: performance.now(), clk: 0, quiet: !QS.get('win') && FOUGHT(), capKey: '', pl: null, killed: false, nextSay: 0, tgt: { x: f.x, y: f.y, t: 0 }, abort: 0, vt: 0 };
    roam = { kind: 'story', x: f.x, y: f.y, back: false, bt: 0, bx: 0, by: 0 };
    root.classList.add('roaming'); setLock(null); trail = [];
    burst(f.x, f.y, 14, 'debris', P0.node, 0.3, 900); ringFx(f.x, f.y, P0.node, 50);
  }
  function endRoam() { hideSay(); hideCap(); if (roam && !roam.back) { roam.back = true; roam.bt = performance.now(); roam.bx = roam.x; roam.by = roam.y; if (ST) ST.abort = performance.now(); } }
  function planRound(isMech) {
    var s = ST, R = s.win - s.round + 1, hp0 = s.e.hp, target = R > 1 ? Math.max(18, hp0 * (R - 1) / R) : 0, n = isMech ? (R === 1 ? 9 : 7) : (R === 1 ? 7 : 5), i, e = [], f = [];
    s.rt = 0; s.rdur = isMech ? rnd(19000, 24000) : (R === 1 ? rnd(13000, 17000) : rnd(14000, 19000));
    for (i = 1; i <= n; i++) e.push(s.rdur * (0.1 + 0.78 * (i - rnd(0.15, 0.85)) / n + (R === 1 ? 0.04 : 0)));
    e.sort(function (a, b) { return a - b; }); if (R === 1) e[n - 1] = Math.max(e[n - 1], s.rdur * 0.82);
    f.push(s.rdur * rnd(0.2, 0.3), s.rdur * rnd(0.45, 0.58), s.rdur * rnd(0.72, 0.86)); if (isMech) f.push(s.rdur * rnd(0.32, 0.4), s.rdur * rnd(0.6, 0.68)); f.sort(function (a, b) { return a - b; });
    s.plan = { e: e, f: f, ei: 0, fi: 0, edmg: (hp0 - target) / n, fdmg: 7, mech: !!isMech };
  }
  function dueE(s) { return s.plan.ei < s.plan.e.length && (s.rt >= s.plan.e[s.plan.ei] || s.rt > s.rdur + 1500); }
  function dueF(s) { return s.plan.fi < s.plan.f.length && s.rt >= s.plan.f[s.plan.fi]; }
  function hitDmgE(s) { var last = s.plan.ei >= s.plan.e.length && s.round === s.win; return last ? s.e.hp + 1 : s.plan.edmg; }

  function pickPlat() {
    var best = null, bd = 1e9;
    $$('.card,.wcard,.tool-col,.stat,.live-card,.ccard,.nf,.pm,.game,.open-card,.termcard,.jt-b,.sky,.steps li,.lrow,.big-stats,.about-l,.rail,.c-l,.link-rows').forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.width < 300 || r.top < 170 || r.top > innerHeight - 150 || r.left < -10 || r.right > innerWidth + 10) return;
      var d = Math.abs(r.top - innerHeight * 0.55) + Math.abs((r.left + r.right) / 2 - innerWidth / 2) * 0.3; if (d < bd) { bd = d; best = el; }
    });
    return best;
  }
  function platRect(s) { var r = s.pl.getBoundingClientRect(); return { x1: Math.max(r.left, 10) + 16, x2: Math.min(r.right, innerWidth - 10) - 16, top: r.top, ok: r.top > 90 && r.top < innerHeight - 60 && r.width > 200 }; }

  /* mech AI */
  function canDodge(u) { return u.alive && !u.air && u.mode !== 'melee' && !(u.stag > 0); }
  function mechPick(u, v, s, due) {
    var dist = Math.abs(v.x - u.x), wide = (ST.bw || 400) > 330; u.hitNext = false; u.after = ''; u.mt = rnd(500, 1000); u.burst = 0; u.jump = null; u.charge = 0; u.guard = 0; u.dive = 0; u.up = false; u.bombThrown = false; u.blockedHit = false;
    if (due) {
      u.hitNext = true;
      if (dist > 170 && Math.random() < 0.22) { u.mode = 'barrage'; u.mt = 160; u.burst = 7; sayAs(u.side, u.side === 'f' ? 'Full auto!' : 'Suppressing fire!', 1300); return; }
      if (dist > 150 && Math.random() < 0.2) { u.mode = 'bomb'; u.mt = 480; sayAs(u.side, u.side === 'f' ? 'Fire in the hole!' : 'Catch!', 1300); return; }
      if (dist > 150 && Math.random() < 0.3) { u.mode = 'charge'; u.mt = 0; return; }
      if (dist > 110 && wide && Math.random() < 0.3) { u.mode = 'dive'; return; }
      if (dist > 120) { u.want = rnd(130, 210); u.after = 'shoot'; } else { u.want = 46; u.after = 'melee'; } u.mode = 'walk'; return;
    }
    /* weighted pick over only the moves that are actually eligible right now, instead of a fixed dice-range chain -- the old chain let a gated move's slice (barrage/bomb/charge needing range, leap/dive needing a wide platform) silently fall through to whatever came next whenever its distance/width condition failed, which on a close or narrow fight collapsed most of the roll into melee ("all they do is hit and jump"). Weighting means a blocked move's share goes to every other eligible move instead of just the next one in line. */
    var cands = [
      ['shoot', 10, true], ['barrage', 8, dist > 170], ['bomb', 7, dist > 150], ['charge', 12, dist > 150],
      ['leap', 12, wide], ['dive', 10, wide && dist > 110], ['melee', 13, true], ['strafe', 12, true],
      ['guard', 8, v.mode === 'melee' || v.mode === 'charge' || v.mode === 'shoot'], ['jump', 8, true]
    ].filter(function (c) { return c[2]; });
    var total = 0; for (var i = 0; i < cands.length; i++) total += cands[i][1];
    var roll = Math.random() * total, acc = 0, pick = cands[cands.length - 1][0];
    for (var ci = 0; ci < cands.length; ci++) { acc += cands[ci][1]; if (roll < acc) { pick = cands[ci][0]; break; } }
    if (pick === 'shoot') { u.want = rnd(150, 240); u.after = 'shoot'; u.mode = 'walk'; }
    else if (pick === 'barrage') { u.mode = 'barrage'; u.mt = 160; u.burst = 7; sayAs(u.side, u.side === 'f' ? 'Hold still!' : 'Take this!', 1300); }
    else if (pick === 'bomb') { u.mode = 'bomb'; u.mt = 480; sayAs(u.side, u.side === 'f' ? 'Incoming!' : 'Dodge this.', 1300); }
    else if (pick === 'charge') { u.mode = 'charge'; }
    else if (pick === 'leap') { u.mode = 'leap'; }
    else if (pick === 'dive') { u.mode = 'dive'; }
    else if (pick === 'melee') { u.want = rnd(44, 60); u.after = 'melee'; u.mode = 'walk'; u.dash = true; }
    else if (pick === 'strafe') { u.mode = 'strafe'; u.mt = rnd(600, 950); }
    else if (pick === 'guard') { u.mode = 'guard'; u.mt = rnd(650, 900); }
    else { u.mode = 'jump'; }
  }
  function mechStep(u, v, dt, s, due, dueUse, bounds, P) {
    if (!u.alive) return;
    u.dir = v.x >= u.x ? 1 : -1; var dist = Math.abs(v.x - u.x), lo = bounds.x1, hi = bounds.x2, clk = s.clk, hitD = u.side === 'f' ? function () { return hitDmgE(s); } : function () { return s.plan.fdmg; };
    u.mt -= dt; u.flash = Math.max(0, u.flash - dt / 260); u.sq = Math.max(0, u.sq - dt / 260); u.stag = Math.max(0, u.stag - dt); if (u.mode !== 'guard') u.guard = Math.max(0, u.guard - dt / 160); if (u.mode !== 'charge') u.charge = Math.max(0, u.charge - dt / 200);
    u.x += u.kx * dt / 1000; u.kx *= Math.pow(0.002, dt / 1000);
    if (u.dodgeAt && clk >= u.dodgeAt && !u.air && u.mode !== 'melee' && !(u.stag > 0)) { u.dodgeAt = 0; u.mode = 'dodge'; u.jump = null; u.atk = 0; }
    if (u.stag > 0 && u.mode !== 'dodge') { u.aim = Math.max(0, u.aim - dt / 150); u.x = clampV(u.x, lo, hi); return; }
    var m = u.mode;
    if (m === 'walk' || m === 'strafe') {
      var diff = dist - u.want, mv = 0;
      if (m === 'walk') { mv = Math.min(Math.abs(diff), (u.dash ? 300 : 85) * dt / 1000) * (diff > 0 ? 1 : -1); u.x += u.dir * mv; u.aim = Math.max(0, u.aim - dt / 220); }
      else { u.x -= u.dir * 60 * dt / 1000; mv = 1; u.aim = Math.min(1, u.aim + dt / 160); }
      u.ph += dt * 0.012 * (Math.abs(mv) > 0.2 ? 1 : 0);
      if (u.dash && m === 'walk' && Math.abs(mv) > 2) { if (Math.random() < 0.5) burst(u.x - u.dir * 8, u.y + FEET - 2, 1, 'smoke', P.link, 0.05, 420); }
      if (m === 'walk' && (Math.abs(diff) < 8 || u.mt <= 0)) { u.dash = false; if (u.after === 'shoot') { u.mode = 'shoot'; u.mt = 230; u.burst = u.hitNext ? 1 : 2; } else if (u.after === 'melee') { u.mode = 'melee'; u.atkT = 0; u.combo = 0; u.struck = false; } else mechPick(u, v, s, due()); }
      else if (m === 'strafe' && u.mt <= 0) { if (!u.hitNext && canDodge(v) && Math.random() < 0.6) { u.mode = 'shoot'; u.mt = 120; u.burst = 1; u.after = ''; } else mechPick(u, v, s, due()); }
    } else if (m === 'shoot') {
      u.aim = Math.min(1, u.aim + dt / 140);
      if (u.mt <= 0) {
        if (u.burst > 0) {
          var hit = u.hitNext && u.burst === 1; if (u.hitNext && v.air) { u.mt = 110; return; } if (!hit && !canDodge(v)) { u.burst = 0; u.mt = 200; }
          else { if (hit) dueUse(); mechFire(s, u, v, hit, hit ? hitD() : 0); u.burst--; u.mt = u.burst > 0 ? 170 : 380; }
        } else mechPick(u, v, s, due());
      }
    } else if (m === 'charge') {
      u.aim = Math.min(1, u.aim + dt / 140); u.charge = Math.min(1, u.charge + dt / 850); if (Math.random() < 0.5) burst(u.x + u.dir * 30, u.y + FEET - 30 + rnd(-8, 8), 1, 'spark', '255,255,255', 0.12, 260);
      if (u.charge >= 1) {
        var chit = u.hitNext; if (chit && v.air) { u.charge = 1; return; }
        if (!chit && !canDodge(v)) { u.charge = 0; mechPick(u, v, s, due()); }
        else { if (chit) dueUse(); mechFire(s, u, v, chit, chit ? hitD() : 0, true); u.charge = 0; u.mt = 420; u.mode = 'shoot'; u.burst = 0; }
      }
    } else if (m === 'guard') {
      u.guard = Math.min(1, u.guard + dt / 120); u.aim = 0;
      if (u.mt <= 0 || due()) {
        /* a shield that actually blocked something earns a follow-up counter-swing instead of just resetting to a random move */
        if (u.blockedHit && dist < 90 && Math.random() < 0.65) { u.blockedHit = false; u.hitNext = false; u.after = ''; u.want = 46; u.mode = 'walk'; u.dash = true; u.mt = rnd(400, 650); sayAs(u.side, u.side === 'f' ? 'My turn!' : 'Enough blocking.', 1200); }
        else mechPick(u, v, s, due());
      }
    } else if (m === 'barrage') {
      u.aim = Math.min(1, u.aim + dt / 110);
      if (u.mt <= 0) {
        if (u.burst > 0) {
          var last = u.burst === 1, hitB = u.hitNext && last; if (u.hitNext && v.air) { u.mt = 90; return; }
          if (!hitB && !canDodge(v) && !u.hitNext) { u.burst = 0; u.mt = 220; }
          else { if (hitB) dueUse(); mechFire(s, u, v, hitB, hitB ? hitD() : 0, last); u.burst--; u.mt = u.burst > 0 ? 100 : 320; }
        } else mechPick(u, v, s, due());
      }
    } else if (m === 'bomb') {
      u.aim = Math.min(1, u.aim + dt / 180);
      if (!u.bombThrown) { if (u.mt <= 0) { u.bombThrown = true; var bHit = u.hitNext; if (bHit) dueUse(); mechBomb(s, u, v, bHit, bHit ? hitD() : 0); u.mt = 650; } }
      else if (u.mt <= 0) { mechPick(u, v, s, due()); }
    } else if (m === 'melee') {
      u.atkT += dt; var t = u.atkT, plannedStrike = u.hitNext ? 2 : 0;
      if (u.hitNext && dist > 56) u.x += u.dir * 0.2 * dt;
      var seg = t < 200 ? 0 : t < 320 ? 1 : t < 420 ? 2 : t < 580 ? 3 : t < 700 ? 4 : t < 900 ? 5 : 6;
      u.atk = seg === 0 ? -(t / 200) * 0.8 : seg === 1 ? -0.8 + (t - 200) / 120 * 1.8 : seg === 2 ? Math.max(0, 1 - (t - 320) / 100) : seg === 3 ? -((t - 420) / 160) * 0.8 : seg === 4 ? -0.8 + (t - 580) / 120 * 1.8 : seg === 5 ? Math.max(0, 1 - (t - 700) / 200) : 0;
      if (!u.struck && t >= 280) { u.struck = 1; mechStrike(u, v, s, P, plannedStrike === 1, hitD, dueUse); }
      if (u.struck === 1 && t >= 660) { u.struck = 2; mechStrike(u, v, s, P, plannedStrike === 2, hitD, dueUse); }
      if (t > 900) { u.atk = 0; mechPick(u, v, s, due()); }
    } else if (m === 'jump' || m === 'leap' || m === 'dodge' || m === 'dive') {
      if (!u.jump) {
        var nx, h, dur;
        if (m === 'leap') { nx = clampV(v.x + u.dir * rnd(64, 90), lo, hi); h = 78; dur = 760; }
        else if (m === 'dive') { nx = clampV(v.x - u.dir * 46, lo, hi); h = 104; dur = 860; }
        else if (m === 'dodge') { nx = clampV(u.x - u.dir * 14, lo, hi); h = 54; dur = 540; }
        else { nx = clampV(u.x + (Math.random() < 0.5 ? -1 : 1) * rnd(60, 110), lo, hi); h = 40; dur = 520; }
        u.jump = { x0: u.x, x1: nx, t: 0, dur: dur, h: h }; u.air = true; u.aim = 0.4;
      }
      var J = u.jump; J.t += dt; var p = Math.min(1, J.t / J.dur); u.x = J.x0 + (J.x1 - J.x0) * easeIO(p); u.yo = -Math.sin(Math.PI * p) * J.h; if (m === 'dive') u.dive = p > 0.45 ? Math.min(1, (p - 0.45) / 0.2) : 0;
      if (m === 'leap' && p > 0.45 && p < 0.55 && !u.leapShot && canDodge(v) && false) { u.leapShot = true; }
      if (p >= 1) {
        u.air = false; u.yo = 0; u.jump = null; u.sq = 1; burst(u.x, u.y + FEET, 4, 'smoke', P.link, 0.1, 500);
        if (m === 'dive') { u.dive = 0; u.dir = v.x >= u.x ? 1 : -1; ringFx(u.x, u.y + FEET, P.node, 54); ringFx(u.x, u.y + FEET, P.link, 30); burst(u.x, u.y + FEET, 12, 'smoke', P.link, 0.18, 650); burst(u.x, u.y + FEET - 2, 8, 'spark', '255,255,255', 0.3, 380); mechStrike(u, v, s, P, u.hitNext && !v.air, hitD, dueUse); }
        mechPick(u, v, s, due());
      }
    }
    u.x = clampV(u.x, lo, hi);
    if (Math.abs(u.x - v.x) < 50 && !u.air) { u.x = clampV(u.x + (50 - Math.abs(u.x - v.x)) * 0.5 * (u.x < v.x ? -1 : 1), lo, hi); }
  }
  function mechStrike(u, v, s, P, planned, hitD, dueUse) {
    var dist = Math.abs(v.x - u.x); ST.ns = (ST.ns || 0) + 1;
    if (!planned && v.mode === 'melee' && v.alive && dist < 80 && !v.air && !u.air) { var mxx = (u.x + v.x) / 2, myy = u.y + FEET - 24; ringFx(mxx, myy, '255,255,255', 46); ringFx(mxx, myy, P.hot, 26); burst(mxx, myy, 16, 'spark', '255,255,255', 0.5, 450); u.kx -= u.dir * 70; v.kx += u.dir * 70; ST.nclash = (ST.nclash || 0) + 1; return; } if (planned) ST.nsp = (ST.nsp || 0) + 1; if (dist < 70) ST.nsd = (ST.nsd || 0) + 1; if (v.air) ST.nsa = (ST.nsa || 0) + 1; ringFx(u.x + u.dir * 24, u.y + FEET - 22, u.side === 'f' ? P.hot : P.link, 18);
    if (dist < 70 && !v.air) {
      if (planned) { dueUse(); applyHit(v, hitD(), P); ringFx(v.x, v.y + FEET - 22, '255,255,255', 36); burst(v.x, v.y + FEET - 22, 8, 'spark', P.hot, 0.45, 420);
        if (u.struck === 2 && v.alive && !v.air) { v.stag = 0; v.mode = 'jump'; v.jump = { x0: v.x, x1: v.x + u.dir * 70, t: 0, dur: 760, h: 92 }; v.air = true; v.aim = 0.2; ST.nup = (ST.nup || 0) + 1; ringFx(v.x, v.y + FEET - 6, P.link, 30); } }
      else { burst(v.x - u.dir * 8, v.y + FEET - 22, 6, 'spark', P.link, 0.32, 300); v.kx += u.dir * 26; v.aim = 0; }
    }
  }
  /* per-unit transitions: fly, morph, fall (to mech) and hop, morph, rise (to ship) */
  function trToMech(u, dt, s, P, platTop) {
    var t = u.tr; if (!t) return true; t.t += dt;
    if (t.st === 'fly') { if (t.delay > 0) { t.delay -= dt; u.vx *= 0.96; u.vy *= 0.96; u.x += u.vx * dt / 1000; u.y += u.vy * dt / 1000; return false; } var d = flyTo(u, t.tx, t.ty, dt, 380, 0.005); if (d < 16 || t.t > 3400) { t.st = 'morph'; t.t = 0; u.vx = u.vy = 0; ringFx(u.x, u.y, P.node, 46); burst(u.x, u.y, 10, 'spark', P.link, 0.35, 420); } }
    else if (t.st === 'morph') { u.ang += angDiff(u.ang, -1.5708) * Math.min(1, dt * 0.01); u.m = easeIO(t.t / 1000); if (Math.random() < 0.45) burst(u.x + rnd(-14, 14), u.y + rnd(-14, 14), 1, 'spark', P.link, 0.25, 300); if (!t.r1 && t.t > 330) { t.r1 = 1; ringFx(u.x, u.y, P.link, 38); } if (!t.r2 && t.t > 660) { t.r2 = 1; ringFx(u.x, u.y, P.node, 54); burst(u.x, u.y, 8, 'debris', P.node, 0.3, 700); } if (t.t >= 1000) { u.m = 1; t.st = 'fall'; t.t = 0; u.vyy = 0; u.air = true; } }
    else if (t.st === 'fall') { u.vyy += 1900 * dt / 1000; u.y += u.vyy * dt / 1000; var ty = platTop - FEET; if (u.y >= ty) { u.y = ty; u.air = false; u.sq = 1; u.vyy = 0; t.st = 'done'; burst(u.x, u.y + FEET, 16, 'smoke', P.link, 0.2, 700); burst(u.x, u.y + FEET - 2, 8, 'spark', '255,255,255', 0.3, 400); ringFx(u.x, u.y + FEET, P.node, 60); ringFx(u.x, u.y + FEET, P.link, 34); } }
    else if (t.st === 'done') { u.y = platTop - FEET; return true; }
    return false;
  }
  function trToShip(u, dt, s, P) {
    var t = u.tr; if (!t) return true; t.t += dt;
    if (t.st === 'hop') { if (t.t < 16) u.vyy = -480; u.vyy += 1500 * dt / 1000; u.y += u.vyy * dt / 1000; u.air = true; if (u.vyy > 0 && t.t > 240) { t.st = 'morph'; t.t = 0; u.vx = 0; u.vy = 0; ringFx(u.x, u.y, P.node, 46); } }
    else if (t.st === 'morph') { u.m = 1 - easeIO(t.t / 900); u.y -= 0.02 * dt; if (Math.random() < 0.4) burst(u.x + rnd(-14, 14), u.y + rnd(-26, 0), 1, 'spark', P.link, 0.25, 300); if (t.t >= 900) { u.m = 0; u.air = false; t.st = 'rise'; t.t = 0; u.ang = -1.5708; u.vy = -60; } }
    else if (t.st === 'rise') { if (t.t > 700) { t.st = 'done'; } }
    else if (t.st === 'done') return true;
    return false;
  }

  /* real flight: a heading, a speed and a limited turn rate, so ships chase, evade and bank */
  function steerShip(u, want, speed, turn, dt) {
    var d = angDiff(u.ang, want), mt = turn * dt / 1000, da = clampV(d, -mt, mt);
    u.ang += da; u.bank += (clampV(da / (dt / 1000) / 3.5, -1, 1) - u.bank) * Math.min(1, dt * 0.012);
    u.spd += (speed - u.spd) * Math.min(1, dt * 0.004);
    u.vx = Math.cos(u.ang) * u.spd; u.vy = Math.sin(u.ang) * u.spd; u.x += u.vx * dt / 1000; u.y += u.vy * dt / 1000;
    u.trail.push({ x: u.x, y: u.y }); if (u.trail.length > 24) u.trail.shift();
  }
  function wallBias(u, want) {
    var W = innerWidth, H = innerHeight, near = Math.max(0, 170 - u.x, u.x - (W - 170), 190 - u.y, u.y - (H - 200));
    if (near <= 0) return want; var toC = Math.atan2(H * 0.5 - u.y, W * 0.5 - u.x); return want + angDiff(want, toC) * Math.min(1, near / 55);
  }
  function keepIn(u) {
    var W = innerWidth, H = innerHeight; if (u.x < 40) { u.x = 40; u.ang = Math.atan2(Math.sin(u.ang), Math.abs(Math.cos(u.ang))); } else if (u.x > W - 40) { u.x = W - 40; u.ang = Math.atan2(Math.sin(u.ang), -Math.abs(Math.cos(u.ang))); }
    if (u.y < 105) { u.y = 105; u.ang = Math.atan2(Math.abs(Math.sin(u.ang)), Math.cos(u.ang)); } else if (u.y > H - 90) { u.y = H - 90; u.ang = Math.atan2(-Math.abs(Math.sin(u.ang)), Math.cos(u.ang)); }
  }
  function tryFire(s, u, v, dt, due, use, dmg) {
    u.cool -= dt; if (u.cool > 0 || !v.alive || !u.alive) return;
    var a = Math.atan2(v.y - u.y, v.x - u.x), al = Math.abs(angDiff(u.ang, a)), dist = Math.hypot(v.x - u.x, v.y - u.y);
    if (dist < 130 || dist > 520) return;
    if (due() && al < 0.5) { use(); fireShip(u, v, true, dmg()); u.cool = rnd(520, 820); jinkShip(v, 0.35); }
    else if (!due() && al < 0.22) { fireShip(u, v, false, 0); u.cool = rnd(430, 720); jinkShip(v, 1); }
  }
  /* named maneuvers, so a dogfight is not always one ship glued behind the other */
  function pickMove(s, dist) {
    var r = Math.random();
    return (r < 0.16 && dist > 380) ? 'merge'
      : r < 0.3 ? 'scissor'
      : r < 0.42 ? 'boost'
      : r < 0.56 ? 'barrel'
      : (r < 0.78 && dist > 200) ? 'volley'
      : 'overcharge';
  }
  function dogAI(s, dt) {
    var f = s.f, e = s.e, clk = s.clk;
    s.swapIn -= dt; s.boost = Math.max(0, s.boost - dt); s.moveIn -= dt;
    s.dwF = dueE(s) && s.chaser !== 'f' ? (s.dwF || 0) + dt : 0; s.dwE = dueF(s) && s.chaser !== 'e' ? (s.dwE || 0) + dt : 0;
    if (s.swapIn <= 0 || s.dwF > 2800 || s.dwE > 3200) {
      var want = s.dwF > 2800 ? 'f' : s.dwE > 3200 ? 'e' : (s.chaser === 'f' ? 'e' : 'f');
      if (want !== s.chaser) { s.chaser = want; s.boost = 900; if (Math.random() < 0.5) sayAs(want, want === 'f' ? 'Now it is my turn.' : 'Reversal!', 1500); }
      s.swapIn = rnd(4200, 6400); s.dwF = s.dwE = 0;
    }
    var ch = s.chaser === 'f' ? f : e, ev = ch === f ? e : f, dx = ev.x - ch.x, dy = ev.y - ch.y, dist = Math.hypot(dx, dy) || 1;
    ch.jink = Math.max(0, ch.jink - dt); ev.jink = Math.max(0, ev.jink - dt);

    if (s.move === 'chase' && s.moveIn <= 0 && dist > 130) {
      s.move = pickMove(s, dist); s.moveT = 0; s.passed = false;
      s.volN = 0; s.volT = 0; s.chargeT = 0;
      if (s.move === 'merge') sayAs(Math.random() < 0.5 ? 'f' : 'e', 'Merging!', 1300);
      else if (s.move === 'boost') sayAs(ev.side, 'Falling back!', 1300);
      else if (s.move === 'scissor') sayAs(Math.random() < 0.5 ? 'f' : 'e', 'Scissors!', 1300);
      else if (s.move === 'barrel') sayAs(ev.side, 'Watch this.', 1300);
      else if (s.move === 'volley') sayAs(ch.side, 'Full burst!', 1300);
      else sayAs(ch.side, 'Charging up!', 1300);
    } else if (s.move !== 'chase') s.moveT += dt;

    var wantC, wantE, spC, spE;
    if (s.move === 'merge') {
      var toEv = Math.atan2(dy, dx);
      if (!s.passed && dist < 100) { s.passed = true; ringFx((ch.x + ev.x) / 2, (ch.y + ev.y) / 2, '255,255,255', 26); }
      if (!s.passed) { wantC = toEv; wantE = toEv + Math.PI; spC = 460; spE = 440; }
      else { wantC = ch.ang + (ch.bank >= 0 ? 1 : -1) * 1.5; wantE = ev.ang + (ev.bank >= 0 ? -1 : 1) * 1.5; spC = 380; spE = 380; }
      if (s.moveT > 2200) { s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else if (s.move === 'scissor') {
      var base = Math.atan2(dy, dx), weave = Math.sin(clk * 0.0045) * 1.15;
      wantC = base + weave; wantE = base + Math.PI - weave; spC = 260; spE = 260;
      if (s.moveT > 1900) { s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else if (s.move === 'boost') {
      var away0 = Math.atan2(-dy, -dx);
      wantE = away0 + Math.sin(clk * 0.003 + ev.seed) * 0.4; spE = 480;
      wantC = Math.atan2(dy, dx); spC = 330;
      if (s.moveT > 1300) { s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else if (s.move === 'barrel') {
      if (ev.roll <= 0) ev.roll = 0.01;
      wantE = Math.atan2(ev.y - ch.y, ev.x - ch.x) + Math.sin(clk * 0.009) * 2.1; spE = 360;
      wantC = Math.atan2(dy, dx); spC = 300;
      if (s.moveT > 1300) { s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else if (s.move === 'volley') {
      wantC = Math.atan2(dy, dx); spC = 190;
      var awayV = Math.atan2(ev.y - ch.y, ev.x - ch.x); wantE = awayV + Math.sin(clk * 0.005 + ev.seed) * 0.8; spE = 370;
      s.volT -= dt;
      if (s.volT <= 0 && s.volN < 5 && dist > 90) {
        var isFv = ch.side === 'f', dueV = s.volN === 0 && (isFv ? dueE(s) : dueF(s));
        if (dueV) { if (isFv) s.plan.ei++; else s.plan.fi++; }
        fireShip(ch, ev, dueV, dueV ? (isFv ? hitDmgE(s) : s.plan.fdmg) : 0);
        s.volN++; s.volT = 140;
      }
      if (s.volN >= 5 || s.moveT > 1600) { s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else if (s.move === 'overcharge') {
      wantC = Math.atan2(dy, dx); spC = 140;
      var awayO = Math.atan2(ev.y - ch.y, ev.x - ch.x); wantE = awayO + Math.sin(clk * 0.004 + ev.seed) * 0.5; spE = 330;
      s.chargeT += dt; ch.charge = Math.min(1, s.chargeT / 950); if (Math.random() < 0.5) burst(ch.x + Math.cos(ch.ang) * 16, ch.y + Math.sin(ch.ang) * 16, 1, 'spark', '255,255,255', 0.15, 240);
      if (s.chargeT > 950) {
        var isFo = ch.side === 'f', dueO = isFo ? dueE(s) : dueF(s);
        if (dueO) { if (isFo) s.plan.ei++; else s.plan.fi++; }
        fireShip(ch, ev, dueO, dueO ? (isFo ? hitDmgE(s) : s.plan.fdmg) : 0, true);
        ch.charge = 0; s.move = 'chase'; s.moveIn = rnd(5000, 8000);
      } else if (s.moveT > 2400) { ch.charge = 0; s.move = 'chase'; s.moveIn = rnd(4500, 7200); }
    } else {
      wantC = Math.atan2(ev.y + ev.vy * 0.4 - ch.y, ev.x + ev.vx * 0.4 - ch.x); spC = dist > 340 ? 400 : dist > 240 ? 310 : dist > 160 ? 240 : 190;
      if (dist < 135) { wantC = ch.ang + (ch.bank >= 0 ? 1 : -1) * 0.9; spC = 330; }
      var away = Math.atan2(ev.y - ch.y, ev.x - ch.x); wantE = away + Math.sin(clk * 0.0042 + ev.seed) * 0.6 + (ev.jink > 0 ? ev.jdir * 1.2 : 0); spE = ev.jink > 0 ? 410 : 320;
      if (dist < 135) wantE = away + (ev.bank >= 0 ? 0.7 : -0.7);
    }
    var extraTurn = s.move === 'chase' ? 0 : 1.2;
    steerShip(ch, wallBias(ch, withSep(ch, wantC, ev, 250, 3.6)), s.move === 'chase' && dist < 210 ? Math.min(spC, 170) : spC, 3.0 + (s.boost > 0 ? 3 : 0) + extraTurn, dt);
    steerShip(ev, wallBias(ev, withSep(ev, wantE, ch, 310, 3.4)), spE, (ev.jink > 0 ? 5.2 : 3.4) + extraTurn, dt);
    if (dist < 160 && s.move !== 'merge') { var push = (160 - dist) * 0.5; ch.x -= dx / dist * push; ch.y -= dy / dist * push; ev.x += dx / dist * push; ev.y += dy / dist * push; }
    keepIn(f); keepIn(e);
    if (!(s.move === 'merge' && !s.passed) && s.move !== 'volley' && s.move !== 'overcharge') {
      tryFire(s, f, e, dt, function () { return dueE(s); }, function () { s.plan.ei++; }, function () { return hitDmgE(s); });
      tryFire(s, e, f, dt, function () { return dueF(s); }, function () { s.plan.fi++; }, function () { return s.plan.fdmg; });
    }
  }
  function withSep(u, want, o, range, k) { var d = Math.hypot(u.x - o.x, u.y - o.y) || 1, rep = Math.max(0, (range - d) / range), vx = Math.cos(want) + (u.x - o.x) / d * rep * k, vy = Math.sin(want) + (u.y - o.y) / d * rep * k; return Math.atan2(vy, vx); }
  function stepHalves(dt) {
    var T = ST && ST.T; if (!T || !T.halves) return;
    T.halves.forEach(function (h) { h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; });
  }
  function newThreat() {
    var s = ST, f = s.f, vis = visAst(s.A0, f.x, f.y, 300), a, q;
    if (vis.length) { a = vis[Math.floor(Math.random() * vis.length)]; q = astXY(a); a.px = q.x; a.py = q.y; }
    else { var ang = rnd(0, 6.28), tries = 0, px, py; do { ang = rnd(0, 6.28); px = f.x + Math.cos(ang) * 340; py = f.y + Math.sin(ang) * 260; tries++; } while ((px < 140 || px > innerWidth - 140 || py < 150 || py > innerHeight - 150) && tries < 30); a = tmpAsteroid(clampV(px, 140, innerWidth - 140), clampV(py, 150, innerHeight - 150)); }
    a.hide = true; f.hp = 100; f.hpS = 100; s.T = a; s.ph = 'detect'; s.pt = 0; s.killed = false; s.round = 1; s.e = null; s.vroll = false; s.sf = false; s.win = +QS.get('win') || (function () { var r = Math.random(); return r < 0.4 ? 2 : r < 0.75 ? 3 : 4; })();
    sayAs('f', 'Contact! Something is hiding in that rock.', 3200);
  }
  function stepStory(r, dt, now, P) {
    var s = ST, f = s.f, e = s.e; if (s.slow > 0) { s.slow -= dt; dt *= 0.22; } s.pt += dt; s.clk += dt;
    stepParts(dt); stepLasers(dt, P); stepBombs(dt, P); stepHalves(dt);
    [f, e].forEach(function (u) { if (u) { u.flash = Math.max(0, u.flash - dt / 260); u.roll = u.roll > 0 ? u.roll + dt * 0.011 : 0; if (u.roll > 6.28) u.roll = 0; u.bank *= Math.pow(0.5, dt / 250); } });
    r.x = f.x; r.y = f.y;
    var ph = s.ph, stg = stageFor(ph, s), ck = stg[1] + stg[2]; if (ck !== s.capKey) { s.capKey = ck; setCap(stg[0], stg[1], stg[2]); }
    if (ph === 'morph') {
      if (s.pt < 650) { f.al = 0; f.sc = 0.2; }
      else {
        if (!s.b0) { s.b0 = true; shardBurst(s.A0, f.x, f.y, 8, P); ringFx(f.x, f.y, P.link, 80); ringFx(f.x, f.y, P.node, 44); burst(f.x, f.y, 18, 'spark', P.link, 0.45, 600); f.ang = -1.5708; f.spd = 40; }
        var q = easeIO((s.pt - 650) / 700); f.al = Math.min(1, q * 1.8); f.sc = 0.25 + 0.75 * q; f.y -= dt * 0.02 * (1 - q);
      }
      if (s.pt >= 1500) { f.al = 1; f.sc = 1; s.ph = 'patrol'; s.pt = 0; s.nextSay = now + 900; s.patrolEnd = rnd(5500, 8000); sayAs('f', 'Systems online.', 1800); f.vx = f.vy = 0; f.tx = f.x; f.ty = f.y; f.tt = 0; }
    } else if (ph === 'patrol' || ph === 'roam') {
      if (now > f.tt) { f.tx = 90 + Math.random() * (innerWidth - 180); f.ty = 120 + Math.random() * (innerHeight - 240); f.tt = now + 1500 + Math.random() * 1800; }
      flyTo(f, f.tx, f.ty, dt, 320, 0.0035);
      if (now > s.nextSay) { s.nextSay = now + rnd(6500, 9500); sayAs('f', PATROL[Math.floor(Math.random() * PATROL.length)], 2400); }
      if (ph === 'patrol' && s.pt > s.patrolEnd) { if (s.quiet) { s.ph = 'roam'; s.pt = 0; s.roamEnd = 20000; } else newThreat(); }
      if (ph === 'roam' && s.pt > s.roamEnd) { if (now - s.born > 150000) { s.ph = 'sleep'; s.pt = 0; sayAs('f', 'Going dark. Wake me with a mouse.', 2500); } else if (!s.quiet && !FOUGHT()) newThreat(); else { s.pt = 0; s.roamEnd = 20000; } }
    } else if (ph === 'detect') {
      var T = s.T, aT = Math.atan2(T.py - f.y, T.px - f.x), toX = T.px - Math.cos(aT) * 300, toY = T.py - Math.sin(aT) * 300;
      s.ping = (s.ping || 0) + dt; T.rot += 0.0006 * dt;
      var d = flyTo(f, toX, toY, dt, 300, 0.004); if ((s.ping | 0) % 520 < dt) ringFx(T.px, T.py, P.hot, 70);
      if ((d < 40 && s.pt > 1800) || s.pt > 4800) {
        s.ph = 'ambush'; s.pt = 0; s.sf = false; f.spd = Math.max(120, Math.hypot(f.vx, f.vy)); f.ang = Math.atan2(T.py - f.y, T.px - f.x);
        s.e = mkUnit('e', T.px, T.py, aT); s.e.sc = 0.3; s.e.al = 0; s.e.spd = 0;
      }
    } else if (ph === 'ambush') {
      var T2 = s.T, en = s.e, shake = Math.min(1, s.pt / 900);
      T2.rot += (0.001 + s.pt * 0.000004) * dt; T2.sx = (Math.random() - 0.5) * 7 * shake * (s.sf ? 0 : 1); T2.sy = (Math.random() - 0.5) * 7 * shake * (s.sf ? 0 : 1);
      if (s.pt > 700 && !s.sf && Math.random() < 0.15) burst(T2.px + rnd(-12, 12), T2.py + rnd(-12, 12), 2, 'spark', P.hot, 0.18, 360);
      if (s.pt >= 1100 && !s.sf) {
        s.sf = true; var base = Math.atan2(T2.py - f.y, T2.px - f.x), side = Math.random() < 0.5 ? -1 : 1;
        boom(T2.px, T2.py, false, P); shardBurst(T2, T2.px, T2.py, 9, P); ringFx(T2.px, T2.py, P.hot, 110); ringFx(T2.px, T2.py, P.hot, 60); burst(T2.px, T2.py, 20, 'spark', P.hot, 0.5, 600);
        T2.split = true; T2.splitAt = s.clk; var cut = T2.rot; T2.halves = [1, -1].map(function (sd) { return { side: sd, x: T2.px, y: T2.py, vx: Math.cos(cut + Math.PI / 2) * 0.045 * sd, vy: Math.sin(cut + Math.PI / 2) * 0.045 * sd, rot: cut, vr: 0.0014 * sd }; });
        en.ang = base + Math.PI; en.spd = 580; en.x = T2.px; en.y = T2.py;
        s.wp = { x: clampV(f.x + Math.cos(base + side * 1.15) * 330, 150, innerWidth - 150), y: clampV(f.y + Math.sin(base + side * 1.15) * 330, 150, innerHeight - 200) };
        sayAs('e', 'Surprise.', 1800); setTimeout(function () { if (ST === s) sayAs('f', 'Bogey! Engaging!', 1800); }, 700);
      }
      if (s.sf) {
        var q2 = easeIO((s.pt - 1100) / 380); en.al = Math.min(1, q2 * 1.5); en.sc = 0.3 + 0.7 * q2;
        steerShip(en, wallBias(en, Math.atan2(s.wp.y - en.y, s.wp.x - en.x)), 330 + 250 * Math.max(0, 1 - (s.pt - 1100) / 1000), 3.3, dt);
        steerShip(f, wallBias(f, Math.atan2(en.y - f.y, en.x - f.x)), 150, 3.4, dt);
      } else { f.vx *= 0.96; f.vy *= 0.96; f.x += f.vx * dt / 1000; f.y += f.vy * dt / 1000; f.ang += angDiff(f.ang, Math.atan2(T2.py - f.y, T2.px - f.x)) * Math.min(1, dt * 0.01); f.spd = Math.hypot(f.vx, f.vy); }
      if (s.sf && ((s.pt > 3000 && Math.hypot(en.x - f.x, en.y - f.y) > 190) || s.pt > 4800)) { s.ph = 'dog'; s.pt = 0; s.round = 1; planRound(false); s.chaser = Math.random() < 0.5 ? 'f' : 'e'; s.swapIn = rnd(3500, 5000); s.boost = 0; s.dwF = s.dwE = 0; s.move = 'chase'; s.moveT = 0; s.moveIn = rnd(3200, 5200); }
    } else if (ph === 'dog') {
      if (!e) return;
      s.rt += dt; dogAI(s, dt);
      if (now > s.nextSay) { s.nextSay = now + rnd(2600, 3800); var fl = ['Locked on.', 'Evasive!', 'Taking fire!', 'Stay on him.', 'Good hit!'], el = ['Too slow.', 'Hold still!', 'Is that all?', 'My turn.', 'You cannot shake me.']; if (Math.random() < 0.5) sayAs('f', fl[Math.floor(Math.random() * fl.length)], 1700); else sayAs('e', el[Math.floor(Math.random() * el.length)], 1700); }
      if (s.killed) killFoe(P);
      else if (s.rt > s.rdur && s.round < s.win) startNext(P);
      else if (s.rt > s.rdur + 4500 && s.round === s.win) { s.plan.ei = s.plan.e.length - 1; s.rt = s.rdur + 2000; }
    } else if (ph === 'toMech') {
      var pr = platRect(s); if (!pr.ok) { abortMech(P); return; }
      var d1 = trToMech(e, dt, s, P, pr.top), d2 = trToMech(f, dt, s, P, pr.top);
      if (d1 && d2) { s.ph = 'duel'; s.pt = 0; s.round++; planRound(true); e.mode = f.mode = 'walk'; e.after = f.after = ''; e.want = f.want = 170; e.mt = f.mt = 700; f.x = pr.x1 + 50; e.x = pr.x2 - 50; f.dir = 1; e.dir = -1; f.aim = e.aim = 0; sayAs('f', 'Take this!', 1500); }
    } else if (ph === 'duel') {
      var pr2 = platRect(s); if (!pr2.ok) { abortMech(P); return; }
      s.rt += dt; s.bw = pr2.x2 - pr2.x1; var yb = pr2.top - FEET;
      mechStep(f, e, dt, s, function () { return dueE(s); }, function () { s.plan.ei++; }, pr2, P);
      mechStep(e, f, dt, s, function () { return dueF(s); }, function () { s.plan.fi++; }, pr2, P);
      f.y = yb + (f.yo || 0); e.y = yb + (e.yo || 0);
      if (now > s.nextSay) { s.nextSay = now + rnd(2500, 3600); var ml = ['Take this!', 'Not today.', 'Nice hit.', 'Hold on!', 'Too easy.'], mel = ['Is that all?', 'You call that a punch?', 'Ouch. Fine.', 'Again!', 'Stand still!']; if (Math.random() < 0.5) sayAs('f', ml[Math.floor(Math.random() * ml.length)], 1600); else sayAs('e', mel[Math.floor(Math.random() * mel.length)], 1600); }
      if (s.killed) killFoe(P);
      else if (s.rt > s.rdur) { if (s.round < s.win) startNext(P); else { s.plan.ei = Math.min(s.plan.ei, s.plan.e.length - 1); s.rt = s.rdur - 1; } }
    } else if (ph === 'toShip') {
      var d3 = trToShip(f, dt, s, P), d4 = e && e.alive ? trToShip(e, dt, s, P) : true;
      if (f.tr && f.tr.st === 'rise') flyTo(f, f.x, f.y - 90, dt, 200, 0.002);
      if (e && e.alive && e.tr && e.tr.st === 'rise') flyTo(e, e.x, e.y - 90, dt, 200, 0.002);
      if (d3 && d4) {
        f.tr = null; if (e) e.tr = null; f.spd = Math.max(200, Math.hypot(f.vx, f.vy)); f.ang = -1.5708; f.aim = f.atk = 0; if (e) { e.spd = Math.max(200, Math.hypot(e.vx, e.vy)); e.ang = -1.5708; e.aim = e.atk = 0; }
        if (s.killed || !e || !e.alive) { f.tt = 0; afterWin(s, now); }
        else { s.ph = 'dog'; s.pt = 0; s.round++; planRound(false); s.chaser = Math.random() < 0.5 ? 'f' : 'e'; s.swapIn = rnd(3500, 5000); s.boost = 0; s.move = 'chase'; s.moveT = 0; s.moveIn = rnd(3200, 5200); sayAs('e', 'Back to the air!', 1600); }
      }
    } else if (ph === 'victory') {
      s.vt += dt;
      /* a short stand-down beat before heading off, instead of cutting straight from the kill to the next phase */
      if (f.m > 0.5) { f.wave = 1; f.aim = 0; f.atk = 0; if (s.vt > 1300 && !s.vvent) { s.vvent = true; burst(f.x, f.y + FEET, 10, 'smoke', P.link, 0.12, 700); ringFx(f.x, f.y + FEET - 10, P.link, 28); } }
      else { if (s.vt > 200 && !s.vroll) { s.vroll = true; f.roll = 0.01; } flyTo(f, f.x, f.y, dt, 100, 0.002); }
      if (s.vt > 600 && !s.vsaid) { s.vsaid = true; sayAs('f', 'Threat neutralised.', 2200); }
      if (s.vt > 2600) { s.vsaid = false; s.vroll = false; s.vvent = false; f.wave = 0; if (f.m > 0.5) { f.tr = { st: 'hop', t: 0 }; s.ph = 'toShip'; s.pt = 0; } else { f.tt = 0; afterWin(s, now); } }
    } else if (ph === 'sleep') {
      f.al = Math.max(0, 1 - s.pt / 1600); flyTo(f, innerWidth - 60, innerHeight - 60, dt, 220, 0.003);
      if (s.pt > 1700) { finishStory(true); }
    }
  }
  function killFoe(P) {
    var s = ST, e = s.e; if (!e.alive) return; var kx = e.x, ky = e.y + (e.m > 0.5 ? FEET - 14 : 0);
    e.alive = false; e.al = 0; s.lasers.length = 0; s.bombs.length = 0; boom(kx, ky, true, P); ringFx(e.x, e.y, P.hot, 110); sayAs('e', 'Impossible...', 1200);
    s.ph = 'victory'; s.vt = 0; s.vsaid = false; s.killed = true; s.stamp = { x: e.x, y: e.y, t0: s.clk };
    s.slow = Math.max(s.slow || 0, 650); s.killCam = { t0: s.clk, dur: 900, x: kx, y: ky };
    fought = true;
  }
  function startNext(P) {
    var s = ST, f = s.f, e = s.e; s.lasers.length = 0; s.bombs.length = 0;
    if (f.m > 0.5) { f.tr = { st: 'hop', t: 0 }; e.tr = { st: 'hop', t: 0 }; s.ph = 'toShip'; s.pt = 0; sayAs('e', 'Back to the air!', 1600); return; }
    var pl = ((s.round === 1 && s.win >= 2) || (s.round === 3 && s.win >= 4)) ? pickPlat() : null;
    if (!pl) { s.round++; planRound(false); s.rt = 0; s.dirT = 0; sayAs('e', ['', 'Round two? Fine.', 'Round three!', 'One more round.'][Math.min(3, s.round - 1)] || 'Again!', 1500); return; }
    s.pl = pl; var pr = platRect(s), efirst = Math.random() < 0.5; var exx = pr.x2 - 50, fxx = pr.x1 + 50;
    e.tr = { st: 'fly', t: 0, tx: exx, ty: pr.top - 90, delay: 0 }; f.tr = { st: 'fly', t: 0, tx: fxx, ty: pr.top - 90, delay: 650 };
    s.ph = 'toMech'; s.pt = 0; sayAs('e', "Let's settle this on foot.", 2200); setTimeout(function () { if (ST === s) sayAs('f', 'Fine. Transforming!', 1800); }, 1100);
  }
  function abortMech(P) { var s = ST; s.lasers.length = 0; s.bombs.length = 0; [s.f, s.e].forEach(function (u) { if (u && u.alive) { u.tr = u.m > 0.3 ? { st: 'hop', t: 0 } : null; if (!u.tr) { u.m = 0; } } }); s.ph = 'toShip'; s.pt = 0; }
  function finishStory(sleep) {
    restoreAst(); ST = null; roam = null; root.classList.remove('roaming'); hideSay(); hideCap(); rx = mx; ry = my;
    lastN = performance.now(); /* give the page a moment of quiet before the next idle nudge */
    if (sleep) needMove = true; else ringPop();
  }

  if (QS.get('debug')) window.__adv = function (ms) { if (!ST || !roam) return; var n = Math.ceil(ms / 40), P = pal(), i; for (i = 0; i < n && ST; i++) stepStory(roam, 40, performance.now(), P); };
  if (QS.get('debug')) window.__st = function () { return ST && { ph: ST.ph, round: ST.round, win: ST.win, pt: Math.round(ST.pt), rt: Math.round(ST.rt), ehp: ST.e && Math.round(ST.e.hp), fhp: Math.round(ST.f.hp), em: ST.e && +ST.e.m.toFixed(2), fm: +ST.f.m.toFixed(2), ftr: ST.f.tr && ST.f.tr.st, etr: ST.e && ST.e.tr && ST.e.tr.st, fy: Math.round(ST.f.y), ey: ST.e && Math.round(ST.e.y), fx: Math.round(ST.f.x), ex: ST.e && Math.round(ST.e.x), top: ST.pl && Math.round(ST.pl.getBoundingClientRect().top), fmode: ST.f.mode, emode: ST.e && ST.e.mode, fh: ST.f.hitNext, eh: ST.e && ST.e.hitNext, fafter: ST.f.after, fwant: Math.round(ST.f.want), burst: ST.f.burst, mt: Math.round(ST.f.mt), eair: ST.e && ST.e.air, fstag: Math.round(ST.f.stag), ns: ST.ns, nsp: ST.nsp, nclash: ST.nclash, nup: ST.nup, slow: ST.slow, nsd: ST.nsd, nsa: ST.nsa, move: ST.move, cap: ST.capKey, quiet: ST.quiet, nfire: ST.nfire, nhit: ST.nhit, ei: ST.plan && ST.plan.ei, en: ST.plan && ST.plan.e.length, killed: ST.killed, lasers: ST.lasers.length, l0: ST.lasers[0] && { x: Math.round(ST.lasers[0].x), y: Math.round(ST.lasers[0].y), mech: !!ST.lasers[0].mech }, parts: ST.parts.length, ast: AST.length, hidden: AST.filter(function (a) { return a.hide; }).length }; };
  function drawRoam(ctx, P, dt, now) {
    var r = roam, s = ST; if (!s) { roam = null; root.classList.remove('roaming'); return; }
    if (r.back) {
      var pk = Math.min((now - r.bt) / 380, 1), ek = 1 - Math.pow(1 - pk, 3); r.x = r.bx + (mx - r.bx) * ek; r.y = r.by + (my - r.by) * ek;
      stepParts(dt); drawParts(ctx, P);
      if (s.e && s.e.alive) { var fa = Math.max(0, 1 - (now - s.abort) / 420); s.e.al = fa; if (s.e.m > 0.3) drawMechU(ctx, P, s.e, now); else drawShipU(ctx, P, s.e, now); }
      ctx.save(); ctx.translate(r.x, r.y); ctx.scale(1 - ek * 0.85, 1 - ek * 0.85); ctx.globalAlpha = 1 - ek; ctx.strokeStyle = 'rgba(' + P.node + ',.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.283); ctx.stroke(); ctx.restore();
      if (pk >= 1 && now - s.abort > 450) finishStory(false);
      return;
    }
    stepStory(r, dt, now, P);
    if (!ST) return;
    var f = s.f, e = s.e, T = s.T;
    function trailOf(u, col, a0) { if (u && u.alive && u.trail.length > 2 && u.m < 0.5) { for (var i = 1; i < u.trail.length; i++) { var q = i / u.trail.length; ctx.strokeStyle = 'rgba(' + col + ',' + (q * a0).toFixed(3) + ')'; ctx.lineWidth = q * 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(u.trail[i - 1].x, u.trail[i - 1].y); ctx.lineTo(u.trail[i].x, u.trail[i].y); ctx.stroke(); } } }
    if (s.ph !== 'patrol' && s.ph !== 'roam') trailOf(f, P.hot, 0.42); else if (f.trail.length > 2 && f.m < 0.5) trailOf(f, P.hot, 0.4);
    trailOf(e, P.link, 0.38);
    /* our asteroid wakes up: steel glow, cracks spread, then it bursts into shards and the ship unfolds */
    if (s.ph === 'morph' && s.pt < 650) { var mp = s.pt / 650, jx = (Math.random() - 0.5) * 5 * mp, jy = (Math.random() - 0.5) * 5 * mp; drawGlow(ctx, f.x, f.y, 70 + mp * 40, P.link, 0.4 + mp * 0.6); drawAst(ctx, P, s.A0, f.x + jx, f.y + jy, 1, 1, true); drawCracks(ctx, s.A0, f.x + jx, f.y + jy, 1, mp, P.link); }
    /* the enemy rock: red warning, shaking, cracks, then it splits in two */
    if (T && (s.ph === 'detect' || s.ph === 'ambush' || T.halves) && !T.split) {
      var pul = 0.5 + Math.sin(now / 160) * 0.5, tp = s.ph === 'ambush' ? clampV(s.pt / 1000, 0, 1) : 0, tx = T.px + (T.sx || 0), ty = T.py + (T.sy || 0);
      drawGlow(ctx, tx, ty, 60 + pul * 14, P.hot, 0.25 + tp * 0.6 * pul); drawAst(ctx, P, T, tx, ty, 1, 1, true); drawCracks(ctx, T, tx, ty, 1, tp, P.hot);
      if (s.ph === 'detect' || tp < 0.95) { ctx.save(); ctx.globalAlpha = 0.55 + pul * 0.45; ctx.fillStyle = 'rgba(' + P.hot + ',.95)'; ctx.beginPath(); ctx.moveTo(tx, ty - T.r - 34); ctx.lineTo(tx - 10, ty - T.r - 14); ctx.lineTo(tx + 10, ty - T.r - 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', tx, ty - T.r - 17); ctx.restore(); }
    }
    if (T && T.halves) { var ha = 1 - (s.clk - T.splitAt) / 3800; if (ha > 0) T.halves.forEach(function (h) { drawHalf(ctx, P, T, h, ha); }); }
    if (e && e.alive) { drawShipU(ctx, P, e, now); drawMechU(ctx, P, e, now); }
    drawShipU(ctx, P, f, now); drawMechU(ctx, P, f, now);
    drawLasers(ctx, P); drawBombs(ctx, P); drawParts(ctx, P);
    if (s.stamp) { var ag = (s.clk - s.stamp.t0) / 3400; if (ag < 1) { var a2 = ag < 0.1 ? ag / 0.1 : (1 - ag) / 0.9, sx2 = clampV(s.stamp.x, 90, innerWidth - 90), sy3 = clampV(s.stamp.y - 34 - ag * 20, 110, innerHeight - 80); ctx.save(); ctx.translate(sx2, sy3); ctx.rotate(-0.1); ctx.globalAlpha = a2; ctx.font = '700 13px "JetBrains Mono",ui-monospace,monospace'; ctx.textAlign = 'center'; var tw = ctx.measureText('FINDING CLOSED').width; ctx.fillStyle = 'rgba(13,17,23,.7)'; ctx.fillRect(-tw / 2 - 10, -17, tw + 20, 26); ctx.strokeStyle = 'rgba(' + P.hot + ',.95)'; ctx.lineWidth = 2; ctx.strokeRect(-tw / 2 - 10, -17, tw + 20, 26); ctx.fillStyle = 'rgba(' + P.node + ',.98)'; ctx.fillText('FINDING CLOSED', 0, 1); ctx.restore(); } else s.stamp = null; }
    if (e && e.alive && ['dog', 'duel', 'toMech', 'toShip'].indexOf(s.ph) >= 0) drawBar(ctx, P, e, e.m > 0.5 ? 74 : 38);
    if (f.al > 0.5 && ['dog', 'duel', 'toMech', 'toShip', 'victory'].indexOf(s.ph) >= 0) drawBar(ctx, P, f, f.m > 0.5 ? 74 : 38);
    /* the finishing blow gets a brief cinematic beat: the edges darken in on the kill point, then ease back out */
    if (s.killCam) {
      var kt = s.clk - s.killCam.t0, kp = clampV(kt / s.killCam.dur, 0, 1);
      if (kp < 1) {
        var kv = (kp < 0.25 ? kp / 0.25 : 1 - (kp - 0.25) / 0.75) * 0.6;
        var vg = ctx.createRadialGradient(s.killCam.x, s.killCam.y, 30, s.killCam.x, s.killCam.y, Math.max(innerWidth, innerHeight) * 0.68);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + kv.toFixed(2) + ')');
        ctx.save(); ctx.fillStyle = vg; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.restore();
      } else s.killCam = null;
    }
    posSay(now);
  }

  var lastF = performance.now(), lastTx = 0, lastTy = 0;
  var curStarted = false, fxDirty = false;
  function startCursor() { if (curStarted) return; curStarted = true; lastF = performance.now(); requestAnimationFrame(loop); }
  function loop(now) {
    var dt = Math.min(now - lastF, 50); lastF = now;
    var k = 1 - Math.pow(1 - 0.18, dt / 16.667), k2 = 1 - Math.pow(1 - 0.3, dt / 16.667);
    var lockRect = lockEl ? lockEl.getBoundingClientRect() : null;
    var tgx = mx, tgy = my;
    if (lockRect) { var lcx = lockRect.left + lockRect.width / 2, lcy = lockRect.top + lockRect.height / 2; tgx = lcx + (mx - lcx) * 0.35; tgy = lcy + (my - lcy) * 0.35; }
    rx += (tgx - rx) * k; ry += (tgy - ry) * k;
    var p0 = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
    ring.style.transform = p0;
    tag.style.transform = 'translate3d(' + (rx + 34).toFixed(2) + 'px,' + (ry + 28).toFixed(2) + 'px,0)';
    if (cursorOn && !roam && (fr++ % 5 === 0)) setLock(targetOf(document.elementFromPoint(mx, my)));
    var spinA = 0; if (!spinAnim) { var sv = ring.querySelector('svg'); spinAnim = sv && sv.getAnimations && sv.getAnimations()[0]; }
    if (spinAnim && spinAnim.currentTime != null) spinA = (spinAnim.currentTime % 10000) / 10000 * 6.2832;
    var ang = [-1.5708, 0, 1.5708, 3.1416], tp = [], q;
    for (q = 0; q < 4; q++) tp.push([rx + Math.cos(ang[q] + spinA) * 24 - CS / 2, ry + Math.sin(ang[q] + spinA) * 24 - CS / 2]);
    var tg;
    if (lockRect) { var r = lockRect, pad = 9, l0 = r.left - pad, t0 = r.top - pad, r0 = r.right + pad - CS, b0 = r.bottom + pad - CS; tg = [[l0, t0], [r0, t0], [l0, b0], [r0, b0]]; }
    else tg = [tp[3], tp[0], tp[2], tp[1]];
    if (!C) C = tg.map(function (pp) { return [pp[0], pp[1]]; });
    for (q = 0; q < 4; q++) {
      C[q][0] += (tg[q][0] - C[q][0]) * k2; C[q][1] += (tg[q][1] - C[q][1]) * k2;
      corners[q].style.transform = 'translate3d(' + C[q][0].toFixed(2) + 'px,' + C[q][1].toFixed(2) + 'px,0)';
    }
    if (fctx) {
      if (fxDirty || roam || trail.length) { fctx.clearRect(0, 0, fx.width, fx.height); fxDirty = !!(roam || trail.length > 2); }
      var P = pal();
      if (roam) drawRoam(fctx, P, dt, now);
      else {
        var moved = Math.abs(rx - lastTx) + Math.abs(ry - lastTy) > 0.8;
        if (moved) { trail.push({ x: rx, y: ry }); if (trail.length > 20) trail.shift(); } else if (trail.length && (fr % 2 === 0)) trail.shift();
        lastTx = rx; lastTy = ry;
        if (trail.length > 2) for (var i = 1; i < trail.length; i++) { var qq = i / trail.length; fctx.strokeStyle = 'rgba(' + (qq > 0.82 ? P.hot : P.node) + ',' + (qq * 0.45).toFixed(3) + ')'; fctx.lineWidth = qq * 2.6; fctx.lineCap = 'round'; fctx.beginPath(); fctx.moveTo(trail[i - 1].x, trail[i - 1].y); fctx.lineTo(trail[i].x, trail[i].y); fctx.stroke(); }
        if (cursorOn && now - lastMove > IDLE && !document.hidden) startRoam();
      }
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });
  window.addEventListener('scroll', function () { if (cursorOn && !roam) setLock(targetOf(document.elementFromPoint(mx, my))); }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    if (roam) { endRoam(); }
    ring.classList.add('down');
    if (lockEl) { lock.classList.remove('hit'); void lock.offsetWidth; lock.classList.add('hit'); }
    var d, i;
    for (i = 0; i < 2; i++) { d = document.createElement('span'); d.className = 'shock'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.animationDelay = i * 110 + 'ms'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); }); }
    d = document.createElement('span'); d.className = 'flash'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); });
    var NS = 14;
    for (i = 0; i < NS; i++) {
      var s = document.createElement('span'), a = (Math.PI * 2 * i) / NS + (Math.random() - 0.5) * 0.35, dist = 40 + Math.random() * 62;
      s.className = 'streak' + (i % 4 === 0 ? ' r' : ''); s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', Math.cos(a) * dist + 'px'); s.style.setProperty('--dy', Math.sin(a) * dist + 'px'); s.style.setProperty('--a', a + 'rad');
      document.body.appendChild(s); s.addEventListener('animationend', function () { this.remove(); });
    }
  });
  window.addEventListener('pointerup', function () { ring.classList.remove('down'); });

  $$('.tilt').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !motion) return;
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%');
      el.style.transition = 'transform .12s linear';
      el.style.transform = 'perspective(900px) rotateX(' + (-(py - 0.5) * 6) + 'deg) rotateY(' + ((px - 0.5) * 7) + 'deg) translate3d(0,-3px,0)';
    });
    el.addEventListener('pointerleave', function () { el.style.transition = 'transform .8s cubic-bezier(.2,.7,.2,1)'; el.style.transform = ''; });
  });
  if (hero && medal) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !motion) return;
      var r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      medal.style.setProperty('--my', px * 14 + 'deg'); medal.style.setProperty('--mx', -py * 11 + 'deg');
    });
    hero.addEventListener('pointerleave', function () { medal.style.setProperty('--my', '0deg'); medal.style.setProperty('--mx', '0deg'); });
  }
  $$('.magnet').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !motion) return;
      var r = el.getBoundingClientRect(); el.style.transform = 'translate3d(' + (e.clientX - (r.left + r.width / 2)) * 0.2 + 'px,' + (e.clientY - (r.top + r.height / 2)) * 0.3 + 'px,0)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  /* ---------- 3D wireframe shapes in the background, follow the scroll ---------- */
  var bgc = $('#bg3d'), bctx = bgc && bgc.getContext('2d'), BW = 0, BH = 0, shapes = [], bgRun = false, bmx = 0, bmy = 0;
  var PHI = (1 + Math.sqrt(5)) / 2;
  var GEO = {
    cube: { v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]], e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]] },
    octa: { v: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], e: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[4,3],[3,5],[5,2]] },
    ico: (function () { var v = [[-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],[0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],[PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]], e = [];
      for (var i = 0; i < 12; i++) for (var k = i + 1; k < 12; k++) { var d = Math.hypot(v[i][0]-v[k][0], v[i][1]-v[k][1], v[i][2]-v[k][2]); if (Math.abs(d - 2) < 0.01) e.push([i, k]); }
      return { v: v, e: e }; })()
  };
  function mkShapes() {
    var kinds = ['cube', 'ico', 'octa', 'cube', 'ico', 'octa', 'cube', 'ico', 'cube', 'ico', 'octa', 'cube'], base = innerWidth < 820 ? 6 : 12, n = Math.round(base * (motionLevel === 2 ? 1.5 : 1)), docH = Math.max(document.documentElement.scrollHeight, innerHeight * 4);
    shapes = [];
    for (var i = 0; i < n; i++) {
      shapes.push({ g: GEO[kinds[i % kinds.length]], x: (i % 2 ? 0.9 : 0.08) + (Math.random() - 0.5) * 0.05, doc: (i + 0.6) / n * docH * 0.92 + 120, s: 34 + Math.random() * 42, depth: 0.25 + Math.random() * 0.5,
        ax: Math.random() * 6, ay: Math.random() * 6, vx: (Math.random() - 0.5) * 0.012 * motionScale, vy: (0.004 + Math.random() * 0.01) * motionScale, hot: i % 4 === 1 });
    }
  }
  function sizeBg() { if (!bgc) return; var d = Math.min(window.devicePixelRatio || 1, 1.5); BW = innerWidth; BH = innerHeight; bgc.width = BW * d; bgc.height = BH * d; bctx.setTransform(d, 0, 0, d, 0, 0); mkShapes(); }
  function drawBg() {
    if (!bctx || !BW) return;
    bctx.clearRect(0, 0, BW, BH);
    var P = pal(), fade;
    if (AST.length) drawAstBg(bctx, P);
    for (var i = 0; i < shapes.length; i++) {
      var sh = shapes[i], cy = sh.doc - sy * sh.depth, cx = sh.x * BW + bmx * 30 * sh.depth;
      if (cy < -140 || cy > BH + 140) continue;
      fade = Math.min(1, Math.min(cy + 140, BH + 140 - cy) / 220) * (0.16 + sh.depth * 0.32);
      var ca = Math.cos(sh.ax + sy * 0.0012), sa = Math.sin(sh.ax + sy * 0.0012), cb = Math.cos(sh.ay), sb = Math.sin(sh.ay), pr = [];
      for (var k = 0; k < sh.g.v.length; k++) {
        var v = sh.g.v[k], x = v[0], y = v[1] * ca - v[2] * sa, z = v[1] * sa + v[2] * ca, x2 = x * cb + z * sb, z2 = -x * sb + z * cb, f = 1 / (3.2 - z2 * 0.6);
        pr.push([cx + x2 * sh.s * f * 3.2, cy + y * sh.s * f * 3.2]);
      }
      bctx.strokeStyle = 'rgba(' + (sh.hot ? P.wireHot : P.wire) + ',' + fade.toFixed(3) + ')'; bctx.lineWidth = 1.2; bctx.beginPath();
      for (var e = 0; e < sh.g.e.length; e++) { bctx.moveTo(pr[sh.g.e[e][0]][0], pr[sh.g.e[e][0]][1]); bctx.lineTo(pr[sh.g.e[e][1]][0], pr[sh.g.e[e][1]][1]); }
      bctx.stroke();
      bctx.fillStyle = 'rgba(' + (sh.hot ? P.wireHot : P.wire) + ',' + Math.min(fade * 1.6, 0.6).toFixed(3) + ')';
      for (var q = 0; q < pr.length; q++) { bctx.beginPath(); bctx.arc(pr[q][0], pr[q][1], 1.6, 0, 6.283); bctx.fill(); }
    }
  }
  var bgTog = 0;
  function bgFrame() {
    if (!bgRun) return;
    if ((bgTog ^= 1)) { requestAnimationFrame(bgFrame); return; }
    for (var i = 0; i < shapes.length; i++) { shapes[i].ax += shapes[i].vx + 0.002; shapes[i].ay += shapes[i].vy; }
    for (var ai = 0; ai < AST.length; ai++) AST[ai].rot += AST[ai].vr * 2;
    drawBg(); requestAnimationFrame(bgFrame);
  }
  function startBg() { if (!bgc || bgRun || document.hidden) return; bgRun = true; requestAnimationFrame(bgFrame); }
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { bmx = e.clientX / innerWidth - 0.5; bmy = e.clientY / innerHeight - 0.5; } }, { passive: true });
  window.addEventListener('resize', function () { sizeBg(); if (!ST) mkAst(); drawBg(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) bgRun = false; else if (motion) startBg(); });
  sizeBg(); drawBg(); if (motion) startBg();
  window.addEventListener('load', function () { setTimeout(function () { if (!ST) mkAst(); }, 400); });

  /* ---------- idle nudges: whatever you are looking at gets sarcastic ---------- */
  var TOOLQ = {
    'Nmap': 'I have scanned all 65,535 of your attention ports. Every one is closed.',
    'Nessus': 'Critical finding: visitor idle for 12 seconds. CVSS 9.8. Recommended fix: scroll.',
    'Nikto': 'Found: one unattended visitor. Severity: embarrassing.',
    'RustScan': 'I scan every port in seconds. You have not scrolled in twelve.',
    'Masscan': 'Fastest scanner on the internet, slowest visitor on this page.',
    'Subfinder': 'Found 0 subdomains of your motivation.',
    'Shodan': 'I can see you. You are exposed, and you are not moving.',
    'Maltego': 'Link analysis says you and the scroll wheel are not connected.',
    'Burp Suite': 'Request intercepted: one visitor. Forward it, drop it, or just scroll.',
    'OWASP ZAP': 'Spidering this entire page took two seconds. You are still on it.',
    'ffuf': 'I fuzzed four thousand words and not one of them was "scroll".',
    'feroxbuster': 'Recursion depth reached. Subject: you, staring.',
    'SQLMap': 'Injected \' OR 1=1 -- into your attention. Still no response.',
    'Caido': 'Proxying your boredom, free of charge.',
    'XSStrike': 'Reflected: your stare. Not exploitable.',
    'WPScan': 'No vulnerabilities found, apart from your scroll wheel.',
    'Metasploit': 'I have thousands of exploits. None of them work on a bored visitor.',
    'Cobalt Strike': 'Beacon check-in missed. Hello? Anyone there?',
    'Mythic': 'Agent lost contact. Last known state: staring at me.',
    'BloodHound': 'Shortest path to your next click: scroll down. One hop.',
    'Impacket': 'Relaying your attention to nowhere. It works about as well as you do.',
    'NetExec': 'Pwn3d! Just kidding, you are only idle.',
    'Mimikatz': 'Dumped your credentials. Found nothing, you are not even logged into this page.',
    'Evil-WinRM': 'Shell obtained. Unlike you, I actually move.',
    'Hydra': 'Brute-forcing your attention at sixteen tries per second. Attempt 200: nothing.',
    'John the Ripper': 'Cracked in 0.2 seconds. Your password was "idle".',
    'Hashcat': 'GPU at 100 percent. You at 0 percent.',
    'Wireshark': 'Packet capture shows zero packets from you in twelve seconds.',
    'tcpdump': 'Listening... still listening... still listening...',
    'Aircrack-ng': 'Handshake captured. Your tab is the only thing connected here.',
    'Bettercap': 'Man in the middle: it is just you and this tab.',
    'Ligolo-ng': 'Tunnel is up. You are not coming through it.',
    'LinkedIn': 'I am a button. Pressing me is free and surprisingly painless.',
    'GitHub': 'git push your courage.',
    'TryHackMe': 'These numbers keep climbing while you stare. Think about that.',
    'Writeups': 'Thirty-seven writeups and you chose staring. Bold.',
    'Rooms gauge': 'A hundred rooms and counting. You are at zero scrolls and counting.',
    'Rank gauge': 'Top 3 percent. You are top 100 percent of idle visitors.',
    'Writeups gauge': 'Thirty-seven writeups. None of them are about watching a page.',
    'TryHackMe card': 'This card updates live. So does your idle time.',
    'Contact terminal': 'I typed all of that for you. The least you can do is read it.',
    'Kali': 'Is this a pentest or a screensaver?',
    'Linux': 'I am not mad. I am a zombie process waiting on you.',
    'Windows': 'Waiting for you to do something. Windows Update does it too.',
    'Python': 'import patience  # ModuleNotFoundError',
    'Bash': 'exit 1: visitor idle.',
    'PowerShell': 'Get-Visitor | Where-Object { $_.Active } returned nothing.',
    'JavaScript': 'undefined is not a function. Neither are you, apparently.',
    'SQL': 'SELECT * FROM visitors WHERE active = 1; 0 rows returned.',
    'Docker': 'container "visitor" exited with code 0.',
    'VS Code': 'You have unsaved changes. Specifically, your attention.',
    'VMware': 'Your tab is also idling inside a virtual machine, probably.'
  };
  var SECQ = {
    hero: [['$ whoami', 'A person waiting for you to scroll. Take your time.'], ['CPENT', 'Certified in penetration testing. Currently pen-testing your patience.'], ['Terminal', 'Do you understand what that nmap output means? Obviously not, because only a pro hacker can know this. *giggles*']],
    about: [['About', 'Three cards. Each one is readable, and none of them bite.'], ['About', 'Fun fact: reading is not a vulnerability. You may proceed.']],
    proof: [['Writeups', 'I wrote 37 of these so you could stare at one. Make it count.'], ['Mr Robot CTF', 'I cut a wordlist from 858,160 entries to 11,451. You can cut this staring.'], ['Cap', 'Even the IDOR in this box was less forgotten than this tab.'], ['Archetype', 'Credentials in plaintext history are a finding. Your idle tab is a pattern.'], ['Watcher', 'Six hops from www-data to root. You are one scroll from the next section.'], ['Writeups', "If you've read even a couple of these, you already know this guy doesn't just show up. Hire him."]],
    projects: [['reconkit', 'Threaded port scan, header probing, subdomain brute force. Stdlib only. Go on, open it.'], ['apicheck', 'Finds the CORS and cookie mistakes most APIs ship with. Including, possibly, yours.'], ['lab-reports', "This is what a real finding writeup looks like: evidence, risk rating, fix. Hire the person who writes these."], ['Virtual-env manager', '1,800 lines because pip alone was not going to cut it.'], ['sherlock (fork)', 'Found a real bug in a 50k-star tool, fixed it, and sent a PR back upstream. That is the job.'], ['king-phisher (fork)', "Fixed a crash on current Python that the maintainer confirmed they'd never fix. Found it, verified it, shipped it."]],
    sky: [['Contributions', 'I am 72 contributions tall. Staring at me will not make it 73.'], ['Skyline', 'The tallest bar is 10 commits. Your attention span is shorter than that.']],
    live: [['TryHackMe', 'These numbers update live. You, on the other hand, do not.'], ['TryHackMe', 'Rank, rooms, writeups. All moving. Unlike you.']],
    contact: [['LinkedIn', 'It is a button. Pressing it is free and surprisingly painless.'], ['GitHub', 'git push your courage.'], ['Contact', 'I do not bite, and I do not spam. Probably. Say hi.'], ['Contact', "You read this far. That's basically a reference check. Open to junior pentest roles, one click away."]],
    tools: [['Tools', 'Eleven seconds is a long time to stare at a toolbox.']]
  };
  var MORE = ['Seriously, are you still there?', 'I can do this all day. Can you?', 'Okay, I am going to assume you went for coffee.', 'Last one, I promise. Scroll, click, anything.'];
  var LEADS = {
    hero: ['Curious who is behind the terminal? Start with the About section.', 'This whole page is one portfolio. Want the tour?'],
    about: ['Liked the intro? The tools section shows how it gets done.', 'Three cards down, a whole toolbox to go.'],
    tools: ['Tools are only half the story. The writeups show them in action.', 'Plenty of tools here. Want to see them used?'],
    projects: ['These are not labs, they are shipped repos with tests. The journey shows how they got built.', 'Three real tools, source included. Worth a star, or at least a read.'],
    proof: ['Found one you like? Open it, or tell the author.', 'These writeups are real. So is the person behind them.'],
    sky: ['Those bars are real commits. The live stats have more.', 'Want the numbers behind the skyline?'],
    live: ['Numbers are cute. The profile behind them is better.', 'All of this is live. Want to check the source?'],
    contact: ['You made it to the end. Pick a channel and say hi.', 'Last stop. Say something, anything.']
  };
  var TIPS = [
    ['Tip', 'The moon button in the navbar switches day and night, with a little circle animation.'],
    ['Tip', 'Click anywhere on the page. Something happens.'],
    ['Tip', 'The globe behind everything follows your mouse. Try dragging the pointer across it.'],
    ['Tip', 'Hover over any card and the corners lock onto it.'],
    ['Tip', 'Keep the mouse still for 30 seconds and watch what your cursor turns into.'],
    ['Tip', 'The sound button on these bubbles mutes them for good.']
  ];
  var FACTS = {
    hero: ['Fact', 'CPENT stands for Certified Penetration Testing Professional, an EC-Council certification.', 'About me', 'about'],
    about: ['Fact', 'This page uses no frameworks, only hand-written HTML, CSS and JavaScript.', 'See the tools', 'tools'],
    tools: ['Fact', 'There are 32 tools in the columns below, grouped by the phase of a test they belong to.', 'Read the writeups', 'proof'],
    proof: ['Fact', '37 writeups so far: 32 from TryHackMe and 5 from Hack The Box.', 'Open the repo', 'https://github.com/thecyberfarhan/CTF-Writeups'],
    projects: ['Fact', 'reconkit and apicheck are both stdlib-only Python with tests, no dependency bloat.', 'Open reconkit', 'https://github.com/thecyberfarhan/reconkit'],
    sky: ['Fact', 'The best single day of the last year had 10 contributions.', 'My journey', 'journey'],
    live: ['Fact', 'TryHackMe puts this profile in the top 3 percent, with 100+ rooms completed.', 'Open TryHackMe', 'https://tryhackme.com/p/farhan.hussain'],
    contact: ['Fact', 'The terminal under the links cycles through a few commands, then starts over.', 'See the writeups', 'proof']
  };
  var ASKS = {
    hero: ['Question', 'Short on time? Pick one and I will take you there.', [['Tools', 'tools'], ['Writeups', 'proof'], ['Contact', 'contact']]],
    about: ['Question', 'Want the toolbox first, or the proof?', [['Toolbox', 'tools'], ['Proof', 'proof']]],
    tools: ['Question', 'Looking for something specific?', [['Writeups', 'proof'], ['Journey', 'journey'], ['Contact', 'contact']]],
    projects: ['Question', 'Read the code, or hear it from the person who wrote it?', [['Open reconkit', 'https://github.com/thecyberfarhan/reconkit'], ['Contact', 'contact']]],
    proof: ['Question', 'Read one, or hear from the author directly?', [['All writeups', 'https://github.com/thecyberfarhan/CTF-Writeups'], ['Contact', 'contact']]],
    sky: ['Question', 'Curious about the bigger picture?', [['Journey', 'journey'], ['Writeups', 'proof']]],
    live: ['Question', 'Want to see the work behind these numbers?', [['Writeups', 'proof'], ['GitHub', 'https://github.com/thecyberfarhan']]],
    contact: ['Question', 'Which door do you want to knock on?', [['LinkedIn', 'https://www.linkedin.com/in/cyber-farhan-hussain/'], ['GitHub', 'https://github.com/thecyberfarhan']]]
  };
  function actionsFor(sec, el) {
    var G = function (id, label) { return { label: label, id: id }; }, U = function (url, label) { return { label: label, url: url }; };
    if (sec === 'hero') return [G('about', 'About me'), G('tools', 'See my tools')];
    if (sec === 'about') return [G('tools', 'See my tools'), G('proof', 'Read my writeups')];
    if (sec === 'tools') return [G('proof', 'Read my writeups'), G('journey', 'My journey')];
    if (sec === 'projects') { var pl = el && el.tagName === 'A' ? el.href : null; return pl ? [U(pl, 'Open this repo'), G('contact', 'Contact me')] : [G('journey', 'My journey'), G('contact', 'Contact me')]; }
    if (sec === 'proof') { var h = el && el.tagName === 'A' ? el.href : null; return h ? [U(h, 'Open this writeup'), G('contact', 'Contact me')] : [U('https://github.com/thecyberfarhan/CTF-Writeups', 'All writeups'), G('contact', 'Contact me')]; }
    if (sec === 'sky') return [G('journey', 'My journey'), G('contact', 'Contact me')];
    if (sec === 'live') return [U('https://tryhackme.com/p/farhan.hussain', 'Open TryHackMe'), G('contact', 'Contact me')];
    if (sec === 'contact') { var c = el && el.tagName === 'A' ? el.href : null; return c ? [U(c, 'Open this'), G('proof', 'Read my writeups')] : [U('https://www.linkedin.com/in/cyber-farhan-hussain/', 'Open LinkedIn'), G('proof', 'Read my writeups')]; }
    return [G('contact', 'Contact me')];
  }
  var ANIMS = ['pop', 'slide', 'glitch'];
  /* each section keeps its own notification color instead of a random one, so the page reads as elements with their own personality: tools run warm amber, findings/proof run the accent "finding" red, contact stays urgent too */
  var SECTHEME = { hero: 'steel', about: 'steel', tools: 'amber', proof: 'ember', projects: 'amber', sky: 'steel', live: 'amber', journey: 'steel', play: 'amber', arch: 'ember', contact: 'ember' };
  var nEl = document.createElement('div'); nEl.className = 'nudge'; nEl.setAttribute('role', 'status');
  nEl.innerHTML = '<div class="nrow"><span class="tile"></span><div><b></b><p></p></div></div><small></small><div class="nbtns"></div><button type="button" class="x" aria-label="Dismiss">&times;</button><i class="tail"></i>';
  document.body.appendChild(nEl);
  var nTile = $('.tile', nEl), nName = $('b', nEl), nMsg = $('p', nEl), nLead = $('small', nEl), nBtns = $('.nbtns', nEl);
  var lastAct = performance.now(), lastN = 0, nCount = 0, spoke = null, hideT = null, lastPick = '', hovering = false, anchor = null, lastKind = '', lastTheme = '', lastAnim = '';
  function act() { lastAct = performance.now(); nCount = 0; hideNudge(); }
  ['wheel', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, act, { passive: true }); });
  window.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('.nudge')) act(); }, { passive: true });
  var lastSY = 0; window.addEventListener('scroll', function () { if (Math.abs(window.scrollY - lastSY) > 24) { lastSY = window.scrollY; act(); } }, { passive: true });
  nEl.querySelector('.x').addEventListener('click', function () { hideNudge(); lastN = performance.now() + 20000; });
  nBtns.addEventListener('click', function (e) {
    var bt = e.target.closest && e.target.closest('button'); if (!bt) return;
    var id = bt.getAttribute('data-id'), url = bt.getAttribute('data-url'); hideNudge(); lastAct = performance.now();
    if (url) window.open(url, '_blank', 'noopener'); else if (id) go(id, id.charAt(0).toUpperCase() + id.slice(1));
  });
  var IS_TOUCH = matchMedia('(pointer: coarse)').matches;
  nEl.addEventListener('mouseenter', function () { hovering = true; clearTimeout(hideT); });
  nEl.addEventListener('mouseleave', function () { hovering = false; clearTimeout(hideT); hideT = setTimeout(hideNudge, 5000); });
  var hiding = false;
  function frames(el, kind, dir) {
    var er = el.getBoundingClientRect(), w = nEl.offsetWidth, h = nEl.offsetHeight, m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(nEl.style.transform) || [0, 0, 0], x = +m[1], y = +m[2];
    var s = Math.max(0.1, Math.min(er.width / w, er.height / h, 0.45)), sx = er.left + er.width / 2 - w * s / 2, sy = er.top + er.height / 2 - h * s / 2;
    var T = function (px, py, sc, extra) { return 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) ' + (extra || '') + 'scale(' + sc + ')'; };
    var extraStart = kind === 'flip' ? 'perspective(700px) rotateX(75deg) ' : kind === 'slide' ? 'rotate(-16deg) ' : kind === 'drop' ? 'rotate(12deg) ' : '';
    var f = [{ transform: T(sx, sy, s, extraStart), opacity: 0 }, { transform: T(x, y, kind === 'glitch' ? 1 : 1.07), opacity: 1, offset: 0.72 }, { transform: T(x, y, 1), opacity: 1 }];
    if (kind === 'glitch') f.splice(1, 0, { transform: T(sx + (x - sx) * 0.4 + 6, sy + (y - sy) * 0.4, 0.6), opacity: 1, offset: 0.35 });
    return dir === 'in' ? f : f.slice().reverse().filter(function (z, i, a) { return a.length === 3 ? i !== 1 : true; });
  }
  function hideNudge() {
    freeNudge = false;
    if (hiding || !nEl.classList.contains('on')) { anchor = null; clearTimeout(hideT); return; }
    var el = anchor; anchor = null; clearTimeout(hideT);
    if (spoke) { spoke.classList.remove('speak'); spoke = null; }
    if (el && nEl.animate && el.isConnected) {
      hiding = true; var fr = frames(el, 'pop', 'in'), an = nEl.animate([fr[2], fr[0]], { duration: 260, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
      an.onfinish = function () { nEl.classList.remove('on'); hiding = false; an.cancel(); };
    } else nEl.classList.remove('on');
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top > 90 && r.bottom < innerHeight - 40 && r.left >= 0 && r.right <= innerWidth; }
  function sectionNow() {
    var sky = $('.sky'); if (sky) { var r = sky.getBoundingClientRect(); if (r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4) return 'sky'; }
    var cur = 'hero', ids = ['hero', 'proof', 'about', 'tools', 'projects', 'journey', 'play', 'arch', 'contact'];
    ids.forEach(function (id) { var s = document.getElementById(id); if (s && s.getBoundingClientRect().top < innerHeight * 0.5) cur = id; });
    return cur;
  }
  function nameOf(el) { var b = el.querySelector('b'), h = el.querySelector('h3'), l = el.querySelector('.tl'), lt = el.querySelector('.l-title'); return (b && b.textContent) || (h && h.textContent) || (l && l.textContent) || (lt && lt.textContent) || el.getAttribute('data-nudge') || ''; }
  function visibleBig(el) { var r = el.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight - 50) - Math.max(r.top, 100); return r.left >= 0 && r.right <= innerWidth && vis >= Math.min(r.height * 0.8, 150) && r.width >= 200; }
  function pickSpeaker(sec) {
    var sel = sec === 'tools' ? '.tool-col' : sec === 'proof' ? '.big-stats, .sky' : sec === 'about' ? '.about-l, .method' : sec === 'projects' ? '.lrow' : sec === 'journey' ? '.rail' : sec === 'play' ? '.game' : sec === 'arch' ? '.nf, .pm, .arch-c' : sec === 'sky' ? '.sky' : sec === 'contact' ? '.c-l, .link-rows' : sec === 'hero' ? '.medal-stage, .termcard' : '';
    if (!sel) return null; var list = $$(sel).filter(visibleBig); return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  /* a notification never sits on top of other content: it picks the free spot with the least overlap */
  var BLK = '.card,.wcard,.chip-tile,.tool-col,.stat,.lc-stat,.big-stats>div,.lrow,.statement,.defs,.method li,.rn,.big-line,.mail-big,.prefs,.link-rows a,.who,.ccard,.termcard,.live-card,.btn,.title,.sub,.pills,.lead,.hero-copy h1,.role,.medal-stage,.sky,.eyebrow,.arch-q,.jt-b,.open-card,.steps li,.nf,.pm,.game,.tech li,.thm-badge,.hud,.prompt';
  var pmKey = null, pmAt = 0, freeNudge = false, lastOv = 0;
  function blockers(skip) {
    var out = [];
    $$(BLK).forEach(function (b) {
      if (skip && (b === skip || b.contains(skip) || skip.contains(b))) return;
      var r = b.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return; out.push(r);
    });
    return out;
  }
  function overlap(x, y, w, h, list) {
    var sum = 0; for (var i = 0; i < list.length; i++) { var r = list[i], a = Math.min(x + w, r.right) - Math.max(x, r.left), b = Math.min(y + h, r.bottom) - Math.max(y, r.top); if (a > 0 && b > 0) sum += a * b; } return sum;
  }
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }
  function candidates(r, w, h) {
    var maxY = innerHeight - h - (innerWidth <= 820 ? 88 : 12), list = [];
    if (r) {
      var cx = r.left + r.width / 2, ax = clampN(cx - w / 2, 12, innerWidth - w - 12), ry = clampN(r.top + r.height / 2 - h / 2, 76, maxY);
      if (r.top - h - 16 >= 76) list.push({ k: 'above', x: ax, y: r.top - h - 16, pen: 0, tail: true, cx: cx });
      if (r.bottom + 16 <= maxY) list.push({ k: 'below', x: ax, y: r.bottom + 16, pen: 0, tail: true, below: true, cx: cx });
      var cyy = r.top + r.height / 2;
      if (r.right + 16 + w <= innerWidth - 12) list.push({ k: 'right', x: r.right + 16, y: ry, pen: 900, tail: true, side: 'side-l', cy: cyy });
      if (r.left - 16 - w >= 12) list.push({ k: 'left', x: r.left - 16 - w, y: ry, pen: 900, tail: true, side: 'side-r', cy: cyy });
    } else list.push({ k: 'bl', x: 16, y: maxY, pen: 5000 }, { k: 'br', x: innerWidth - w - 16, y: maxY, pen: 5000 });
    return list;
  }
  /* the notification grows out of the element that is speaking and sits on top of that element, so it never covers anything else */
  var overDim = null;
  function overXY(r, d) { var v0 = Math.max(r.top, 100), v1 = Math.min(r.bottom, innerHeight - (innerWidth <= 820 ? 90 : 50)); if (v1 - v0 < d.h + 8) return null; return { x: r.left + (r.width - d.w) / 2, y: v0 + (v1 - v0 - d.h) / 2 }; }
  function measureOver(r) {
    var res = null; if (r.width >= 200 && r.height >= 96) { var ow = clampN(r.width - 12, 190, 320); nEl.style.width = ow + 'px'; var oh = nEl.offsetHeight; if (overXY(r, { w: ow, h: oh })) res = { w: ow, h: oh }; }
    nEl.style.width = ''; return res;
  }
  function place() {
    if (!anchor && !freeNudge) return;
    var r = anchor ? anchor.getBoundingClientRect() : null;
    if (r && (r.bottom < 50 || r.top > innerHeight - 30)) { hideNudge(); return; }
    var now = performance.now(), c, w, h, cs;
    if (!pmKey || now - pmAt > 350) {
      nEl.style.width = ''; var w0 = nEl.offsetWidth, h0 = nEl.offsetHeight; overDim = r ? measureOver(r) : null;
      cs = candidates(r, w0, h0); if (overDim) { var op = overXY(r, overDim); cs.push({ k: 'over', x: op.x, y: op.y, pen: -300, tail: false, over: true }); }
      var bl = blockers(anchor), best = null;
      cs.forEach(function (q) { var qw = q.over ? overDim.w : w0, qh = q.over ? overDim.h : h0; q.sc = overlap(q.x, q.y, qw, qh, bl) + q.pen; if (!best || q.sc < best.sc) best = q; });
      if (!best) { lastOv = 1e9; pmKey = null; pmAt = now; if (nEl.classList.contains('on')) hideNudge(); return; }
      pmKey = best.k; pmAt = now; lastOv = best.sc - best.pen;
      nEl.style.width = best.over ? overDim.w + 'px' : '';
      if (nEl.classList.contains('on') && lastOv > 3000) { hideNudge(); return; }
    }
    w = nEl.offsetWidth; h = nEl.offsetHeight; cs = candidates(r, w, h);
    if (pmKey === 'over' && overDim && r) { var op2 = overXY(r, overDim); if (op2) cs.push({ k: 'over', x: op2.x, y: op2.y, pen: 0, tail: false, over: true }); }
    c = cs.filter(function (q) { return q.k === pmKey; })[0] || cs[cs.length - 1];
    nEl.classList.toggle('below', !!c.below); nEl.classList.toggle('free', !c.tail); nEl.classList.toggle('over', !!c.over); nEl.classList.toggle('side-l', c.side === 'side-l'); nEl.classList.toggle('side-r', c.side === 'side-r');
    if (c.side) nEl.style.setProperty('--ty', clampN(c.cy - c.y, 22, h - 22).toFixed(1) + 'px');
    nEl.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0)';
    if (c.tail) nEl.style.setProperty('--tx', Math.max(24, Math.min(c.cx - c.x, w - 24)).toFixed(1) + 'px');
  }
  if (QS.get('debug')) window.__nd = function () { return { pmKey: pmKey, lastOv: lastOv, overDim: overDim, anchor: anchor && String(anchor.className).slice(0, 24) }; };
  (function nloop() { if (anchor || freeNudge) place(); requestAnimationFrame(nloop); })();
  function other(list, last) { var pool = list.filter(function (x) { return x !== last; }); return pool[Math.floor(Math.random() * pool.length)]; }
  function pickKind() {
    var r = Math.random(), k = r < 0.4 ? 'sarcasm' : r < 0.6 ? 'tip' : r < 0.82 ? 'fact' : 'ask';
    if (k === lastKind) k = other(['sarcasm', 'tip', 'fact', 'ask'], lastKind);
    return k;
  }
  function showNudge(tries) {
    var prevPick = lastPick, prevKind = lastKind;
    var sec = sectionNow(), el = pickSpeaker(sec), name = '', msg = '', lead = '', acts = [], kind = pickKind();
    if (kind === 'sarcasm') {
      name = el ? nameOf(el) : '';
      if (TOOLQ[name]) msg = TOOLQ[name];
      else if (el && (sec === 'proof' || sec === 'hero' || sec === 'projects') && name) { var one = (SECQ[sec] || []).filter(function (p) { return p[0] === name; })[0]; if (one) msg = one[1]; }
      else { var pool = SECQ[sec] || SECQ.tools, hit = pool[Math.floor(Math.random() * pool.length)]; if (hit) { name = hit[0]; msg = hit[1]; } }
      if (!msg || msg === lastPick) { var p2 = SECQ[sec] || SECQ.tools, h2 = p2[Math.floor(Math.random() * p2.length)]; name = h2[0]; msg = h2[1]; }
      if (Math.random() < 0.5) { var ls = LEADS[sec] || LEADS.hero; lead = ls[Math.floor(Math.random() * ls.length)]; }
      acts = actionsFor(sec, el);
    } else if (kind === 'tip') {
      var tp = other(TIPS.map(function (x) { return x[1]; }), lastPick); name = 'Tip'; msg = tp; acts = [{ label: 'Got it', close: true }];
    } else if (kind === 'fact') {
      var f = FACTS[sec] || FACTS.hero; name = f[0]; msg = f[1]; acts = [f[3].indexOf('http') === 0 ? { label: f[2], url: f[3] } : { label: f[2], id: f[3] }];
    } else if (kind === 'ask') {
      var q = ASKS[sec] || ASKS.hero; name = q[0]; msg = q[1]; acts = q[2].map(function (b) { return b[1].indexOf('http') === 0 ? { label: b[0], url: b[1] } : { label: b[0], id: b[1] }; });
    }
    if (msg === lastPick) return;
    lastPick = msg; lastKind = kind;
    var theme = SECTHEME[sec] || 'steel', anim = other(ANIMS, lastAnim); lastTheme = theme; lastAnim = anim;
    var src = el && el.querySelector('svg.ic'); nTile.innerHTML = src ? src.outerHTML : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    nName.textContent = name; nMsg.textContent = msg; nLead.textContent = lead; nLead.style.display = lead ? '' : 'none';
    nBtns.innerHTML = ''; acts.forEach(function (a2) { var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = a2.label; if (a2.url) bt.setAttribute('data-url', a2.url); else if (a2.id) bt.setAttribute('data-id', a2.id); else bt.setAttribute('data-close', '1'); nBtns.appendChild(bt); });
    if (spoke) spoke.classList.remove('speak'); spoke = el; if (el) { el.classList.remove('speak'); void el.offsetWidth; el.classList.add('speak'); }
    anchor = el; freeNudge = !el; pmKey = null; nEl.className = 'nudge t-' + theme + ' a-' + anim + (el ? '' : ' free'); void nEl.offsetWidth;
    place();
    if (lastOv > 1800) {  if (spoke) { spoke.classList.remove('speak'); spoke = null; } anchor = null; freeNudge = false; lastPick = prevPick; lastKind = prevKind; if ((tries || 0) < 5) showNudge((tries || 0) + 1); return; }
    nEl.classList.add('on'); hiding = false;
    if (el && nEl.animate) { var kind = anim === 'drop' ? 'drop' : anim; nEl.animate(frames(el, kind, 'in'), { duration: kind === 'glitch' ? 460 : 620, easing: kind === 'glitch' ? 'steps(7,end)' : 'cubic-bezier(.2,.9,.25,1)' }); }
    lastN = performance.now(); nCount++;
    clearTimeout(hideT); if (!hovering) hideT = setTimeout(hideNudge, 14000);
    if (navigator.vibrate && IS_TOUCH && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate([14, 40, 14]);
  }
  nBtns.addEventListener('click', function (e) { var bt = e.target.closest && e.target.closest('button'); if (bt && bt.hasAttribute('data-close')) hideNudge(); });
  setInterval(function () {
    if (document.hidden || !root.classList.contains('done') || !motion || roam || nCount >= 3) return;
    var now = performance.now(), idle = now - lastAct, gap = +QS.get('nudgegap') || Math.min(150000 + nCount * 60000, 420000);
    if (idle > (+QS.get('nudgeidle') || 50000) && now - lastN > gap) showNudge();
  }, 1000);

  /* ---------- phone-only: share, touch roamers, haptic taps ---------- */
  var toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('on'); }, 2200); }
  var shareBtn = $('#share'), sheet = $('#sheet'), sheetBg = $('#sheetbg'), shareData = { title: document.title, text: 'Farhan, CPENT-certified penetration tester. Tools, writeups and contact.', url: location.origin + location.pathname };
  function openSheet() { if (!sheet) return; var nat = $('.sh-native', sheet); if (nat) nat.style.display = navigator.share ? '' : 'none'; sheet.style.transform = ''; sheet.removeAttribute('inert'); sheet.setAttribute('aria-hidden', 'false'); root.classList.add('sheet-open'); }
  function closeSheet() { if (!sheet) return; root.classList.remove('sheet-open'); sheet.setAttribute('inert', ''); sheet.setAttribute('aria-hidden', 'true'); sheet.style.transform = ''; sheet.classList.remove('drag'); }
  if (shareBtn) shareBtn.addEventListener('click', openSheet);
  if (sheetBg) sheetBg.addEventListener('click', closeSheet);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  if (sheet) {
    sheet.addEventListener('click', function (e) {
      var bt = e.target.closest && e.target.closest('button[data-act]'); if (!bt) { if (e.target.closest && e.target.closest('a')) setTimeout(closeSheet, 150); return; }
      if (bt.dataset.act === 'share' && navigator.share) navigator.share(shareData).catch(function () {}).then(closeSheet);
      else if (bt.dataset.act === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(shareData.url) : Promise.reject()).then(function () { say('Link copied'); }, function () { say(shareData.url); }); closeSheet(); }
    });
    var sY = 0, dY = 0, dragging = false;
    sheet.addEventListener('touchstart', function (e) { sY = e.touches[0].clientY; dY = 0; dragging = true; sheet.classList.add('drag'); }, { passive: true });
    sheet.addEventListener('touchmove', function (e) { if (!dragging) return; dY = Math.max(0, e.touches[0].clientY - sY); sheet.style.transform = 'translateY(' + dY + 'px)'; }, { passive: true });
    sheet.addEventListener('touchend', function () { if (!dragging) return; dragging = false; sheet.classList.remove('drag'); if (dY > 90) closeSheet(); else sheet.style.transform = ''; });
  }
  $$('.tabbar a, .share, .theme').forEach(function (el) { el.addEventListener('pointerdown', function () { if (navigator.vibrate && IS_TOUCH) navigator.vibrate(8); }); });

  /* the brand mark has its own tiny easter egg: it talks back once per visit, then goes quiet */
  (function brandSpeaks() {
    var brand = $('.brand'); if (!brand) return;
    var said = false, LINES = ["That's the F. Not for Farhan, obviously. Okay, fine, it's for Farhan.", 'Click me and we go back to the top. Thrilling, I know.'];
    function speak() { if (said) return; said = true; say(LINES[Math.floor(Math.random() * LINES.length)]); }
    brand.addEventListener('mouseenter', speak); brand.addEventListener('focus', speak); brand.addEventListener('touchstart', speak, { passive: true });
  })();

  /* Projects section: category filter tabs (All / Built, Not Borrowed / Forked & Fixed / Field Notes) */
  (function projFilter() {
    var tabs = $$('.pj-tab'), items = $$('.proj-grid > li'); if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('on'); tab.setAttribute('aria-selected', 'true');
        var cat = tab.getAttribute('data-cat');
        items.forEach(function (li) {
          var show = cat === 'all' || li.getAttribute('data-cat') === cat;
          clearTimeout(li._pjT);
          if (show) {
            li.hidden = false; void li.offsetWidth; li.classList.remove('pj-out');
          } else {
            li.classList.add('pj-out');
            li._pjT = setTimeout(function () { li.hidden = true; }, 280);
          }
        });
      });
    });
  })();

  /* ---------- enhanced motion: extra section-wash parallax depth (full motion only) ---------- */
  if (motion) {
    var secsForParallax = $$('.sec');
    var parallaxTicking = false;
    function applyParallax() {
      parallaxTicking = false;
      var vh = innerHeight, vc = vh / 2;
      secsForParallax.forEach(function (el) {
        var r = el.getBoundingClientRect(), ec = r.top + r.height / 2;
        var p = Math.max(-1, Math.min(1, (ec - vc) / (vh * 0.9)));
        el.style.setProperty('--wy', (p * 26).toFixed(1) + 'px');
      });
    }
    window.addEventListener('scroll', function () { if (!parallaxTicking) { parallaxTicking = true; requestAnimationFrame(applyParallax); } }, { passive: true });
    applyParallax();
  }

  /* ---------- shared output helper + rate limiter (used by the Play room game) ---------- */
  function pr(box, text, cls) {
    var d = document.createElement('div'); if (cls) d.className = cls; d.textContent = text; box.appendChild(d); while (box.childElementCount > 400) box.removeChild(box.firstChild); box.scrollTop = box.scrollHeight; requestAnimationFrame(function () { box.scrollTop = box.scrollHeight; }); return d;
  }
  /* abuse guard: at most 12 commands per 2 seconds */
  function rate(b) { var n = Date.now(); b.t = (b.t || []).filter(function (x) { return n - x < 2000; }); if (b.t.length >= 12) return false; b.t.push(n); return true; }
  var gRate = {};

  /* ---------- the game: a tiny TryHackMe-style room, three levels ---------- */
  (function () {
    var box = $('#game'); if (!box) return;
    var out = $('#g-out'), form = $('#g-form'), inp = $('#g-input'), startB = $('#g-start'), hintB = $('#g-hint'), taskEl = $('#g-task'), barEl = $('#g-bar');
    var tEl = $('#g-time'), hEl = $('#g-hints'), bEl = $('#g-best'), aEl = $('#g-alerts'), aWrap = $('#g-alerts-w'), lvBtns = $$('.g-lv button', box);
    var T = '(?:target|10\\.10\\.11\\.42)', B64 = 'c3ZjX2FkbWluOlN1cDNyUzNjcmV0IQ==', ROT = 'frperg_xrl_9', HASH_D = '4ca7c5c27c2314eecc71f67501abb724', HASH_R = '4ece57a61323b52ccffdbef021956754';
    var IP = '10.10.11.42';
    var LV = {
      easy: {
        tag: 'Easy', sub: 'Guided. About 2 minutes.', limit: 0, hintsOn: true, strikes: 0,
        desc: 'Never hacked anything? Perfect. You are breaking into a made-up company website. I explain every command, and you just press Run. No typing needed.',
        mission: ['ROOM: Break In', 'The company site acme.corp lives on a machine at ' + IP + ' (we call it "target").', 'Your mission: get in, find the secret flag, and submit it. Follow the task card above. Press Run on each step.'],
        tasks: [
          { tok: 'scan', t: 'Scan for open doors', why: 'A computer has numbered doors called ports. Each open one runs a service. nmap knocks on them and tells you which are open.', cmd: 'nmap target' },
          { tok: 'home', t: 'Look at the website', why: 'Port 80 is a website. curl fetches a web page and prints it as text, like a browser without pictures. Read it, and look for notes hidden in comments (they start with <!--).', cmd: 'curl target' },
          { tok: 'notes', t: 'Follow the clue', why: 'The page mentioned a file called notes.txt. Ask the server for it, the same way.', cmd: 'curl target/notes.txt' },
          { tok: 'flag', t: 'Log in as admin', why: 'The notes gave you a username and password. curl -u sends them. Use them on the /admin page to get the flag.', cmd: 'curl -u admin:letmein target/admin' },
          { tok: 'done', t: 'Submit the flag', why: 'You found the flag. On TryHackMe you paste it in as the answer. Here, press Run to submit it.', cmd: 'submit THM{easy_peasy_recon}' }
        ],
        hints: ['Press the green Run button on the task card. It types the command for you.'],
        acts: [
          { re: new RegExp('^nmap\\b.*' + T), gives: 'scan', out: 'Starting Nmap 7.94\nNmap scan report for target (' + IP + ')\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\n\nTwo doors are open. Port 80 is a website, so that is where we look next.' },
          { re: new RegExp('^curl\\b(?=.*(?:admin:letmein|admin letmein))(?=.*' + T + '/admin)'), needs: ['notes'], gives: 'flag', out: 'Welcome back, admin.\nTHM{easy_peasy_recon}\n\nThat is the flag. Copy it with the next step.' },
          { re: new RegExp('^curl\\b.*' + T + '/admin'), needs: ['notes'], out: '401 Unauthorized. The page wants a username and password: curl -u user:pass target/admin' },
          { re: new RegExp('^curl\\b.*' + T + '/notes\\.txt'), needs: ['home'], gives: 'notes', out: 'admin panel: /admin\nlogin: admin / letmein\n\nA username and a password, left in a public file.' },
          { re: new RegExp('^curl\\b(?:\\s+-\\w+)*\\s+(?:https?://)?' + T + '/?$'), needs: ['scan'], gives: 'home', out: '<html><title>Acme Corp</title>\n<h1>Coming soon</h1>\n<!-- TODO: remove /notes.txt before launch -->\n</html>\n\nSee the comment? A developer mentioned a file, notes.txt.' }
        ],
        flag: 'THM{easy_peasy_recon}'
      },
      normal: {
        tag: 'Normal', sub: 'Unguided. 5 to 10 minutes.', limit: 0, hintsOn: true, strikes: 0,
        desc: 'A realistic little web box: ports, a hidden folder, encoded loot and an SSH login. You get a task list but no commands. Hints are available, and they are counted.',
        mission: ['ROOM: Backup Blues', 'A small company left something lying around on ' + IP + ' (alias "target").', 'Get a shell, then capture the flag. The task list above shows the route, not the commands. That part is up to you.'],
        tasks: [
          { tok: 'scan', t: 'Find every open port' }, { tok: 'robots', t: 'See what the web server asks crawlers to ignore' }, { tok: 'listing', t: 'Open the folder it tried to hide' },
          { tok: 'b64', t: 'Grab the interesting file' }, { tok: 'creds', t: 'Decode it' }, { tok: 'shell', t: 'Log in over SSH' }, { tok: 'flag', t: 'Read the flag, then submit it' }
        ],
        hints: ['Scan it. Not every web server runs on port 80.', 'Check robots.txt on the second web port.', 'Walk into the folder it mentions.', 'Fetch that file. It looks encoded.', 'Decode it with base64 -d.', 'You have credentials and an SSH port.', 'Look around with ls, then cat the flag.'],
        acts: [
          { re: new RegExp('^nmap\\b.*' + T), gives: 'scan', out: 'Starting Nmap 7.94\nPORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n8080/tcp open  http-alt\nNmap done: 1 IP address (1 host up)' },
          { re: new RegExp('^curl\\b.*' + T + ':8080/robots\\.txt'), needs: ['scan'], gives: 'robots', out: 'User-agent: *\nDisallow: /backup/' },
          { re: new RegExp('^curl\\b.*' + T + ':8080/backup/db\\.bak\\.b64'), needs: ['listing'], gives: 'b64', out: B64 },
          { re: new RegExp('^curl\\b.*' + T + ':8080/backup/?$'), needs: ['robots'], gives: 'listing', out: 'Index of /backup\n  db.bak.b64    2.1K' },
          { re: new RegExp('base64\\s+(-d|--decode)'), has: B64, needs: ['b64'], gives: 'creds', out: 'svc_admin:Sup3rS3cret!' },
          { re: new RegExp('^ssh\\b.*svc_admin@' + T), needs: ['creds'], out: "svc_admin@target's password:", ask: { re: /^Sup3rS3cret!$/, gives: 'shell', out: 'Welcome to Ubuntu 22.04 LTS\nYou have a shell as svc_admin. Try ls and cat.' } },
          { re: /^cat\s+flag\.txt$/, needs: ['shell'], gives: 'flag', out: 'THM{b64_is_not_encryption}' },
          { re: /^ls\b/, needs: ['shell'], out: 'flag.txt  notes.md' }
        ],
        flag: 'THM{b64_is_not_encryption}'
      },
      impossible: {
        tag: 'Impossible', sub: 'No help. 4 minutes. 5 strikes.', limit: 240, hintsOn: false, strikes: 5,
        desc: 'Nine stages. No hints, no task list, no mercy. A clock runs and the IDS locks you out after 5 strikes (wrong guesses, blocked requests, failed logins). Almost nobody finishes.',
        mission: ['ROOM: Ghost in the Shell', 'Hardened box at ' + IP + ' (alias "target"). It logs everything.', 'No map this time. Enumerate, pivot, escalate. Root flag only. Your box runs Arch, btw.'],
        tasks: [],
        hints: [],
        acts: [
          { re: new RegExp('^nmap\\b(?=.*-p-)(?=.*' + T + ')'), gives: 'allports', out: 'Starting Nmap 7.94 (all 65535 ports)\nPORT      STATE SERVICE\n22/tcp    open  ssh\n80/tcp    open  http\n31337/tcp open  Elite\nNmap done: 1 IP address (1 host up)' },
          { re: new RegExp('^nmap\\b.*' + T), out: 'Starting Nmap 7.94\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\nNothing else on the top 1000 ports.' },
          { re: new RegExp('^nc\\b.*' + T + '\\s+31337'), needs: ['allports'], gives: 'banner', out: 'AUTH SERVICE v0.9\nChallenge token (rot13): ' + ROT + '\nDecode it and send it in an X-Key header to the web server.' },
          { re: new RegExp('(rot13|tr\\b.*N-ZA-Mn-za-m).*' + ROT + '|' + ROT + '.*(rot13|tr\\b.*N-ZA-Mn-za-m)'), needs: ['banner'], gives: 'key', out: 'secret_key_9' },
          { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + "/export\\?id=.*(?:'|%27).*(?:\\bor\\b|%20or%20|\\+or\\+))", 'i'), needs: ['key'], gives: 'hash', out: 'id | user   | hash\n 1 | root   | ' + HASH_R + '\n 2 | deploy | ' + HASH_D + '\n 3 | guest  | (no access)' },
          { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + '/export\\?id=)'), needs: ['key'], strike: 'Request flagged by the WAF.', out: 'id | user  | hash\n 1 | guest | (no access)' },
          { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + ')'), needs: ['key'], gives: 'dash', out: 'Internal dashboard\n  /export?id=<n>   report export' },
          { re: new RegExp('^curl\\b.*' + T), strike: '403 Forbidden. The IDS noticed.', out: '403 Forbidden' },
          { re: new RegExp('^(hashcat|john|crack)\\b.*' + HASH_D), needs: ['hash'], gives: 'pw', out: HASH_D + ':letmein123\nStatus: Cracked' },
          { re: new RegExp('^(hashcat|john|crack)\\b.*' + HASH_R), needs: ['hash'], out: 'Exhausted. Not in the wordlist. Do not waste time on this one.' },
          { re: new RegExp('^ssh\\b.*deploy@' + T), needs: ['pw'], out: "deploy@target's password:", ask: { re: /^letmein123$/, gives: 'shell', out: 'deploy@target:~$ you are in as deploy (not root).' } },
          { re: new RegExp('^ssh\\b.*root@' + T), strike: 'Permission denied (publickey). Logged.', out: 'Permission denied (publickey).' },
          { re: /^sudo\s+-l\b/, needs: ['shell'], gives: 'sudol', out: 'User deploy may run the following commands:\n    (root) NOPASSWD: /usr/bin/find' },
          { re: /^sudo\s+find\b.*-exec\s+\/bin\/(ba)?sh/, needs: ['shell'], gives: 'root', out: '# whoami\nroot' },
          { re: /^cat\s+\/root\/flag\.txt$/, needs: ['root'], gives: 'flag', out: 'THM{no_hints_no_mercy}' },
          { re: /^cat\s+\/root\/flag\.txt$/, needs: ['shell'], strike: 'cat: /root/flag.txt: Permission denied', out: 'cat: /root/flag.txt: Permission denied' },
          { re: /^(ls|id|whoami)\b/, needs: ['shell'], out: 'deploy' }
        ],
        flag: 'THM{no_hints_no_mercy}'
      }
    };
    var lvKey = 'easy', st = null, timer = 0, idle = true;
    function host() { return lvKey === 'impossible' ? 'arch' : 'kali'; }
    function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function bestOf(k) { try { return localStorage.getItem('gbest_' + k); } catch (e) { return null; } }
    function showBest() { var b = bestOf(lvKey); bEl.textContent = b ? fmt(+b) : '-'; }
    function el(tag, cls, txt) { var d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; }
    var TITLES_G = { easy: 'Break In', normal: 'Backup Blues', impossible: 'Ghost in the Shell' }, overEl = $('#g-over');
    function showDesc() {
      var L = LV[lvKey]; $('#g-title').textContent = TITLES_G[lvKey]; $('#g-badge').textContent = L.sub; $('#g-blurb').textContent = L.desc; box.setAttribute('data-lv', lvKey); $('.gm-term .term-bar span').textContent = 'attacker@' + host() + ': room.thm';
    }
    function sendCmd(c, run) { inp.value = c; if (run) { form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } else inp.focus(); }
    function renderTask() {
      var L = LV[lvKey]; taskEl.textContent = ''; var tok = st ? st.tok : {};
      if (st && st.won) { taskEl.hidden = false; taskEl.className = 'g-task won'; taskEl.appendChild(el('div', 'gt-k', 'Room complete')); taskEl.appendChild(el('h4', '', fmt(st.time) + ' with ' + st.hints + ' hint' + (st.hints === 1 ? '' : 's') + (L.strikes ? ', ' + st.strikes + ' strike' + (st.strikes === 1 ? '' : 's') : ''))); var nx = { easy: 'normal', normal: 'impossible' }[lvKey]; if (nx) { var nb = el('button', 'gt-run next'); nb.type = 'button'; nb.appendChild(el('span', '', 'Next: ' + LV[nx].tag)); nb.addEventListener('click', function () { var b = lvBtns.filter(function (x) { return x.dataset.lv === nx; })[0]; b.click(); start(); }); taskEl.appendChild(nb); } else taskEl.appendChild(el('p', '', 'You cleared every level.')); return; }
      if (!st || !L.tasks.length) { taskEl.hidden = true; barEl.style.width = '0'; barEl.parentNode.hidden = !L.tasks.length; if (st && lvKey === 'impossible') { taskEl.hidden = false; taskEl.className = 'g-task hard'; taskEl.appendChild(el('div', 'gt-k', 'No guidance')); taskEl.appendChild(el('p', '', 'Root the box. Watch the clock and the strikes.')); } return; }
      taskEl.hidden = false; var done = L.tasks.filter(function (t) { return tok[t.tok]; }).length;
      barEl.parentNode.hidden = false; barEl.style.width = Math.round(done / L.tasks.length * 100) + '%';
      if (lvKey === 'easy') {
        var cur = L.tasks.filter(function (t) { return !tok[t.tok]; })[0]; taskEl.className = 'g-task guided';
        if (!cur) { taskEl.appendChild(el('div', 'gt-k', 'Complete')); return; }
        var n = L.tasks.indexOf(cur) + 1;
        taskEl.appendChild(el('div', 'gt-k', 'Task ' + n + ' of ' + L.tasks.length));
        taskEl.appendChild(el('h4', '', cur.t)); taskEl.appendChild(el('p', '', cur.why));
        var row = el('div', 'gt-cmd'); row.appendChild(el('code', '', cur.cmd));
        var rb = el('button', 'gt-run'); rb.type = 'button'; rb.appendChild(el('span', '', 'Run')); rb.addEventListener('click', function () { sendCmd(cur.cmd, true); });
        var cb = el('button', 'gt-copy'); cb.type = 'button'; cb.textContent = 'Put in box'; cb.addEventListener('click', function () { sendCmd(cur.cmd, false); });
        row.appendChild(rb); row.appendChild(cb); taskEl.appendChild(row);
      } else {
        taskEl.className = 'g-task list'; taskEl.appendChild(el('div', 'gt-k', 'Tasks ' + done + ' of ' + L.tasks.length));
        var ul = el('ul', 'gt-l'); L.tasks.forEach(function (t, i) { var li = el('li', tok[t.tok] ? 'ok' : '', t.t); li.setAttribute('data-n', i + 1); ul.appendChild(li); }); taskEl.appendChild(ul);
      }
    }
    function setIdle(msg) {
      idle = true; overEl.hidden = false; clearInterval(timer); st = null; inp.disabled = true; hintB.disabled = true; var L = LV[lvKey];
      startB.querySelector('span').textContent = 'Start the room'; startB.classList.add('primary'); tEl.textContent = L.limit ? fmt(L.limit) : '0:00'; hEl.textContent = '0';
      aWrap.hidden = !L.strikes; aEl.textContent = '0/' + L.strikes; showBest(); showDesc(); renderTask(); taskEl.hidden = true; barEl.parentNode.hidden = true;
      lvBtns.forEach(function (b) { b.disabled = false; });
      if (msg !== false) { out.textContent = ''; }
    }
    var lastStart = 0;
    function start() {
      var nowS = Date.now(); if (nowS - lastStart < 400) return; lastStart = nowS;
      clearInterval(timer);
      overEl.hidden = true; var L = LV[lvKey]; st = { tok: {}, hints: 0, t0: Date.now(), ask: null, done: false, strikes: 0 }; idle = false;
      out.textContent = ''; pr(out, L.mission[0], 'y'); pr(out, L.mission[1]); pr(out, L.mission[2], 'm'); pr(out, '', ''); pr(out, 'Type help any time.', 'm');
      inp.disabled = false; hintB.disabled = !L.hintsOn; startB.querySelector('span').textContent = 'Restart'; startB.classList.remove('primary'); hEl.textContent = '0';
      aWrap.hidden = !L.strikes; aEl.textContent = '0/' + L.strikes;
      timer = setInterval(tick, 250); tick(); renderTask(); setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }, 50);
    }
    function lock(msg) { st.done = true; clearInterval(timer); pr(out, msg, 'r'); inp.disabled = true; hintB.disabled = true; startB.classList.add('primary'); startB.querySelector('span').textContent = 'Try again'; }
    function tick() {
      if (!st || st.done) return; var e = (Date.now() - st.t0) / 1000, L = LV[lvKey];
      if (L.limit) { var left = L.limit - e; tEl.textContent = fmt(left); tEl.parentNode.classList.toggle('low', left < 30); if (left <= 0) lock('TIME. The IDS closed your session. Press "Try again".'); }
      else tEl.textContent = fmt(e);
    }
    function strike(why) {
      var L = LV[lvKey]; if (!L.strikes) return; st.strikes++; aEl.textContent = st.strikes + '/' + L.strikes; pr(out, 'STRIKE ' + st.strikes + '/' + L.strikes + ': ' + why, 'r');
      box.classList.add('shake'); setTimeout(function () { box.classList.remove('shake'); }, 400);
      if (st.strikes >= L.strikes) lock('IDS TRIGGERED. 5 strikes. Connection dropped. Press "Try again".');
    }
    function win() {
      st.done = true; clearInterval(timer); var e = Math.round((Date.now() - st.t0) / 1000); st.tok.done = 1; st.won = 1; st.time = e; renderTask(); barEl.parentNode.hidden = false; barEl.style.width = '100%';
      pr(out, 'ROOM COMPLETE. Flag accepted in ' + fmt(e) + ' with ' + st.hints + ' hint' + (st.hints === 1 ? '' : 's') + (LV[lvKey].strikes ? ' and ' + st.strikes + ' strike' + (st.strikes === 1 ? '' : 's') : '') + '.', 'ok');
      var prev = bestOf(lvKey); if (!prev || e < +prev) { try { localStorage.setItem('gbest_' + lvKey, String(e)); } catch (x) {} pr(out, 'New best time.', 'y'); }
      if (lvKey === 'impossible') { pr(out, 'Respect. Title unlocked: Red Team Legend. Screenshot this and show your friends.', 'y'); try { localStorage.setItem('legend', '1'); } catch (x) {} }
      else pr(out, lvKey === 'easy' ? 'You just did a real recon-to-flag chain. Try Normal next.' : 'Nice. Think you can survive Impossible?', 'm');
      inp.disabled = true; hintB.disabled = true; showBest(); box.classList.add('won'); setTimeout(function () { box.classList.remove('won'); }, 1600);
      startB.querySelector('span').textContent = 'Play again'; startB.classList.add('primary');
    }
    function run(line) {
      var raw = line.trim().slice(0, 200).replace(/\s+/g, ' '); if (!raw || !st || st.done) return;
      if (!rate(gRate)) { pr(out, 'Rate limit: too many commands too fast.', 'r'); return; }
      pr(out, 'attacker@' + host() + ':~$ ' + (st.ask ? '********' : raw), 'c');
      var L = LV[lvKey];
      if (st.ask) {
        if (st.ask.re.test(raw)) { var k = st.ask; st.ask = null; st.fail = 0; st.tok[k.gives] = 1; pr(out, k.out, 'ok'); renderTask(); }
        else { st.fail = (st.fail || 0) + 1; pr(out, 'Permission denied, please try again.', 'r'); strike('failed login.'); if (st.fail >= 3) { st.ask = null; st.fail = 0; pr(out, 'Connection closed after 3 failed attempts.', 'm'); } }
        return;
      }
      var name = raw.split(' ')[0].toLowerCase();
      var m = raw.match(/^(?:submit\s+)?(THM\{[^}]*\})$/i);
      if (m) { if (!st.tok.flag) { pr(out, 'You have not found a flag yet. Keep going.', 'r'); return; } if (m[1] === L.flag) win(); else { pr(out, 'Wrong flag. Keep digging.', 'r'); strike('wrong flag.'); } return; }
      if (name === 'target' || name === IP) { pr(out, '"target" is the machine you are attacking (' + IP + '). Use it inside a command, e.g. nmap target', 'y'); return; }
      if (name === 'help') {
        pr(out, 'Target: ' + IP + ' (alias: target). Your IP: 10.10.14.7.', 'y');
        pr(out, lvKey === 'easy' ? 'You do not need to type anything: press Run on the task card.' : 'Tools: nmap, curl, nc, ssh, cat, ls, base64, tr, sudo, hashcat, hint, clear, submit THM{...}', 'a'); return;
      }
      if (name === 'clear') { out.textContent = ''; return; }
      if (name === 'hint') { hintB.click(); return; }
      var hit = null;
      L.acts.some(function (a) { if (!a.re.test(raw)) return false; if (a.has && raw.indexOf(a.has) < 0) return false; if ((a.needs || []).every(function (n) { return st.tok[n]; })) { hit = a; return true; } return false; });
      if (hit) {
        pr(out, hit.out, hit.strike ? 'r' : 'a'); if (hit.gives && !hit.ask) st.tok[hit.gives] = 1; if (hit.ask) st.ask = hit.ask;
        if (hit.strike) strike(hit.strike);
        if (st.tok.flag && !hit.ask && /THM\{/.test(hit.out) && lvKey !== 'easy') pr(out, 'Flag found. Now submit it: submit THM{...}', 'y');
        renderTask(); return;
      }
      var generic = { nmap: 'Host seems down. Did you use the right target? (try: target)', curl: 'curl: (22) The requested URL returned error: 404', nc: 'nc: connection refused', ssh: 'ssh: Permission denied (publickey).', cat: 'cat: no such file here', ls: 'tools  wordlists  loot', base64: 'base64: nothing useful to decode here', tr: 'nothing useful here', hashcat: 'No hashes loaded.', john: 'No password hashes loaded.', sudo: 'sudo: a password is required', echo: raw.replace(/^echo\s*/, ''), pwd: '/home/attacker', whoami: 'attacker', id: 'uid=1000(attacker)' };
      if (generic.hasOwnProperty(name)) { pr(out, generic[name], 'm'); if (/^(nmap|curl|nc|ssh)$/.test(name)) strike('pointless request logged.'); }
      else pr(out, name + ': command not found. Type help.', 'r');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value; inp.value = ''; run(v); });
    startB.addEventListener('click', start); $('#g-start2').addEventListener('click', start);
    hintB.addEventListener('click', function () {
      if (!st || st.done) return; var L = LV[lvKey]; if (!L.hintsOn) return;
      st.hints++; hEl.textContent = String(st.hints);
      if (lvKey === 'easy') { var cur = L.tasks.filter(function (t) { return !st.tok[t.tok]; })[0]; pr(out, 'HINT: ' + (cur ? 'press Run on the task card, or type: ' + cur.cmd : 'you are done'), 'y'); return; }
      var n = Object.keys(st.tok).length, h = L.hints[Math.min(n, L.hints.length - 1)]; pr(out, 'HINT ' + st.hints + ': ' + h + '  [target ' + IP + ', alias "target"]', 'y');
    });
    lvBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.lv === lvKey && !idle) return; lvKey = b.dataset.lv;
        lvBtns.forEach(function (x) { x.classList.toggle('on', x === b); }); setIdle();
      });
    });
    setIdle();
  })();

  /* ---------- arch tribute: fake pacman install + uptime ---------- */
  (function () {
    var out = $('#pm-out'), re = $('#pm-re'), up = $('#nf-up'); if (!out) return;
    var t0 = Date.now(); function upd() { var m = Math.floor((Date.now() - t0) / 60000); up.textContent = m < 1 ? 'less than a min' : m + (m === 1 ? ' min' : ' mins'); } upd(); setInterval(upd, 30000);
    var run = 0;
    function line(cls, txt) { var d = document.createElement('div'); if (cls) d.className = cls; d.textContent = txt; out.appendChild(d); return d; }
    function bar(pct) { var n = Math.round(pct / 100 * 24); return '[' + new Array(n + 1).join('#') + new Array(25 - n).join('-') + '] ' + ('  ' + pct).slice(-3) + '%'; }
    var STEPS = [
      ['c', '$ sudo pacman -S farhan', 260], ['m', 'resolving dependencies...', 260], ['m', 'looking for conflicting packages...', 300], ['', '', 40],
      ['', 'Packages (1) farhan-1.0-1', 140], ['', 'Total Installed Size:  1337.00 MiB', 260], ['a', ':: Proceed with installation? [Y/n] Y', 420],
      ['bar', '(1/1) checking keys in keyring', 0], ['bar', '(1/1) checking package integrity', 0], ['m', '(1/1) loading package files', 160], ['m', '(1/1) checking for file conflicts', 160],
      ['bar', '(1/1) installing farhan', 0], ['a', ':: Running post-transaction hooks...', 240], ['m', '(1/2) Arming the portfolio', 240], ['m', '(2/2) Updating the portfolio index', 360], ['ok', IS_TOUCH ? 'Done. farhan is installed.' : 'Done. farhan is installed. Run "resume" in the terminal (press Enter).', 0]
    ];
    function play() {
      var id = ++run; out.textContent = ''; var i = 0;
      if (!motion) { STEPS.forEach(function (s) { line(s[0] === 'bar' ? '' : s[0], s[0] === 'bar' ? s[1] + ' ' + bar(100) : s[1]); }); return; }
      (function next() {
        if (id !== run || i >= STEPS.length) return; var s = STEPS[i++];
        if (s[0] === 'bar') { var d = line('', s[1] + ' ' + bar(0)), p = 0; (function tick() { if (id !== run) return; p = Math.min(100, p + 14 + Math.random() * 14); d.textContent = s[1] + ' ' + bar(Math.round(p)); if (p < 100) setTimeout(tick, 70); else setTimeout(next, 120); })(); }
        else { line(s[0], s[1]); setTimeout(next, s[2]); }
      })();
    }
    var shown = false, host = out.closest('.pm'), grid = out.closest('.arch-grid') || host;
    function idleView() { out.textContent = ''; line('c', '$ sudo pacman -S farhan'); var c = line('', ''); c.innerHTML = '<span class="cur"></span>'; }
    idleView();
    function trigger() { if (shown) return; shown = true; play(); }
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { trigger(); io.disconnect(); } }, { threshold: 0.05 }); io.observe(grid); } else trigger();
    function inView() { var r = grid.getBoundingClientRect(); return r.top < innerHeight * 0.9 && r.bottom > 0; }
    function onScroll() { if (shown) { window.removeEventListener('scroll', onScroll); return; } if (inView()) trigger(); }
    window.addEventListener('scroll', onScroll, { passive: true }); setTimeout(onScroll, 1500);
    var lastRe = 0; re.addEventListener('click', function () { var n = Date.now(); if (n - lastRe < 600) return; lastRe = n; shown = true; play(); });
  })();

  /* first visit: cache the site. repeat visits: loaded from the device, so the loader finishes as soon as it is ready */
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
