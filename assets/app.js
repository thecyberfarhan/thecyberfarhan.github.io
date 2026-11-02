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
    if (!document.startViewTransition) { applyTheme(next); return; }
    var r = tBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(function () { applyTheme(next); });
    vt.ready.then(function () {
      document.documentElement.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 750, easing: 'cubic-bezier(.65,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
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
  function sizeGlobe() { if (!gl) return; var d = Math.min(window.devicePixelRatio || 1, 1.5); GW = innerWidth; GH = innerHeight; gl.width = GW * d; gl.height = GH * d; gctx.setTransform(d, 0, 0, d, 0, 0); }
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
    for (i = 0; i < pr.length; i++) {
      var q2 = pr[i], dep = (q2.z + 1) / 2;
      if (gp[i].hot) { var pulse = 0.6 + Math.sin(t * 2 + i) * 0.4; gctx.fillStyle = 'rgba(' + P.hot + ',' + (0.35 + dep * 0.55).toFixed(2) + ')'; gctx.beginPath(); gctx.arc(q2.x, q2.y, (2.4 + pulse * 1.2) * q2.s * 1.4, 0, 6.283); gctx.fill(); }
      else { gctx.fillStyle = 'rgba(' + P.node + ',' + (0.2 + dep * 0.6).toFixed(2) + ')'; gctx.beginPath(); gctx.arc(q2.x, q2.y, 1.4 + dep * 1.4, 0, 6.283); gctx.fill(); }
    }
  }
  function gframe() {
    if (!G.running) return;
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
  var minMs = seen ? 1400 : 3200, t0 = performance.now(), loaded = document.readyState === 'complete';
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
  function termDemo() {
    var box = $('.term-body'); if (!box) return;
    var scripts = [
      ['nmap -sC -sV 10.10.10.5', ['22/tcp  open  ssh   OpenSSH 8.2', '80/tcp  open  http  Apache 2.4.41', '[+] 2 services, 1 outdated']],
      ['ffuf -u http://lab/FUZZ -w common.txt', ['admin     [Status: 301]', 'uploads   [Status: 200]', '[+] 2 paths found']],
      ['sqlmap -u "http://lab/item?id=1" --batch', ['[*] testing parameter id', '[+] id is injectable (boolean-based)']],
      ['hashcat -m 0 hash.txt rockyou.txt', ['5f4dcc3b5aa765d61d8327deb882cf99:password', '[+] 1/1 hashes cracked']]
    ], si = 0;
    function line(cls) { var d = document.createElement('div'); d.className = cls; box.appendChild(d); while (box.children.length > 7) box.removeChild(box.firstChild); return d; }
    function typeCmd(txt, done) { var d = line('cmd'), i = 0; (function t() { d.textContent = '$ ' + txt.slice(0, i++); if (i <= txt.length) setTimeout(t, 38); else setTimeout(done, 380); })(); }
    function out(arr, i, done) { if (i >= arr.length) return setTimeout(done, 2200); var d = line(arr[i].charAt(0) === '[' && arr[i].charAt(1) === '+' ? 'ok' : 'out'); d.textContent = arr[i]; setTimeout(function () { out(arr, i + 1, done); }, 420); }
    (function run() { var s = scripts[si++ % scripts.length]; typeCmd(s[0], function () { out(s[1], 0, run); }); })();
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

  var secs = links.map(function (a) { return { a: a, s: document.getElementById(a.dataset.nav) }; });
  var hero = $('#hero'), copy = $('.hero-copy'), medalWrap = $('.hero-medal'), medal = $('.medal-stage');
  var sy = 0, ticking = false, lastY = 0;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight, frac = h > 0 ? y / h : 0;
    sy = y;
    if (bar) bar.style.transform = 'scaleX(' + frac + ')';
    if (prog) prog.style.strokeDashoffset = 119.4 * (1 - frac);
    root.style.setProperty('--scroll', y);
    nav.classList.toggle('scrolled', y > 30);
    if (motion) {
      nav.style.transform = (y > lastY && y > 500 && !pill.classList.contains('open')) ? 'translateY(-90px)' : '';
      var k = Math.min(y / innerHeight, 1.4);
      if (copy) copy.style.transform = 'translate3d(0,' + (y * 0.18) + 'px,0)';
      if (medalWrap) medalWrap.style.transform = 'translate3d(0,' + (y * 0.3) + 'px,0) scale(' + Math.max(1 - k * 0.18, 0.7) + ')';
      if (gl) gl.style.opacity = Math.max(0.85 - k * 0.8, 0); G.show = y < innerHeight * 1.5; if (G.show) startGlobe(); else G.running = false;
      if (medal && !fineMouse) medal.style.setProperty('--my', Math.min(y / 14, 24) + 'deg');
    }
    lastY = y;
    var cur = null;
    secs.forEach(function (o) { if (o.s && o.s.getBoundingClientRect().top < innerHeight * 0.45) cur = o; });
    var nxt = cur ? cur.a : null;
    if (nxt !== active) { active = nxt; links.forEach(function (a) { a.classList.toggle('on', a === active); }); moveInd(active); }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

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
      if (phase === 2 && !midDone) { midDone = true; mid(); }
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
    var y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
    pill.classList.remove('open');
    if (busy) return;
    busy = true;
    runScan(label || id, function () {
      window.scrollTo(0, y); nav.style.transform = '';
      var t = target.querySelector && target.querySelector('.title');
      if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }
    }, function () { busy = false; try { history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id); } catch (e) {} });
  }
  $$('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var id = a.dataset.go, name = id === 'top' ? 'Top' : (a.textContent.trim() || id);
      go(id, name.charAt(0).toUpperCase() + name.slice(1));
    });
  });

  /* ---------- pointer: reticle cursor with target lock, trail and click burst ---------- */
  var dot = $('.cursor-dot'), ring = $('.cursor-ring'), tag = $('.cursor-tag'), lock = $('.cur-lock'), fx = $('#curfx'), fctx = fx && fx.getContext('2d');
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, cursorOn = false, lockEl = null, trail = [], lastMove = 0, L = { x: 0, y: 0, w: 0, h: 0, ready: false };
  function sizeFx() { if (!fx) return; fx.width = innerWidth; fx.height = innerHeight; }
  sizeFx(); window.addEventListener('resize', sizeFx);
  function targetFor(t) { return t.closest && t.closest('a,button,.tilt'); }
  function tagText(a) {
    var l = a.getAttribute('data-cursor');
    if (l === null) l = a.hasAttribute('data-go') ? 'Go' : (a.tagName === 'A' && a.target === '_blank' ? 'Open' : '');
    return l;
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !motion) return;
    fineMouse = true;
    if (!cursorOn) { cursorOn = true; root.classList.add('has-cursor'); rx = e.clientX; ry = e.clientY; }
    mx = e.clientX; my = e.clientY; lastMove = performance.now();
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    trail.push({ x: mx, y: my }); if (trail.length > 26) trail.shift();
  }, { passive: true });
  (function loop(now) {
    rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    tag.style.transform = 'translate3d(' + (rx + 34) + 'px,' + (ry + 28) + 'px,0)';
    if (lockEl) {
      var r = lockEl.getBoundingClientRect(), pad = 9, tx = r.left - pad, ty = r.top - pad, tw = r.width + pad * 2, th = r.height + pad * 2;
      if (!L.ready) { L.x = mx; L.y = my; L.w = 0; L.h = 0; L.ready = true; }
      L.x += (tx - L.x) * 0.24; L.y += (ty - L.y) * 0.24; L.w += (tw - L.w) * 0.24; L.h += (th - L.h) * 0.24;
      lock.style.transform = 'translate3d(' + L.x + 'px,' + L.y + 'px,0)'; lock.style.width = L.w + 'px'; lock.style.height = L.h + 'px';
    }
    if (fctx) {
      fctx.clearRect(0, 0, fx.width, fx.height);
      if (trail.length > 1) {
        if (now - lastMove > 90) trail.shift();
        var P = pal(), n = trail.length;
        for (var i = 1; i < n; i++) {
          var k = i / n; fctx.strokeStyle = 'rgba(' + (k > 0.8 ? P.hot : P.node) + ',' + (k * 0.5).toFixed(3) + ')'; fctx.lineWidth = k * 3; fctx.lineCap = 'round';
          fctx.beginPath(); fctx.moveTo(trail[i - 1].x, trail[i - 1].y); fctx.lineTo(trail[i].x, trail[i].y); fctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  })(performance.now());
  document.addEventListener('pointerover', function (e) {
    var a = targetFor(e.target);
    if (a === lockEl) return;
    lockEl = a; var big = a && (a.offsetWidth > 700 || a.offsetHeight > 520);
    if (a && !big) { L.ready = false; lock.classList.add('on'); } else { lock.classList.remove('on'); if (big) lockEl = null; }
    ring.classList.toggle('hot', !!a && !big); dot.classList.toggle('hot', !!a);
    var tx = a ? tagText(a) : ''; tag.textContent = tx; tag.classList.toggle('on', !!tx);
  });
  document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });

  window.addEventListener('pointerdown', function (e) {
    if (!motion) return; ring.classList.add('down');
    if (lockEl) { lock.classList.remove('hit'); void lock.offsetWidth; lock.classList.add('hit'); }
    var d, i;
    for (i = 0; i < 2; i++) { d = document.createElement('span'); d.className = 'shock'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.animationDelay = i * 110 + 'ms'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); }); }
    d = document.createElement('span'); d.className = 'flash'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.body.appendChild(d); d.addEventListener('animationend', function () { this.remove(); });
    for (i = 0; i < 14; i++) {
      var s = document.createElement('span'), a = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.35, dist = 40 + Math.random() * 62;
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
  function drawBg() {
    if (!bctx || !BW) return;
    bctx.clearRect(0, 0, BW, BH);
    var P = pal(), fade;
    if (!nodes.length) mkNodes(); drawNet(P);
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
  function bgFrame() {
    if (!bgRun) return;
    for (var i = 0; i < shapes.length; i++) { shapes[i].ax += shapes[i].vx + 0.002; shapes[i].ay += shapes[i].vy; }
    drawBg(); requestAnimationFrame(bgFrame);
  }
  function startBg() { if (!bgc || bgRun || document.hidden) return; bgRun = true; requestAnimationFrame(bgFrame); }
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { bmx = e.clientX / innerWidth - 0.5; bmy = e.clientY / innerHeight - 0.5; } }, { passive: true });
  window.addEventListener('resize', function () { sizeBg(); mkNodes(); drawBg(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) bgRun = false; else startBg(); });
  sizeBg(); mkNodes(); drawBg(); startBg();
  window.addEventListener('load', function () { mkShapes(); });
})();
