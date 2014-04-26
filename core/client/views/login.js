/*global window, Ghost, $, validator */
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
                redirect = Ghost.Views.Utils.getUrlVariables().r,
                validationErrors = [];

            if (!validator.isEmail(email)) {
                validationErrors.push("Invalid Email");
            }

            if (!validator.isLength(password, 0)) {
                validationErrors.push("Please enter a password");
            }

            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
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
                password = this.$('.password').val(),
                validationErrors = [],
                self = this;

            if (!validator.isLength(name, 1)) {
                validationErrors.push("Please enter a name.");
            }

            if (!validator.isEmail(email)) {
                validationErrors.push("Please enter a correct email address.");
            }

            if (!validator.isLength(password, 0)) {
                validationErrors.push("Please enter a password");
            }

            if (!validator.equals(this.submitted, "no")) {
                validationErrors.push("Ghost is signing you up. Please wait...");
            }

            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
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
                        self.submitted = "no";
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

            var email = this.$el.find('.email').val(),
                validationErrors = [];

            if (!validator.isEmail(email)) {
                validationErrors.push("Please enter a correct email address.");
            }

            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
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
