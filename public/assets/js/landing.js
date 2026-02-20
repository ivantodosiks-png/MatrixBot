(function () {
  const items = Array.from(document.querySelectorAll('.reveal-on-scroll'));
  if (!items.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  items.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 35, 210)}ms`;
    el.style.transitionDuration = '680ms';
    el.style.transitionTimingFunction = 'cubic-bezier(0.2, 0.7, 0.25, 1)';
    observer.observe(el);
  });

  const tiltTargets = Array.from(
    document.querySelectorAll('.lp-terminal, .lp-showcase-card')
  );

  function resetTilt(el) {
    el.style.transform = '';
  }

  if (!prefersReduced && tiltTargets.length) {
    tiltTargets.forEach((el) => {
      el.addEventListener('mousemove', (event) => {
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 6;
        const rotateX = (0.5 - py) * 5;
        el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      });

      el.addEventListener('mouseleave', () => resetTilt(el));
      el.addEventListener('blur', () => resetTilt(el));
    });
  }

  const pod = document.getElementById('lpScrollPod');
  const heroSection = document.querySelector('.lp-hero');
  const featuresSection = document.getElementById('features');
  const howSection = document.getElementById('how');

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeInOutCubic = (value) =>
    value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;

  function cubicPoint(t, p0, p1, p2, p3) {
    const inv = 1 - t;
    const x =
      inv * inv * inv * p0.x +
      3 * inv * inv * t * p1.x +
      3 * inv * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      inv * inv * inv * p0.y +
      3 * inv * inv * t * p1.y +
      3 * inv * t * t * p2.y +
      t * t * t * p3.y;
    return { x, y };
  }

  if (!prefersReduced && pod && heroSection && featuresSection) {
    const flightState = {
      start: 0,
      end: 1,
      ticking: false
    };

    function getPathPoint(t) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 820;
      const p0 = isMobile ? { x: vw * 0.78, y: vh * 0.48 } : { x: vw * 0.74, y: vh * 0.36 };
      const p1 = isMobile ? { x: vw * 0.66, y: vh * 0.9 } : { x: vw * 0.62, y: vh * 0.96 };
      const p2 = isMobile ? { x: vw * 0.4, y: vh * 0.64 } : { x: vw * 0.36, y: vh * 0.67 };
      const p3 = isMobile ? { x: vw * 0.26, y: -vh * 0.18 } : { x: vw * 0.2, y: -vh * 0.24 };
      return cubicPoint(t, p0, p1, p2, p3);
    }

    function renderPod() {
      flightState.ticking = false;
      const range = Math.max(flightState.end - flightState.start, 1);
      const rawProgress = (window.scrollY - flightState.start) / range;
      const clampedProgress = clamp(rawProgress, 0, 1);
      const easedProgress = easeInOutCubic(clampedProgress);

      const point = getPathPoint(easedProgress);
      const aheadPoint = getPathPoint(clamp(easedProgress + 0.012, 0, 1));
      const angle = Math.atan2(aheadPoint.y - point.y, aheadPoint.x - point.x) * (180 / Math.PI);

      let opacity = 0;
      if (rawProgress >= -0.08 && rawProgress <= 1.14) {
        if (rawProgress < 0) {
          opacity = 1 + rawProgress / 0.08;
        } else if (rawProgress > 1) {
          opacity = 1 - (rawProgress - 1) / 0.14;
        } else {
          opacity = 1;
        }
      }

      const trailStrength = 0.46 + (1 - clampedProgress) * 0.54;
      const boostStrength = 0.84 + Math.sin(clampedProgress * 28) * 0.14;
      const glitchStrength =
        clampedProgress > 0.16 && clampedProgress < 0.9 ? 0.11 : 0.06;

      pod.style.setProperty('--pod-x', `${point.x.toFixed(2)}px`);
      pod.style.setProperty('--pod-y', `${point.y.toFixed(2)}px`);
      pod.style.setProperty('--pod-angle', `${angle.toFixed(2)}deg`);
      pod.style.setProperty('--pod-opacity', `${clamp(opacity, 0, 1).toFixed(3)}`);
      pod.style.setProperty('--pod-trail', `${trailStrength.toFixed(3)}`);
      pod.style.setProperty('--pod-boost', `${boostStrength.toFixed(3)}`);
      pod.style.setProperty('--pod-glitch', `${glitchStrength.toFixed(3)}`);
    }

    function requestFrame() {
      if (flightState.ticking) return;
      flightState.ticking = true;
      window.requestAnimationFrame(renderPod);
    }

    function measureFlightWindow() {
      const vh = window.innerHeight;
      const heroTop = heroSection.getBoundingClientRect().top + window.scrollY;
      const featuresTop = featuresSection.getBoundingClientRect().top + window.scrollY;
      const howTop = howSection
        ? howSection.getBoundingClientRect().top + window.scrollY
        : featuresTop + featuresSection.clientHeight * 1.2;

      flightState.start = heroTop - vh * 0.34;
      flightState.end = Math.max(flightState.start + vh * 0.9, howTop - vh * 0.32);
      requestFrame();
    }

    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', measureFlightWindow);
    measureFlightWindow();
  }
})();
