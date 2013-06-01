/*global window, document, Ghost, Backbone, confirm, JST, $, _ */
(function () {
    "use strict";

    var ContentList,
        ContentItem,
        PreviewContainer,

        // Add shadow during scrolling
        scrollShadow = function (target, e) {
            if ($(e.currentTarget).scrollTop() > 10) {
                $(target).addClass('scrolling');
            } else {
                $(target).removeClass('scrolling');
            }
        };

    // Base view
    // ----------
    Ghost.Views.Blog = Backbone.View.extend({
        initialize: function (options) {
            this.addSubview(new PreviewContainer({ el: '.js-content-preview', collection: this.collection })).render();
            this.addSubview(new ContentList({ el: '.js-content-list', collection: this.collection })).render();
        }
    });


    // Content list (sidebar)
    // -----------------------
    ContentList = Backbone.View.extend({

        events: {
            'click .content-list-content'    : 'scrollHandler'
        },

        initialize: function (options) {
            this.$('.content-list-content').on('scroll', _.bind(scrollShadow, null, '.content-list'));
            this.listenTo(this.collection, 'remove', this.showNext);
        },

        showNext: function () {
            var id = this.collection.at(0).id;
            if (id) {
                Backbone.trigger('blog:activeItem', id);
            }
        },

        render: function () {
            this.collection.each(function (model) {
                this.$('ol').append(this.addSubview(new ContentItem({model: model})).render().el);
            }, this);
            this.showNext();
        }

    });

    // Content Item
    // -----------------------
    ContentItem = Backbone.View.extend({

        tagName: 'li',

        events: {
            'click a': 'setActiveItem'
        },

        active: false,

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.checkActive);
            this.listenTo(this.model, 'destroy', this.removeItem);
        },

        removeItem: function () {
            var view = this;
            $.when(this.$el.slideUp()).then(function () {
                view.remove();
            });
        },

        // If the current item isn't active, we trigger the event to
        // notify a change in which item we're viewing.
        setActiveItem: function (e) {
            e.preventDefault();
            if (this.active !== true) {
                Backbone.trigger('blog:activeItem', this.model.id);
                this.render();
            }
        },

        // Checks whether this item is active and doesn't match the current id.
        checkActive: function (id) {
            if (this.model.id !== id) {
                if (this.active) {
                    this.active = false;
                    this.$el.removeClass('active');
                    this.render();
                }
            } else {
                this.active = true;
                this.$el.addClass('active');
            }
        },

        showPreview: function (e) {
            var item = $(e.currentTarget);
            this.$('.content-list-content li').removeClass('active');
            item.addClass('active');
            Backbone.trigger('blog:activeItem', item.data('id'));
        },

        template: JST['content/list-item'],

        render: function () {
            this.$el.html(this.template(_.extend({active: this.active}, this.model.toJSON())));
            return this;
        }

    });

    // Content preview
    // ----------------
    PreviewContainer = Backbone.View.extend({

        activeId: null,

        events: {
            'click .post-controls .delete' : 'deletePost',
            'click .post-controls .post-edit' : 'editPost'
        },

        initialize: function (options) {
            this.listenTo(Backbone, 'blog:activeItem', this.setActivePreview);
            this.$('.content-preview-content').on('scroll', _.bind(scrollShadow, null, '.content-preview'));
        },

        setActivePreview: function (id) {
            if (this.activeId !== id) {
                this.activeId = id;
                this.render();
            }
        },

        deletePost: function (e) {
            e.preventDefault();
            if (confirm('Are you sure you want to delete this post?')) {
                this.model.destroy({
                    wait: true
                });
            }
        },

        editPost: function (e) {
            e.preventDefault();
            // for now this will disable "open in new tab", but when we have a Router implemented
            // it can go back to being a normal link to '#/ghost/editor/X'
            window.location = '/ghost/editor/' + this.model.get('id');
        },

        template: JST['content/preview'],

        render: function () {
            if (this.activeId) {
                this.model = this.collection.get(this.activeId);
                this.$el.html(this.template(this.model.toJSON()));
            }
            this.$('.wrapper').on('click', 'a', function (e) {
                $(e.currentTarget).attr('target', '_blank');
            });
            Ghost.temporary.initToggles(this.$el);
            return this;
        }

    });

}());