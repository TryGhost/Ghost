/*global window, history, jQuery, Showdown, CodeMirror */
(function ($) {
    "use strict";

    $(document).ready(function () {

        // Shadow on Markdown if scrolled
        $('.content-list-content').on('scroll', function (e) {
            if ($('.content-list-content').scrollTop() > 10) {
                $('.content-list').addClass('scrolling');
            } else {
                $('.content-list').removeClass('scrolling');
            }
        });

        // Shadow on Preview if scrolled
        $('.content-preview-content').on('scroll', function (e) {
            if ($('.content-preview-content').scrollTop() > 10) {
                $('.content-preview').addClass('scrolling');
            } else {
                $('.content-preview').removeClass('scrolling');
            }
        });

        $('.post-controls .delete').on('click', function (e) {
            e.preventDefault();
            var postID = $('.content-list-content').find('li.active').data('id');
            $.ajax({
                method: 'DELETE',
                url: '/api/v0.1/posts/' + postID,
                success: function (res) {
                    window.location.reload();
                },
                error: function () {
                    window.alert('Delete failed.');
                }
            });
        });

    });

}(jQuery));