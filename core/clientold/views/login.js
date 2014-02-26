/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Login = Ghost.View.extend({

        initialize: function () {
            this.render();
        },

        templateName: "login",

        events: {
            'submit #login': 'submitHandler'
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='email']").focus();
            });
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
                    url: Ghost.paths.subdir + '/ghost/signin/',
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
                        Ghost.notifications.clearEverything();
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
            this.submitted = "no";
            this.render();
        },

        templateName: "signup",

        events: {
            'submit #signup': 'submitHandler'
        },

        afterRender: function () {
            var self = this;

            this.$el
                .css({"opacity": 0})
                .animate({"opacity": 1}, 500, function () {
                    self.$("[name='name']").focus();
                });
        },

        submitHandler: function (event) {
            event.preventDefault();
            var name = this.$('.name').val(),
                email = this.$('.email').val(),
                password = this.$('.password').val();

            // This is needed due to how error handling is done. If this is not here, there will not be a time
            // when there is no error.
            Ghost.Validate._errors = [];
            Ghost.Validate.check(name, "Please enter a name").len(1);
            Ghost.Validate.check(email, "Please enter a correct email address").isEmail();
            Ghost.Validate.check(password, "Your password is not long enough. It must be at least 8 characters long.").len(8);
            Ghost.Validate.check(this.submitted, "Ghost is signing you up. Please wait...").equals("no");

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                this.submitted = "yes";
                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/signup/',
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
                        this.submitted = "no";
                        Ghost.notifications.clearEverything();
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
        },

        templateName: "forgotten",

        events: {
            'submit #forgotten': 'submitHandler'
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='email']").focus();
            });
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
                    url: Ghost.paths.subdir + '/ghost/forgotten/',
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
                        Ghost.notifications.clearEverything();
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

    Ghost.Views.ResetPassword = Ghost.View.extend({
        templateName: 'reset',

        events: {
            'submit #reset': 'submitHandler'
        },

        initialize: function (attrs) {
            attrs = attrs || {};

            this.token = attrs.token;

            this.render();
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='newpassword']").focus();
            });
        },

        submitHandler: function (ev) {
            ev.preventDefault();

            var self = this,
                newPassword = this.$('input[name="newpassword"]').val(),
                ne2Password = this.$('input[name="ne2password"]').val();

            if (newPassword !== ne2Password) {
                Ghost.notifications.clearEverything();
                Ghost.notifications.addItem({
                    type: 'error',
                    message: "Your passwords do not match.",
                    status: 'passive'
                });

                return;
            }

            this.$('input, button').prop('disabled', true);

            $.ajax({
                url: Ghost.paths.subdir + '/ghost/reset/' + this.token + '/',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                data: {
                    newpassword: newPassword,
                    ne2password: ne2Password
                },
                success: function (msg) {
                    window.location.href = msg.redirect;
                },
                error: function (xhr) {
                    self.$('input, button').prop('disabled', false);

                    Ghost.notifications.clearEverything();
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });

            return false;
        }
    });
}());
