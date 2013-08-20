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
            var children = this.subviews;

            if (!children) {
                return this;
            }

            _(children).invoke("remove");

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
        },

        // Used in API request fail handlers to parse a standard api error
        // response json for the message to display
        getRequestErrorMessage: function (request) {
            var message;

            // Can't really continue without a request
            if (!request) {
                return null;
            }

            // Seems like a sensible default
            message = request.statusText;

            // If a non 200 response
            if (request.status !== 200) {
                try {
                    // Try to parse out the error, or default to "Unknown"
                    message =  request.responseJSON.error || "Unknown Error";
                } catch (e) {
                    message = "The server returned an error (" + (request.status || "?") + ").";
                }
            }

            return message;
        },

        // Getting URL vars
        getUrlVariables: function () {
            var vars = [],
                hash,
                hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&'),
                i;

            for (i = 0; i < hashes.length; i += 1) {
                hash = hashes[i].split('=');
                vars.push(hash[0]);
                vars[hash[0]] = hash[1];
            }
            return vars;
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

    // ## Modals
    Ghost.Views.Modal = Ghost.View.extend({
        el: '#modal-container',
        templateName: 'modal',
        className: 'js-bb-modal',
        // Render and manages modal dismissal
        initialize: function () {
            this.render();
            var self = this;
            if (!this.model.options.confirm) {
                shortcut.add("ESC", function () {
                    self.removeElement();
                });
                $(document).on('click', '.modal-background', function (e) {
                    self.removeElement(e);
                });
            } else {
                // Initiate functions for buttons here so models don't get tied up.
                this.acceptModal = function () {
                    this.model.options.confirm.accept.func();
                    self.removeElement();
                };
                this.rejectModal = function () {
                    this.model.options.confirm.reject.func();
                    self.removeElement();
                };
                shortcut.remove("ESC");
                $(document).off('click', '.modal-background');
            }
        },
        templateData: function () {
            return this.model;
        },
        events: {
            'click .close': 'removeElement',
            'click .js-button-accept': 'acceptModal',
            'click .js-button-reject': 'rejectModal'
        },
        afterRender: function () {
            this.$(".modal-content").html(this.addSubview(new Ghost.Views.Modal.ContentView({model: this.model})).render().el);
            this.$el.children(".js-modal").center({animate: false}).css("max-height", $(window).height() - 120); // same as resize(), but the debounce causes init lag
            this.$el.addClass("active dark");

            if (document.body.style.webkitFilter !== undefined) { // Detect webkit filters
                $("body").addClass("blur");
            }

            var self = this;
            $(window).on('resize', self.resize);

        },
        // #### resize
        // Center and resize modal based on window height
        resize: _.debounce(function () {
            $(".js-modal").center().css("max-height", $(window).height() - 120);
        }, 50),
        // #### remove
        // Removes Backbone attachments from modals
        remove: function () {
            this.undelegateEvents();
            this.$el.empty();
            this.stopListening();
            return this;
        },
        // #### removeElement
        // Visually removes the modal from the user interface
        removeElement: function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            var self = this;
            this.$el.removeClass('dark');
            $('.js-modal').fadeOut(300, function () {
                $(this).remove();
                if (document.body.style.filter !== undefined) {
                    $("body").removeClass("blur");
                }
                self.remove();
                self.$el.removeClass('active');
            });

        }
    });

    // ## Modal Content
    Ghost.Views.Modal.ContentView = Ghost.View.extend({

        template: function (data) {
            return JST['modals/' + this.model.content.template](data);
        },
        templateData: function () {
            return this.model;
        }

    });
}());
