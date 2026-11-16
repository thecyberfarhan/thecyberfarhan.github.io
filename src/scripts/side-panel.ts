// The sticky "On this page" column on writeup and project pages scrolls on its own when it's
// taller than the window. Its scrollbar is hidden, so these classes fade whichever edge still has
// more to show, and the active section's link is kept in view as the reader moves down the page.
export function initSidePanel(side: HTMLElement) {
  const edges = () => {
    const more = side.scrollHeight - side.clientHeight > 1;
    side.classList.toggle('more-up', more && side.scrollTop > 2);
    side.classList.toggle('more-down', more && side.scrollTop + side.clientHeight < side.scrollHeight - 2);
  };
  side.addEventListener('scroll', edges, { passive: true });
  addEventListener('resize', edges);
  edges();

  return (link: HTMLElement | undefined) => {
    if (!link || side.scrollHeight <= side.clientHeight) return;
    const y = link.getBoundingClientRect().top - side.getBoundingClientRect().top;
    if (y < 40 || y > side.clientHeight - 80) {
      side.scrollBy({ top: y - side.clientHeight / 3, behavior: 'smooth' });
    }
  };
}
