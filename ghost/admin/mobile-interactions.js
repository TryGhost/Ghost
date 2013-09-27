// # Ghost Mobile Interactions

/*global window, document, $, FastClick */

(function () {
    'use strict';

    FastClick.attach(document.body);

    // ### Show content preview when swiping left on content list
    $('.manage').on('click', '.content-list ol li', function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.preventDefault();
            event.stopPropagation();
            $('.content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
            $('.content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
        }
    });

    // ### Hide content preview
    $('.manage').on('click', '.content-preview .button-back', function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.preventDefault();
            event.stopPropagation();
            $('.content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
            $('.content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
        }
    });

    // ### Show settings options page when swiping left on settings menu link
    $('.settings').on('click', '.settings-menu li', function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.preventDefault();
            event.stopPropagation();
            $('.settings-sidebar').animate({right: '100%', left: '-102%', 'margin-right': '15px'}, 300);
            $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
            $('.settings-content .button-back, .settings-content .button-save').css('display', 'inline-block');
        }
    });

    // ### Hide settings options page
    $('.settings').on('click', '.settings-content .button-back', function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.preventDefault();
            event.stopPropagation();
            $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
            $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
            $('.settings-content .button-back, .settings-content .button-save').css('display', 'none');
        }
    });

    // ### Toggle the sidebar menu
    $('[data-off-canvas]').on('click', function (event) {
        if (window.matchMedia('(max-width: 650px)').matches) {
            event.preventDefault();
            $('body').toggleClass('off-canvas');
        }
    });

}());