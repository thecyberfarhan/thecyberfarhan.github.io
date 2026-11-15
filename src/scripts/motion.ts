import { animate, onScroll, stagger } from 'animejs';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
(window as unknown as { __motionReady: boolean }).__motionReady = true;

// [data-reveal] fades up once when it enters; [data-reveal="stagger"] staggers its children instead
export function initReveals(root: ParentNode = document) {
  if (reduced) return;
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const group = el.dataset.reveal === 'stagger';
    if (group) {
      [...el.children].forEach((c) => ((c as HTMLElement).style.opacity = '0'));
      el.style.opacity = '1';
    }
    animate(group ? el.children : el, {
      opacity: [0, 1],
      y: [22, 0],
      duration: 900,
      delay: group ? stagger(70) : 0,
      ease: 'outQuart',
      autoplay: onScroll({ target: el, enter: 'end-=60 start', repeat: false }),
    });
  });
}

export function countUp(el: HTMLElement, delay = 0) {
  const to = Number(el.dataset.to);
  if (reduced || !Number.isFinite(to)) return;
  const o = { v: 0 };
  el.textContent = '0';
  animate(o, { v: to, duration: 1600, delay, ease: 'outExpo', onUpdate: () => { el.textContent = String(Math.round(o.v)); } });
}

export function countOnView(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>('[data-count]').forEach((group) => {
    const nums = group.querySelectorAll<HTMLElement>('[data-to]');
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      nums.forEach((n, i) => countUp(n, i * 120));
    }, { threshold: 0.4 });
    io.observe(group);
  });
}
