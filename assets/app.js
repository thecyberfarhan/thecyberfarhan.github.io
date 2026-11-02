(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* live badge: hide the static fallback once TryHackMe's script renders */
  var live = $('.live-card'), badge = $('.thm-badge');
  function rendered() { return Array.prototype.some.call(badge.children, function (c) { return c.tagName !== 'SCRIPT' && c.offsetHeight > 20; }); }
  if (live && badge && 'MutationObserver' in window) {
    var mo = new MutationObserver(function () { if (rendered()) { live.classList.add('has-live'); } });
    mo.observe(badge, { childList: true, subtree: true });
    window.addEventListener('load', function () { setTimeout(function () { if (rendered()) live.classList.add('has-live'); }, 1500); });
  }

  /* scroll reveal */
  var els = $$('[data-reveal], .title');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); if (e.target.querySelector && e.target.querySelector('[data-count]')) countUp(e.target); if (e.target.hasAttribute && e.target.hasAttribute('data-count')) countUp(e.target.parentNode); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* animated counters */
  function countUp(scope) {
    $$('[data-count]', scope).forEach(function (b) {
      if (b.dataset.done) return; b.dataset.done = 1;
      var end = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '', t0 = null, dur = 1100;
      function step(t) {
        if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        b.textContent = pre + Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* scroll progress, parallax grid, hero depth, active nav */
  var bar = $('#progress'), medal = $('.medal-stage'), ticking = false;
  var sections = $$('[data-nav]').map(function (a) { return { a: a, s: $('#' + a.dataset.nav) }; });
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    root.style.setProperty('--scroll', y);
    if (medal && !reduce && !fine) medal.style.setProperty('--my', Math.min(y / 14, 24) + 'deg');
    var cur = null;
    sections.forEach(function (o) { if (o.s && o.s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = o; });
    sections.forEach(function (o) { o.a.classList.toggle('on', o === cur); });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (reduce) return;

  /* custom cursor */
  if (fine) {
    root.classList.add('has-cursor');
    var dot = $('.cursor-dot'), ring = $('.cursor-ring');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; }, { passive: true });
    (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', function (e) { ring.classList.toggle('hot', !!e.target.closest('a,button,.tilt')); });
    window.addEventListener('mousedown', function () { ring.classList.add('down'); });
    window.addEventListener('mouseup', function () { ring.classList.remove('down'); });
    document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });

    /* 3D tilt on cards (x and y rotation, z depth) */
    $$('.tilt').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .08s linear';
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 9) + 'deg) rotateY(' + (px * 11) + 'deg) translate3d(0,-4px,18px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'; el.style.transform = ''; });
    });

    /* hero medal follows the pointer in depth */
    var hero = $('.hero');
    if (hero && medal) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        medal.style.setProperty('--my', (px * 24) + 'deg'); medal.style.setProperty('--mx', (-py * 18) + 'deg');
      });
      hero.addEventListener('mouseleave', function () { medal.style.setProperty('--my', '0deg'); medal.style.setProperty('--mx', '0deg'); });
    }

    /* magnetic buttons */
    $$('.magnet').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate3d(' + dx * 0.18 + 'px,' + dy * 0.28 + 'px,0)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }
})();
