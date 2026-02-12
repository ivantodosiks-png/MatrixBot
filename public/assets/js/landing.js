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
})();
