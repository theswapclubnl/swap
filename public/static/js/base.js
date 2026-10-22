/* ═════════════════════════════════════════════
   THE SWAP CLUB — shared behaviour
   ═════════════════════════════════════════════ */

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Hide the navbar on downward scroll; reveal it on upward scroll. */
(function scrollNavigation() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  let previousY = Math.max(0, window.scrollY);
  let ticking = false;

  function update() {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const currentY = Math.max(0, Math.min(window.scrollY, maxY));
    const delta = currentY - previousY;
    ticking = false;

    if (currentY <= nav.offsetHeight + 16 || nav.classList.contains('nav-open') ||
        nav.querySelector(':focus-visible')) {
      nav.classList.remove('nav-hidden');
      previousY = currentY;
      return;
    }
    if (Math.abs(delta) < 8) return;
    nav.classList.toggle('nav-hidden', delta > 0);
    previousY = currentY;
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  nav.addEventListener('focusin', () => {
    nav.classList.remove('nav-hidden');
    previousY = Math.max(0, window.scrollY);
  });
})();

/* Fill the available heading width without wrapping. */
(function fitPageHeadings() {
  const headings = document.querySelectorAll('[data-fit-heading]');
  if (!headings.length) return;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;

  function fit() {
    headings.forEach((heading) => {
      const style = window.getComputedStyle(heading);
      const currentSize = parseFloat(style.fontSize);
      const spacing = parseFloat(style.letterSpacing) || 0;
      const lines = Array.from(heading.querySelectorAll('[data-heading-line]'))
        .filter((line) => window.getComputedStyle(line).display !== 'none');
      const texts = (lines.length ? lines : [heading]).map((line) =>
        style.textTransform === 'uppercase' ? line.textContent.trim().toUpperCase() : line.textContent.trim()
      );
      context.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      const width = Math.max(...texts.map((text) => context.measureText(text).width + Math.max(0, text.length - 1) * spacing * 100 / currentSize));
      if (width > 0 && heading.clientWidth > 0) {
        const maxSize = parseFloat(style.getPropertyValue('--fit-heading-max')) || 80;
        heading.style.fontSize = `${Math.min(maxSize, (heading.clientWidth - 4) * 100 / width)}px`;
      }
    });
  }

  window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);
  fit();
})();

/* Fit mobile social headings to the width of their supporting paragraph. */
(function fitSocialHeadings() {
  const titles = document.querySelectorAll('.social-title');
  if (!titles.length) return;
  const mobile = window.matchMedia('(max-width: 600px)');
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;

  function fit() {
    titles.forEach((title) => {
      if (!mobile.matches) {
        title.style.removeProperty('font-size');
        return;
      }
      const paragraph = title.parentElement.querySelector('.social-sub');
      if (!paragraph) return;
      const style = window.getComputedStyle(title);
      context.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      const text = style.textTransform === 'uppercase'
        ? title.textContent.trim().toUpperCase() : title.textContent.trim();
      const textWidth = context.measureText(text).width;
      if (textWidth > 0 && paragraph.clientWidth > 0) {
        title.style.fontSize = `${(paragraph.clientWidth - 2) * 100 / textWidth}px`;
      }
    });
  }

  window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);
  fit();
})();

/* Opening hours gently scroll back and forth on mobile; touch pauses autoplay. */
(function scrollMobileHours() {
  const strip = document.querySelector('.hours-strip');
  if (!strip) return;

  const mobile = window.matchMedia('(max-width: 600px)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  let lastTime = null;
  let position = 0;
  let direction = 1;
  let pausedUntil = 0;
  let interacting = false;
  let hovered = false;

  function animate(time) {
    const elapsed = lastTime === null ? 0 : Math.min(time - lastTime, 50);
    lastTime = time;
    const rect = strip.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < window.innerHeight;
    const maxScroll = strip.scrollWidth - strip.clientWidth;

    if (visible && maxScroll > 0 && !interacting && !hovered &&
        !strip.matches(':focus-within') && time >= pausedUntil) {
      position = Math.max(0, Math.min(maxScroll, position + direction * elapsed * 0.025));
      strip.scrollLeft = position;
      if (position === maxScroll || position === 0) {
        direction *= -1;
        pausedUntil = time + 1000;
      }
    } else {
      position = strip.scrollLeft;
    }
    frame = window.requestAnimationFrame(animate);
  }

  function sync() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    position = strip.scrollLeft;
    if (mobile.matches && !motion.matches && !document.hidden) {
      pausedUntil = performance.now() + 1500;
      frame = window.requestAnimationFrame(animate);
    }
  }

  strip.addEventListener('pointerdown', () => { interacting = true; });
  const release = () => { interacting = false; pausedUntil = performance.now() + 2500; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  strip.addEventListener('pointerenter', (event) => { hovered = event.pointerType === 'mouse'; });
  strip.addEventListener('pointerleave', () => { hovered = false; });
  strip.addEventListener('wheel', release, { passive: true });
  mobile.addEventListener('change', sync);
  motion.addEventListener('change', sync);
  window.addEventListener('resize', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();

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
   Quote letters fade in with scroll progress, keeping the full text layout.
   ───────────────────────────────────────────── */
(function revealScrollQuotes() {
  const quotes = Array.from(document.querySelectorAll('[data-scroll-quote]'));
  if (!quotes.length || prefersReducedMotion()) return;

  const reveals = quotes.map((quote) => {
    const text = quote.textContent;
    const accessibleText = document.createElement('span');
    accessibleText.className = 'scroll-quote-accessible';
    accessibleText.textContent = text;

    const visualText = document.createElement('span');
    visualText.setAttribute('aria-hidden', 'true');
    const letters = [];

    // Keep words together so wrapping stays natural on narrow screens.
    text.split(/(\s+)/).forEach((word) => {
      if (/^\s+$/.test(word)) {
        visualText.append(document.createTextNode(word));
        return;
      }
      const wordSpan = document.createElement('span');
      wordSpan.className = 'scroll-quote-word';
      Array.from(word).forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'scroll-quote-letter';
        letter.textContent = character;
        wordSpan.append(letter);
        letters.push(letter);
      });
      visualText.append(wordSpan);
    });

    quote.replaceChildren(accessibleText, visualText);
    return { quote, letters };
  });

  let ticking = false;
  function update() {
    ticking = false;
    const viewportHeight = window.innerHeight;
    reveals.forEach(({ quote, letters }) => {
      const top = quote.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1,
        (viewportHeight * 0.85 - top) / (viewportHeight * 0.55)
      ));
      letters.forEach((letter, index) => {
        const opacity = prefersReducedMotion() ? 1 : Math.max(0, Math.min(1,
          (progress * (letters.length + 6) - index) / 6
        ));
        letter.style.opacity = String(opacity);
      });
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('pageshow', requestUpdate);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', requestUpdate);
  update();
})();

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

   Auto-advance keeps moving on hover. It pauses only while the user
   drags/wheels/clicks arrows, then resumes after 2.5s; it also stops when
   the strip is off-screen or the tab is hidden, so idle carousels cost nothing.
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
    let paused = false;          // short cool-down after user interaction
    let userInteracting = false;
    let resumeTimer = null;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let suppressClick = false;

    const isRunning = () =>
      inView && !paused && !userInteracting && !prefersReducedMotion() && !document.hidden;

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
    const duration = Math.min(5000, 1800 + target * 0.9);
    const suffix = counter.getAttribute('data-suffix') || '';
    const step = Number(counter.getAttribute('data-step')) || 1;
    const unit = counter.getAttribute('data-unit') || '';
    const format = (value) => `${unit === 'K' ? value / 1000 : value}${unit}${suffix}`;
    let startedAt = null;
    counter.innerText = format(0);

    const frame = (time) => {
      if (startedAt === null) startedAt = time;
      const progress = Math.min((time - startedAt) / duration, 1);
      if (progress === 1 || prefersReducedMotion()) {
        counter.innerText = finalText(counter);
        return;
      }
      const eased = step > 1 ? progress : 1 - Math.pow(1 - progress, 3);
      counter.innerText = format(Math.floor(target * eased / step) * step);
      window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);
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
