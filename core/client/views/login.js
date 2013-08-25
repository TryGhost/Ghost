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
            var container = $(".js-login-container");
            container.css({
                'position': 'relative'
            }).animate({
                'top': Math.round($(window).height() / 2) - container.outerHeight() / 2 + 'px'
            });
            $(window).trigger("centered");
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
                redirect = Ghost.Views.Utils.getUrlVariables().r;

            $.ajax({
                url: '/ghost/signin/',
                type: 'POST',
                data: {
                    email: email,
                    password: password,
                    redirect: redirect
                },
                success: function (msg) {
                    window.location.href = msg.redirect;
                },
                error: function (xhr) {
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
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
                password = this.$el.find('.password').val();

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
                error: function (xhr) {
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        }
    });
}());
