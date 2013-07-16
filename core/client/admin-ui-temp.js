// # Temporary Admin UI

/*global window, document, _, $ */

(function () {
    "use strict";

    // UTILS

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

    var positionCenter = _.debounce(function (e) {

            var loginContainer = $(".js-login-container"),
                marginTop = Math.floor((loginContainer.parent().height() - loginContainer.height()) / 2) - 15;
            loginContainer.animate({'margin-top': marginTop}, 200);
            $(window).trigger('centered');

        }, 100); // Maximum run of once per 100 milliseconds

    function fadeInAndFocus() {
        $(".js-login-container").fadeIn(750, function () {
            $("[name='email']").focus();
        });
    }

    $(window).on('resize', positionCenter);
    $(window).one('centered', fadeInAndFocus);

    // Allow notifications to be dismissed
    $(document).on('click', '.js-notification .close',  function () {
        $(this).parent().fadeOut(200,  function () { $(this).remove(); });
    });

    $(document).ready(function () {

        // ## Set interactions for all menus
        // This finds all visible '.overlay' elements and hides them upon clicking away from the element itself.
        $("body").on('click', function (event) {
            var $target = $(event.target);
            if (!$target.parents().is(".overlay:visible") && !$target.is(".overlay:visible")) {
                $("body").find(".overlay:visible").fadeOut();

                // Toggle active classes on menu headers
                $("[data-toggle].active").removeClass("active");
            }
        });

        // LOGIN SCREEN
        $(window).trigger('resize');


        // EDITOR / NOTIFICATIONS

        $('.entry-content header, .entry-preview header').on('click', function () {
            $('.entry-content, .entry-preview').removeClass('active');
            $(this).closest('section').addClass('active');
        });

        $('.entry-title .icon-fullscreen').on('click', function (e) {
            e.preventDefault();
            $('body').toggleClass('fullscreen');
        });

        $('.options.up').on('click', function (e) {
            e.stopPropagation();
            $(this).next("ul").fadeToggle(200);
        });

    });

}());