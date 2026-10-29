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

  // Desktop: arraste verdadeiro com captura de ponteiro, sem saltos.
  // Mobile: preserve o gesto nativo de rolagem horizontal.
  document.querySelectorAll('.rail').forEach(rail => {
    let dragging = false, moved = false, suppressClick = false, pointerId = -1, startX = 0, startScroll = 0;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a,button,iframe')) return;
      dragging = true; moved = false; pointerId = e.pointerId;
      startX = e.clientX; startScroll = rail.scrollLeft;
      rail.classList.add('dragging');
      rail.setPointerCapture?.(e.pointerId);
    });
    rail.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;
      if (moved) { rail.scrollLeft = startScroll - delta; e.preventDefault(); }
    });
    const stopDrag = e => {
      if (!dragging) return;
      if (e && e.pointerId !== pointerId) return;
      dragging = false; pointerId = -1;
      rail.classList.remove('dragging');
      if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; moved = false; }, 110); }
    };
    rail.addEventListener('pointerup', stopDrag);
    rail.addEventListener('pointercancel', stopDrag);
    rail.addEventListener('lostpointercapture', stopDrag);
    rail.addEventListener('click', e => {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);
    rail.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * rail.clientWidth * .72, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
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
  // KPIs: anima a contagem ao entrar na viewport, sem mudar o valor real.
  const counters = [...document.querySelectorAll('[data-count][data-format]')];
  const formatCounter = (value, fmt, final) => {
    if (fmt === 'currency') {
      return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(value);
    }
    if (fmt === 'millions') return (value/1000000).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' mi';
    return Math.round(value).toLocaleString('pt-BR');
  };
  const runCounter = el => {
    if (el.dataset.animated === 'true') return;
    el.dataset.animated = 'true';
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const fmt = el.dataset.format;
    if (prefersReducedMotion) { el.textContent = formatCounter(target,fmt,true); return; }
    const duration = 1450;
    let start = null;
    const tick = time => {
      if (start === null) start = time;
      const progress = Math.min((time-start)/duration,1);
      const eased = 1 - Math.pow(1-progress,3);
      el.textContent = formatCounter(target*eased,fmt,progress===1);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatCounter(target,fmt,true);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const metricObserver = new IntersectionObserver((entries,obs) => {
      entries.forEach(entry => {if(entry.isIntersecting){runCounter(entry.target);obs.unobserve(entry.target);}});
    },{threshold:.35});
    counters.forEach(el => metricObserver.observe(el));
  } else counters.forEach(runCounter);
  // Retém os players dentro do site sem travar o swipe do carrossel:
  // controles são ativados somente quando o visitante pede.
  document.querySelectorAll('.video-interact').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.video-card');
      const active = !card.classList.contains('is-interactive');
      document.querySelectorAll('.video-card.is-interactive').forEach(other => {
        if(other===card) return;
        other.classList.remove('is-interactive');
        const otherButton=other.querySelector('.video-interact');
        if(otherButton) {otherButton.textContent='Ativar controles ↗';otherButton.setAttribute('aria-pressed','false');}
      });
      card.classList.toggle('is-interactive',active);
      button.setAttribute('aria-pressed',String(active));
      button.textContent=active?'Desativar controles ↔':'Ativar controles ↗';
    });
  });
  // Player oficial: carrega somente ao entrar na área visível e pausa ao sair.
  // Autoplay é uma tentativa (sem som) e pode ser bloqueado pelo navegador.
  const players = [...document.querySelectorAll('.tiktok-player[data-video-id]')];
  const playerOrigin = 'https://www.tiktok.com';
  const playerMessage = (frame, type) => {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({type, 'x-tiktok-player': true}, playerOrigin);
  };
  const mountPlayer = (frame) => {
    if (frame.src) return;
    const id = frame.dataset.videoId;
    if (!/^[0-9]{15,22}$/.test(id || '')) return;
    const params = new URLSearchParams({autoplay:'1',muted:'1',loop:'1',controls:'1',rel:'0',music_info:'0',description:'0'});
    frame.src = playerOrigin + '/player/v1/' + id + '?' + params.toString();
    frame.dataset.mounted = 'true';
  };
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const frame = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= .42) {
          mountPlayer(frame);
          if (frame.dataset.ready === 'true') playerMessage(frame, 'play');
        } else if (frame.dataset.mounted === 'true') {
          playerMessage(frame, 'pause');
        }
      });
    }, { threshold:[0,.42,.7], rootMargin:'80px 0px 0px 0px' });
    players.forEach(p => videoObserver.observe(p));
  } else {
    players.forEach(mountPlayer);
  }
  window.addEventListener('message', event => {
    if (event.origin !== playerOrigin || !event.data || event.data['x-tiktok-player'] !== true) return;
    if (event.data.type !== 'onPlayerReady') return;
    const target = players.find(p => p.contentWindow === event.source);
    if (target) { target.dataset.ready = 'true'; }
  });
  
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
(function(){
 const floating=document.querySelector('.mobile-contact');
 if(!floating)return;
 let raf=0;
 const update=()=>{floating.classList.toggle('is-compact',window.scrollY>260);raf=0;};
 window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(update)},{passive:true});
 update();
})();
