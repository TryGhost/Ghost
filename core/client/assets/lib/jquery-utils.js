// # Ghost jQuery Utils

/*global window, document, $ */

(function () {
    "use strict";

    // ## UTILS

    /**
     * Allows to check contents of each element exactly
     * @param obj
     * @param index
     * @param meta
     * @param stack
     * @returns {boolean}
     */
    $.expr[":"].containsExact = function (obj, index, meta, stack) {
        return (obj.textContent || obj.innerText || $(obj).text() || "") === meta[3];
    };

    /**
     * Center an element to the window vertically and centrally
     * @returns {*}
     */
    $.fn.center = function () {
        this.css({
            'position': 'fixed',
            'left': '50%',
            'top': '50%'
        });
        this.css({
            'margin-left': -this.outerWidth() / 2 + 'px',
            'margin-top': -this.outerHeight() / 2 + 'px'
        });
        $(window).trigger('centered');
        return this;
    };

    $.fn.selectText = function () {
        var elem = this[0],
            range,
            selection;
        if (document.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(elem);
            range.select();
        } else if (window.getSelection) {
            selection = window.getSelection();
            range = document.createRange();
            range.selectNodeContents(elem);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    /**
     * Set interactions for all menus and overlays
     * This finds all visible 'hideClass' elements and hides them upon clicking away from the element itself.
     * A callback can be defined to customise the results. By default it will hide the element.
     * @param callback
     */
    $.fn.hideAway = function (callback) {
        var $self = $(this);
        $("body").on('click', function (event) {
            var $target = $(event.target),
                hideClass = $self.selector;
            if (!$target.parents().is(hideClass + ":visible") && !$target.is(hideClass + ":visible")) {
                if (callback) {
                    callback($("body").find(hideClass + ":visible"));
                } else {
                    $("body").find(hideClass + ":visible").fadeOut();

                    // Toggle active classes on menu headers
                    $("[data-toggle].active").removeClass("active");
                }
            }
        });

        return this;
    };

    // ## GLOBALS

    /**
     * Hammer.js
     */
    var Hammer = $(document).hammer({stop_browser_behavior: { touchAction: true }});
    Hammer.on("swiperight", "#global-header", function (event) {
        if (window.matchMedia('(max-width: 400px)').matches) {
            event.gesture.preventDefault();
            $('body').addClass('off-canvas');
        }
    });

    Hammer.on("swipeleft", "#main-menu", function (event) {
        if (window.matchMedia('(max-width: 400px)').matches) {
            event.gesture.preventDefault();
            $('body').removeClass('off-canvas');
        }
    });

    Hammer.on("tap swipeleft", ".manage .content-list ol li", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            $(".content-list").animate({right: "100%", left: "-100%", 'margin-right': "15px"}, 300);
            $(".content-preview").animate({right: "0", left: "0", 'margin-left': "0"}, 300);
        }
    });

    Hammer.on("swiperight", ".content-preview", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            $(".content-list").animate({right: "0", left: "0", 'margin-right': "0"}, 300);
            $(".content-preview").animate({right: "-100%", left: "100%", 'margin-left': "15px"}, 300);
        }
    });

    Hammer.on("tap swipeleft", ".settings .settings-menu li", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            $(".settings-sidebar").animate({right: "100%", left: "-102%", 'margin-right': "15px"}, 300);
            $(".settings-content").animate({right: "0", left: "0", 'margin-left': "0"}, 300);
        }
    });

    Hammer.on("swiperight", ".settings-content", function (event) {
        if (window.matchMedia('(max-width: 800px)').matches) {
            event.gesture.preventDefault();
            $(".settings-sidebar").animate({right: "0", left: "0", 'margin-right': "0"}, 300);
            $(".settings-content").animate({right: "-100%", left: "100%", 'margin-left': "15px"}, 300);
        }
    });


    $('[data-off-canvas]').on('click', function (e) {
        if (window.matchMedia('(max-width: 650px)').matches) {
            e.preventDefault();
            $('body').toggleClass('off-canvas');
        }
    });

    $('.overlay').hideAway();

}());