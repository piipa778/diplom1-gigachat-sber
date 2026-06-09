

document.addEventListener("DOMContentLoaded", function() {
    document.querySelector('body').insertAdjacentHTML("beforeEnd",  ''+
        '<div class="pwrbox__but js-pwr-form">'+
            '<svg class="pwrbox__but-icon" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg"><path d="M4.626 9.954a19.357 19.357 0 0 0 8.42 8.42l2.811-2.81a1.27 1.27 0 0 1 1.303-.307c1.432.472 2.978.728 4.562.728.703 0 1.278.575 1.278 1.278v4.46c0 .702-.575 1.277-1.278 1.277C9.724 23 0 13.276 0 1.278 0 .575.575 0 1.278 0H5.75c.703 0 1.278.575 1.278 1.278 0 1.597.255 3.13.728 4.561.14.448.038.946-.32 1.304l-2.81 2.81z" fill="#fff"/></svg>'+
        '</div>'+
        '<div class="pwrbox__fon"></div>'+
        '<div class="pwrbox__form">'+
            '<div class="pwrbox__close js-pwr-close">'+
                '<svg class="pwrbox__close-icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="m1 1 12 12M1 13 13 1" stroke="#8b8b8b" stroke-width="2" stroke-linecap="round"/></svg>'+
            '</div>'+
            '<img src="https://svc.blacklemon.ru/pwrbox/images/16611143931243765794.jpg" class="pwrbox__logo" loading="lazy">'+
            '<div class="pwrbox__zag">Здравствуйте!<br>Оставьте номер, и мы Вам перезвоним!</div>'+
            '<input type="text" name="pwrbox-phone" class="pwrbox__phone pwrbox__input-style" placeholder="+7 (___) ___-__-__">'+
            '<div class="pwrbox__form-but pwrbox__but-style">Позвоните мне!</div>'+
            '<div class="pwrbox__politica">'+
            	'<input type="checkbox" name="pwrbox-politsuc" id="pwrbox-politsuc" class="pwrbox__sucs">'+
            	'<label class="pwrbox__politica-text" for="pwrbox-politsuc">Нажимая «Позвоните мне», я подтверждаю, что ознакомлен с <a href="https://shafran56.ru/politica.html" class="pwrbox__politica-href" target="_blank">Политикой обработки ПД</a> компании и подтверждаю <a href="https://shafran56.ru/politica.html" class="pwrbox__politica-href" target="_blank">согласие на обработку</a> персональных данных.</label>'+
            '</div>'+
        '</div>');

    function pwrOpen() {
        document.querySelector('.pwrbox__form').style.right = "0px";
        document.querySelector('.pwrbox__fon').style.visibility = "visible";
        document.querySelector('.pwrbox__fon').style.opacity = "1";
    }

    function pwrClose() {
        document.querySelector('.pwrbox__form').style.right = "-100%";
        document.querySelector('.pwrbox__fon').style.visibility = "hidden";
        document.querySelector('.pwrbox__fon').style.opacity = "0";
    }

    const locale = document.location.href.replace(/http(s|):\/\//, '');
    const nomerRegex = /^\+7\s\([0-9]{3,3}\)\s[0-9]{3,3}-[0-9]{2,2}-[0-9]{2,2}$/;
    async function sendNomer() {
        let nomer = document.querySelector('.pwrbox__phone').value;
        if (nomerRegex.test(nomer)&&document.querySelector('input[name=pwrbox-politsuc]').checked) {
            if ('+7 (915) 319-61-45'!=nomer&&'+7 (977) 320-59-00'!=nomer&&'+7 (495) 468-44-13'!=nomer&&'+7 (987) 846-46-43'!=nomer) {
                await fetch("https://svc.blacklemon.ru/pwrbox/widget/inmail.php", {
                    method: 'POST', mode: 'no-cors', cache: 'no-cache', credentials: 'same-origin', 
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    redirect: 'follow', referrerPolicy: 'no-referrer-when-downgrade',
                    body:   'nomer3lp='+nomer.replace("+", "%2B")+'&url='+locale+'&wdgkey=16611143931243765794',
                })
                //if (prov.replace(/\s/gi,'')=='good') {
            
                document.querySelector('.pwrbox__zag').innerHTML = "Спасибо за заявку!";
                document.querySelector('input[name="pwrbox-phone"]').remove();
                document.querySelector('.pwrbox__form-but').remove();
                document.querySelector('.pwrbox__politica').remove();
                                    //ym(30094214, 'reachGoal', 'PWR_ZVN');
                    yaCounter30094214.reachGoal('PWR_ZVN');
                    //return true;
                                            }
        }else{
        	document.querySelector('.pwrbox__phone').style.background = "#ff000040";
            document.querySelector('input[name=pwrbox-politsuc]').style.background = "#ff000040";
            setTimeout( function () { document.querySelector('.pwrbox__phone').removeAttribute('style'); }, 3000);  
        }
    }

    const phoneInput = document.querySelector(".pwrbox__phone");

    function pwrMask() {
        let k = phoneInput.value.replace(/\D/g, '').replace(/^7/, ''); 
        let number = '+7 ('+(k[0]?k[0]:'_')+(k[1]?k[1]:'_')+(k[2]?k[2]:'_')+') '+(k[3]?k[3]:'_')+(k[4]?k[4]:'_')+(k[5]?k[5]:'_')+'-'+(k[6]?k[6]:'_')+(k[7]?k[7]:'_')+'-'+(k[8]?k[8]:'_')+(k[9]?k[9]:'_');
        phoneInput.value = number; 
    } //pwrMask();

    function pwrCursor() {
        let lngt = phoneInput.value.replace(/\D/g, '').replace(/^7/, '').length;
        let cursor = 4;
        switch (lngt) {
            case 0: cursor = 4; break; case 1: cursor = 5; break; case 2: cursor = 6; break; case 3: cursor = 7; break;
            case 4: cursor = 10; break; case 5: cursor = 11; break; case 6: cursor = 12; break; case 7: cursor = 14; break;
            case 8: cursor = 15; break; case 9: cursor = 17; break; case 10: cursor = 18; break; case 11: cursor = 18; break;
        }
        phoneInput.setSelectionRange(cursor, cursor);
    } //pwrCursor();

    function pwrValid() {
        if (phoneInput.value.indexOf('_') !== -1) {
            phoneInput.value = ''; pwrMask(); pwrCursor();
        }
    }
    //phoneInput.onblur = pwrValid;

    document.querySelector('.pwrbox__form-but').onclick = sendNomer;
    phoneInput.addEventListener("keyup", function(event) { if (event.keyCode===13) {sendNomer()} });
    // document.querySelector('.js-pwr-form').onclick = pwrOpen;
    let allButPwr = document.querySelectorAll('.js-pwr-form');
    for (var i = 0; i < allButPwr.length; i++) {
        allButPwr[i].onclick = pwrOpen;
    }
    document.querySelector('.js-pwr-close').onclick = pwrClose;
    document.querySelector('.pwrbox__fon').onclick = pwrClose;

        
    phoneInput.addEventListener('input', function() { pwrMask(); pwrCursor(); });
    phoneInput.addEventListener('click', function() { pwrMask(); pwrCursor(); });
});
