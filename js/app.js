(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const tokenKey = 'vd_token';
  const userKey = 'vd_user';
  const pageSlug = document.body.dataset.page || location.pathname.split('/').pop().replace('.html','') || 'index';
  let editing = false;
  const api = async (url, opts={}) => {
    const token = localStorage.getItem(tokenKey);
    const headers = opts.headers || {};
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.message || 'Ошибка запроса');
    return data;
  };
  const toast = (msg) => { let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)} t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600); };
  const user = () => { try{return JSON.parse(localStorage.getItem(userKey)||'null')}catch{return null} };
  const esc = (v) => String(v ?? '').replace(/[&<>'\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[m]));
  const money = (v) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;
  let catalogProducts = null;
  const setUserUI = () => {
    const u=user();
    $$('.js-user-name').forEach(e=>e.textContent=u?.name||u?.login||'Войти');
    $$('.js-logout').forEach(e=>e.classList.toggle('hidden',!u));
    $$('.js-admin-only').forEach(e=>e.classList.toggle('hidden',u?.role!=='admin'));
    const tb=$('.cms-toolbar'); if(tb) tb.classList.toggle('visible',u?.role==='admin');
  };
  const openAuth = () => $('.auth-modal')?.classList.add('open');
  const closeAuth = () => $('.auth-modal')?.classList.remove('open');
  const authMode = (mode) => {
    $$('.auth-tabs button').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));
    $('#registerFields')?.classList.toggle('hidden', mode!=='register');
    $('#authTitle').textContent = mode==='register' ? 'Регистрация' : 'Вход на сайт';
    $('#authSubmit').textContent = mode==='register' ? 'Создать аккаунт ❤' : 'Войти ❤';
    $('#authForm').dataset.mode = mode;
  };
  document.addEventListener('click', async (e)=>{
    if(e.target.closest('.hamburger')) $('.main-nav')?.classList.toggle('open');
    if(e.target.closest('[data-open-auth]')) openAuth();
    if(e.target.closest('[data-close-auth]')) closeAuth();
    const tab=e.target.closest('.auth-tabs button'); if(tab) authMode(tab.dataset.mode);
    if(e.target.closest('.js-logout')){localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);setUserUI();toast('Вы вышли из аккаунта');}
    if(e.target.closest('[data-cms-start]')) toggleEdit(true);
    if(e.target.closest('[data-cms-cancel]')) location.reload();
    if(e.target.closest('[data-cms-save]')) saveContent();
    const img=e.target.closest('[data-cms-image]');
    if(img && editing){
      const choice = prompt('Вставьте путь к картинке/URL или нажмите ОК и выберите файл. Текущий путь:', img.getAttribute('src')||'');
      if(choice){ img.setAttribute('src', choice); return; }
      const input=document.createElement('input'); input.type='file'; input.accept='image/*';
      input.onchange=async()=>{ if(!input.files[0])return; const fd=new FormData(); fd.append('image',input.files[0]); try{const data=await api('/api/upload',{method:'POST',body:fd}); img.setAttribute('src',data.url); toast('Картинка загружена');}catch(err){toast(err.message)} };
      input.click();
    }
  });
  $('#authForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget); const mode=e.currentTarget.dataset.mode||'login';
    const body = mode==='register' ? {name:fd.get('name'), email:fd.get('login'), password:fd.get('password')} : {login:fd.get('login'), password:fd.get('password')};
    try{const data=await api(mode==='register'?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify(body)});localStorage.setItem(tokenKey,data.token);localStorage.setItem(userKey,JSON.stringify(data.user));closeAuth();setUserUI();toast(data.user.role==='admin'?'Вы вошли как администратор':'Вы вошли на сайт');}
    catch(err){toast(err.message)}
  });
  $('#reviewForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    try{await api('/api/reviews',{method:'POST',body:JSON.stringify({author:fd.get('author'),rating:Number(fd.get('rating')),category:fd.get('category'),text:fd.get('text')})}); e.currentTarget.reset(); toast('Спасибо! Отзыв сохранён'); loadReviews();}
    catch(err){toast(err.message)}
  });
  function toggleEdit(on){ editing=on; document.body.classList.toggle('cms-editing', on); $$('[data-cms-text]').forEach(el=>el.contentEditable=on?'true':'false'); toast(on?'Режим редактирования включён. Кликните по тексту или картинке.':''); }
  async function loadContent(){
    try{const data=await api(`/api/content/${pageSlug}`); const c=data.content||{};
      Object.entries(c.texts||{}).forEach(([k,v])=>{const el=document.querySelector(`[data-cms-text="${CSS.escape(k)}"]`); if(el) el.innerHTML=v;});
      Object.entries(c.images||{}).forEach(([k,v])=>{const el=document.querySelector(`[data-cms-image="${CSS.escape(k)}"]`); if(el) el.setAttribute('src',v);});
    }catch(err){console.warn(err)}
  }
  async function saveContent(){
    const content={texts:{},images:{}};
    $$('[data-cms-text]').forEach(el=>content.texts[el.dataset.cmsText]=el.innerHTML.trim());
    $$('[data-cms-image]').forEach(el=>content.images[el.dataset.cmsImage]=el.getAttribute('src'));
    try{await api(`/api/content/${pageSlug}`,{method:'PUT',body:JSON.stringify({content})}); toast('Изменения сохранены в PostgreSQL'); toggleEdit(false);}catch(err){toast(err.message)}
  }
  async function loadReviews(){
    const box=$('[data-reviews-list]'); if(!box) return;
    try{const data=await api('/api/reviews'); const reviews=data.reviews.length?data.reviews:[
      {author:'Ольга С.',category:'Заказной торт',rating:5,text:'Заказывали торт на день рождения дочери. Нежно, красиво и очень вкусно. Гости были в восторге!'},
      {author:'Марина П.',category:'Капкейки',rating:5,text:'Капкейки просто тают во рту. Нежные, ароматные, с идеальным кремом.'},
      {author:'Евгений Л.',category:'Доставка',rating:5,text:'Оформление красивое, доставка вовремя, всё на высшем уровне.'}
    ];
      box.innerHTML=reviews.map(r=>`<article class="review-card"><div class="stars">${'★'.repeat(r.rating||5)}</div><p>${r.text}</p><div class="author">${r.author}</div><small>${r.category||''}</small></article>`).join('');
    }catch(err){console.warn(err)}
  }

  function productTextFromCard(card){
    return card.textContent.toLowerCase().replace(/\s+/g,' ');
  }
  function applyCatalogSearch(){
    const grid=$('[data-products-list]');
    const input=$('#catalogSearch');
    if(!grid || !input) return;
    const q=input.value.trim().toLowerCase();
    let visible=0;
    $$('.product-card', grid).forEach(card=>{
      const text=card.dataset.search || productTextFromCard(card);
      const ok=!q || text.includes(q);
      card.classList.toggle('hidden', !ok);
      if(ok) visible++;
    });
    $('[data-products-empty]')?.classList.toggle('hidden', visible!==0);
  }

  async function loadProducts(){
    const grid=$('[data-products-list]'); if(!grid) return;
    try{
      const data=await api('/api/products');
      const products=data.products||[];
      if(products.length){
        catalogProducts = products;
        grid.innerHTML=products.map((p)=>{
          const search=[p.name,p.description,p.category,p.weight,p.price].filter(Boolean).join(' ').toLowerCase();
          return `<article class="product-card" data-search="${esc(search)}"><span class="fav">♡</span><img src="${esc(p.image_url)}" alt="${esc(p.name)}"><div class="card-body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="meta"><span>${esc(p.weight||p.category||'')}</span><span class="price">${money(p.price)}</span></div></div></article>`;
        }).join('');
      }
      $$('.product-card', grid).forEach(card=>{ if(!card.dataset.search) card.dataset.search=productTextFromCard(card); });
      applyCatalogSearch();
    }catch(err){
      console.warn(err);
      $$('.product-card', grid).forEach(card=>{ if(!card.dataset.search) card.dataset.search=productTextFromCard(card); });
    }
  }
  $('#catalogSearch')?.addEventListener('input', applyCatalogSearch);
  setUserUI(); loadContent(); loadReviews(); loadProducts();
})();
