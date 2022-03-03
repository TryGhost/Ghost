(function ($) {
    "use strict";


    jQuery(document).ready(function($){
        var hasAnim = $('.all-games').hasClass('anim-change');
        hasAnim = false;


        $('.game-menu').find('.nav-link').on('click', function(){
            $('.all-games').removeClass('anim-change');
            setTimeout(function() {
                $('.all-games').addClass('anim-change');
            }, 300);
        });

        // games sidebar navlink activate
        $('.game-menu').find('.nav-link').on('click', function(){
            $(this).addClass('active');
            $(this).parents('.nav-item').siblings().find('.nav-link').removeClass('active');
        });


        // feature_section positioning
        var feature_section = $('.about').find('.feature');
        var features_section_height = feature_section.height();
        feature_section.css("margin-top", - features_section_height / 2);
        feature_section.css("margin-bottom", - features_section_height / 2);

        var banner_section = $('.banner').find('.banner-txt');
        banner_section.css('padding-bottom', features_section_height / 2 + 200 );

        // game details


        // testimonial slider
        var testimonialCarousel = $('.testimonial-slider');
        testimonialCarousel.owlCarousel({
            loop: true,
            dots: true,
            nav: false,
            margin: 30,
            autoplay: true,
            autoplayTimeout: 3000,
            autoplayHoverPause: true,
            responsive: {
                0: {
                    items: 1
                },
                768: {
                    items: 1
                },
                960: {
                    items: 1
                },
                1200: {
                    items: 1
                },
                1920: {
                    items: 1
                }
            }
        });



        // fertilizr
        jQuery(window).load(function() {

             var $filterizr = $('.filterizr__elements');
             if($filterizr.length) {
              var $filterizrControls = $('.filterizr__controls');
              $filterizr.filterizr();
              $filterizrControls.children('li').click(function() {
                $filterizrControls.find('li.active').removeClass('active');
                $(this).addClass('active');
              });
             }

        });

        $(".js-video-button").modalVideo({
			youtube:{
				controls:0,
				nocookie: true
			}
        });

        /**----------------------
         *  Back to top
         * --------------------**/
        $(document).on('click', '.back-to-top button',function(){
            $('html,body').animate({
                scrollTop:0
            },3000);
        });
        /*--------------------
            wow js init
        ---------------------*/
        new WOW().init();

         // count down
        var nodes = $('.timer');
        $.each(nodes, function (_index, value) {
            var date = $(this).data('date');

            setInterval(() => {

                var endTime = new Date(date);
                endTime = (Date.parse(endTime) / 1000);

                var now = new Date();
                now = (Date.parse(now) / 1000);

                var timeLeft = endTime - now;

                var days = Math.floor(timeLeft / 86400);
                var hours = Math.floor((timeLeft - (days * 86400)) / 3600);
                var minutes = Math.floor((timeLeft - (days * 86400) - (hours * 3600)) / 60);
                var seconds = Math.floor((timeLeft - (days * 86400) - (hours * 3600) - (minutes * 60)));

                if (hours < "10") { hours = "0" + hours; }
                if (minutes < "10") { minutes = "0" + minutes; }
                if (seconds < "10") { seconds = "0" + seconds; }

                $(value).find('.day').html(days);
                $(value).find('.hour').html(hours);
                $(value).find('.minute').html(minutes);
                $(value).find('.second').html(seconds);

            }, 1000);

        });

    });



    // fixed navbar

    $(window).on('scroll', function(){
        var headerSection = $('.header');

        if ($(window).scrollTop() > 300) {
            headerSection.addClass('header-fixed fadeInDown animated');
        } else {
            headerSection.removeClass('header-fixed fadeInDown animated');
        }

    });


    $(window).on('load',function(){
        /*-----------------
            preloader
        ------------------*/
        var preLoder = $(".preloader");
        preLoder.fadeOut(1000);

    });

    //======================================
    //============= YTPlayer ===============
    //======================================
    // $(function(){
    //     $("#bgndVideo").YTPlayer();
    // })

    var icon_1 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="th-large" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-th-large fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48H48C21.49 32 0 53.49 0 80zm240-16v176H32V80c0-8.837 7.163-16 16-16h192zM32 432V272h208v176H48c-8.837 0-16-7.163-16-16zm240 16V272h208v160c0 8.837-7.163 16-16 16H272zm208-208H272V64h192c8.837 0 16 7.163 16 16v160z" class=""></path></svg>';
    var icon_2 = '<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="sword" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-sword fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M511.84 18.27C513.23 8.49 505.57 0 496.04 0c-.76 0-1.53.05-2.31.16L400 16 148.51 267.49l-38.82-38.82c-6.22-6.22-16.31-6.23-22.54 0L68.43 247.4c-5.37 5.37-6.21 13.79-1.99 20.11l53.19 79.79-53.23 53.22-29.15-14.57c-1.21-.61-9.25-4.14-15.97 2.59L4.05 405.76c-5.4 5.41-5.4 14.17 0 19.57l82.62 82.62c2.7 2.7 6.24 4.05 9.78 4.05s7.08-1.35 9.79-4.05l17.23-17.23a13.84 13.84 0 0 0 2.59-15.97l-14.57-29.15 53.22-53.23 79.79 53.19c6.32 4.21 14.74 3.38 20.11-1.99l18.73-18.72c6.22-6.22 6.22-16.32 0-22.54l-38.82-38.82L496 112l15.84-93.73zm-60.62 70.62L210.57 329.55l-28.12-28.12L423.11 60.77l33.83-5.72-5.72 33.84z" class=""></path></svg>';
    var icon_3 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="cube" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-cube fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M239.1 6.3l-208 78c-18.7 7-31.1 25-31.1 45v225.1c0 18.2 10.3 34.8 26.5 42.9l208 104c13.5 6.8 29.4 6.8 42.9 0l208-104c16.3-8.1 26.5-24.8 26.5-42.9V129.3c0-20-12.4-37.9-31.1-44.9l-208-78C262 2.2 250 2.2 239.1 6.3zM256 34.2l224 84v.3l-224 97.1-224-97.1v-.3l224-84zM32 153.4l208 90.1v224.7l-208-104V153.4zm240 314.8V243.5l208-90.1v210.9L272 468.2z" class=""></path></svg>';
    var icon_4 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="spade" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-spade fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M471.4 200.3C456.1 186.4 327 57.7 278.6 9.3c-12.5-12.5-32.7-12.5-45.2 0-48.4 48.4-177.5 177-192.8 191C15.1 223.5 0 256.4 0 292c0 68.4 55.6 124 124 124 35.5 0 52-8 76-32 0 24-9.7 27.6-30.2 53.4-23.9 30.1-2.4 74.6 36 74.6h100.3c38.5 0 60-44.5 36-74.6-19-24.1-30.1-29.4-30.1-53.4 24 24 48.9 32 76 32 68.4 0 124-55.6 124-124 0-35.7-15.2-68.5-40.6-91.7zM385.5 384c-41-.4-54.6-11.3-87.2-45.2-3.7-3.9-10.3-1.2-10.3 4.2v25c0 40.6 0 52.6 29.1 89.3 7.3 9.2.7 22.7-11 22.7H205.8c-11.7 0-18.3-13.5-11-22.7C224 420.6 224 408.6 224 368v-25c0-5.4-6.6-8.1-10.3-4.2-32.3 33.7-45.9 44.7-87.1 45.2-51.8.5-95-41-94.5-92.8.2-26 11.4-50.1 30.1-67.2C81.3 206.5 256 32 256 32s174.7 174.5 193.9 192c19 17.3 29.9 41.6 30.1 67.3.4 51.8-42.7 93.2-94.5 92.7z" class=""></path></svg>';
    var icon_5 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="dice-six" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-dice-six fa-w-14 fa-fw fa-2x"><path fill="currentColor" d="M384 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h320c35.35 0 64-28.65 64-64V96c0-35.35-28.65-64-64-64zm32 384c0 17.64-14.36 32-32 32H64c-17.64 0-32-14.36-32-32V96c0-17.64 14.36-32 32-32h320c17.64 0 32 14.36 32 32v320zM128 136c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24zm0 96c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24zm192 0c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24zm-192 96c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24zm192-192c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24zm0 192c-13.25 0-24 10.74-24 24 0 13.25 10.75 24 24 24s24-10.75 24-24c0-13.26-10.75-24-24-24z" class=""></path></svg>';
    var icon_6 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="chess" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-chess fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M400 320a16 16 0 0 0-32 0v32h32zm103.16 115.57L480 424v-24a16 16 0 0 0-16-16h-1.1l-2.83-82.21 24.6-20.79A32 32 0 0 0 496 256.54V176a16 16 0 0 0-16-16H288a16 16 0 0 0-16 16v80.6a32 32 0 0 0 11.35 24.4l24.57 20.76L305.1 384H304a16 16 0 0 0-16 16v24l-23.15 11.57a16 16 0 0 0-8.85 14.31 16 16 0 0 0-8.84-14.31L224 424v-24a16 16 0 0 0-16-16h-6.4c-6-30.16-9.6-60.75-9.6-91.47V256h24a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8h-16.9l31.81-84.78a32 32 0 0 0-30-43.22H144V64h24a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8h-24V8a8 8 0 0 0-8-8h-16a8 8 0 0 0-8 8v24H88a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h24v32H55.09a32 32 0 0 0-30 43.25L56.91 224H40a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h24v36.53c0 30.71-3.56 61.31-9.6 91.47H48a16 16 0 0 0-16 16v24L8.84 435.57c-4.25 2.13-6.7 6.19-7.81 10.68-.3 1.24-1 2.33-1 3.64V496a16 16 0 0 0 16 16H240a16 16 0 0 0 16-16 16 16 0 0 0 16 16h224a16 16 0 0 0 16-16v-46.12a16 16 0 0 0-8.84-14.31zM55.09 128h145.85l-36 96H91.09zm113.79 256H87.12A499.15 499.15 0 0 0 96 292.53V256h64v36.53a499.15 499.15 0 0 0 8.88 91.47zM224 480H32v-20.22l32-16V416h128v27.78l32 16zm80-223.4V192h32v32h32v-32h32v32h32v-32h32v64.54l-24.6 20.82-11.84 10 .53 15.5 2.79 81.14h-93.76l2.79-81.1.53-15.52-11.86-10zM480 480H288v-20.22l32-16V416h128v27.78l32 16z" class=""></path></svg>';
    var icon_7 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="fire" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="svg-inline--fa fa-fire fa-w-12 fa-fw fa-2x"><path fill="currentColor" d="M216 24.01c0-23.8-31.16-33.11-44.15-13.04C76.55 158.25 200 238.73 200 288c0 22.06-17.94 40-40 40s-40-17.94-40-40V182.13c0-19.39-21.85-30.76-37.73-19.68C30.75 198.38 0 257.28 0 320c0 105.87 86.13 192 192 192s192-86.13 192-192c0-170.29-168-192.85-168-295.99zM192 480c-88.22 0-160-71.78-160-160 0-46.94 20.68-97.75 56-128v96c0 39.7 32.3 72 72 72s72-32.3 72-72c0-65.11-112-128-45.41-248C208 160 352 175.3 352 320c0 88.22-71.78 160-160 160z" class=""></path></svg>';
    var icon_8 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="bahai" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-bahai fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M496.25 202.52l-110-15.44 41.82-104.34c5.26-13.11-4.98-25.55-16.89-25.55-3.2 0-6.52.9-9.69 2.92L307.45 120l-34.1-107.18C270.64 4.27 263.32 0 256 0c-7.32 0-14.64 4.27-17.35 12.82l-34.09 107.19-94.04-59.89c-3.18-2.02-6.5-2.92-9.69-2.92-11.91 0-22.15 12.43-16.89 25.55l41.82 104.34-110 15.44c-17.53 2.46-21.67 26.27-6.03 34.67l98.16 52.66-74.49 83.53c-10.92 12.25-1.72 30.93 13.28 30.93 1.32 0 2.67-.14 4.07-.45l108.57-23.65-4.11 112.55c-.43 11.65 8.87 19.22 18.41 19.22 5.16 0 10.39-2.21 14.2-7.18l68.18-88.9 68.18 88.9c3.81 4.97 9.04 7.18 14.2 7.18 9.55 0 18.84-7.57 18.41-19.22l-4.11-112.55 108.57 23.65c1.39.3 2.75.45 4.07.45 15.01 0 24.2-18.69 13.28-30.93l-74.48-83.54 98.16-52.66c15.65-8.4 11.51-32.21-6.03-34.67zm-106.88 59.05l-35.85 19.24 27.2 30.51 46.79 52.48-68.21-14.86-39.65-8.64 1.5 41.11 2.58 70.71-42.83-55.85L256 363.8l-24.9 32.47-42.83 55.85 2.58-70.71 1.5-41.11-39.65 8.64-68.21 14.86 46.79-52.48 27.2-30.51-35.85-19.24-61.67-33.09 69.11-9.7 40.18-5.64-15.27-38.11-26.27-65.55 59.08 37.62 34.35 21.87 12.45-39.15L256 62.49l21.42 67.34 12.45 39.15 34.35-21.87 59.08-37.62-26.27 65.55-15.27 38.11 40.18 5.64 69.11 9.7-61.68 33.08z" class=""></path></svg>';
    var icon_9 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="star" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="svg-inline--fa fa-star fa-w-18 fa-fw fa-2x"><path fill="currentColor" d="M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM405.8 317.9l27.8 162L288 403.5 142.5 480l27.8-162L52.5 203.1l162.7-23.6L288 32l72.8 147.5 162.7 23.6-117.7 114.8z" class=""></path></svg>';
    var icon_10 = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="sync" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-sync fa-w-16 fa-fw fa-2x"><path fill="currentColor" d="M492 8h-10c-6.627 0-12 5.373-12 12v110.627C426.929 57.261 347.224 8 256 8 123.228 8 14.824 112.338 8.31 243.493 7.971 250.311 13.475 256 20.301 256h10.016c6.353 0 11.646-4.949 11.977-11.293C48.157 132.216 141.097 42 256 42c82.862 0 154.737 47.077 190.289 116H332c-6.627 0-12 5.373-12 12v10c0 6.627 5.373 12 12 12h160c6.627 0 12-5.373 12-12V20c0-6.627-5.373-12-12-12zm-.301 248h-10.015c-6.352 0-11.647 4.949-11.977 11.293C463.841 380.158 370.546 470 256 470c-82.608 0-154.672-46.952-190.299-116H180c6.627 0 12-5.373 12-12v-10c0-6.627-5.373-12-12-12H20c-6.627 0-12 5.373-12 12v160c0 6.627 5.373 12 12 12h10c6.627 0 12-5.373 12-12V381.373C85.071 454.739 164.777 504 256 504c132.773 0 241.176-104.338 247.69-235.493.339-6.818-5.165-12.507-11.991-12.507z" class=""></path></svg>';
    var icon_11 = '<svg height="38" id="黑白" viewBox="0 0 32 32" width="38" xmlns="http://www.w3.org/2000/svg"><path d="M24.59,29.47H23.21a.84.84,0,0,0-.83.84.83.83,0,0,0,.83.83h1.38a.83.83,0,0,0,.83-.83A.84.84,0,0,0,24.59,29.47Zm6.65-18.75c-.52-.21-7.22-2.93-13.13-.1-3.54,1.69-6,5-7.35,9.73C8.9,27,8.82,31.14,10.49,33.93s5.11,3.84,9,4.7l.27,0a1.27,1.27,0,0,0,.34,0,1,1,0,0,0,.24,0,.84.84,0,0,0,.84-.83v-1a7.63,7.63,0,0,0,2.71.52,8,8,0,0,0,3.9-1.08v1.58a.83.83,0,0,0,.83.83.82.82,0,0,0,.35-.08,1.18,1.18,0,0,0,.56,0,11.47,11.47,0,0,0,7.69-7,17.66,17.66,0,0,0,1.37-5.23C39.65,14.29,31.88,11,31.24,10.72ZM12.64,32.64c-1-1.67-1.11-4.33-.3-8.24h.11l.19,0,.1,0v0h0a1.13,1.13,0,0,0,.07.55,16.18,16.18,0,0,0,6.71,11v.11C15.82,35.23,13.71,34.43,12.64,32.64Zm2-6.77c.31,0,.69,0,1.13,0a20.53,20.53,0,0,0,13.89-5.54,7.07,7.07,0,0,0,3.69,4.07c-.59,5.24-4.79,11.21-9.38,11.21C19.65,35.65,15.78,30.7,14.67,25.87Zm21.44.29c0,.08-.65,7.85-6.64,9.82v-.89a16.53,16.53,0,0,0,5.64-11.46,1.26,1.26,0,0,0-.75-1.49c-2.29-.89-2.81-4.29-2.81-4.34s0,0,0-.06l0-.13a.42.42,0,0,0,0-.1.61.61,0,0,0-.05-.12l-.06-.1-.07-.1-.09-.1,0,0,0,0L31,16.94l-.1-.06-.12-.06-.1,0-.13,0h-.47l-.13,0-.11,0-.11.05-.11.07-.09.07a.28.28,0,0,0-.1.09l-.05,0A18.2,18.2,0,0,1,15.8,23.41,23.25,23.25,0,0,0,23.51,19a.83.83,0,0,0,0-1.18.82.82,0,0,0-1.17,0c-3.09,2.88-8.09,4.41-9.64,4.84.13-.52.27-1.05.42-1.61,1.14-4,3.16-6.79,6-8.15,5-2.4,11,.12,11.11.15l0,0C30.4,13.08,37,15.69,36.11,26.16Z" fill="#FF4647"/></svg>';
    var arrowIcon = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="angle-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 512" class="svg-inline--fa fa-angle-right fa-w-6 fa-fw fa-2x"><path fill="currentColor" d="M166.9 264.5l-117.8 116c-4.7 4.7-12.3 4.7-17 0l-7.1-7.1c-4.7-4.7-4.7-12.3 0-17L127.3 256 25.1 155.6c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0l117.8 116c4.6 4.7 4.6 12.3-.1 17z" class=""></path></svg>';

    // ----

    var calendar_icon = '<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="calendar-alt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-calendar-alt fa-w-14 fa-fw fa-2x"><path fill="currentColor" d="M400 64h-48V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H128V12c0-6.6-5.4-12-12-12h-8c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 96h352c8.8 0 16 7.2 16 16v48H32v-48c0-8.8 7.2-16 16-16zm352 384H48c-8.8 0-16-7.2-16-16V192h384v272c0 8.8-7.2 16-16 16zM148 320h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-96 96h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-96 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm192 0h-40c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12z" class=""></path></svg>';
    $('.contest-date-text').find('.clndr-icon').html(calendar_icon);

    $('.icon-1').html(icon_1);
    // $('.icon-2').html(icon_2);
    $('.icon-3').html(icon_3);
    $('.icon-4').html(icon_4);
    // $('.icon-5').html(icon_5);
    // $('.icon-6').html(icon_6);
    $('.icon-7').html(icon_7);
    $('.icon-8').html(icon_8);
    $('.icon-9').html(icon_9);
    $('.icon-10').html(icon_10);
    $('.icon-11').html(icon_11);
    $('.arrowIcon').html(arrowIcon);


    var check_icon = $('.check-svg').html();
    $('.check-icon').html(check_icon);




}(jQuery));







