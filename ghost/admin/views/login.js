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

            Ghost.Validate._errors = [];
            Ghost.Validate.check(email).isEmail();
            Ghost.Validate.check(password, "Please enter a password").len(0);

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                $.ajax({
                    url: '/ghost/signin/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
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

            // This is needed due to how error handling is done. If this is not here, there will not be a time
            // when there is no error.
            Ghost.Validate._errors = [];
            Ghost.Validate.check(name, "Please enter a name").len(1);
            Ghost.Validate.check(email, "Please enter a correct email address").isEmail();
            Ghost.Validate.check(password, "Your password is not long enough. It must be at least 8 characters long.").len(8);

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                $.ajax({
                    url: '/ghost/signup/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
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

            Ghost.Validate._errors = [];
            Ghost.Validate.check(email).isEmail();

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                $.ajax({
                    url: '/ghost/forgotten/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
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
        }
    });
}());
