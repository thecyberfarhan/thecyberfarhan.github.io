(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var motion = true;
  var PAL = { dark: { node: '201,209,217', link: '127,168,204', hot: '180,35,44', wire: '127,168,204', wireHot: '194,104,108' }, light: { node: '31,35,40', link: '63,110,154', hot: '176,74,79', wire: '63,110,154', wireHot: '176,74,79' } };
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
    root.classList.add('no-tr');
    var vt = document.startViewTransition(function () { applyTheme(next); });
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 950, easing: 'cubic-bezier(.65,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('no-tr'); }, function () { root.classList.remove('no-tr'); });
  });

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
    R *= 1 + Math.min(sy / Math.max(innerHeight, 1), 1.4) * 0.22;
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
  buildGlobe(); sizeGlobe(); drawGlobe(); startGlobe();
  window.addEventListener('resize', function () { sizeGlobe(); buildGlobe(); drawGlobe(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) G.running = false; else startGlobe(); });
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { G.mx = e.clientX / innerWidth - 0.5; G.my = e.clientY / innerHeight - 0.5; } }, { passive: true });

  /* ---------- loader: counter drives the globe assembling ---------- */
  var seen = false;
  try { seen = sessionStorage.getItem('seen') === '1'; } catch (e) {}
  var pctEl = $('.ld-pct'), barEl = $('.ld-bar span'), msgEl = $('.ld-msg');
  function growGlobe() {
    var g0 = null, dur = 1700;
    (function step(t) { if (!g0) g0 = t; G.grow = Math.min((t - g0) / dur, 1); if (G.grow < 1) requestAnimationFrame(step); })(performance.now());
  }
  function finishLoader() {
    root.classList.add('loaded'); G.assemble = 1; growGlobe();
    try { sessionStorage.setItem('seen', '1'); } catch (e) {}
    setTimeout(begin, 650);
    setTimeout(function () { root.classList.remove('loading'); root.classList.add('done'); }, 1700);
  }
  var minMs = seen ? 800 : (innerWidth < 760 ? 1500 : 2100), t0 = performance.now(), loaded = document.readyState === 'complete';
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
      }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add('is-in'); countUp(el); }); }
    roleCycle(); termDemo(); hudTick();
  }
  if (!motion) begin();

  function countUp(scope) {
    var list = $$('[data-count]', scope); if (scope.hasAttribute && scope.hasAttribute('data-count')) list.push(scope);
    list.forEach(function (b) {
      if (b.dataset.done) return; b.dataset.done = 1;
      var end = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '', t0 = null, dur = 1400;
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
    (function run() { var s = scripts[si++ % scripts.length]; typeCmd(s[0], function () { out(s[1], 0, run); }); })();
  }
  function termDemo() {
    termLoop($('.termcard .term-body'), [
      ['nmap -sC -sV 10.10.10.5', ['22/tcp  open  ssh   OpenSSH 8.2', '80/tcp  open  http  Apache 2.4.41', '[+] 2 services, 1 outdated']],
      ['ffuf -u http://lab/FUZZ -w common.txt', ['admin     [Status: 301]', 'uploads   [Status: 200]', '[+] 2 paths found']],
      ['sqlmap -u "http://lab/item?id=1" --batch', ['[*] testing parameter id', '[+] id is injectable (boolean-based)']],
      ['hashcat -m 0 hash.txt rockyou.txt', ['5f4dcc3b5aa765d61d8327deb882cf99:password', '[+] 1/1 hashes cracked']]
    ], 7, 2200);
    termLoop($('.cterm-body'), [
      ['./contact.sh --open', ['[+] role: penetration tester', '[+] focus: web and API security', '[+] status: open to conversations']],
      ['cat channels.txt', ['linkedin   in/cyber-farhan-hussain', 'github     @thecyberfarhan', 'tryhackme  farhan.hussain', 'writeups   CTF-Writeups']],
      ['whoami && id', ['farhan', 'uid=1000(farhan) gid=1000(pentester)', '[+] certified: CPENT']],
      ['./say_hi.sh', ['[*] waiting for your message...', '[+] pick a channel on the right']],
      ['ping -c 1 farhan', ['PING farhan: 56 data bytes', '[+] reachable, reply pending your message']]
    ], 8, 2600);
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

  var TITLES = { about: 'About', tools: 'Tools', proof: 'Proof of work', live: 'Live stats', contact: 'Contact' }, appTitle = $('#apptitle'), curTitle = 'Farhan';
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
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight, frac = h > 0 ? y / h : 0;
    sy = y;
    if (bar) bar.style.transform = 'scaleX(' + frac + ')';
    if (prog) prog.style.strokeDashoffset = 119.4 * (1 - frac);
    root.style.setProperty('--scroll', y);
    nav.classList.toggle('scrolled', y > 30);
    nav.style.transform = (performance.now() > navHold && y > lastY && y > 500 && !pill.classList.contains('open')) ? 'translateY(-90px)' : '';
    if (medal && !fineMouse) medal.style.setProperty('--my', Math.min(y / 14, 24) + 'deg');
    G.show = y < innerHeight * 1.5; if (G.show) startGlobe(); else G.running = false;
    lastY = y;
    var cur = null;
    secs.forEach(function (o) { if (o.s && o.s.getBoundingClientRect().top < innerHeight * 0.45) cur = o; });
    var nxt = cur ? cur.a : null;
    if (nxt !== active) { active = nxt; links.forEach(function (a) { a.classList.toggle('on', a === active); }); moveInd(active); $$('.tabbar a').forEach(function (a) { a.classList.toggle('on', !!active && a.dataset.nav === active.dataset.nav); }); setTitle(active ? active.dataset.nav : ''); moveTabInd(); }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  var ssy = 0, plxDone = false;
  (function plx() {
    if (Math.abs(sy - ssy) < 0.05 && plxDone) { requestAnimationFrame(plx); return; }
    ssy += (sy - ssy) * 0.12; plxDone = Math.abs(sy - ssy) < 0.05;
    var h = innerHeight, k = Math.min(ssy / h, 1.4), fade = Math.max(0, 1 - ssy / (h * 0.7)).toFixed(3);
    if (copy) { copy.style.transform = 'translate3d(0,' + (-ssy * 0.14).toFixed(2) + 'px,0)'; copy.style.opacity = fade; }
    if (medalWrap) { medalWrap.style.transform = 'translate3d(0,' + (-ssy * 0.22).toFixed(2) + 'px,0) scale(' + Math.max(1 - k * 0.1, 0.75).toFixed(4) + ')'; medalWrap.style.opacity = fade; }
    if (gl) gl.style.opacity = Math.max(0.85 - k * 0.8, 0).toFixed(3);
    requestAnimationFrame(plx);
  })();

  /* ---------- section transitions: scan sweep ---------- */
  var scan = $('#scan'), sctx = scan && scan.getContext('2d'), busy = false;
  function runScan(label, mid, done) {
    var W = innerWidth, H = innerHeight, CS = 44, cols = Math.ceil(W / CS), rows = Math.ceil(H / CS), cell = [], i, bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0d1117';
    scan.width = W; scan.height = H; scan.classList.add('on');
    for (i = 0; i < cols * rows; i++) cell.push({ j: Math.random(), f: Math.random() });
    var A = 700, HOLD = 120, B = 1000, tStart = performance.now(), midDone = false;
    function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function frame(now) {
      var t = now - tStart, y, phase;
      sctx.clearRect(0, 0, W, H);
      if (t < A) { phase = 1; y = ease(t / A) * (H + 120); }
      else if (t < A + HOLD) { phase = 2; y = H + 120; }
      else { phase = 3; y = ease(Math.min((t - A - HOLD) / B, 1)) * (H + 320); }
      if (t >= A && !midDone) { midDone = true; mid(); }
      for (var r = 0; r < rows; r++) for (var c2 = 0; c2 < cols; c2++) {
        var k = cell[r * cols + c2], cy = r * CS, a;
        if (phase === 1) { if (cy > y) continue; a = Math.min(1, (y - cy) / 90) * (k.f > 0.93 && Math.random() < 0.5 ? 0.35 : 0.97); }
        else if (phase === 2) a = 1;
        else { var rel = y - cy - k.j * 180; a = rel < 0 ? 1 : Math.max(0, 1 - rel / 160); if (a < 0.6 && k.f > 0.85 && Math.random() < 0.3) a = 0.9; }
        if (a <= 0.01) continue;
        sctx.globalAlpha = a; sctx.fillStyle = bg; sctx.fillRect(c2 * CS, cy, CS + 1, CS + 1);
        if (phase !== 2 && k.f > 0.9 && a < 0.95) { sctx.globalAlpha = 0.28; sctx.fillStyle = '#B4232C'; sctx.fillRect(c2 * CS, cy, CS - 2, CS - 2); }
      }
      sctx.globalAlpha = 1;
      if (phase !== 2) {
        var ly = Math.min(y, H);
        var g = sctx.createLinearGradient(0, ly - 70, 0, ly); g.addColorStop(0, 'rgba(180,35,44,0)'); g.addColorStop(1, 'rgba(180,35,44,.32)');
        sctx.fillStyle = g; sctx.fillRect(0, ly - 70, W, 70);
        sctx.fillStyle = '#B4232C'; sctx.shadowColor = '#B4232C'; sctx.shadowBlur = 16; sctx.fillRect(0, ly - 1, W, 2); sctx.shadowBlur = 0;
        sctx.font = '700 12px "JetBrains Mono","Fira Code",ui-monospace,monospace'; sctx.fillStyle = '#E5A0A4'; sctx.fillText('> scan /' + label.toLowerCase() + '  [' + Math.min(99, Math.round(ly / H * 100)) + '%]', 24, Math.max(ly - 14, 22));
      } else {
        sctx.font = '700 clamp(20px,4vw,38px) sans-serif'; sctx.font = '800 36px "Inter","Segoe UI",sans-serif'; sctx.fillStyle = getComputedStyle(root).getPropertyValue('--text').trim(); sctx.textAlign = 'center'; sctx.fillText(label, W / 2, H / 2); sctx.textAlign = 'left';
      }
      if (t < A + HOLD + B + 200) requestAnimationFrame(frame); else { sctx.clearRect(0, 0, W, H); scan.classList.remove('on'); done(); }
    }
    requestAnimationFrame(frame);
  }
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
  /* quick, quiet transition: an eased glide with a thin scanner line crossing the screen */
  function glide(y, done) {
    var y0 = window.scrollY, d = y - y0, dur = Math.min(850, Math.max(420, 300 + Math.abs(d) * 0.15)), t0 = performance.now(), W = innerWidth, H = innerHeight, down = d >= 0;
    var finished = false;
    function finish() { if (finished) return; finished = true; clearTimeout(guard); sctx.clearRect(0, 0, W, H); scan.classList.remove('on'); window.scrollTo(0, y); done(); }
    var guard = setTimeout(finish, dur + 700);
    if (document.hidden) { finish(); return; }
    scan.width = W; scan.height = H; scan.classList.add('on');
    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    (function frame(now) {
      if (finished) return;
      var p = Math.min((now - t0) / dur, 1), e = ease(p);
      window.scrollTo(0, y0 + d * e);
      sctx.clearRect(0, 0, W, H);
      var ly = (down ? e : 1 - e) * H, a = Math.sin(Math.PI * p), dir = down ? -1 : 1;
      var g = sctx.createLinearGradient(0, ly, 0, ly + dir * 90); g.addColorStop(0, 'rgba(180,35,44,' + (0.22 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(180,35,44,0)');
      sctx.fillStyle = g; sctx.fillRect(0, Math.min(ly, ly + dir * 90), W, 90);
      sctx.fillStyle = 'rgba(180,35,44,' + (0.85 * a).toFixed(3) + ')'; sctx.fillRect(0, ly - 1, W, 2);
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
    var d = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (!sOn && Math.abs(d) < 40) return;
    e.preventDefault();
    if (!sOn) { sC = window.scrollY; sT = sC; }
    sT = sClamp(sT + d); sOn = true;
  }, { passive: false });
  (function sLoop() {
    if (sOn) { sC += (sT - sC) * 0.09; if (Math.abs(sT - sC) < 0.4) { sC = sT; sOn = false; } window.scrollTo(0, sC); }
    requestAnimationFrame(sLoop);
  })();
  window.addEventListener('keydown', function () { sOn = false; });

  /* ---------- cursor: reticle, target lock, trail, click burst, idle roamers ---------- */
  var dot = $('.cursor-dot'), ring = $('.cursor-ring'), tag = $('.cursor-tag'), lock = $('.cur-lock'), fx = $('#curfx'), fctx = fx && fx.getContext('2d');
  var corners = $$('.cur-lock i'), CS = 13, QS = new URLSearchParams(location.search), IDLE = +QS.get('idle') || 30000;
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
    if (!cursorOn) { cursorOn = true; root.classList.add('has-cursor'); rx = e.clientX; ry = e.clientY; startCursor(); }
    mx = e.clientX; my = e.clientY; lastMove = performance.now();
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    if (roam) endRoam(); else setLock(targetOf(e.target));
  }, { passive: true });

  /* idle roamers: after 30 seconds of a still mouse the reticle becomes a ship or a mecha */
  function platforms() {
    var out = [];
    $$('.card,.wcard,.chip-tile,.tool-col,.stat,.lc-stat,.ccard,.sky,.termcard,.cterm,.live-card,.title,.pills li,.btn,.tech li').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 70 && r.top > 90 && r.top < innerHeight - 70 && r.right > 40 && r.left < innerWidth - 40) out.push({ el: el, x1: Math.max(r.left + 12, 12), x2: Math.min(r.right - 12, innerWidth - 12), y: r.top });
    });
    return out;
  }
  function startRoam() {
    var kind = QS.get('roam') || (Math.random() < 0.5 ? 'ship' : 'mecha'), pl = kind === 'mecha' ? platforms() : [];
    if (kind === 'mecha' && pl.length < 2) kind = 'ship';
    roam = { kind: kind, x: rx, y: ry, vx: 0, vy: 0, ang: -1.5708, tx: rx, ty: ry, tt: 0, back: false, bt: 0, bx: 0, by: 0, lasers: [], pl: null, state: 'fall', dir: 1, legT: 0, jumpAt: 0, jump: null, lastShot: 0, vyy: 0, squash: 0, trail: [] };
    root.classList.add('roaming'); setLock(null); trail = [];
  }
  function endRoam() { if (roam && !roam.back) { roam.back = true; roam.bt = performance.now(); roam.bx = roam.x; roam.by = roam.y; } }
  function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
  function drawShip(ctx, r, P, dt, now) {
    if (now > r.tt) { r.tx = 80 + Math.random() * (innerWidth - 160); r.ty = 110 + Math.random() * (innerHeight - 220); r.tt = now + 1500 + Math.random() * 1800; }
    var dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(320, d * 1.7), f = Math.min(1, dt * 0.0035);
    r.vx += (dx / d * sp - r.vx) * f; r.vy += (dy / d * sp - r.vy) * f; r.x += r.vx * dt / 1000; r.y += r.vy * dt / 1000;
    if (Math.hypot(r.vx, r.vy) > 25) r.ang += angDiff(r.ang, Math.atan2(r.vy, r.vx)) * Math.min(1, dt * 0.01);
    r.trail.push({ x: r.x, y: r.y }); if (r.trail.length > 28) r.trail.shift();
    if (now - r.lastShot > 2300) { r.lastShot = now; r.lasers.push({ x: r.x + Math.cos(r.ang) * 16, y: r.y + Math.sin(r.ang) * 16, a: r.ang, l: 1 }); }
    drawTrailPts(ctx, r.trail, P);
    r.lasers = r.lasers.filter(function (L2) { L2.l -= dt / 500; if (L2.l <= 0) return false; L2.x += Math.cos(L2.a) * dt * 0.9; L2.y += Math.sin(L2.a) * dt * 0.9; ctx.strokeStyle = 'rgba(' + P.hot + ',' + L2.l.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L2.x, L2.y); ctx.lineTo(L2.x - Math.cos(L2.a) * 22, L2.y - Math.sin(L2.a) * 22); ctx.stroke(); return true; });
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.ang); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(' + P.node + ',.95)'; ctx.fillStyle = 'rgba(' + P.link + ',.18)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-5, 0); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-5, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(' + P.hot + ',.95)'; ctx.beginPath(); ctx.arc(4, 0, 2.4, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(' + P.hot + ',.95)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-14 - Math.random() * 9, 0); ctx.stroke();
    ctx.restore();
  }
  function drawTrailPts(ctx, pts, P) { if (pts.length < 3) return; for (var i = 1; i < pts.length; i++) { var q = i / pts.length; ctx.strokeStyle = 'rgba(' + P.link + ',' + (q * 0.4).toFixed(3) + ')'; ctx.lineWidth = q * 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); } }
  function drawMecha(ctx, r, P, dt, now) {
    if (!(pc++ % 8)) pcache = platforms();
    var st = r.state, g = 1800, i, best, pl;
    function nearestBelow(x, y) { best = null; pcache.forEach(function (p) { if (x > p.x1 - 20 && x < p.x2 + 20 && p.y >= y - 6 && (!best || p.y < best.y)) best = p; }); return best; }
    if (st === 'fall') {
      r.vyy += g * dt / 1000; r.y += r.vyy * dt / 1000;
      pl = nearestBelow(r.x, r.y - r.vyy * dt / 1000);
      if (pl && r.y >= pl.y) { r.pl = pl; r.y = pl.y; r.vyy = 0; r.state = 'walk'; r.squash = 1; r.jumpAt = now + 1800 + Math.random() * 1800; r.x = Math.max(pl.x1, Math.min(pl.x2, r.x)); }
      else if (r.y > innerHeight + 60) { r.kind = 'ship'; r.vx = 0; r.vy = 0; r.y = innerHeight - 100; return; }
    } else if (st === 'walk') {
      var rc = r.pl.el.getBoundingClientRect();
      if (rc.top < 90 || rc.top > innerHeight - 60 || rc.width < 60) { r.state = 'fall'; r.vyy = 0; r.pl = null; }
      else {
        var x1 = Math.max(rc.left + 12, 12), x2 = Math.min(rc.right - 12, innerWidth - 12); r.y = rc.top; r.pl.x1 = x1; r.pl.x2 = x2; r.pl.y = rc.top;
        r.x += r.dir * 58 * dt / 1000; r.legT += dt * 0.011;
        if (r.x <= x1) { r.x = x1; r.dir = 1; } if (r.x >= x2) { r.x = x2; r.dir = -1; }
        if (now > r.jumpAt) {
          var opts = pcache.filter(function (p) { return p.el !== r.pl.el && Math.abs((p.x1 + p.x2) / 2 - r.x) < 460 && Math.abs(p.y - r.y) < 320; });
          if (opts.length) { var tp = opts[Math.floor(Math.random() * opts.length)], tx = tp.x1 + Math.random() * Math.max(1, tp.x2 - tp.x1); r.jump = { x0: r.x, y0: r.y, x1: tx, y1: tp.y, t: 0, dur: 620 + Math.hypot(tx - r.x, tp.y - r.y) * 0.9, pl: tp }; r.state = 'jump'; r.dir = tx > r.x ? 1 : -1; }
          else r.jumpAt = now + 2000;
        }
      }
    } else if (st === 'jump') {
      var J = r.jump; J.t += dt; var p = Math.min(J.t / J.dur, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      r.x = J.x0 + (J.x1 - J.x0) * p; r.y = J.y0 + (J.y1 - J.y0) * e - Math.sin(Math.PI * p) * (54 + Math.abs(J.y1 - J.y0) * 0.25);
      if (p >= 1) { r.pl = J.pl; r.state = 'walk'; r.squash = 1; r.jumpAt = now + 2200 + Math.random() * 2600; r.y = J.y1; }
    }
    r.squash = Math.max(0, r.squash - dt / 260);
    var x = r.x, y = r.y, s = 1.12, ph = r.legT, dir = r.dir, air = r.state !== 'walk', sq = 1 - r.squash * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s * sq); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.9;
    ctx.strokeStyle = 'rgba(' + P.node + ',.95)';
    [-1, 1].forEach(function (side) {
      var pp = ph + (side > 0 ? Math.PI : 0), fx2 = air ? side * 4 : Math.sin(pp) * 9 + side * 3, lift = air ? 11 : Math.max(0, Math.cos(pp)) * 5;
      ctx.beginPath(); ctx.moveTo(side * 4, -20); ctx.lineTo(side * 4 + (air ? 3 : Math.sin(pp) * 4 + 3), -11 - lift * 0.5); ctx.lineTo(fx2, -lift); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx2 - 3, -lift); ctx.lineTo(fx2 + 4, -lift); ctx.stroke();
      var hx = air ? side * 12 + 4 : Math.sin(pp + Math.PI) * 7 + side * 9;
      ctx.beginPath(); ctx.moveTo(side * 9, -38); ctx.lineTo(hx, air ? -46 : -26); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(' + P.link + ',.2)'; ctx.beginPath(); ctx.rect(-8, -42, 16, 21); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-6, -56, 12, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(3, -63); ctx.stroke();
    ctx.fillStyle = 'rgba(' + P.hot + ',.95)'; ctx.fillRect(1, -53, 4, 2.4); ctx.fillRect(-3, -37, 6, 5); ctx.beginPath(); ctx.arc(3, -64, 1.8, 0, 6.283); ctx.fill();
    if (r.state === 'jump') { ctx.strokeStyle = 'rgba(' + P.hot + ',.9)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-4, -2 + Math.random() * 8); ctx.moveTo(4, -10); ctx.lineTo(4, -2 + Math.random() * 8); ctx.stroke(); }
    ctx.restore();
  }
  function drawRoam(ctx, P, dt, now) {
    var r = roam;
    if (r.back) {
      var p = Math.min((now - r.bt) / 380, 1), e = 1 - Math.pow(1 - p, 3); r.x = r.bx + (mx - r.bx) * e; r.y = r.by + (my - r.by) * e;
      ctx.save(); ctx.translate(r.x, r.y); ctx.scale(1 - e * 0.85, 1 - e * 0.85); ctx.globalAlpha = 1 - e; ctx.strokeStyle = 'rgba(' + P.node + ',.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.283); ctx.stroke(); ctx.restore();
      if (p >= 1) { roam = null; root.classList.remove('roaming'); rx = mx; ry = my; ringPop(); }
      return;
    }
    if (r.kind === 'ship') drawShip(ctx, r, P, dt, now); else drawMecha(ctx, r, P, dt, now);
  }

  var lastF = performance.now(), lastTx = 0, lastTy = 0;
  var curStarted = false, fxDirty = false;
  function startCursor() { if (curStarted) return; curStarted = true; lastF = performance.now(); requestAnimationFrame(loop); }
  function loop(now) {
    var dt = Math.min(now - lastF, 50); lastF = now;
    var k = 1 - Math.pow(1 - 0.18, dt / 16.667), k2 = 1 - Math.pow(1 - 0.3, dt / 16.667);
    rx += (mx - rx) * k; ry += (my - ry) * k;
    var p0 = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
    ring.style.transform = p0;
    tag.style.transform = 'translate3d(' + (rx + 34).toFixed(2) + 'px,' + (ry + 28).toFixed(2) + 'px,0)';
    if (cursorOn && !roam && (fr++ % 5 === 0)) setLock(targetOf(document.elementFromPoint(mx, my)));
    var spinA = 0; if (!spinAnim) { var sv = ring.querySelector('svg'); spinAnim = sv && sv.getAnimations && sv.getAnimations()[0]; }
    if (spinAnim && spinAnim.currentTime != null) spinA = (spinAnim.currentTime % 10000) / 10000 * 6.2832;
    var ang = [-1.5708, 0, 1.5708, 3.1416], tp = [], q;
    for (q = 0; q < 4; q++) tp.push([rx + Math.cos(ang[q] + spinA) * 24 - CS / 2, ry + Math.sin(ang[q] + spinA) * 24 - CS / 2]);
    var tg;
    if (lockEl) { var r = lockEl.getBoundingClientRect(), pad = 9, l0 = r.left - pad, t0 = r.top - pad, r0 = r.right + pad - CS, b0 = r.bottom + pad - CS; tg = [[l0, t0], [r0, t0], [l0, b0], [r0, b0]]; }
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
    if (roam) { endRoam(); }
    ring.classList.add('down');
    if (lockEl) { lock.classList.remove('hit'); void lock.offsetWidth; lock.classList.add('hit'); }
    var d, i;
    for (i = 0; i < 2; i++) { d = document.createElement('span'); d.className = 'shock'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.animationDelay = i * 110 + 'ms'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); }); }
    d = document.createElement('span'); d.className = 'flash'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); });
    var NS = e.pointerType === 'touch' ? 8 : 14;
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
    var kinds = ['cube', 'ico', 'octa', 'cube', 'ico', 'octa', 'cube', 'ico'], n = innerWidth < 820 ? 4 : 8, docH = Math.max(document.documentElement.scrollHeight, innerHeight * 4);
    shapes = [];
    for (var i = 0; i < n; i++) {
      shapes.push({ g: GEO[kinds[i % kinds.length]], x: (i % 2 ? 0.9 : 0.08) + (Math.random() - 0.5) * 0.05, doc: (i + 0.6) / n * docH * 0.92 + 120, s: 34 + Math.random() * 42, depth: 0.25 + Math.random() * 0.5,
        ax: Math.random() * 6, ay: Math.random() * 6, vx: (Math.random() - 0.5) * 0.012, vy: 0.004 + Math.random() * 0.01, hot: i % 4 === 1 });
    }
  }
  function sizeBg() { if (!bgc) return; var d = Math.min(window.devicePixelRatio || 1, 1.5); BW = innerWidth; BH = innerHeight; bgc.width = BW * d; bgc.height = BH * d; bctx.setTransform(d, 0, 0, d, 0, 0); mkShapes(); }
  var nodes = [];
  function mkNodes() {
    var n = innerWidth < 820 ? 34 : 70; nodes = [];
    for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * BW, y: Math.random() * BH, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, z: 0.3 + Math.random() * 0.7, hot: i % 13 === 0 });
  }
  var pkts = [], pulses = [], nextPkt = 0, nextPulse = 0;
  function drawNet(P) {
    var i, j, a, b, dx, dy, d, mxp = (bmx + 0.5) * BW, myp = (bmy + 0.5) * BH;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i]; a.x += a.vx; a.y += a.vy;
      if (a.x < -20) a.x = BW + 20; else if (a.x > BW + 20) a.x = -20; if (a.y < -20) a.y = BH + 20; else if (a.y > BH + 20) a.y = -20;
    }
    bctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      var ay = a.y - ((sy * 0.08 * a.z) % (BH + 40));
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j]; dx = a.x - b.x; dy = (a.y - b.y); d = dx * dx + dy * dy;
        if (d < 14400) { bctx.strokeStyle = 'rgba(' + P.link + ',' + ((1 - d / 14400) * 0.16 * Math.min(a.z, b.z)).toFixed(3) + ')'; bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(b.x, b.y); bctx.stroke(); }
      }
      dx = a.x - mxp; dy = a.y - myp; d = dx * dx + dy * dy;
      if (d < 22500) { bctx.strokeStyle = 'rgba(' + P.hot + ',' + ((1 - d / 22500) * 0.35).toFixed(3) + ')'; bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(mxp, myp); bctx.stroke(); }
      bctx.fillStyle = a.hot ? 'rgba(' + P.hot + ',' + (0.35 * a.z).toFixed(2) + ')' : 'rgba(' + P.node + ',' + (0.22 * a.z).toFixed(2) + ')';
      bctx.beginPath(); bctx.arc(a.x, a.y, a.hot ? 2.4 : 1.4 * a.z + 0.4, 0, 6.283); bctx.fill();
    }
  }
  var SNIP = ['0x41414141', 'root@kali:~#', 'nmap -sV -p-', 'SELECT * FROM users', 'CVE-2021-44228', 'HTTP/1.1 200 OK', 'sudo -l', 'id=1 OR 1=1', 'whoami', 'uid=0(root)', '/etc/shadow', '$ ssh user@lab', 'GET /admin 302', 'base64 -d', 'chmod +s /bin/bash', 'nc -lvnp 4444', 'XSS <script>', '0xdeadbeef', 'flag{...}', 'hashcat -m 0'], flo = [];
  function mkFlo() { flo = []; var n = innerWidth < 820 ? 8 : 16; for (var i = 0; i < n; i++) flo.push({ t: SNIP[i % SNIP.length], x: Math.random(), y: Math.random() * 1.4, v: 0.08 + Math.random() * 0.16, z: 0.3 + Math.random() * 0.7 }); }
  function drawFlo(P) {
    if (!flo.length) mkFlo();
    bctx.font = '11px "JetBrains Mono","Fira Code",ui-monospace,monospace'; bctx.textBaseline = 'middle';
    for (var i = 0; i < flo.length; i++) {
      var f = flo[i]; f.y -= f.v * 0.0006 * 16; if (f.y < -0.1) { f.y = 1.1; f.x = Math.random(); }
      var yy = f.y * BH - (sy * 0.05 * f.z) % BH, a = Math.min(1, Math.min(f.y + 0.1, 1.1 - f.y) * 6) * 0.2 * f.z;
      bctx.fillStyle = 'rgba(' + P.node + ',' + a.toFixed(3) + ')'; bctx.fillText(f.t, f.x * (BW - 160) + 20 + bmx * 20 * f.z, yy);
    }
  }
  function drawLive(P) {
    var now = performance.now(), i, a, b;
    if (now > nextPkt && nodes.length > 4) {
      nextPkt = now + 450 + Math.random() * 500;
      for (var tries = 0; tries < 12; tries++) { a = nodes[Math.floor(Math.random() * nodes.length)]; b = nodes[Math.floor(Math.random() * nodes.length)]; var dx = a.x - b.x, dy = a.y - b.y; if (a !== b && dx * dx + dy * dy < 14400) { pkts.push({ a: a, b: b, t: 0, s: 0.008 + Math.random() * 0.01, hot: Math.random() < 0.3 }); break; } }
    }
    for (i = pkts.length - 1; i >= 0; i--) {
      var p = pkts[i]; p.t += p.s; if (p.t >= 1) { pkts.splice(i, 1); continue; }
      var x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t, col = p.hot ? P.hot : P.link;
      bctx.fillStyle = 'rgba(' + col + ',.16)'; bctx.beginPath(); bctx.arc(x, y, 6, 0, 6.283); bctx.fill();
      bctx.fillStyle = 'rgba(' + col + ',.9)'; bctx.beginPath(); bctx.arc(x, y, 2.2, 0, 6.283); bctx.fill();
    }
    if (now > nextPulse) { nextPulse = now + 4200 + Math.random() * 3000; pulses.push({ x: Math.random() * BW, y: Math.random() * BH, r: 0, hot: Math.random() < 0.4 }); }
    for (i = pulses.length - 1; i >= 0; i--) {
      var q = pulses[i]; q.r += 1.6; if (q.r > 320) { pulses.splice(i, 1); continue; }
      bctx.strokeStyle = 'rgba(' + (q.hot ? P.hot : P.link) + ',' + (0.22 * (1 - q.r / 320)).toFixed(3) + ')'; bctx.lineWidth = 1.2; bctx.beginPath(); bctx.arc(q.x, q.y, q.r, 0, 6.283); bctx.stroke();
      bctx.beginPath(); bctx.arc(q.x, q.y, q.r * 0.6, 0, 6.283); bctx.stroke();
    }
  }
  function drawBg() {
    if (!bctx || !BW) return;
    bctx.clearRect(0, 0, BW, BH);
    var P = pal(), fade;
    if (!nodes.length) mkNodes(); drawNet(P); drawLive(P); drawFlo(P);
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
    drawBg(); requestAnimationFrame(bgFrame);
  }
  function startBg() { if (!bgc || bgRun || document.hidden) return; bgRun = true; requestAnimationFrame(bgFrame); }
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { bmx = e.clientX / innerWidth - 0.5; bmy = e.clientY / innerHeight - 0.5; } }, { passive: true });
  window.addEventListener('resize', function () { sizeBg(); mkNodes(); drawBg(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) bgRun = false; else startBg(); });
  sizeBg(); mkNodes(); drawBg(); startBg();
  window.addEventListener('load', function () { mkShapes(); });

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
    hero: [['$ whoami', 'A person waiting for you to scroll. Take your time.'], ['CPENT', 'Certified in penetration testing. Currently pen-testing your patience.'], ['Terminal', 'That lab session keeps running whether you read it or not.']],
    about: [['About', 'Three cards. Each one is readable, and none of them bite.'], ['About', 'Fun fact: reading is not a vulnerability. You may proceed.']],
    proof: [['Writeups', 'I wrote 37 of these so you could stare at one. Make it count.'], ['Mr Robot CTF', 'I cut a wordlist from 858,160 entries to 11,451. You can cut this staring.'], ['Cap', 'Even the IDOR in this box was less forgotten than this tab.'], ['Archetype', 'Credentials in plaintext history are a finding. Your idle tab is a pattern.'], ['Watcher', 'Six hops from www-data to root. You are one scroll from the next section.']],
    sky: [['Contributions', 'I am 72 contributions tall. Staring at me will not make it 73.'], ['Skyline', 'The tallest bar is 10 commits. Your attention span is shorter than that.']],
    live: [['TryHackMe', 'These numbers update live. You, on the other hand, do not.'], ['TryHackMe', 'Rank, rooms, writeups. All moving. Unlike you.']],
    contact: [['LinkedIn', 'It is a button. Pressing it is free and surprisingly painless.'], ['GitHub', 'git push your courage.'], ['Contact', 'I do not bite, and I do not spam. Probably. Say hi.']],
    tools: [['Tools', 'Eleven seconds is a long time to stare at a toolbox.']]
  };
  var MORE = ['Seriously, are you still there?', 'I can do this all day. Can you?', 'Okay, I am going to assume you went for coffee.', 'Last one, I promise. Scroll, click, anything.'];
  var LEADS = {
    hero: ['Curious who is behind the terminal? Start with the About section.', 'This whole page is one portfolio. Want the tour?'],
    about: ['Liked the intro? The tools section shows how it gets done.', 'Three cards down, a whole toolbox to go.'],
    tools: ['Tools are only half the story. The writeups show them in action.', 'Plenty of tools here. Want to see them used?'],
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
    sky: ['Fact', 'The best single day of the last year had 10 contributions.', 'Live stats', 'live'],
    live: ['Fact', 'TryHackMe puts this profile in the top 3 percent, with 100+ rooms completed.', 'Open TryHackMe', 'https://tryhackme.com/p/farhan.hussain'],
    contact: ['Fact', 'The terminal on the left cycles through five commands, then starts over.', 'See the writeups', 'proof']
  };
  var ASKS = {
    hero: ['Question', 'Short on time? Pick one and I will take you there.', [['Tools', 'tools'], ['Writeups', 'proof'], ['Contact', 'contact']]],
    about: ['Question', 'Want the toolbox first, or the proof?', [['Toolbox', 'tools'], ['Proof', 'proof']]],
    tools: ['Question', 'Looking for something specific?', [['Writeups', 'proof'], ['TryHackMe', 'live'], ['Contact', 'contact']]],
    proof: ['Question', 'Read one, or hear from the author directly?', [['All writeups', 'https://github.com/thecyberfarhan/CTF-Writeups'], ['Contact', 'contact']]],
    sky: ['Question', 'Curious about the bigger picture?', [['Live stats', 'live'], ['Writeups', 'proof']]],
    live: ['Question', 'Want to see the work behind these numbers?', [['Writeups', 'proof'], ['GitHub', 'https://github.com/thecyberfarhan']]],
    contact: ['Question', 'Which door do you want to knock on?', [['LinkedIn', 'https://www.linkedin.com/in/cyber-farhan-hussain/'], ['GitHub', 'https://github.com/thecyberfarhan']]]
  };
  var MORE2 = ['Seriously, are you still there?', 'I can do this all day. Can you?', 'Okay, I will assume you went for coffee. Come back when you are ready.'];
  function actionsFor(sec, el) {
    var G = function (id, label) { return { label: label, id: id }; }, U = function (url, label) { return { label: label, url: url }; };
    if (sec === 'hero') return [G('about', 'About me'), G('tools', 'See my tools')];
    if (sec === 'about') return [G('tools', 'See my tools'), G('proof', 'Read my writeups')];
    if (sec === 'tools') return [G('proof', 'Read my writeups'), G('live', 'Live stats')];
    if (sec === 'proof') { var h = el && el.tagName === 'A' ? el.href : null; return h ? [U(h, 'Open this writeup'), G('contact', 'Contact me')] : [U('https://github.com/thecyberfarhan/CTF-Writeups', 'All writeups'), G('contact', 'Contact me')]; }
    if (sec === 'sky') return [G('live', 'Live stats'), G('contact', 'Contact me')];
    if (sec === 'live') return [U('https://tryhackme.com/p/farhan.hussain', 'Open TryHackMe'), G('contact', 'Contact me')];
    if (sec === 'contact') { var c = el && el.tagName === 'A' ? el.href : null; return c ? [U(c, 'Open this'), G('proof', 'Read my writeups')] : [U('https://www.linkedin.com/in/cyber-farhan-hussain/', 'Open LinkedIn'), G('proof', 'Read my writeups')]; }
    return [G('contact', 'Contact me')];
  }
  var THEMES = ['steel', 'amber', 'violet', 'ink', 'ember'], ANIMS = ['pop', 'flip', 'drop', 'glitch', 'slide'];
  var nEl = document.createElement('div'); nEl.className = 'nudge'; nEl.setAttribute('role', 'status');
  nEl.innerHTML = '<div class="nrow"><span class="tile"></span><div><b></b><p></p></div></div><small></small><div class="nbtns"></div><button type="button" class="x" aria-label="Dismiss">&times;</button><button type="button" class="snd" aria-label="Toggle sound"></button><i class="tail"></i>';
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
  var VOL = { on: '<svg viewBox="0 0 24 24"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>', off: '<svg viewBox="0 0 24 24"><path d="M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z"/><path d="m16.5 14.5 5-5"/><path d="m16.5 9.5 5 5"/></svg>' };
  var IS_TOUCH = matchMedia('(pointer: coarse)').matches, soundOn = !IS_TOUCH; try { var ss = localStorage.getItem('nudgesound'); if (ss) soundOn = ss === 'on'; } catch (e) {}
  var sndBtn = $('.snd', nEl); function paintSnd() { sndBtn.innerHTML = soundOn ? VOL.on : VOL.off; }
  paintSnd(); sndBtn.addEventListener('click', function () { soundOn = !soundOn; try { localStorage.setItem('nudgesound', soundOn ? 'on' : 'off'); } catch (e) {} paintSnd(); if (soundOn) ping(); });
  var actx = null;
  function unlockAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); }
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, unlockAudio, { passive: true }); });
  function ping(theme) {
    if (!soundOn || !actx || actx.state !== 'running') return;
    var t = actx.currentTime, set = theme === 'ink' ? [[880, 0], [880, 0.09]] : theme === 'ember' ? [[440, 0], [330, 0.12]] : theme === 'amber' ? [[523, 0], [659, 0.1], [784, 0.2]] : [[660, 0], [990, 0.1]];
    set.forEach(function (n) {
      var o = actx.createOscillator(), g = actx.createGain(); o.type = theme === 'ink' ? 'square' : 'sine'; o.frequency.setValueAtTime(n[0], t + n[1]);
      g.gain.setValueAtTime(0.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(theme === 'ink' ? 0.03 : 0.06, t + n[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.28);
      o.connect(g); g.connect(actx.destination); o.start(t + n[1]); o.stop(t + n[1] + 0.3);
    });
  }
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
    var cur = 'hero', ids = ['hero', 'about', 'tools', 'proof', 'live', 'contact'];
    ids.forEach(function (id) { var s = document.getElementById(id); if (s && s.getBoundingClientRect().top < innerHeight * 0.5) cur = id; });
    return cur;
  }
  function nameOf(el) { var b = el.querySelector('b'), h = el.querySelector('h3'), l = el.querySelector('.tl'); return (b && b.textContent) || (h && h.textContent) || (l && l.textContent) || el.getAttribute('data-nudge') || ''; }
  function pickSpeaker(sec) {
    var sel = sec === 'tools' ? '.chip-tile, .tool-col li' : sec === 'proof' ? '.wcard, .stat' : sec === 'about' ? '.card' : sec === 'sky' ? '.sky' : sec === 'live' ? '.lc-stat, .live-card' : sec === 'contact' ? '.ccard, .cterm' : sec === 'hero' ? '.medal-stage, .termcard' : '';
    if (!sel) return null; var list = $$(sel).filter(inView); return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  function place() {
    if (!anchor) return;
    var r = anchor.getBoundingClientRect();
    if (r.bottom < 50 || r.top > innerHeight - 30) { hideNudge(); return; }
    var w = nEl.offsetWidth, h = nEl.offsetHeight, cx = r.left + r.width / 2, x = Math.max(12, Math.min(cx - w / 2, innerWidth - w - 12)), below = r.top - h - 16 < 76, y = below ? r.bottom + 16 : r.top - h - 16;
    y = Math.max(76, Math.min(y, innerHeight - h - (innerWidth <= 820 ? 88 : 12)));
    nEl.classList.toggle('below', below);
    nEl.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    nEl.style.setProperty('--tx', Math.max(24, Math.min(cx - x, w - 24)).toFixed(1) + 'px');
  }
  (function nloop() { if (anchor) place(); requestAnimationFrame(nloop); })();
  function other(list, last) { var pool = list.filter(function (x) { return x !== last; }); return pool[Math.floor(Math.random() * pool.length)]; }
  function pickKind() {
    var r = Math.random(), k = r < 0.4 ? 'sarcasm' : r < 0.6 ? 'tip' : r < 0.82 ? 'fact' : 'ask';
    if (k === lastKind) k = other(['sarcasm', 'tip', 'fact', 'ask'], lastKind);
    return k;
  }
  function showNudge() {
    var sec = sectionNow(), el = pickSpeaker(sec), name = '', msg = '', lead = '', acts = [], kind = nCount >= 3 ? 'final' : pickKind();
    if (kind === 'sarcasm') {
      name = el ? nameOf(el) : '';
      if (TOOLQ[name]) msg = TOOLQ[name];
      else if (el && sec === 'proof' && name) { var one = SECQ.proof.filter(function (p) { return p[0] === name; })[0]; msg = one ? one[1] : 'Read me or keep staring. Both are valid, only one is useful.'; }
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
    } else { name = 'Website'; msg = MORE2[Math.min(nCount - 3, MORE2.length - 1)]; el = null; acts = [{ label: 'Contact me', id: 'contact' }, { label: 'Back to top', id: 'top' }]; }
    if (msg === lastPick) return;
    lastPick = msg; lastKind = kind;
    var theme = other(THEMES, lastTheme), anim = other(ANIMS, lastAnim); lastTheme = theme; lastAnim = anim;
    var src = el && el.querySelector('svg.ic'); nTile.innerHTML = src ? src.outerHTML : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    nName.textContent = name; nMsg.textContent = msg; nLead.textContent = lead; nLead.style.display = lead ? '' : 'none';
    nBtns.innerHTML = ''; acts.forEach(function (a2) { var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = a2.label; if (a2.url) bt.setAttribute('data-url', a2.url); else if (a2.id) bt.setAttribute('data-id', a2.id); else bt.setAttribute('data-close', '1'); nBtns.appendChild(bt); });
    if (spoke) spoke.classList.remove('speak'); spoke = el; if (el) { el.classList.remove('speak'); void el.offsetWidth; el.classList.add('speak'); }
    anchor = el; nEl.className = 'nudge t-' + theme + ' a-' + anim + (el ? '' : ' free'); void nEl.offsetWidth;
    if (!el) nEl.style.transform = 'translate3d(' + Math.round(innerWidth / 2 - 160) + 'px,' + (innerHeight - 260) + 'px,0)';
    place(); nEl.classList.add('on'); hiding = false;
    if (el && nEl.animate) { var kind = anim === 'drop' ? 'drop' : anim; nEl.animate(frames(el, kind, 'in'), { duration: kind === 'glitch' ? 460 : 620, easing: kind === 'glitch' ? 'steps(7,end)' : 'cubic-bezier(.2,.9,.25,1)' }); }
    lastN = performance.now(); nCount++;
    clearTimeout(hideT); if (!hovering) hideT = setTimeout(hideNudge, 14000);
    ping(theme); if (navigator.vibrate && IS_TOUCH) navigator.vibrate([14, 40, 14]);
  }
  nBtns.addEventListener('click', function (e) { var bt = e.target.closest && e.target.closest('button'); if (bt && bt.hasAttribute('data-close')) hideNudge(); });
  setInterval(function () {
    if (document.hidden || !root.classList.contains('done') || !motion) return;
    var now = performance.now(), idle = now - lastAct, gap = Math.min(55000 + nCount * 30000, 150000);
    if (idle > 35000 && now - lastN > gap && nCount < 5) showNudge();
  }, 1000);

  /* ---------- phone-only: share, tilt with the phone, touch roamers, haptic taps ---------- */
  var toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('on'); }, 2200); }
  var shareBtn = $('#share'), sheet = $('#sheet'), sheetBg = $('#sheetbg'), shareData = { title: document.title, text: 'Farhan, CPENT-certified penetration tester. Tools, writeups and contact.', url: location.origin + location.pathname };
  function openSheet() { if (!sheet) return; var nat = $('.sh-native', sheet); if (nat) nat.style.display = navigator.share ? '' : 'none'; sheet.style.transform = ''; sheet.setAttribute('aria-hidden', 'false'); root.classList.add('sheet-open'); }
  function closeSheet() { if (!sheet) return; root.classList.remove('sheet-open'); sheet.setAttribute('aria-hidden', 'true'); sheet.style.transform = ''; sheet.classList.remove('drag'); }
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

  if (IS_TOUCH && window.DeviceOrientationEvent) {
    var tiltOn = false, gx = 0, gy = 0;
    function onTilt(e) {
      if (e.gamma == null) return;
      var g = Math.max(-25, Math.min(25, e.gamma)) / 25, b = Math.max(-25, Math.min(25, (e.beta || 0) - 45)) / 25;
      if (medal) { medal.style.setProperty('--my', (g * 14).toFixed(1) + 'deg'); medal.style.setProperty('--mx', (-b * 10).toFixed(1) + 'deg'); }
      G.mx = g * 0.5; G.my = b * 0.5;
    }
    function enableTilt() { if (tiltOn) return; tiltOn = true; window.addEventListener('deviceorientation', onTilt, { passive: true }); }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('pointerdown', function ask() { window.removeEventListener('pointerdown', ask); DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') enableTilt(); }).catch(function () {}); }, { once: true });
    } else enableTilt();
  }

  /* with no mouse, the roamers start after 30 seconds without a touch or scroll */
  if (IS_TOUCH) {
    var tAct = performance.now(), tLoop = false;
    function touched(e) { tAct = performance.now(); if (e && e.touches && e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; } if (roam) endRoam(); }
    ['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach(function (ev) { window.addEventListener(ev, touched, { passive: true }); });
    window.addEventListener('scroll', function () { tAct = performance.now(); if (roam) endRoam(); }, { passive: true });
    function roamLoop(now) {
      if (!roam) { fctx.clearRect(0, 0, fx.width, fx.height); tLoop = false; return; }
      var dt = Math.min(now - lastF, 50); lastF = now; fctx.clearRect(0, 0, fx.width, fx.height); drawRoam(fctx, pal(), dt, now); requestAnimationFrame(roamLoop);
    }
    setInterval(function () {
      if (roam || tLoop || document.hidden || !root.classList.contains('done') || performance.now() - tAct < IDLE) return;
      rx = innerWidth / 2; ry = innerHeight * 0.42; if (!mx || !my) { mx = rx; my = ry; }
      startRoam(); tLoop = true; lastF = performance.now(); requestAnimationFrame(roamLoop);
    }, 2000);
  }
})();
