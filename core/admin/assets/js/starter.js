/*global window, document, Ghost, GhostData, Backbone, $, _ */
(function () {

    "use strict";

    Ghost.router = new Ghost.Router();

    // Initialize the base models & collections
    Ghost.settings = new Ghost.Collections.Settings([{
        id: 1,
        key: 'title',
        value: ''
    }, {
        id: 2,
        key: 'description',
        value: ''
    }]);

    Ghost.posts = new Ghost.Collections.Posts(GhostData.posts);
    Ghost.user = new Ghost.Collections.User(GhostData.user);

    // Once the document
    $(function() {

        // This should get moved elsewhere...
        $('body').initToggles();

        Backbone.history.start({pushState: true, hashChange: false});
    });

    // ## Set interactions for all menus
    // This finds all visible '.overlay' elements and hides them upon clicking away from the element itself.
    $("body").on('click', function (event) {
        var $target = $(event.target);
        if (!$target.parents().is(".overlay:visible") && !$target.is(".overlay:visible")) {
            $("body").find(".overlay:visible").fadeOut();
        }
    });

    // EDITOR / NOTIFICATIONS

    // TODO: Move this stuff into the nav view

    $('.entry-content header, .entry-preview header').on('click', function () {
        $('.entry-content, .entry-preview').removeClass('active');
        $(this).closest('section').addClass('active');
    });

    $('.entry-title .icon-fullscreen').on('click', function (e) {
        e.preventDefault();
        $('body').toggleClass('fullscreen');
    });

    $('.content-list-content li').on('click', function (e) {
        var $target = $(e.target).closest('li'),
            $preview = $('.content-preview');
        $('.content-list-content li').removeClass('active');
        $target.addClass('active');
        // *****
        // this means a *lot* of extra gumpf is in the DOM and should really be done with AJAX when we have proper
        // data API endpoints
        // ideally, we need a way to bind data to views properly... backbone marionette, angular, etc
        // *****
        //
        /**
         * @todo Remove gumpf
         */
        $preview.find('.content-preview-content .wrapper').html($target.data('content'));
        $preview.find('.post-controls .post-edit').attr('href', '/ghost/editor/' + $target.data('id'));
    });

    $('.editor-options').on('click', 'li', function (e) {
        $('.button-save').data("state", $(this).data("title")).attr('data-state', $(this).data("title")).text($(this).text());
        $('.editor-options .active').removeClass('active');
        $(this).addClass('active');
    });

}());