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
            $(window).trigger('resize');
        },

        afterRender: function () {
            var self = this;

            $(window).on('resize', _.debounce(function (e) {
                $(".js-login-container").center();
            }, 100));

            $(window).one('centered', self.fadeInAndFocus);
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
        },

        fadeInAndFocus: function () {
            $(".js-login-container").fadeIn(750, function () {
                $("[name='email']").focus();
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
