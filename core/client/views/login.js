/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";


    Ghost.SimpleFormView = Ghost.View.extend({
        initialize: function () {
            this.render();
            $(".js-login-box").fadeIn(500, function () {
                $("[name='email']").focus();
            });
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

    Ghost.Views.Forgotten = Ghost.SimpleFormView.extend({

        templateName: "forgotten",

        events: {
            'submit #forgotten': 'submitHandler'
        },

        submitHandler: function (event) {
            event.preventDefault();

            var email = this.$el.find('.email').val();

            $.ajax({
                url: '/ghost/forgotten/',
                type: 'POST',
                data: {
                    email: email
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
