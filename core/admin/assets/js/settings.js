/*globals document, location, jQuery */
(function ($) {
    "use strict";

    var changePage = function (e) {
        var newPage = $(this).children('a').attr('href');

        e.preventDefault();
        $('.settings-menu .active').removeClass('active');
        location.hash = $(this).attr('class'); // Placed here so never gets given the active attribute.
        $(this).addClass('active');

        $('.settings-content').fadeOut().delay(250);
        $(newPage).fadeIn();

    },

        defaultSettings = {
            title: 'My Blog',
            description: ''
        },

        getSettings = function () {
            return $.extend(defaultSettings, {
                title       : $('#blog-title').val(),
                description : $('#blog-description').val()
            });
        };

    $(document).ready(function () {
        if (location.hash) {
            var page = $(".settings-menu li." + location.hash.replace('#', '')),
                newPage = page.children('a').attr('href');
            $('.settings-menu .active').removeClass('active');
            page.addClass('active');

            $('.settings-content').hide().delay(250);
            $(newPage).show();
        }
        $('.settings-menu li').on('click', changePage);

        $('input').iCheck({
            checkboxClass: 'icheckbox_square-grey'
        });

        $('.button-save').click(function (e) {
            e.preventDefault();
            var data = getSettings();
            $.ajax({
                method: 'PUT',
                url: '/api/v0.1/settings/edit',
                data: data,
                success: function (res, xhr, c) {
                    console.log(xhr, c);
                }
            });
        });
    });

}(jQuery));