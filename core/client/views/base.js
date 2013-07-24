/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.View = Backbone.View.extend({

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

    Ghost.TemplateView = Ghost.View.extend({
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
            this.$el.html(this.template(this.templateData()));

            if (_.isFunction(this.afterRender)) {
                this.afterRender();
            }

            return this;
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
            this.render();
        },
        events: {
            'animationend .js-notification': 'removeItem',
            'webkitAnimationEnd .js-notification': 'removeItem',
            'oanimationend .js-notification': 'removeItem',
            'MSAnimationEnd .js-notification': 'removeItem'
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
        removeItem: function (e) {
            e.preventDefault();
            $(e.currentTarget).remove();
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
        },
        template: function (data) {
            return JST[this.templateName](data);
        },
        events: {
            'click .close': 'removeItem'
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
        removeItem: function (e) {
            e.preventDefault();
            $(e.currentTarget).closest('.js-modal').fadeOut(300, function () {
                $(this).remove();
                $("#modal-container").removeClass('active dark');
                if (document.body.style.filter !== undefined) {
                    $("body").removeClass("blur");
                }
            });
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
