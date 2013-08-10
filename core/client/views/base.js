/*global window, document, Ghost, $, _, Backbone, JST, shortcut */
(function () {
    "use strict";

    Ghost.TemplateView = Backbone.View.extend({
        templateName: "widget",

        template: function (data) {
            return JST[this.templateName](data);
        },

        templateData: function () {
            if (this.model) {
                return this.model.toJSON();
            }

            if (this.collection) {
                return this.collection.toJSON();
            }

            return {};
        },

        render: function () {
            if (_.isFunction(this.beforeRender)) {
                this.beforeRender();
            }

            this.$el.html(this.template(this.templateData()));

            if (_.isFunction(this.afterRender)) {
                this.afterRender();
            }

            return this;
        }
    });

    Ghost.View = Ghost.TemplateView.extend({

        // Adds a subview to the current view, which will
        // ensure its removal when this view is removed,
        // or when view.removeSubviews is called
        addSubview: function (view) {
            if (!(view instanceof Backbone.View)) {
                throw new Error("Subview must be a Backbone.View");
            }
            this.subviews = this.subviews || [];
            this.subviews.push(view);
            return view;
        },

        // Removes any subviews associated with this view
        // by `addSubview`, which will in-turn remove any
        // children of those views, and so on.
        removeSubviews: function () {
            var i, l, children = this.subviews;
            if (!children) {
                return this;
            }
            for (i = 0, l = children.length; i < l; i += 1) {
                children[i].remove();
            }
            this.subviews = [];
            return this;
        },

        // Extends the view's remove, by calling `removeSubviews`
        // if any subviews exist.
        remove: function () {
            if (this.subviews) {
                this.removeSubviews();
            }
            return Backbone.View.prototype.remove.apply(this, arguments);
        }

    });

    /**
     * This is the view to generate the markup for the individual
     * notification. Will be included into #flashbar.
     *
     * States can be
     * - persistent
     * - passive
     *
     * Types can be
     * - error
     * - success
     * - alert
     * -   (empty)
     *
     */
    Ghost.Views.Notification = Ghost.View.extend({
        templateName: 'notification',
        className: 'js-bb-notification',
        template: function (data) {
            return JST[this.templateName](data);
        },
        render: function () {
            var html = this.template(this.model);
            this.$el.html(html);
            return this;
        }
    });

    /**
     * This handles Notification groups
     */
    Ghost.Views.NotificationCollection = Ghost.View.extend({
        el: '#flashbar',
        initialize: function () {
            var self = this;
            this.render();
            Backbone.history.on('route', function () {
                self.clearEverything();
            });
        },
        events: {
            'animationend .js-notification': 'removeItem',
            'webkitAnimationEnd .js-notification': 'removeItem',
            'oanimationend .js-notification': 'removeItem',
            'MSAnimationEnd .js-notification': 'removeItem',
            'click .js-notification.notification-passive .close': 'closePassive',
            'click .js-notification.notification-persistent .close': 'closePersistent'
        },
        render: function () {
            _.each(this.model, function (item) {
                this.renderItem(item);
            }, this);
        },
        renderItem: function (item) {
            var itemView = new Ghost.Views.Notification({ model: item });
            this.$el.html(itemView.render().el);
        },
        addItem: function (item) {
            this.model.push(item);
            this.renderItem(item);
        },
        clearEverything: function () {
            this.$el.find('.js-notification.notification-passive').fadeOut(200,  function () { $(this).remove(); });
        },
        removeItem: function (e) {
            e.preventDefault();
            var self = e.currentTarget;
            if (self.className.indexOf('notification-persistent') !== -1) {
                $.ajax({
                    type: "DELETE",
                    url: '/api/v0.1/notifications/' + $(self).find('.close').data('id')
                }).done(function (result) {
                    $(e.currentTarget).remove();
                });
            } else {
                $(e.currentTarget).remove();
            }

        },
        closePassive: function (e) {
            $(e.currentTarget).parent().fadeOut(200,  function () { $(this).remove(); });
        },
        closePersistent: function (e) {
            var self = e.currentTarget;
            $.ajax({
                type: "DELETE",
                url: '/api/v0.1/notifications/' + $(self).data('id')
            }).done(function (result) {
                if ($(self).parent().parent().hasClass('js-bb-notification')) {
                    $(self).parent().parent().fadeOut(200, function () { $(self).remove(); });
                } else {
                    $(self).parent().fadeOut(200, function () { $(self).remove(); });
                }
            });
        }
    });

    /**
     * This is the view to generate the markup for the individual
     * modal. Will be included into #modals.
     *
     *
     *
     * Types can be
     * -   (empty)
     *
     */
    Ghost.Views.Modal = Ghost.View.extend({
        el: '#modal-container',
        templateName: 'modal',
        className: 'js-bb-modal',
        initialize: function () {
            this.render();
            var self = this;
            if (!this.model.options.confirm) {
                shortcut.add("ESC", function () {
                    self.removeItem();
                });
                $(document).on('click', '.modal-background', function (e) {
                    self.removeItem(e);
                });
            } else {
                // Initiate functions for buttons here so models don't get tied up.
                this.acceptModal = function () {
                    this.model.options.confirm.accept.func();
                    self.removeItem();
                };
                this.rejectModal = function () {
                    this.model.options.confirm.reject.func();
                    self.removeItem();
                };
                shortcut.remove("ESC");
                $(document).off('click', '.modal-background');
            }
        },
        template: function (data) {
            return JST[this.templateName](data);
        },
        events: {
            'click .close': 'removeItem',
            'click .js-button-accept': 'acceptModal',
            'click .js-button-reject': 'rejectModal'
        },
        render: function () {
            this.$el.html(this.template(this.model));
            this.$(".modal-content").html(this.addSubview(new Ghost.Views.Modal.ContentView({model: this.model})).render().el);
            this.$el.children(".js-modal").center();
            this.$el.addClass("active");
            if (document.body.style.webkitFilter !== undefined) { // Detect webkit filters
                $("body").addClass("blur");
            } else {
                this.$el.addClass("dark");
            }
            return this;
        },
        remove: function () {
            this.undelegateEvents();
            this.$el.empty();
            this.stopListening();
            return this;
        },
        removeItem: function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            $('.js-modal').fadeOut(300, function () {
                $(this).remove();
                $("#modal-container").removeClass('active dark');
                if (document.body.style.filter !== undefined) {
                    $("body").removeClass("blur");
                }
            });
            this.remove();
        }
    });

    /**
     * Modal Content
     * @type {*}
     */
    Ghost.Views.Modal.ContentView = Ghost.View.extend({

        template: function (data) {
            return JST['modals/' + this.model.content.template](data);
        },

        render: function () {
            this.$el.html(this.template(this.model));
            return this;
        }

    });
}());
