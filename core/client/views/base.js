/*global window, document, setTimeout, Ghost, $, _, Backbone, JST, shortcut */
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
        }
    });

    Ghost.Views.Utils = {

        // Used in API request fail handlers to parse a standard api error
        // response json for the message to display
        getRequestErrorMessage: function (request) {
            var message,
                msgDetail;

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
                    msgDetail = request.status ? request.status + " - " + request.statusText : "Server was not available";
                    message = "The server returned an error (" + msgDetail + ").";
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
    };

    /**
     * This is the view to generate the markup for the individual
     * notification. Will be included into #notifications.
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
        el: '#notifications',
        initialize: function () {
            var self = this;
            this.render();
            Ghost.on('urlchange', function () {
                self.clearEverything();
            });
            shortcut.add("ESC", function () {
                // Make sure there isn't currently an open modal, as the escape key should close that first.
                // This is a temporary solution to enable closing extra-long notifications, and should be refactored
                // into something more robust in future
                if ($('.js-modal').length < 1) {
                    self.clearEverything();
                }
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
            var itemView = new Ghost.Views.Notification({ model: item }),
                height,
                $notification = $(itemView.render().el);

            this.$el.append($notification);
            height = $notification.hide().outerHeight(true);
            $notification.animate({height: height}, 250, function () {
                $(this)
                    .css({height: "auto"})
                    .fadeIn(250);
            });
        },
        addItem: function (item) {
            this.model.push(item);
            this.renderItem(item);
        },
        clearEverything: function () {
            this.$el.find('.js-notification.notification-passive').parent().remove();
        },
        removeItem: function (e) {
            e.preventDefault();
            var self = e.currentTarget,
                bbSelf = this;
            if (self.className.indexOf('notification-persistent') !== -1) {
                $.ajax({
                    type: "DELETE",
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    url: Ghost.paths.apiRoot + '/notifications/' + $(self).find('.close').data('id')
                }).done(function (result) {
                    /*jslint unparam:true*/
                    bbSelf.$el.slideUp(250, function () {
                        $(this).show().css({height: "auto"});
                        $(self).remove();
                    });
                });
            } else {
                $(self).slideUp(250, function () {
                    $(this)
                        .show()
                        .css({height: "auto"})
                        .parent()
                        .remove();
                });
            }
        },
        closePassive: function (e) {
            $(e.currentTarget)
                .parent()
                .fadeOut(250)
                .slideUp(250, function () {
                    $(this).remove();
                });
        },
        closePersistent: function (e) {
            var self = e.currentTarget,
                bbSelf = this;
            $.ajax({
                type: "DELETE",
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                url: Ghost.paths.apiRoot + '/notifications/' + $(self).data('id')
            }).done(function (result) {
                /*jslint unparam:true*/
                var height = bbSelf.$('.js-notification').outerHeight(true),
                    $parent = $(self).parent();
                bbSelf.$el.css({height: height});

                if ($parent.parent().hasClass('js-bb-notification')) {
                    $parent.parent().fadeOut(200,  function () {
                        $(this).remove();
                        bbSelf.$el.slideUp(250, function () {
                            $(this).show().css({height: "auto"});
                        });
                    });
                } else {
                    $parent.fadeOut(200,  function () {
                        $(this).remove();
                        bbSelf.$el.slideUp(250, function () {
                            $(this).show().css({height: "auto"});
                        });
                    });
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
            if (this.model.options.close) {
                shortcut.add("ESC", function () {
                    self.removeElement();
                });
                $(document).on('click', '.modal-background', function () {
                    self.removeElement();
                });
            } else {
                shortcut.remove("ESC");
                $(document).off('click', '.modal-background');
            }

            if (this.model.options.confirm) {
                // Initiate functions for buttons here so models don't get tied up.
                this.acceptModal = function () {
                    this.model.options.confirm.accept.func.call(this);
                    self.removeElement();
                };
                this.rejectModal = function () {
                    this.model.options.confirm.reject.func.call(this);
                    self.removeElement();
                };
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
            this.$el.fadeIn(50);
            $(".modal-background").fadeIn(10, function () {
                $(this).addClass("in");
            });
            if (this.model.options.confirm) {
                this.$('.close').remove();
            }
            this.$(".modal-body").html(this.addSubview(new Ghost.Views.Modal.ContentView({model: this.model})).render().el);

//            if (document.body.style.webkitFilter !== undefined) { // Detect webkit filters
//                $("body").addClass("blur"); // Removed due to poor performance in Chrome
//            }

            if (_.isFunction(this.model.options.afterRender)) {
                this.model.options.afterRender.call(this);
            }
            if (this.model.options.animation) {
                this.animate(this.$el.children(".js-modal"));
            }
        },
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

            var self = this,
                $jsModal = $('.js-modal'),
                removeModalDelay = $jsModal.transitionDuration(),
                removeBackgroundDelay = self.$el.transitionDuration();

            $jsModal.removeClass('in');

            if (!this.model.options.animation) {
                removeModalDelay = removeBackgroundDelay = 0;
            }

            setTimeout(function () {

                if (document.body.style.filter !== undefined) {
                    $("body").removeClass("blur");
                }
                $(".modal-background").removeClass('in');

                setTimeout(function () {
                    self.remove();
                    self.$el.hide();
                    $(".modal-background").hide();
                }, removeBackgroundDelay);
            }, removeModalDelay);

        },
        // #### animate
        // Animates the animation
        animate: function (target) {
            setTimeout(function () {
                target.addClass('in');
            }, target.transitionDuration());
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
