/* ═════════════════════════════════════════════
   THE SWAP CLUB — shared behaviour
   ═════════════════════════════════════════════ */

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────
   Scroll reveal (AOS) — sections slide up as they enter.
   Runs once per element so it never re-triggers while scrolling back.
   ───────────────────────────────────────────── */
if (typeof AOS !== 'undefined') {
  document.querySelectorAll(
    '.page-content > section, .page-content > div:not(.flash-container):not(.hours-strip), .page-content > article, .terms-main > .legal-header, .terms-main > section'
  ).forEach((el) => {
    if (!el.hasAttribute('data-aos')) {
      el.setAttribute('data-aos', 'fade-up');
    }
  });

  document.querySelectorAll('[data-aos]').forEach((el, index) => {
    if (!el.hasAttribute('data-aos-delay')) {
      el.setAttribute('data-aos-delay', String(Math.min((index % 4) * 70, 210)));
    }
  });

  AOS.init({
    duration: 950,
    easing: 'ease-out-cubic',
    once: true,
    offset: 80,
    anchorPlacement: 'top-bottom',
    disable: prefersReducedMotion,
  });
} else {
  // AOS failed to load (CDN blocked/offline): un-hide content instead of leaving it at opacity 0.
  document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos'));
}

/* ─────────────────────────────────────────────
   Scroll motion — progress bar + soft image drift
   ───────────────────────────────────────────── */
(function scrollMotion() {
  if (prefersReducedMotion()) return;

  document.documentElement.classList.add('has-scroll-motion');

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const driftTargets = Array.from(document.querySelectorAll(
    '.step-image-wrap, .story-photo, .grid-item, div.clubhouse-photo'
  ));

  let ticking = false;

  function updateScrollMotion() {
    ticking = false;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPct = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    progress.style.transform = `scaleX(${Math.min(Math.max(scrollPct, 0), 1)})`;

    const viewportMid = window.innerHeight / 2;
    driftTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > window.innerHeight + 120) return;
      const targetMid = rect.top + rect.height / 2;
      const distance = (targetMid - viewportMid) / window.innerHeight;
      const drift = Math.max(-18, Math.min(18, distance * -28));
      target.style.setProperty('--scroll-drift', `${drift}px`);
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollMotion);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
})();

/* ─────────────────────────────────────────────
   Page transitions — fallback only.
   Browsers with cross-document View Transitions slide pages natively
   (see base.css). Everywhere else <html class="no-vt"> is set in <head>,
   and we play the CSS slide-out before following an internal link.
   ───────────────────────────────────────────── */
(function pageTransitionFallback() {
  const root = document.documentElement;
  if (!root.classList.contains('no-vt')) return;

  // Coming back via the bfcache must not leave the page half-slid-out.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) root.classList.remove('is-leaving');
  });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;                       // external
    if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same-page / #hash

    e.preventDefault();
    root.classList.add('is-leaving');
    setTimeout(() => { window.location.href = url.href; }, 260);
  });
})();

/* ─────────────────────────────────────────────
   Autoplay videos: respect reduced-motion (stay on the poster frame)
   ───────────────────────────────────────────── */
if (prefersReducedMotion()) {
  document.querySelectorAll('video[autoplay]').forEach((video) => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

/* ─────────────────────────────────────────────
   FAQ toggles (How It Works page)
   Question links open/close their answer block; aria-expanded mirrors it.
   ───────────────────────────────────────────── */
document.querySelectorAll('.toggles .toggle-heading').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const toggle = link.closest('.toggle');
    const isOpen = toggle.classList.toggle('active');
    link.setAttribute('aria-expanded', String(isOpen));
  });
});

/* ─────────────────────────────────────────────
   "How it works" steps
   Desktop (>900px): vertical scroll-snap, driven by the sidebar dots.
   Mobile (<=900px): horizontal swipe carousel — same markup/JS, just
   tracks scrollLeft instead of scrollTop and reacts to touch swipes
   natively via CSS scroll-snap-type: x.
   ───────────────────────────────────────────── */
const stepsScrollEls = document.querySelectorAll('.steps-scroll');
const isMobileSteps = () => window.matchMedia('(max-width: 900px)').matches;

stepsScrollEls.forEach(stepsScroll => {
  const outer = stepsScroll.closest('.steps-outer');
  if (!outer) return;

  const stepNavBtns = outer.querySelectorAll('.step-nav-btn');
  const stepSlides = outer.querySelectorAll('.step-slide');
  const stepsFill = outer.querySelector('.steps-progress-fill');
  const totalSteps = stepSlides.length || stepNavBtns.length || 4;

  function updateActiveStep(index) {
    index = Math.max(0, Math.min(index, totalSteps - 1));

    stepNavBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
    if (stepsFill) {
      const pct = (index / (totalSteps - 1)) * 100;
      stepsFill.style.height = pct + '%';
    }
    // Visual feedback for the active slide when swiping on mobile
    stepSlides.forEach((slide, i) => {
      slide.classList.toggle('step-slide-active', i === index);
    });
  }

  // Mark the first slide active by default (covers the mobile carousel,
  // where opacity feedback relies on this class).
  updateActiveStep(0);

  let scrollTicking = false;
  stepsScroll.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      let index;
      if (isMobileSteps()) {
        const slideW = stepsScroll.clientWidth;
        index = Math.round(stepsScroll.scrollLeft / slideW);
      } else {
        const slideH = stepsScroll.clientHeight;
        index = Math.round(stepsScroll.scrollTop / slideH);
      }
      updateActiveStep(index);
      scrollTicking = false;
    });
  });

  stepNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.step, 10);
      if (isMobileSteps()) {
        stepsScroll.scrollTo({ left: i * stepsScroll.clientWidth, behavior: 'smooth' });
      } else {
        stepsScroll.scrollTo({ top: i * stepsScroll.clientHeight, behavior: 'smooth' });
      }
    });
  });
});

/* ─────────────────────────────────────────────
   Nav — mobile menu + active link highlighting
   The panel is styled like the desktop bar (see base.css); here we only
   handle open/close: toggle button, link tap, Escape, tap outside, and
   resizing up to desktop width.
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('main-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    const isOpen = () => nav.classList.contains('nav-open');

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (isOpen() && !nav.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-cta').forEach((a) => {
    if (a.getAttribute('href') === currentPath) a.classList.add('active');
  });
});

/* ─────────────────────────────────────────────
   HSCROLL carousels — auto-advancing, seamlessly looping strips that
   can also be dragged, swiped, wheeled or driven with the arrow buttons.
   Used by: home (community photos) and how (points examples).

   Loop contract: the track contains two identical .hscroll-set children.
   We scroll one set-width and jump back by exactly that distance, which
   is invisible because the second set is a copy of the first.

   Auto-advance pauses while a mouse hovers, while the user drags/wheels,
   and for 2.5s afterwards; it also stops when the strip is off-screen or
   the tab is hidden, so idle carousels cost nothing.
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hscroll').forEach((track) => {
    const speed = parseFloat(track.dataset.speed) || 34; // px / second
    const sets = track.querySelectorAll(':scope > .hscroll-set');
    const canLoop = sets.length >= 2;
    // Measured, not scrollWidth / 2: the sets are separated by a gap, so halving
    // scrollWidth drifts out of sync and causes a visible jump over time.
    const getLoopWidth = () => (canLoop ? sets[1].offsetLeft - sets[0].offsetLeft : 0);

    let pos = track.scrollLeft;  // fractional position — scrollLeft alone rounds to whole px on many displays, which stalls slow scrolls
    let lastTs = null;
    let rafId = null;
    let inView = false;
    let hovering = false;        // mouse only — touch has no "leave" event
    let paused = false;          // short cool-down after user interaction
    let userInteracting = false;
    let resumeTimer = null;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let suppressClick = false;

    const isRunning = () =>
      inView && !paused && !userInteracting && !prefersReducedMotion() && !document.hidden;  // no hover check on purpose: keeps looping under the mouse

    function tick(ts) {
      rafId = null;
      if (!isRunning()) { lastTs = null; return; }   // loop stops; start() revives it
      if (lastTs === null) { lastTs = ts; pos = track.scrollLeft; }
      const dt = Math.min((ts - lastTs) / 1000, 0.1); // clamp: a throttled tab must not leap
      lastTs = ts;

      pos += speed * dt;
      const loopWidth = getLoopWidth();
      if (loopWidth && pos >= loopWidth) pos -= loopWidth;
      track.scrollLeft = pos;
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (rafId === null && isRunning()) rafId = requestAnimationFrame(tick);
    }

    function normalizeLoopPosition() {
      const loopWidth = getLoopWidth();
      if (loopWidth && track.scrollLeft >= loopWidth) track.scrollLeft -= loopWidth;
    }

    function pauseThenResume() {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { paused = false; start(); }, 2500);
    }

    function endInteraction() {
      if (!userInteracting) return;
      userInteracting = false;
      track.classList.remove('is-dragging');
      normalizeLoopPosition();
      pauseThenResume();
    }

    // Only run while visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
      }).observe(track);
    } else {
      inView = true;
    }
    document.addEventListener('visibilitychange', start);

    track.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    track.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; start(); } });

    track.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      userInteracting = true;
      dragStartX = event.clientX;
      dragStartScrollLeft = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture?.(event.pointerId);
    });

    track.addEventListener('pointermove', (event) => {
      if (!userInteracting) return;
      const deltaX = event.clientX - dragStartX;
      if (Math.abs(deltaX) > 4) suppressClick = true;
      track.scrollLeft = dragStartScrollLeft - deltaX;
    });

    track.addEventListener('pointerup', (event) => {
      track.releasePointerCapture?.(event.pointerId);
      endInteraction();
    });
    track.addEventListener('pointercancel', endInteraction);
    track.addEventListener('lostpointercapture', endInteraction);
    // Safety net: never stay paused if a pointerup is missed outside the element.
    window.addEventListener('pointerup', endInteraction);
    window.addEventListener('blur', endInteraction);

    track.addEventListener('click', (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);

    track.addEventListener('wheel', pauseThenResume, { passive: true });

    // Prev / next arrow buttons, if present alongside this track.
    const wrap = track.closest('.hscroll-wrap');
    if (wrap) {
      const prevBtn = wrap.querySelector('.hscroll-btn.prev');
      const nextBtn = wrap.querySelector('.hscroll-btn.next');
      const scrollByCard = (dir) => {
        const card = track.querySelector(':scope > .hscroll-set > *') || track.firstElementChild;
        const amount = (card ? card.getBoundingClientRect().width + 24 : track.clientWidth * 0.8) * dir;
        pauseThenResume();
        track.scrollBy({ left: amount, behavior: 'smooth' });
      };
      if (prevBtn) prevBtn.addEventListener('click', () => scrollByCard(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => scrollByCard(1));
    }

    // Live reduced-motion changes
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(start);
  });
});

/* ─────────────────────────────────────────────
   Impact stats count-up animation
   ───────────────────────────────────────────── */
const counters = document.querySelectorAll('.counter');
if (counters.length) {
  const finalText = (counter) => counter.getAttribute('data-final') || counter.getAttribute('data-target');

  const runCounter = (counter) => {
    if (prefersReducedMotion()) {
      counter.innerText = finalText(counter);
      return;
    }
    const target = +counter.getAttribute('data-target');
    const current = +counter.innerText.replace(/\D/g, '') || 0;
    const increment = target / 100;

    if (current < target) {
      counter.innerText = `${Math.ceil(current + increment)}`;
      setTimeout(() => runCounter(counter), 20);
    } else {
      counter.innerText = finalText(counter);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(counter => observer.observe(counter));
  } else {
    counters.forEach(runCounter);
  }
}
