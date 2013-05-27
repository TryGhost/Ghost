/*global window, document, Ghost, Backbone, $, _ */
(function () {

    Ghost.Views.Blog = Backbone.View.extend({

        events: {
            'click .js-delete-post': 'deletePost',
            'scroll .js-content-list': 'listScrollHandler',
            'scroll .js-content-preview': 'previewScrollHandler'
        },

        deletePost: function (e) {
            e.preventDefault();
            this.model.destroy();
        },

        previewScrollHandler: function (e) {
            this.scrollHandler(e, '.content-preview');
        },

        listScrollHandler: function (e) {
            this.scrollHandler(e, '.content-list');
        },

        scrollHandler: function (e, targetClass) {
            if ($(e.currentTarget).scrollTop() > 10) {
                $(targetClass).addClass('scrolling');
            } else {
                $(targetClass).removeClass('scrolling');
            }
        }

    });

}());