/**
 *  Bastard - Main JavaScript file
 */
/**
 * Main JS file for Bastard theme, behaviours
 * Based on Casper theme js - /content/themes/casper/assets/js
 */

/*globals jQuery, document */
(function ($) {
    "use strict";

    $(document).ready(function() {
        /* Higlight.js */
        hljs.initHighlightingOnLoad();
        /* Scroll to Top */
        $("#scroll-to-top").click(function() {
          $('body').animate({ scrollTop:$('#top').position().top }, 'slow');
          return false;
        });
        /* Custom JavaScript for the Slide Menu */
        $("#slidemenu-close").click(function(e) {
            e.preventDefault();
            $("#slidemenu-wrapper").toggleClass("active");
        });
        $("*[data-slidemenu-toggle]").click(function(e) {
            e.preventDefault();
            $("#slidemenu-wrapper").toggleClass("active");
        });
        /* FitVids */
        $(".post-content").fitVids();
        /* Cover Parralax effect */
        $(".site-head").parallax("70%", 0.2);

        $('.page-scroll a').bind('click', function(event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top
            }, 1600, 'easeInOutExpo');
            event.preventDefault();
        });

        function bastardFullImg() {
            $("img").each( function() {
                var contentWidth = $(".post-content").outerWidth(); // Width of the content
                var imageWidth = $(this)[0].naturalWidth; // Original image resolution

                if (imageWidth >= contentWidth) {
                    $(this).addClass('full-img');
                } else {
                    $(this).removeClass('full-img');
                }
            });
        }

        bastardFullImg();
        $(window).smartresize(bastardFullImg);

        var breakpoint = {};
        breakpoint.refreshValue = function () {
            this.value = window.getComputedStyle(
                document.querySelector('body'), ':before'
            ).getPropertyValue('content').replace(/\"/g, '');
        };

        $(window).on('load resize', function () {
            breakpoint.refreshValue();
        });

        //sub-nav hide on scroll
        var $subNav = $('.sub-nav-main');

        if ($subNav.length > 0) {
            var subNavPosTop = $subNav.position().top;
            var handleSubNav = function () {
                console.log(breakpoint.value);
                if ($.inArray(breakpoint.value, ['smartphone', 'smartphone_wide']) === -1) {
                    console.log('baaaaa');
                    if ($(document).scrollTop() > 200) {
                        $subNav.animate({
                            top: (subNavPosTop - 50) + 'px'
                        }, 'fast', function () {
                            $subNav.addClass('absolute');
                        });
                    } else {
                        $subNav.removeClass('absolute');
                        $subNav.animate({
                            top: subNavPosTop
                        }, 'fast');
                    }
                }
            };

            $(window).on('scroll', handleSubNav.debounce(100));
        }
    });

}(jQuery));

(function($,sr) {

  // debouncing function from John Hann
  // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
  var debounce = function (func, threshold, execAsap) {
      var timeout;

      return function debounced () {
          var obj = this, args = arguments;
          function delayed () {
              if (!execAsap) {
                  func.apply(obj, args);
              }
              timeout = null;
          }

          if (timeout) {
              clearTimeout(timeout);
          } else if (execAsap) {
              func.apply(obj, args);
          }

          timeout = setTimeout(delayed, threshold || 100);
      };
  };
  // smartresize
  jQuery.fn[sr] = function(fn){  return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

})(jQuery,'smartresize');
