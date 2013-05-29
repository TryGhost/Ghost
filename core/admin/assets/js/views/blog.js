/*global window, document, Ghost, Backbone, $, _ */
(function () {
    "use strict";

    // Base view
    // ----------
    Ghost.Layout.Blog = Backbone.Layout.extend({
        initialize: function (options) {
            this.addViews({
                list    : new Ghost.View.ContentList({ el: '.content-list' }),
                preview : new Ghost.View.ContentPreview({ el: '.content-preview' })
            });

            // TODO: render templates on the client
            // this.render()
        }
    });

    // Add shadow during scrolling
    var scrollShadow = function (target, e) {
        if ($(e.currentTarget).scrollTop() > 10) {
            $(target).addClass('scrolling');
        } else {
            $(target).removeClass('scrolling');
        }
    };


    // Content list (sidebar)
    // -----------------------
    Ghost.View.ContentList = Backbone.View.extend({
        initialize: function (options) {
            this.$('.content-list-content').on('scroll', _.bind(scrollShadow, null, '.content-list'));
            // Select first item
            _.defer(function (el) {
                el.find('.content-list-content li:first').trigger('click');
            }, this.$el);
        },

        events: {
            'click .content-list-content'    : 'scrollHandler',
            'click .content-list-content li' : 'showPreview'
        },

        showPreview: function (e) {
            var item = $(e.currentTarget);
            this.$('.content-list-content li').removeClass('active');
            item.addClass('active');
            Backbone.trigger("blog:showPreview", item.data('id'));
        }
    });

    // Content preview
    // ----------------
    Ghost.View.ContentPreview = Backbone.View.extend({
        initialize: function (options) {
            this.listenTo(Backbone, "blog:showPreview", this.showPost);
            this.$('.content-preview-content').on('scroll', _.bind(scrollShadow, null, '.content-preview'));
        },

        events: {
            'click .post-controls .delete' : 'deletePost',
            'click .post-controls .post-edit' : 'editPost'
        },

        deletePost: function (e) {
            e.preventDefault();
            this.model.destroy({
                success: function (model) {
                    // here the ContentList would pick up the change in the Posts collection automatically
                    // after client-side rendering is implemented
                    var item = $('.content-list-content li[data-id=' + model.get('id') + ']');
                    item.next().add(item.prev()).eq(0).trigger('click');
                    item.remove();
                },
                error: function () {
                    // TODO: decent error handling
                    console.error('Error');
                }
            });
        },

        editPost: function (e) {
            e.preventDefault();
            // for now this will disable "open in new tab", but when we have a Router implemented
            // it can go back to being a normal link to '#/ghost/editor/X'
            window.location = '/ghost/editor/' + this.model.get('id');
        },

        showPost: function (id) {
            this.model = new Ghost.Model.Post({ id: id });
            this.model.once('change', this.render, this);
            this.model.fetch();
        },

        render: function () {
            this.$('.wrapper').html(this.model.get('content_html'));
        }
    });

    // Initialize views.
    // TODO: move to a `Backbone.Router`
    Ghost.currentView = new Ghost.Layout.Blog({ el: '#main' });

}());