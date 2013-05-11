/*globals document, jQuery */
(function ($) {
    "use strict";

    var changePage = function (e) {
        var newPage = $(this).children('a').attr('href');

        e.preventDefault();
        $('.settings-menu .active').removeClass('active');
        $(this).addClass('active');

        $('.settings-content').fadeOut().delay(250);
        $(newPage).fadeIn();

    };

    $(document).ready(function() {
        $('.settings-menu li').on('click', changePage);
    });

}(jQuery));