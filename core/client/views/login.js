/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";


    Ghost.SimpleFormView = Ghost.View.extend({
        initialize: function () {
            this.render();
            $(window).trigger('resize');
        },

        afterRender: function () {
            var self = this;

            $(window).on('resize', self.centerOnResize);

            $(window).one('centered', self.fadeInAndFocus);
        },

        fadeInAndFocus: function () {
            $(".js-login-container").fadeIn(750, function () {
                $("[name='email']").focus();
            });
        },

        centerOnResize: _.debounce(function (e) {
            $(".js-login-container").center();
        }, 100),

        remove: function () {
            var self = this;
            $(window).off('resize', self.centerOnResize);
            $(window).off('centered', self.fadeInAndFocus);
        }
    });

    Ghost.Views.Login = Ghost.SimpleFormView.extend({

        templateName: "login",

        events: {
            'submit #login': 'submitHandler'
        },

        submitHandler: function (event) {
            event.preventDefault();
            var email = this.$el.find('.email').val(),
                password = this.$el.find('.password').val(),
                self = this;

            $.ajax({
                url: '/ghost/login/',
                type: 'POST',
                data: {
                    email: email,
                    password: password
                },
                success: function (msg) {
                    window.location.href = msg.redirect;
                },
                error: function (obj, string, status) {
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: self.getRequestErrorMessage(obj),
                        status: 'passive'
                    });
                }
            });
        }
    });

    Ghost.Views.Signup = Ghost.SimpleFormView.extend({

        templateName: "signup",

        events: {
            'submit #register': 'submitHandler'
        },

        submitHandler: function (event) {
            event.preventDefault();
            var email = this.$el.find('.email').val(),
                password = this.$el.find('.password').val(),
                self = this;

            $.ajax({
                url: '/ghost/signup/',
                type: 'POST',
                data: {
                    email: email,
                    password: password
                },
                success: function (msg) {
                    window.location.href = msg.redirect;
                },
                error: function (obj, string, status) {
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: self.getRequestErrorMessage(obj),
                        status: 'passive'
                    });
                }
            });
        }
    });
}());
