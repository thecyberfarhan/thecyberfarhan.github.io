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

  /* ---------- loader ---------- */
  var seen = false;
  try { seen = sessionStorage.getItem('seen') === '1'; } catch (e) {}
  var pctEl = $('.ld-pct'), barEl = $('.ld-bar span');
  function finishLoader() {
    root.classList.add('loaded');
    try { sessionStorage.setItem('seen', '1'); } catch (e) {}
    setTimeout(function () { root.classList.remove('loading'); root.classList.add('done'); begin(); }, 1100);
  }
  if (!motion) { root.classList.remove('loading'); root.classList.add('done'); }
  else {
    var minMs = seen ? 900 : 2600, t0 = performance.now(), loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    (function tick(now) {
      var p = Math.min((now - t0) / minMs, 1), shown = Math.round((loaded ? p : Math.min(p, 0.92)) * 100);
      if (pctEl) pctEl.textContent = shown + '%';
      if (barEl) barEl.style.transform = 'scaleX(' + shown / 100 + ')';
      if (p >= 1 && loaded) finishLoader(); else requestAnimationFrame(tick);
    })(t0);
  }

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
    roleCycle(); startGlobe();
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
  var active = null, fineMouse = false, gMX = 0, gMY = 0;
  function moveInd(a) {
    if (!ind) return; if (!a) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  links.forEach(function (a) { a.addEventListener('mouseenter', function () { moveInd(a); }); a.addEventListener('focus', function () { moveInd(a); }); });
  $('#navlinks').addEventListener('mouseleave', function () { moveInd(active); });
  window.addEventListener('resize', function () { moveInd(active); });
  $('#burger').addEventListener('click', function () { var o = pill.classList.toggle('open'); this.setAttribute('aria-expanded', o); });

  var secs = links.map(function (a) { return { a: a, s: document.getElementById(a.dataset.nav) }; });
  var hero = $('#hero'), copy = $('.hero-copy'), medalWrap = $('.hero-medal'), medal = $('.medal-stage'), gcan = $('#globe');
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
      if (gcan) gcan.style.opacity = Math.max(0.8 - k * 0.7, 0);
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

  /* ---------- section transitions (click a link) ---------- */
  var curtain = $('#curtain'), cuLabel = $('.cu-label'), busy = false;
  function go(id, label) {
    var target = id === 'top' ? document.body : document.getElementById(id); if (!target) return;
    var y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
    pill.classList.remove('open');
    if (!motion || busy) { window.scrollTo({ top: y, behavior: motion ? 'smooth' : 'auto' }); return; }
    busy = true; cuLabel.textContent = label || ''; curtain.className = 'cover';
    setTimeout(function () {
      window.scrollTo(0, y); nav.style.transform = '';
      curtain.className = 'leave';
      var t = target.querySelector && target.querySelector('.title');
      if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }
      setTimeout(function () { curtain.className = 'reset'; busy = false; try { history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id); } catch (e) {} }, 750);
    }, 780);
  }
  $$('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var id = a.dataset.go, name = id === 'top' ? 'Top' : (a.textContent.trim() || id);
      go(id, name.charAt(0).toUpperCase() + name.slice(1));
    });
  });

  /* ---------- pointer: cursor, tilt, magnet, click effects ---------- */
  var dot = $('.cursor-dot'), ring = $('.cursor-ring'), tag = $('.cursor-tag');
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, cursorOn = false;
  function tagFor(t) {
    var a = t.closest && t.closest('a,button,.tilt'); if (!a) return null;
    var l = a.getAttribute('data-cursor');
    if (l === null) l = a.hasAttribute('data-go') ? 'Go' : (a.tagName === 'A' && a.target === '_blank' ? 'Open' : '');
    return { label: l };
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !motion) return;
    fineMouse = true;
    if (!cursorOn) { cursorOn = true; root.classList.add('has-cursor'); rx = e.clientX; ry = e.clientY; }
    mx = e.clientX; my = e.clientY; dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
  }, { passive: true });
  (function loop() { rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; tag.style.transform = 'translate3d(' + (rx + 30) + 'px,' + (ry + 24) + 'px,0)'; requestAnimationFrame(loop); })();
  document.addEventListener('pointerover', function (e) {
    var h = tagFor(e.target);
    ring.classList.toggle('hot', !!h); dot.classList.toggle('hot', !!h);
    tag.textContent = h && h.label ? h.label : ''; tag.classList.toggle('on', !!(h && h.label));
  });
  document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });

  window.addEventListener('pointerdown', function (e) {
    if (!motion) return; ring.classList.add('down');
    var r = document.createElement('span'); r.className = 'ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r);
    r.addEventListener('animationend', function () { r.remove(); });
    for (var i = 0; i < 9; i++) {
      var s = document.createElement('span'), a = (Math.PI * 2 * i) / 9 + Math.random() * 0.5, d = 28 + Math.random() * 38;
      s.className = 'spark' + (i % 3 === 0 ? ' r' : ''); s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
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
      medal.style.setProperty('--my', px * 26 + 'deg'); medal.style.setProperty('--mx', -py * 20 + 'deg'); gMX = px; gMY = py;
    });
    hero.addEventListener('pointerleave', function () { medal.style.setProperty('--my', '0deg'); medal.style.setProperty('--mx', '0deg'); gMX = 0; gMY = 0; });
  }
  $$('.magnet').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !motion) return;
      var r = el.getBoundingClientRect(); el.style.transform = 'translate3d(' + (e.clientX - (r.left + r.width / 2)) * 0.2 + 'px,' + (e.clientY - (r.top + r.height / 2)) * 0.3 + 'px,0)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  /* ---------- 3D network globe (canvas, pauses off-screen) ---------- */
  var ctx = gcan && gcan.getContext('2d'), pts = [], lk = [], W = 0, H = 0, dpr = 1, ry3 = 0, rx3 = 0.35, running = false, visible = true;
  function buildGlobe() {
    var n = innerWidth < 760 ? 70 : 120, i; pts = []; lk = [];
    for (i = 0; i < n; i++) { var k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i; pts.push({ x: Math.cos(th) * Math.sin(phi), y: Math.cos(phi), z: Math.sin(th) * Math.sin(phi), hot: i % 19 === 0 }); }
    for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) { var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z; if (dx * dx + dy * dy + dz * dz < 0.36) lk.push([i, j]); }
  }
  function sizeGlobe() { if (!gcan) return; dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = gcan.clientWidth; H = gcan.clientHeight; gcan.width = W * dpr; gcan.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function drawGlobe() {
    if (!ctx || !W) return;
    ctx.clearRect(0, 0, W, H);
    var P = pal();
    var small = innerWidth < 760, R = Math.min(W * (small ? 0.5 : 0.3), H * 0.4), cx = small ? W * 0.5 : W * 0.7, cy = H * 0.5;
    var cyaw = Math.cos(ry3), syaw = Math.sin(ry3), cp = Math.cos(rx3), sp = Math.sin(rx3), proj = [], t = performance.now() / 1000, i;
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], x = p.x * cyaw + p.z * syaw, z = -p.x * syaw + p.z * cyaw, y = p.y * cp - z * sp; z = p.y * sp + z * cp;
      var s = 1 / (1.9 - z * 0.5); proj.push({ x: cx + x * R * s * 1.9, y: cy + y * R * s * 1.9, z: z, s: s });
    }
    ctx.lineWidth = 1;
    for (i = 0; i < lk.length; i++) {
      var a = proj[lk[i][0]], b = proj[lk[i][1]], al = 0.05 + ((a.z + b.z) / 2 + 1) * 0.1;
      ctx.strokeStyle = 'rgba(' + P.link + ',' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (i = 0; i < proj.length; i++) {
      var q = proj[i], depth = (q.z + 1) / 2;
      if (pts[i].hot) { var pulse = 0.6 + Math.sin(t * 2 + i) * 0.4; ctx.fillStyle = 'rgba(' + P.hot + ',' + (0.35 + depth * 0.55).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, (2.4 + pulse * 1.2) * q.s * 1.4, 0, 6.283); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(' + P.node + ',' + (0.18 + depth * 0.6).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.3 + depth * 1.4, 0, 6.283); ctx.fill(); }
    }
  }
  function frame() {
    if (!running) return;
    ry3 += 0.0016 + sy * 0.0000012 + gMX * 0.002; rx3 += ((0.35 + gMY * 0.5) - rx3) * 0.04;
    drawGlobe(); requestAnimationFrame(frame);
  }
  function startGlobe() {
    if (!gcan || !ctx) return; if (!pts.length) buildGlobe(); if (!W) sizeGlobe();
    if (!motion) { drawGlobe(); return; }
    if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); }
  }
  if (gcan && 'ResizeObserver' in window) new ResizeObserver(function () { sizeGlobe(); drawGlobe(); }).observe(gcan);
  if (gcan && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (!visible) running = false; else startGlobe(); }).observe(hero);
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else startGlobe(); });
  buildGlobe(); sizeGlobe(); drawGlobe();

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
