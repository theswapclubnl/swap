(() => {
  const carousel = document.querySelector('.partnership-carousel');
  const toggle = document.querySelector('.partnership-toggle');
  if (!carousel || !toggle) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateVisibility = () => { toggle.hidden = reducedMotion.matches; };
  updateVisibility();
  reducedMotion.addEventListener('change', updateVisibility);
  toggle.addEventListener('click', () => {
    const paused = carousel.classList.toggle('is-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Play logos' : 'Pause logos');
  });
})();
