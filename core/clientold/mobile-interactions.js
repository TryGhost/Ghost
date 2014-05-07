// # Ghost Mobile Interactions

/*global window, document, $, FastClick */

(function () {
    'use strict';

    FastClick.attach(document.body);

    // ### general wrapper to handle conditional screen size actions
    function responsiveAction(event, mediaCondition, cb) {
        if (!window.matchMedia(mediaCondition).matches) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        cb();
    }

    // ### Show content preview when swiping left on content list
    $('.manage').on('click', '.content-list ol li', function (event) {
        responsiveAction(event, '(max-width: 800px)', function () {
            $('.content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
            $('.content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
        });
    });

    // ### Hide content preview
    $('.manage').on('click', '.content-preview .button-back', function (event) {
        responsiveAction(event, '(max-width: 800px)', function () {
            $('.content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
            $('.content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
        });
    });

    // ### Show settings options page when swiping left on settings menu link
    $('.settings').on('click', '.settings-menu li', function (event) {
        responsiveAction(event, '(max-width: 800px)', function () {
            $('.settings-sidebar').animate({right: '100%', left: '-102%', 'margin-right': '15px'}, 300);
            $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
            $('.settings-content .button-back, .settings-content .button-save').css('display', 'inline-block');
        });
    });

    // ### Hide settings options page
    $('.settings').on('click', '.settings-content .button-back', function (event) {
        responsiveAction(event, '(max-width: 800px)', function () {
            $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
            $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
            $('.settings-content .button-back, .settings-content .button-save').css('display', 'none');
        });
    });

    // ### Toggle the sidebar menu
    $('[data-off-canvas]').on('click', function (event) {
        responsiveAction(event, '(max-width: 650px)', function () {
            $('body').toggleClass('off-canvas');
        });
    });

}());
