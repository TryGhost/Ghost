// # Ghost Mobile Interactions

/*global window, document, $ */

(function () {
    "use strict";

    // ## Touch Gestures

    // Initiate Hammer.js
    // `touchAction: true` Potentially fix problems in IE10 [Ref](https://github.com/EightMedia/hammer.js/wiki/Tips-&-Tricks)
    // `drag: false` Removes the Hammer drag event listeners, as they were clashing with jQueryUI Draggable
    var Hammer = $(document).hammer({stop_browser_behavior: { touchAction: true }, drag: false});

    // ### Show content preview when swiping left on content list
    Hammer.on("tap", ".manage .content-list ol li", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            event.stopPropagation();
            $(".content-list").animate({right: "100%", left: "-100%", 'margin-right': "15px"}, 300);
            $(".content-preview").animate({right: "0", left: "0", 'margin-left': "0"}, 300);
        }
    });

    // ### Hide content preview
    Hammer.on("tap", ".manage .content-preview .button-back", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            event.stopPropagation();
            $(".content-list").animate({right: "0", left: "0", 'margin-right': "0"}, 300);
            $(".content-preview").animate({right: "-100%", left: "100%", 'margin-left': "15px"}, 300);
        }
    });

    // ### Show settings options page when swiping left on settings menu link
    Hammer.on("tap", ".settings .settings-menu li", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            event.stopPropagation();
            $(".settings-sidebar").animate({right: "100%", left: "-102%", 'margin-right': "15px"}, 300);
            $(".settings-content").animate({right: "0", left: "0", 'margin-left': "0"}, 300);
            $(".settings-content .button-back, .settings-content .button-save").css("display", "inline-block");
        }
    });

    // ### Hide settings options page
    Hammer.on("tap", ".settings .settings-content .button-back", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            event.stopPropagation();
            $(".settings-sidebar").animate({right: "0", left: "0", 'margin-right': "0"}, 300);
            $(".settings-content").animate({right: "-100%", left: "100%", 'margin-left': "15"}, 300);
            $(".settings-content .button-back, .settings-content .button-save").css("display", "none");
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