/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Login = Ghost.View.extend({

        templateName: "login",

        events: {
            'submit #login': 'submitHandler'
        },

        initialize: function (options) {
            this.render();
        },

        template: function (data) {
            return JST[this.templateName](data);
        },

        render: function () {
            this.$el.html(this.template());
            return this;
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
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'error',
                            message: 'Invalid username or password',
                            status: 'passive'
                        }]
                    }));
                }
            });
        }
    });

    Ghost.Views.Signup = Ghost.View.extend({

        templateName: "signup",

        events: {
            'submit #register': 'submitHandler'
        },

        initialize: function (options) {
            this.render();
        },

        template: function (data) {
            return JST[this.templateName](data);
        },

        render: function () {
            this.$el.html(this.template());
            return this;
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
                    var msgobj = $.parseJSON(obj.responseText);
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'error',
                            message: msgobj.message,
                            status: 'passive'
                        }]
                    }));
                }
            });
        }
    });
}());
