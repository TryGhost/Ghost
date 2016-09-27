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
                if ($.inArray(breakpoint.value, ['smartphone', 'smartphone_wide']) === -1) {
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

        //Ghost posts search functionality start
        $(".search-results").addClass("hidden");

        // Save search term
        $("#nav-search").on('keydown', function (e) {
            if (e.which === 13) {
                var searchVal = $(this).val();
                sessionStorage.setItem("searchVal", searchVal);
                $(this).closest('form').submit();
            }
        });

        var result_template = '<a href="{{link}}">' +
                                '<div class="col-md-6">' +
                                    '<div class="panel panel-default single-post">' +
                                        '<div class="panel-heading" style="">' +
                                            '<div class="green-overlay"></div>' +
                                            '<span class="custom-badge custom-badge-white category">{{category}}</span>' +
                                        '</div>' +
                                        '<div class="panel-body">' +
                                            '<h3>{{title}}</h3>' +
                                            '<p>{{description}}</p>' +
                                            '<span class="shares-count">' +
                                                '<span data-open-share-count="reddit,facebook,linkedin,google,pinterest" data-open-share-count-url="{{link}}"></span>' +
                                                'shares' +
                                            '</span>' +
                                            '<span class="comments-count"><i class="fa fa-comment"></i> 25</span>' +
                                        '</div>' +
                                    '</div>' +
                                  '</div>' +
                                '</a>';

        $("#search-field").ghostHunter({
            results: "#search-results",
            onKeyUp: true,
            displaySearchInfo: false,
            result_template : result_template,
            before: function () {
                $(".search-results").removeClass("hidden");
            },
            onComplete: function (results) {
                console.log( results );

            }
        });

        // Write search term to search form
        $('#search-field').val(sessionStorage.getItem("searchVal"))
        setTimeout(function () {
            var e = $.Event('keyup', {
                keycode: 68
            });
            $('#search-field').trigger(e);
        }, 500);
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
