const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');

const header = document.querySelector('.site-header');
if (header) {
  let queued = false;
  const update = () => {
    queued = false;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
  update();
}

const menu = document.querySelector('.menu');
if (menu) {
  const toggle = menu.querySelector('summary');
  const close = () => {
    menu.open = false;
  };
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    close();
    toggle.focus();
  });
  // The backdrop is the menu's own ::after, so its clicks target the menu element.
  document.addEventListener('click', event => {
    const { target } = event;
    if (menu.open && (target === menu || !menu.contains(target) || target.closest('.menu-panel a'))) close();
  });
  window.matchMedia('(min-width: 60.01rem)').addEventListener('change', event => {
    if (event.matches) close();
  });
  window.addEventListener('pagehide', close);
}

const revealTargets = '.section-heading, .cards > .card, .steps > li, .callout, .split > *, .service-detail > *, .prose > *, .form-panel, .form-aside';
if (motion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      const settle = event => {
        if (event.target !== target) return;
        target.removeEventListener('transitionend', settle);
        target.classList.remove('reveal');
      };
      target.addEventListener('transitionend', settle);
      target.classList.remove('reveal-pending');
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const target of document.querySelectorAll(revealTargets)) {
    if (target.getBoundingClientRect().top <= window.innerHeight) continue;
    target.classList.add('reveal', 'reveal-pending');
    observer.observe(target);
  }
}

if (motion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const card of document.querySelectorAll('.card')) {
    card.addEventListener('pointermove', event => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${Math.round(event.clientX - box.left)}px`);
      card.style.setProperty('--spot-y', `${Math.round(event.clientY - box.top)}px`);
    });
  }
}

// iOS Safari only applies :active styles while a touch listener is registered.
document.addEventListener('touchstart', () => {}, { passive: true });

const inquiry = document.querySelector('form[method="post"]');
const submit = inquiry?.querySelector('button[type="submit"]');
if (submit) {
  const label = submit.textContent;
  inquiry.addEventListener('submit', () => {
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'Sending inquiry…';
  });
  window.addEventListener('pageshow', () => {
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
    submit.textContent = label;
  });
}
