(() => {
  const attach = () => {
    const shell = document.querySelector('.admin-shell');
    const sidebar = shell?.querySelector('.admin-sidebar');
    const header = shell?.querySelector('.admin-header');
    if (!shell || !sidebar || !header) return;

    let menu = header.querySelector('.admin-menu-button');
    if (!menu) {
      menu = document.createElement('button');
      menu.className = 'admin-menu-button';
      menu.type = 'button';
      menu.setAttribute('aria-label', 'Open admin menu');
      menu.setAttribute('aria-expanded', 'false');
      menu.innerHTML = '<span aria-hidden="true">☰</span>';
      const left = header.querySelector('.admin-header-left') || header.firstElementChild;
      if (left) left.prepend(menu);
    }

    let scrim = shell.querySelector('.admin-mobile-scrim');
    if (!scrim) {
      scrim = document.createElement('button');
      scrim.className = 'admin-mobile-scrim';
      scrim.type = 'button';
      scrim.setAttribute('aria-label', 'Close admin menu');
      shell.prepend(scrim);
    }

    let close = sidebar.querySelector('.admin-mobile-close');
    if (!close) {
      close = document.createElement('button');
      close.className = 'admin-mobile-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close admin menu');
      close.innerHTML = '×';
      const brand = sidebar.querySelector('.admin-brand');
      if (brand) brand.appendChild(close);
    }

    if (menu.dataset.adminBound === '1') return;
    menu.dataset.adminBound = '1';
    const closeMenu = () => {
      sidebar.classList.remove('mobile-open', 'is-open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open admin menu');
      scrim.style.display = '';
    };
    const openMenu = () => {
      sidebar.classList.add('mobile-open');
      menu.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-label', 'Close admin menu');
      scrim.style.display = '';
    };
    menu.addEventListener('click', () => sidebar.classList.contains('mobile-open') ? closeMenu() : openMenu());
    close.addEventListener('click', closeMenu);
    scrim.addEventListener('click', closeMenu);
    sidebar.querySelectorAll('nav button, .back-bank').forEach((button) => button.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => { if (window.innerWidth > 720) closeMenu(); });
  };
  const observer = new MutationObserver(attach);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  attach();
})();
