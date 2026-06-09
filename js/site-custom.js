document.addEventListener('DOMContentLoaded', function () {
  const body = document.body;
  const headerInner = document.querySelector('.header__osnova');
  const menu = document.querySelector('.header__menu');

  if (headerInner && menu && !document.querySelector('.site-menu-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'site-menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Открыть меню');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="site-menu-toggle__icon"><span></span></span><span>Меню</span>';
    headerInner.appendChild(toggle);

    toggle.addEventListener('click', function () {
      const isOpen = body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    });
  }

  document.querySelectorAll('.header__menu-box').forEach(function (box) {
    const trigger = box.querySelector('.header__menu-name');
    const submenu = box.querySelector('.css-menu');
    if (!trigger || !submenu) return;

    trigger.setAttribute('tabindex', '0');
    trigger.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 1050px)').matches) {
        event.preventDefault();
        box.classList.toggle('is-open');
      }
    });
    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        box.classList.toggle('is-open');
      }
    });
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.header') && body.classList.contains('menu-open')) {
      body.classList.remove('menu-open');
      const toggle = document.querySelector('.site-menu-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      body.classList.remove('menu-open');
      const toggle = document.querySelector('.site-menu-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.querySelectorAll('form:not(#review-form)').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Спасибо! Заявка на сайте «Вкусный дворик» принята. Подключите обработчик формы на вашем хостинге, чтобы получать обращения.');
    });
  });
});
