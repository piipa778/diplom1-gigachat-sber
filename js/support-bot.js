(function(){
  const STORAGE_KEY = 'vd_support_bot_messages';
  const fallbackAnswers = [
    { keys:['достав','курьер','привез'], text:'Доставка обсуждается при оформлении заказа. Укажите адрес, дату и время, а менеджер подтвердит условия.' },
    { keys:['оплат','карта','налич'], text:'Оплату можно согласовать с менеджером при подтверждении заказа. Подготовьте название десерта, дату и телефон.' },
    { keys:['контакт','телефон','адрес','почт'], text:'Контакты: +7 (495) 123-45-67, info@vkusnydvorik.ru, г. Москва, ул. Сладкая, 10.' },
    { keys:['заказ','заказать','оформ'], text:'Для заказа сообщите название десерта, количество, дату, время, адрес доставки и телефон для связи.' },
    { keys:['торт','капкей','макар','десерт','цена','стоим','каталог'], text:'Откройте каталог и выберите десерт. Можете написать точное название или категорию, а я подскажу, что уточнить у менеджера.' }
  ];
  const css = `
    .support-bot-toggle{position:fixed;right:24px;bottom:24px;z-index:150;width:64px;height:64px;border-radius:50%;border:0;background:#e95770;color:#fff;box-shadow:0 18px 45px rgba(61,29,19,.24);cursor:pointer;font-size:28px;display:grid;place-items:center}
    .support-bot-toggle:hover{transform:translateY(-2px)}
    .support-bot{position:fixed;right:24px;bottom:102px;z-index:151;width:min(390px,calc(100vw - 32px));height:560px;max-height:calc(100vh - 128px);background:#fffaf4;border:1px solid #eadbd2;border-radius:30px;box-shadow:0 28px 90px rgba(25,8,5,.28);display:none;overflow:hidden;font-family:Montserrat,Arial,sans-serif;color:#3a211c}
    .support-bot.open{display:flex;flex-direction:column}.support-bot__head{padding:18px 20px;background:linear-gradient(135deg,#32140f,#4a2119);color:#fff;display:flex;align-items:center;gap:12px}.support-bot__avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#e95770;font-size:22px}.support-bot__title{font-weight:900}.support-bot__subtitle{font-size:12px;color:#f4dad0}.support-bot__close{margin-left:auto;border:0;background:rgba(255,255,255,.14);color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer}.support-bot__messages{flex:1;overflow:auto;padding:18px;background:linear-gradient(180deg,#fff8ef,#fffaf4)}.support-bot__msg{max-width:84%;padding:12px 14px;border-radius:18px;margin:0 0 12px;white-space:pre-line;font-size:14px;line-height:1.45}.support-bot__msg.bot{background:#fff;border:1px solid #eadbd2;border-top-left-radius:6px}.support-bot__msg.user{background:#e95770;color:#fff;margin-left:auto;border-top-right-radius:6px}.support-bot__quick{display:flex;gap:8px;flex-wrap:wrap;padding:0 18px 12px;background:#fffaf4}.support-bot__quick button{border:1px solid #eadbd2;background:#fff;border-radius:999px;padding:8px 12px;color:#32140f;font-weight:800;cursor:pointer;font-size:12px}.support-bot__form{display:flex;gap:10px;padding:14px;background:#fff;border-top:1px solid #eadbd2}.support-bot__input{flex:1;border:0;outline:0;border-radius:18px;background:#fff8ef;padding:14px 16px;font:inherit;box-shadow:inset 0 0 0 1px #eadbd2}.support-bot__send{border:0;border-radius:18px;background:#32140f;color:#fff;padding:0 17px;font-weight:900;cursor:pointer}@media(max-width:760px){.support-bot-toggle{right:16px;bottom:16px}.support-bot{right:16px;bottom:88px;height:calc(100vh - 112px);border-radius:24px}}`;
  function addStyles(){ const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style); }
  function loadMessages(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []} }
  function saveMessages(messages){ localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m])); }
  function localAnswer(text){ const q=String(text).toLowerCase().replace('ё','е'); const found=fallbackAnswers.find(item=>item.keys.some(k=>q.includes(k))); return found ? found.text : 'Я помогу с каталогом, доставкой, оплатой, контактами и оформлением заказа. Напишите, что именно вас интересует.'; }
  function createBot(){
    addStyles();
    const toggle=document.createElement('button'); toggle.className='support-bot-toggle'; toggle.type='button'; toggle.title='ИИ-бот поддержки'; toggle.textContent='💬';
    const bot=document.createElement('section'); bot.className='support-bot'; bot.setAttribute('aria-label','ИИ-бот поддержки');
    bot.innerHTML=`<div class="support-bot__head"><div class="support-bot__avatar">🤖</div><div><div class="support-bot__title">ИИ-бот поддержки</div><div class="support-bot__subtitle">Отвечает по заказам и каталогу</div></div><button class="support-bot__close" type="button">×</button></div><div class="support-bot__messages"></div><div class="support-bot__quick"><button type="button">Как оформить заказ?</button><button type="button">Какие есть торты?</button><button type="button">Доставка</button><button type="button">Контакты</button></div><form class="support-bot__form"><input class="support-bot__input" name="message" placeholder="Напишите вопрос..." autocomplete="off"><button class="support-bot__send" type="submit">➤</button></form>`;
    document.body.append(bot, toggle);
    const messagesBox=bot.querySelector('.support-bot__messages');
    let messages=loadMessages();
    if(!messages.length) messages=[{role:'bot', text:'Здравствуйте! Я ИИ-бот поддержки «Вкусный дворик». Помогу выбрать десерт, узнать цену, доставку или контакты.'}];
    function render(){ messagesBox.innerHTML=messages.map(m=>`<div class="support-bot__msg ${m.role==='user'?'user':'bot'}">${esc(m.text)}</div>`).join(''); messagesBox.scrollTop=messagesBox.scrollHeight; saveMessages(messages); }
    async function ask(text){
      const clean=String(text||'').trim(); if(!clean) return;
      messages.push({role:'user', text:clean});
      const history=messages.filter(m=>m.text && m.text!=='Печатаю ответ…').slice(-8).map(m=>({role:m.role==='user'?'user':'assistant', text:m.text}));
      messages.push({role:'bot', text:'Печатаю ответ…'}); render();
      try{
        const res=await fetch('/api/support/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:clean, history})});
        const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.message||'Ошибка');
        messages[messages.length-1]={role:'bot', text:data.answer};
      }catch(e){ messages[messages.length-1]={role:'bot', text:localAnswer(clean)}; }
      render();
    }
    render();
    toggle.addEventListener('click',()=>{bot.classList.toggle('open'); if(bot.classList.contains('open')) bot.querySelector('.support-bot__input').focus();});
    bot.querySelector('.support-bot__close').addEventListener('click',()=>bot.classList.remove('open'));
    bot.querySelector('.support-bot__form').addEventListener('submit',(e)=>{e.preventDefault(); const input=e.currentTarget.message; ask(input.value); input.value='';});
    bot.querySelectorAll('.support-bot__quick button').forEach(btn=>btn.addEventListener('click',()=>ask(btn.textContent)));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', createBot); else createBot();
})();
