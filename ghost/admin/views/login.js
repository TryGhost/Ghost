/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Login = Ghost.View.extend({

        initialize: function () {
            this.render();
            $(".js-login-box").css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                $("[name='email']").focus();
            });
        },

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

    Ghost.Views.Signup = Ghost.View.extend({

        initialize: function () {
            this.render();
            $(".js-signup-box").css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                $("[name='name']").focus();
            });
        },

        templateName: "signup",

        events: {
            'submit #signup': 'submitHandler'
        },

        submitHandler: function (event) {
            event.preventDefault();
            var name = this.$el.find('.name').val(),
                email = this.$el.find('.email').val(),
                password = this.$el.find('.password').val();

            if (!name) {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: "Please enter a name",
                    status: 'passive'
                });
            } else if (!email) {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: "Please enter an email",
                    status: 'passive'
                });
            } else if (!password) {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: "Please enter a password",
                    status: 'passive'
                });
            } else {
                $.ajax({
                    url: '/ghost/signup/',
                    type: 'POST',
                    data: {
                        name: name,
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
        }
    });

    Ghost.Views.Forgotten = Ghost.View.extend({

        initialize: function () {
            this.render();
            $(".js-forgotten-box").css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                $("[name='email']").focus();
            });
        },

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
