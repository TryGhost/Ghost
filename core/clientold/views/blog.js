/*global window, Ghost, $, _, Backbone, NProgress */
(function () {
    "use strict";

    var ContentList,
        ContentItem,
        PreviewContainer;

    // Base view
    // ----------
    Ghost.Views.Blog = Ghost.View.extend({
        initialize: function (options) {
            /*jshint unused:false*/
            var self = this,
                finishProgress = function () {
                    NProgress.done();
                };

            // Basic collection request/sync flow progress bar handlers
            this.listenTo(this.collection, 'request', function () {
                NProgress.start();
            });
            this.listenTo(this.collection, 'sync', finishProgress);

            // A special case because models that are destroyed are removed from the
            // collection before the sync event fires and bubbles up
            this.listenTo(this.collection, 'destroy', function (model) {
                self.listenToOnce(model, 'sync', finishProgress);
            });

            this.addSubview(new PreviewContainer({ el: '.js-content-preview', collection: this.collection })).render();
            this.addSubview(new ContentList({ el: '.js-content-list', collection: this.collection })).render();
        }
    });


    // Content list (sidebar)
    // -----------------------
    ContentList = Ghost.View.extend({

        isLoading: false,

        events: {
            'click .content-list-content'    : 'scrollHandler'
        },

        initialize: function () {
            this.$('.content-list-content').scrollClass({target: '.content-list', offset: 10});
            this.listenTo(this.collection, 'remove', this.showNext);
            this.listenTo(this.collection, 'add', this.renderPost);
            // Can't use backbone event bind (see: http://stackoverflow.com/questions/13480843/backbone-scroll-event-not-firing)
            this.$('.content-list-content').scroll($.proxy(this.checkScroll, this));
        },

        showNext: function () {
            if (this.isLoading) { return; }

            if (!this.collection.length) {
                return Backbone.trigger('blog:activeItem', null);
            }

            var id = this.collection.at(0) ? this.collection.at(0).id : false;
            if (id) {
                Backbone.trigger('blog:activeItem', id);
            }
        },

        reportLoadError: function (response) {
            var message = 'A problem was encountered while loading more posts';

            if (response) {
                // Get message from response
                message += '; ' + Ghost.Views.Utils.getRequestErrorMessage(response);
            } else {
                message += '.';
            }

            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        },

        checkScroll: function (event) {
            var self = this,
                element = event.target,
                triggerPoint = 100;

            // If we haven't passed our threshold, exit
            if (this.isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
                return;
            }

            // If we've loaded the max number of pages, exit
            if (this.collection.currentPage >=  this.collection.totalPages) {
                return;
            }

            // Load moar posts!
            this.isLoading = true;
            this.collection.fetch({
                update: true,
                remove: false,
                data: {
                    status: 'all',
                    page: (self.collection.currentPage + 1),
                    staticPages: 'all'
                }
            }).then(function onSuccess(response) {
                /*jshint unused:false*/
                self.render();
                self.isLoading = false;
            }, function onError(e) {
                self.reportLoadError(e);
            });
        },

        renderPost: function (model) {
            this.$('ol').append(this.addSubview(new ContentItem({model: model})).render().el);
        },

        render: function () {
            var $list = this.$('ol');

            // Clear out any pre-existing subviews.
            this.removeSubviews();

            this.collection.each(function (model) {
                $list.append(this.addSubview(new ContentItem({model: model})).render().el);
            }, this);
            this.showNext();
        }

    });

    // Content Item
    // -----------------------
    ContentItem = Ghost.View.extend({

        tagName: 'li',

        events: {
            'click a': 'setActiveItem'
        },

        active: false,

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.checkActive);
            this.listenTo(this.model, 'change:page change:featured', this.render);
            this.listenTo(this.model, 'destroy', this.removeItem);
        },

        removeItem: function () {
            var self = this;
            $.when(this.$el.slideUp()).then(function () {
                self.remove();
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

        templateName: "list-item",

        templateData: function () {
            return _.extend({active: this.active}, this.model.toJSON());
        }
    });

    // Content preview
    // ----------------
    PreviewContainer = Ghost.View.extend({

        activeId: null,

        events: {
            'click .post-controls .post-edit' : 'editPost',
            'click .featured' : 'toggleFeatured',
            'click .unfeatured' : 'toggleFeatured'
        },

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.setActivePreview);
        },

        setActivePreview: function (id) {
            if (this.activeId !== id) {
                this.activeId = id;
                this.render();
            }
        },

        editPost: function (e) {
            e.preventDefault();
            // for now this will disable "open in new tab", but when we have a Router implemented
            // it can go back to being a normal link to '#/ghost/editor/X'
            window.location = Ghost.paths.subdir + '/ghost/editor/' + this.model.get('id') + '/';
        },

        toggleFeatured: function (e) {
            e.preventDefault();
            var self = this,
                featured = !self.model.get('featured'),
                featuredEl = $(e.currentTarget),
                model = this.collection.get(this.activeId);

            model.save({
                featured: featured
            }, {
                success : function () {
                    featuredEl.removeClass("featured unfeatured").addClass(featured ? "featured" : "unfeatured");
                    Ghost.notifications.clearEverything();
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Post successfully marked as " + (featured ? "featured" : "not featured") + ".",
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jshint unused:false*/
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        },

        templateName: "preview",

        render: function () {
            this.model = this.collection.get(this.activeId);
            this.$el.html(this.template(this.templateData()));

            this.$('.content-preview-content').scrollClass({target: '.content-preview', offset: 10});
            this.$('.wrapper').on('click', 'a', function (e) {
                $(e.currentTarget).attr('target', '_blank');
            });

            if (this.model !== undefined) {
                this.addSubview(new Ghost.View.PostSettings({el: $('.post-controls'), model: this.model})).render();
            }

            Ghost.temporary.initToggles(this.$el);
            return this;
        }

    });

}());
