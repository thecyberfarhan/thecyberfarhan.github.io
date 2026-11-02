(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var KEY = 'motion';
  var motion = true;
  try { motion = localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  root.classList.toggle('reduce', !motion);

  /* ---------- motion toggle ---------- */
  var mBtn = $('#motion');
  function paintToggle() {
    mBtn.setAttribute('aria-pressed', String(motion));
    mBtn.setAttribute('aria-label', motion ? 'Motion effects on. Press to reduce motion.' : 'Motion effects off. Press to turn them on.');
  }
  paintToggle();
  mBtn.addEventListener('click', function () {
    motion = !motion; root.classList.toggle('reduce', !motion);
    try { localStorage.setItem(KEY, motion ? 'on' : 'off'); } catch (e) {}
    paintToggle(); if (motion) startGlobe(); else drawGlobe();
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
  var dot = $('.cursor-dot'), ring = $('.cursor-ring'), lab = $('.cur-label');
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, cursorOn = false;
  function labelFor(t) {
    var a = t.closest && t.closest('a,button,.tilt'); if (!a) return null;
    var l = a.getAttribute('data-cursor');
    if (l === null) { if (a.classList.contains('wcard')) l = 'Read'; else if (a.hasAttribute('data-go')) l = 'Go'; else if (a.target === '_blank') l = 'Open'; else l = ''; }
    return { label: l };
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !motion) return;
    fineMouse = true;
    if (!cursorOn) { cursorOn = true; root.classList.add('has-cursor'); rx = e.clientX; ry = e.clientY; }
    mx = e.clientX; my = e.clientY; dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
  }, { passive: true });
  (function loop() { rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; requestAnimationFrame(loop); })();
  document.addEventListener('pointerover', function (e) {
    var h = labelFor(e.target);
    ring.classList.toggle('hot', !!h); dot.classList.toggle('hot', !!h);
    lab.textContent = h && h.label ? h.label : ''; lab.classList.toggle('on', !!(h && h.label));
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
      el.style.transform = 'perspective(900px) rotateX(' + (-(py - 0.5) * 10) + 'deg) rotateY(' + ((px - 0.5) * 12) + 'deg) translate3d(0,-5px,22px)';
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
    var small = innerWidth < 760, R = Math.min(W * (small ? 0.5 : 0.3), H * 0.4), cx = small ? W * 0.5 : W * 0.7, cy = H * 0.5;
    var cyaw = Math.cos(ry3), syaw = Math.sin(ry3), cp = Math.cos(rx3), sp = Math.sin(rx3), proj = [], t = performance.now() / 1000, i;
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], x = p.x * cyaw + p.z * syaw, z = -p.x * syaw + p.z * cyaw, y = p.y * cp - z * sp; z = p.y * sp + z * cp;
      var s = 1 / (1.9 - z * 0.5); proj.push({ x: cx + x * R * s * 1.9, y: cy + y * R * s * 1.9, z: z, s: s });
    }
    ctx.lineWidth = 1;
    for (i = 0; i < lk.length; i++) {
      var a = proj[lk[i][0]], b = proj[lk[i][1]], al = 0.05 + ((a.z + b.z) / 2 + 1) * 0.1;
      ctx.strokeStyle = 'rgba(127,168,204,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (i = 0; i < proj.length; i++) {
      var q = proj[i], depth = (q.z + 1) / 2;
      if (pts[i].hot) { var pulse = 0.6 + Math.sin(t * 2 + i) * 0.4; ctx.fillStyle = 'rgba(180,35,44,' + (0.35 + depth * 0.55).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, (2.4 + pulse * 1.2) * q.s * 1.4, 0, 6.283); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(201,209,217,' + (0.18 + depth * 0.6).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.3 + depth * 1.4, 0, 6.283); ctx.fill(); }
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
})();
