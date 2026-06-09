jQuery(document).ready(function() {jQuery(function($) {

// Rabota positon sticky, prikleivanie podvala
if (document.documentElement.clientHeight > document.querySelector('body').clientHeight) {
	$('html').css('height','100%');
	$('body').css({'height':'100%','display':'flex','flex-direction':'column','justify-content':'space-between'})
	$('main').css('flex','auto');
}
// Rabota positon sticky, prikleivanie podvala end


// formi
let knopkiPowerForm = '.vspl-standform-power';
let knopkiCloseForm = '.vspl-standform-close, .popap-fon';

$(knopkiPowerForm).on('click', function () {
	let nameform = $(this).attr('class').replace(/-power.*/g,'').replace(/.*?vspl-/g,'');
	$('.vspl-'+nameform).css({'visibility':'visible','opacity':'1'});
	$('.popap-fon').css({'visibility':'visible','opacity':'1'});
});

$(knopkiCloseForm).on('click', function () {
	let closeform = knopkiCloseForm.replace(/-close/g,'').replace(/.popap-fon/,'').replace(/\s*/g,'').replace(/^,/,'').replace(/,$/,'');
	$(closeform).css({'visibility':'hidden','opacity':'0'});
	$('.popap-fon').css({'visibility':'hidden','opacity':'0'});
})
// formi end


// atntck 
if (document.cookie.indexOf('atntckyes') > -1) {}else{
	jQuery('.atntck').css('display','flex');
}
jQuery('.js-atntck').on('click', function () {
	jQuery('.atntck').css('display','none');
	document.cookie = "atntck=atntckyes; max-age=2592000";
});
// atntck end


//menu
$('.js-menu-power').on('click', function () {
	$('.modalmenu').css('right','0px');
	$('.modalmenu__fon').css({'visibility':'visible','opacity':'1'});
	$("body").css("overflow", "hidden");
});

$('.modalmenu__close, .modalmenu__fon').on('click', function () {
	$('.modalmenu').css('right','-100%');
	$('.modalmenu__fon').css({'visibility':'hidden','opacity':'0'});
	$("body").css("overflow", "auto");
});
//menu end



// vopros otvet razvertka 
$('.vopros-raz').on('click', function () {
	$(this).parents('.box-raz').find('.otvet-raz').not($(this).next()).each(function() {
		if ( $(this).css('display') == 'flex' || $(this).css('display') == 'block') {
			$(this).slideToggle(500);
			$('.vopros-raz').removeClass('vopros-raz-up');
		};
	});
	$(this).hasClass('vopros-raz-up') ? $(this).removeClass('vopros-raz-up') :	$(this).addClass('vopros-raz-up');
	$(this).next().slideToggle(500);
});
// vopros otvet razvertka end


$('.zavitush').each(function(index) {
	let content = $(this).html();
	$(this).html('<svg viewBox="0 0 145 39" width="145" height="39"><use xlink:href="#zavit"></use></svg>'+content);
});
$('.zavitush_pas').each(function(index) {
	let content = $(this).html();
	$(this).html('<svg viewBox="0 0 145 39" width="145" height="39"><use xlink:href="#zavit"></use></svg>'+content);
});




// mask 
$('.js-mask-phone').mask('+7 (999) 999-99-99');
// mask end


// raskrivushka
window.addEventListener('load',function(){
	$('.js-razvernut').on('click', function () { $(this).next().slideToggle(500); });
}, 2000);
// raskrivushka end



// Zagruzka karti posle zagruski stranici
// window.addEventListener('load',function(){ setTimeout(function () {
		// document.querySelector('.karta__content').insertAdjacentHTML("afterBegin", '' + 
		// 'сюда карту надо'); 
// }, 2000); });
// Zagruzka karti posle zagruski stranici end


//Zagatovka slidera
// const swiper = new Swiper('.avtoparkmod__content', {
//     slidesPerView: 'auto',
//     loop: false,
//     centeredSlides: true,
//     navigation: {
//         nextEl: '.avtoparkmod-next',
//         prevEl: '.avtoparkmod-prev',
//     },
//     pagination: {
// 		el: '.avtoparkmod-pagination',
// 		clickable: true,
// 	},
//     // autoplay: {
//     //     delay: 5000,
//     // },
// });
//Zagatovka slidera end


// razvertka v modalnom okne
// $('.modalmenu .deeper > a').on('click', function (e) {
// 	e.preventDefault();
// 	$(this).hasClass('mactive') ? $(this).removeClass('mactive') : $(this).addClass('mactive');
// 	$(this).next().slideToggle(400)
// });
// razvertka v modalnom okne end



$('.modalmenu__menu-name').on('click', function (e) {
	$(this).hasClass('mactive') ? $(this).removeClass('mactive') : $(this).addClass('mactive');
	$(this).next().slideToggle(400)
});
$('.modalmenu .glav-menu').slideToggle(400);



//слайдер на главной
const swiperslider = new Swiper('.slider__container', {
    slidesPerView: 'auto',
    loop: false,
    effect: "fade",
    navigation: {
        nextEl: '.slider__next',
        prevEl: '.slider__prev',
    },
    pagination: {
		el: '.slider__pagination',
		clickable: true,
		renderBullet: function (index, className) {
			let nadpic = '';
			switch (index) {
				case 0: nadpic = 'Организация мероприятий'; break;
				case 1: nadpic = 'Проведение юбилея'; break;
				case 2: nadpic = 'Свадебный банкет'; break;
				case 3: nadpic = 'Кейтеринг'; break;
				default: nadpic = '';
			}
			return '<span class="'+className+'">'+
					'<svg class="slider__dekor-left" viewBox="0 0 50 26" width="50" height="26"><use xlink:href="#pagindekor"></use></svg>'+
					nadpic+
					'<svg class="slider__dekor-right" viewBox="0 0 50 26" width="50" height="26"><use xlink:href="#pagindekor"></use></svg>'+
					'</span>';
		},
	},
    // autoplay: {
    //     delay: 5000,
    // },
});
//слайдер на главной




//Проведение мероприятий
const swipervidmerop = new Swiper('.vidmerop__container', {
    slidesPerView: 'auto',
    loop: false,
    navigation: {
        nextEl: '.vidmerop__next',
        prevEl: '.vidmerop__prev',
    },
    pagination: {
		el: '.vidmerop__pagination',
		clickable: true,
	},
    // autoplay: {
    //     delay: 5000,
    // },
});
//Проведение мероприятий



//О ресторане
jQuery('.orestr .sigplus-gallery').addClass('swiper-container orestr__container');
jQuery('.orestr .sigplus-gallery ul').addClass('swiper-wrapper orestr__wrapper');
jQuery('.orestr .sigplus-gallery li').addClass('swiper-slide orestr__slide');
jQuery('.orestr__container').append(
	'<div class="orestr__navig">'+
	    '<div class="orestr__prev orestr__navbut"><svg viewBox="0 0 9 14" width="9" height="14"><use xlink:href="#arrowleft"></use></svg></div>'+
	    '<div class="orestr__pagination"></div>'+
	    '<div class="orestr__next orestr__navbut"><svg viewBox="0 0 9 14" width="9" height="14"><use xlink:href="#arrowright"></use></svg></div>'+
	'</div>');
if ( jQuery('.swiper-initialized').length ) { jQuery.fancybox.defaults.backFocus = false; }
const swiperorestr = new Swiper('.orestr__container', {
    slidesPerView: 'auto',
    loop: false,
    navigation: {
        nextEl: '.orestr__next',
        prevEl: '.orestr__prev',
    },
    pagination: {
		el: '.orestr__pagination',
		clickable: true,
	},
    // autoplay: {
    //     delay: 5000,
    // },
});
//О ресторане



// Меню подгрузка
jQuery('.katalog__razdel').on('click', function (e) {
	e.preventDefault();
	fetchMenu($(this).attr('data-razdel'));
});
// Меню подгрузка



if ($(window).width() < 768){
	const swiperkatalog = new Swiper('.katalog__slider', {
	    slidesPerView: 'auto',
	    loop: false,
	    centeredSlides: true,
	    // autoplay: {
	    //     delay: 5000,
	    // },
	    on: {
	    	slideChangeTransitionEnd: function () {
	    		fetchMenu(jQuery('.katalog__razdel.swiper-slide-active').attr('data-razdel'));
	    	}
	    }
	});
};


// if ($(window).width() < 768){};
if ( $('.swiper-container').length ) { $.fancybox.defaults.backFocus = false; }

});});// !!! ATENTION !!!  pishem do syuda, nije ne nado pisat'


// Меню подгрузка
async function fetchMenu(tip) {
	jQuery('.katalog__razdel').removeClass('katalog__rzdl-active');
	jQuery('.katalog__razdel[data-razdel="'+tip+'"]').hasClass('.katalog__razdel[data-razdel="'+tip+'"]') ? 
	jQuery('.katalog__razdel[data-razdel="'+tip+'"]').removeClass('katalog__rzdl-active') : 
	jQuery('.katalog__razdel[data-razdel="'+tip+'"]').addClass('katalog__rzdl-active');
	
    let menuHTML = await fetch("/templates/shablon/menu_query.php", {
    	method: 'POST', mode: 'cors', cache: 'no-cache', credentials: 'same-origin', 
    	headers: {'Content-Type': 'application/x-www-form-urlencoded'}, redirect: 'follow',
    	referrerPolicy: 'no-referrer',
    	body:   'tip='+tip,
    }).then(data => {return data.text()});

	jQuery('.katalog__menus').html(menuHTML); 
}

window.addEventListener('load',function(){
	let atr = jQuery('.katalog__menus').attr('data-actvfirstrazdel');
	if (typeof atr !== 'undefined' && atr !== false) {
	    fetchMenu(jQuery('.katalog__menus').attr('data-actvfirstrazdel'));
	}
});
// Меню подгрузка




window.addEventListener('load',function(){
	if (document.querySelector('.slider')){
		var otstup_pad = jQuery('.header').outerHeight(true) + parseInt(jQuery('.slider').css('padding-top'));
		var otstup_mar = jQuery('.header').outerHeight(true);
		jQuery('.slider').css({'padding-top':otstup_pad, 'margin-top':otstup_mar*-1});
	}
});

jQuery('a[href="/novogodnij-korporativ.html"]').html(jQuery('a[href="/novogodnij-korporativ.html"]').html().replace(/\d/gi,'')+'<span>2026</span>');