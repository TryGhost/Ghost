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
    $.fn.center = function (options) {
        var $window = $(window),
            config = $.extend({
                animate        : true,
                successTrigger : 'centered'
            }, options);

        return this.each(function () {
            var $this = $(this);
            $this.css({
                'position': 'absolute'
            });
            if (config.animate) {
                $this.animate({
                    'left': ($window.width() / 2) - $this.outerWidth() / 2 + 'px',
                    'top': ($window.height() / 2) - $this.outerHeight() / 2 + 'px'
                });
            } else {
                $this.css({
                    'left': ($window.width() / 2) - $this.outerWidth() / 2 + 'px',
                    'top': ($window.height() / 2) - $this.outerHeight() / 2 + 'px'
                });
            }
            $(window).trigger(config.successTrigger);
        });
    };

    // ## getTransformProperty
    // This returns the transition duration for an element, good for calling things after a transition has finished.
    // **Original**: [https://gist.github.com/mandelbro/4067903](https://gist.github.com/mandelbro/4067903)
    // **returns:** the elements transition duration
    $.fn.transitionDuration = function () {
        var $this = $(this);

        // check the main transition duration property
        if ($this.css('transition-duration')) {
            return Math.round(parseFloat(this.css('transition-duration')) * 1000);
        }

        // check the vendor transition duration properties
        if (this.css('-webkit-transtion-duration')) {
            return Math.round(parseFloat(this.css('-webkit-transtion-duration')) * 1000);
        }

        if (this.css('-ms-transtion-duration')) {
            return Math.round(parseFloat(this.css('-ms-transtion-duration')) * 1000);
        }
        
        if (this.css('-moz-transtion-duration')) {
            return Math.round(parseFloat(this.css('-moz-transtion-duration')) * 1000);
        }

        if (this.css('-o-transtion-duration')) {
            return Math.round(parseFloat(this.css('-o-transtion-duration')) * 1000);
        }

        // if we're here, then no transition duration was found, return 0
        return 0;
    };

    // ## scrollShadow
    // This adds a 'scroll' class to the targeted element when the element is scrolled
    // **target:** The element in which the class is applied. Defaults to scrolled element.
    // **class-name:** The class which is applied.
    // **offset:** How far the user has to scroll before the class is applied.
    $.fn.scrollClass = function (options) {
        var config = $.extend({
                'target'     : '',
                'class-name' : 'scrolling',
                'offset'     : 1
            }, options);

        return this.each(function () {
            var $this = $(this),
                $target = $this;
            if (config.target) {
                $target = $(config.target);
            }
            $this.scroll(function () {
                if ($this.scrollTop() > config.offset) {
                    $target.addClass(config['class-name']);
                } else {
                    $target.removeClass(config['class-name']);
                }
            });
        });
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

    $('.overlay').hideAway();

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