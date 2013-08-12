// # Ghost jQuery Utils

/*global window, document, $ */

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

    $('.overlay').hideAway(); // TODO: Move to a more sensible global file.

    /**
     * Adds appropriate inflection for pluralizing the singular form of a word when appropriate.
     * This is an overly simplistic implementation that does not handle irregular plurals.
     * @param {Number} count 
     * @param {String} singularWord
     * @returns {String}
     */
    $.pluralize = function inflect(count, singularWord) {
    	var base = [count, ' ', singularWord];

        return (count === 1) ? base.join('') : base.concat('s').join('');
    };

}());