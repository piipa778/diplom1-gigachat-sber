(function () {
  const TEXT_SELECTOR = 'main h1, main h2, main h3, main h4, main h5, main h6, main p, main li, main a, main span, main strong, main b, section h1, section h2, section h3, section h4, section p, section li, section a, section span, section strong, section b, .page-hero h1, .page-hero p, .breadcrumbs, .metric__num, .metric__label, .menu-meta span, .contact-card__body strong, .contact-card__body p, .contact-card__body a, .review-card__body p, .review-card__body strong, .timeline-item__date, .timeline-item__content h3, .timeline-item__content p';
  const IMAGE_SELECTOR = 'main img, section img, .page-hero img, .info-card img, .menu-card img, .news-card img, .lead-block img, .simple-banner img';
  const tokenKey = 'vd_admin_token';
  let currentContent = { texts: {}, images: {} };
  let editMode = false;

  function slug() {
    const name = (location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    return name || 'index.html';
  }

  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += '#' + node.id;
        parts.unshift(part);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join('>');
  }

  function editableTextNodes() {
    return Array.from(document.querySelectorAll(TEXT_SELECTOR)).filter((el) => {
      if (el.closest('.cms-toolbar,.admin-page,script,style,noscript')) return false;
      if (el.querySelector('img,video,iframe,form,input,textarea,select,button')) return false;
      return (el.textContent || '').trim().length > 0;
    });
  }

  function editableImages() {
    return Array.from(document.querySelectorAll(IMAGE_SELECTOR)).filter((el) => !el.closest('.cms-toolbar,.admin-page'));
  }

  function assignKeys() {
    editableTextNodes().forEach((el) => {
      el.dataset.cmsType = 'text';
      el.dataset.cmsKey = el.dataset.cmsKey || cssPath(el);
    });
    editableImages().forEach((el) => {
      el.dataset.cmsType = 'image';
      el.dataset.cmsKey = el.dataset.cmsKey || cssPath(el);
    });
  }

  async function api(url, options) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options && options.headers ? options.headers : {});
    const response = await fetch(url, Object.assign({}, options, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Ошибка запроса');
    return data;
  }

  async function loadContent() {
    assignKeys();
    try {
      const data = await api('/api/content/' + encodeURIComponent(slug()));
      currentContent = data.content || { texts: {}, images: {} };
      currentContent.texts = currentContent.texts || {};
      currentContent.images = currentContent.images || {};
      applyContent();
    } catch (error) {
      console.warn('CMS content load error:', error.message);
    }
  }

  function applyContent() {
    editableTextNodes().forEach((el) => {
      const value = currentContent.texts[el.dataset.cmsKey];
      if (typeof value === 'string') el.textContent = value;
    });
    editableImages().forEach((img) => {
      const data = currentContent.images[img.dataset.cmsKey];
      if (data && data.src) img.src = data.src;
      if (data && typeof data.alt === 'string') img.alt = data.alt;
    });
  }

  async function saveContent() {
    const token = localStorage.getItem(tokenKey);
    if (!token) return alert('Сначала войдите как администратор.');
    currentContent.texts = currentContent.texts || {};
    currentContent.images = currentContent.images || {};
    editableTextNodes().forEach((el) => {
      currentContent.texts[el.dataset.cmsKey] = (el.textContent || '').trim();
    });
    editableImages().forEach((img) => {
      currentContent.images[img.dataset.cmsKey] = { src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' };
    });
    await api('/api/content/' + encodeURIComponent(slug()), {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify({ content: currentContent })
    });
    flash('Сохранено');
  }

  function setEditMode(value) {
    editMode = value;
    document.body.classList.toggle('cms-edit-mode', editMode);
    editableTextNodes().forEach((el) => {
      el.contentEditable = editMode ? 'true' : 'false';
      if (editMode) el.setAttribute('spellcheck', 'true');
    });
  }

  function flash(text) {
    const node = document.querySelector('.cms-toolbar__status');
    if (!node) return;
    node.textContent = text;
    setTimeout(() => { node.textContent = ''; }, 2200);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function enableImageEditing() {
    document.addEventListener('click', async (event) => {
      if (!editMode) return;
      const img = event.target.closest('img[data-cms-type="image"]');
      if (!img) return;
      event.preventDefault();
      event.stopPropagation();
      const choice = prompt('Вставьте путь/URL картинки. Для загрузки файла нажмите ОК с пустым полем.', img.getAttribute('src') || '');
      if (choice === null) return;
      if (choice.trim()) {
        img.src = choice.trim();
        const alt = prompt('Alt-текст картинки:', img.getAttribute('alt') || '');
        if (alt !== null) img.alt = alt;
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) return alert('Файл слишком большой. Используйте изображение до 6 МБ.');
        img.src = await fileToDataUrl(file);
        const alt = prompt('Alt-текст картинки:', img.getAttribute('alt') || '');
        if (alt !== null) img.alt = alt;
      };
      input.click();
    }, true);
  }

  async function login(login, password) {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) });
    localStorage.setItem(tokenKey, data.token);
    return data;
  }

  function createToolbar() {
    if (document.querySelector('.cms-toolbar')) return;
    const bar = document.createElement('div');
    bar.className = 'cms-toolbar';
    bar.innerHTML = '<strong>Админ</strong><button type="button" data-action="login">Войти</button><button type="button" data-action="edit">Редактировать</button><button type="button" data-action="save">Сохранить</button><button type="button" data-action="logout">Выйти</button><a href="/admin.html">Панель</a><span class="cms-toolbar__status"></span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', async (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      try {
        if (action === 'login') {
          const loginValue = prompt('Логин администратора:', 'admin');
          if (loginValue === null) return;
          const passwordValue = prompt('Пароль администратора:');
          if (passwordValue === null) return;
          await login(loginValue, passwordValue);
          flash('Вход выполнен');
        }
        if (action === 'edit') setEditMode(!editMode);
        if (action === 'save') await saveContent();
        if (action === 'logout') { localStorage.removeItem(tokenKey); setEditMode(false); flash('Вы вышли'); }
      } catch (error) { alert(error.message); }
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    await loadContent();
    enableImageEditing();
    if (location.search.includes('admin=1') || localStorage.getItem(tokenKey)) createToolbar();
  });
})();
