(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      }
    }, { threshold: .08, rootMargin: '0px 0px -28px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('in-view'));
  }

  const progress = document.querySelector('.scroll-progress');
  let ticking = false;
  const setProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(setProgress);
      ticking = true;
    }
  }, { passive: true });
  addEventListener('resize', setProgress, { passive: true });
  setProgress();

  const menuButton = document.getElementById('menu-toggle');
  const menu = document.getElementById('nav-links');
  function closeMenu() {
    if (!menu || !menuButton) return;
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    menuButton.textContent = '☰';
  }
  if (menu && menuButton) {
    menuButton.addEventListener('click', () => {
      const opening = !menu.classList.contains('open');
      menu.classList.toggle('open', opening);
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Fechar menu' : 'Abrir menu');
      menuButton.textContent = opening ? '×' : '☰';
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth > 680) closeMenu(); }, { passive: true });
  }

  // A navegação por arraste funciona com mouse, touch e trackpad.
  // No celular, preservamos o scroll nativo para evitar gestos travados.
  document.querySelectorAll('.rail').forEach(rail => {
    let dragging = false, moved = false, startX = 0, startScroll = 0;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a,button,iframe')) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
    });
    rail.addEventListener('pointermove', e => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 5) moved = true;
      if (moved) {
        e.preventDefault();
        rail.classList.add('dragging');
        rail.scrollLeft = startScroll - delta;
      }
    });
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('dragging');
      if (moved) setTimeout(() => { moved = false; }, 0);
    };
    rail.addEventListener('pointerup', stop);
    rail.addEventListener('pointercancel', stop);
    rail.addEventListener('pointerleave', stop);
    rail.addEventListener('click', e => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
    rail.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * rail.clientWidth * .7, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
  document.querySelectorAll('[data-target][data-direction]').forEach(button => {
    button.addEventListener('click', () => {
      const rail = document.getElementById(button.dataset.target);
      if (!rail) return;
      const direction = Number(button.dataset.direction) || 1;
      rail.scrollBy({ left: direction * Math.max(210, rail.clientWidth * .75), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();