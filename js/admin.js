(function(){
 const tokenKey='vd_token', userKey='vd_user';
 const $=(s,r=document)=>r.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
 const user=()=>{try{return JSON.parse(localStorage.getItem(userKey)||'null')}catch{return null}};
 const api=async(url,opts={})=>{const token=localStorage.getItem(tokenKey);const headers=opts.headers||{};if(!(opts.body instanceof FormData))headers['Content-Type']='application/json';if(token)headers.Authorization=`Bearer ${token}`;const res=await fetch(url,{...opts,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Ошибка');return data};
 const fmt=d=>d?new Date(d).toLocaleString('ru-RU'):'';
 const money=v=>`${Number(v||0).toLocaleString('ru-RU')} ₽`;
 const emptyProduct={id:'',name:'',description:'',category:'Торты',weight:'',price:'',image_url:'',is_active:true};
 let productsCache=[];
 function productForm(p=emptyProduct){
   return `<form id="productForm" class="product-admin-form" data-id="${esc(p.id)}">
    <h3>${p.id?'Редактировать блюдо':'Добавить новое блюдо'}</h3>
    <div class="form-grid">
      <input class="input" name="name" placeholder="Название блюда" value="${esc(p.name)}" required>
      <input class="input" name="category" placeholder="Категория: Торты, Пирожные..." value="${esc(p.category||'Торты')}">
      <input class="input" name="weight" placeholder="Вес / количество: 1 кг, 6 шт." value="${esc(p.weight)}">
      <input class="input" name="price" type="number" min="0" step="1" placeholder="Цена" value="${esc(p.price)}" required>
      <textarea class="full" name="description" placeholder="Описание блюда" required>${esc(p.description)}</textarea>
      <input class="input full" name="image_url" placeholder="Путь к картинке или URL" value="${esc(p.image_url)}">
      <input class="input full" name="image_file" type="file" accept="image/*">
      <label class="full admin-check"><input type="checkbox" name="is_active" ${p.is_active!==false?'checked':''}> Показывать блюдо на сайте</label>
    </div>
    <div class="admin-actions"><button class="btn pink" type="submit">${p.id?'Сохранить изменения':'Добавить блюдо'}</button>${p.id?'<button class="btn light" type="button" data-new-product>Очистить форму</button>':''}</div>
   </form>`;
 }
 function productRows(items){
   return `<table class="admin-table"><thead><tr><th>ID</th><th>Фото</th><th>Блюдо</th><th>Категория</th><th>Цена</th><th>Статус</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td>${x.id}</td><td><img class="admin-thumb" src="${esc(x.image_url)}" alt=""></td><td><b>${esc(x.name)}</b><br><small>${esc(x.description)}</small><br><small>${esc(x.weight||'')}</small></td><td>${esc(x.category)}</td><td>${money(x.price)}</td><td>${x.is_active?'Показывается':'Скрыто'}</td><td><button class="btn small light" data-edit-product="${x.id}">Редактировать</button><button class="btn small pink" data-delete-product="${x.id}">Удалить</button></td></tr>`).join('')||'<tr><td colspan="7">Блюд пока нет</td></tr>'}</tbody></table>`;
 }
 async function load(tab='users'){
   const u=user(); if(u?.role!=='admin'){ $('#adminTitle').textContent='Нужен вход администратора'; return; }
   try{
    if(tab==='users'){
      $('#adminTitle').textContent='Пользователи сайта';
      const d=await api('/api/admin/users');
      $('#adminContent').innerHTML=`<table class="admin-table"><thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Роль</th><th>Создан</th></tr></thead><tbody>${d.users.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${fmt(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="5">Пользователей пока нет</td></tr>'}</tbody></table>`;
    }
    if(tab==='products'){
      $('#adminTitle').textContent='Блюда каталога';
      const d=await api('/api/products?all=1'); productsCache=d.products||[];
      $('#adminContent').innerHTML=`<p>Здесь можно добавить новое блюдо, изменить цену, описание, категорию и картинку. Всё сохраняется в PostgreSQL и сразу отображается в каталоге.</p>${productForm()}${productRows(productsCache)}`;
    }
    if(tab==='reviews'){
      $('#adminTitle').textContent='Отзывы пользователей';
      const d=await api('/api/reviews?all=1');
      $('#adminContent').innerHTML=`<table class="admin-table"><thead><tr><th>ID</th><th>Автор</th><th>Оценка</th><th>Текст</th><th>Статус</th><th></th></tr></thead><tbody>${d.reviews.map(x=>`<tr><td>${x.id}</td><td>${esc(x.author)}<br><small>${esc(x.category)}</small></td><td>${'★'.repeat(x.rating)}</td><td>${esc(x.text)}</td><td>${x.is_published?'Опубликован':'Скрыт'}</td><td><button class="btn small light" data-toggle-review="${x.id}" data-status="${!x.is_published}">${x.is_published?'Скрыть':'Опубликовать'}</button><button class="btn small pink" data-delete-review="${x.id}">Удалить</button></td></tr>`).join('')||'<tr><td colspan="6">Отзывов пока нет</td></tr>'}</tbody></table>`;
    }
    if(tab==='edits'){
      $('#adminTitle').textContent='История редактирования администратором';
      const d=await api('/api/admin/edits');
      $('#adminContent').innerHTML=`<table class="admin-table"><thead><tr><th>ID</th><th>Админ</th><th>Действие</th><th>Объект</th><th>Детали</th><th>Дата</th></tr></thead><tbody>${d.edits.map(x=>`<tr><td>${x.id}</td><td>${esc(x.admin_login)}</td><td>${esc(x.action)}</td><td>${esc(x.target)}</td><td><code>${esc(JSON.stringify(x.details))}</code></td><td>${fmt(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="6">Редактирований пока нет</td></tr>'}</tbody></table>`;
    }
   }catch(e){ $('#adminContent').innerHTML=`<p>${esc(e.message)}</p><button class="btn" data-open-auth>Войти</button>`; }
 }
 async function collectProduct(form){
   const fd=new FormData(form);
   let imageUrl=String(fd.get('image_url')||'').trim();
   const file=fd.get('image_file');
   if(file && file.size){
    const uploadFd=new FormData(); uploadFd.append('image',file);
    const uploaded=await api('/api/upload',{method:'POST',body:uploadFd}); imageUrl=uploaded.url;
   }
   return {name:fd.get('name'),description:fd.get('description'),category:fd.get('category'),weight:fd.get('weight'),price:Number(fd.get('price')),image_url:imageUrl,is_active:fd.get('is_active')==='on'};
 }
 document.addEventListener('submit',async e=>{
   if(e.target.id==='productForm'){
    e.preventDefault();
    try{
      const id=e.target.dataset.id; const body=await collectProduct(e.target);
      await api(id?`/api/admin/products/${id}`:'/api/admin/products',{method:id?'PUT':'POST',body:JSON.stringify(body)});
      await load('products');
    }catch(err){alert(err.message)}
   }
 });
 document.addEventListener('click',async e=>{
   const tab=e.target.closest('[data-admin-tab]'); if(tab) load(tab.dataset.adminTab);
   const tog=e.target.closest('[data-toggle-review]'); if(tog){ await api(`/api/reviews/${tog.dataset.toggleReview}`,{method:'PATCH',body:JSON.stringify({is_published:tog.dataset.status==='true'})}); load('reviews');}
   const del=e.target.closest('[data-delete-review]'); if(del && confirm('Удалить отзыв?')){ await api(`/api/reviews/${del.dataset.deleteReview}`,{method:'DELETE'}); load('reviews');}
   const edit=e.target.closest('[data-edit-product]'); if(edit){const p=productsCache.find(x=>String(x.id)===String(edit.dataset.editProduct)); if(p){$('#adminContent').innerHTML=`${productForm(p)}${productRows(productsCache)}`; window.scrollTo({top:0,behavior:'smooth'});}}
   const newBtn=e.target.closest('[data-new-product]'); if(newBtn){$('#adminContent').innerHTML=`${productForm()}${productRows(productsCache)}`;}
   const delProduct=e.target.closest('[data-delete-product]'); if(delProduct && confirm('Удалить блюдо из каталога?')){await api(`/api/admin/products/${delProduct.dataset.deleteProduct}`,{method:'DELETE'});load('products');}
 });
 setTimeout(()=>load('users'),300);
 window.addEventListener('storage',()=>load('users'));
})();
