/*global window, document, Ghost, Backbone, $, _, NProgress */
(function () {
    "use strict";

    Ghost.Router = Backbone.Router.extend({

        routes: {
            ''                 : 'blog',
            'content/'         : 'blog',
            'settings(/:pane)/' : 'settings',
            'editor(/:id)/'     : 'editor',
            'debug/'           : 'debug',
            'register/'        : 'register',
            'signup/'          : 'signup',
            'signin/'          : 'login',
            'forgotten/'       : 'forgotten',
            'reset/:token/'     : 'reset'
        },

        signup: function () {
            Ghost.currentView = new Ghost.Views.Signup({ el: '.js-signup-box' });
        },

        login: function () {
            Ghost.currentView = new Ghost.Views.Login({ el: '.js-login-box' });
        },

        forgotten: function () {
            Ghost.currentView = new Ghost.Views.Forgotten({ el: '.js-forgotten-box' });
        },

        reset: function (token) {
            Ghost.currentView = new Ghost.Views.ResetPassword({ el: '.js-reset-box', token: token });
        },

        blog: function () {
            var posts = new Ghost.Collections.Posts();
            NProgress.start();
            posts.fetch({ data: { status: 'all', staticPages: 'all'} }).then(function () {
                Ghost.currentView = new Ghost.Views.Blog({ el: '#main', collection: posts });
                NProgress.done();
            });
        },

        settings: function (pane) {
            if (!pane) {
                // Redirect to settings/general if no pane supplied
                this.navigate('/settings/general/', {
                    trigger: true,
                    replace: true
                });
                return;
            }

            // only update the currentView if we don't already have a Settings view
            if (!Ghost.currentView || !(Ghost.currentView instanceof Ghost.Views.Settings)) {
                Ghost.currentView = new Ghost.Views.Settings({ el: '#main', pane: pane });
            }
        },

        editor: function (id) {
            var post = new Ghost.Models.Post();
            post.urlRoot = Ghost.paths.apiRoot + '/posts';
            if (id) {
                post.id = id;
                post.fetch({ data: {status: 'all'}}).then(function () {
                    Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
                });
            } else {
                Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
            }
        },

        debug: function () {
            Ghost.currentView = new Ghost.Views.Debug({ el: "#main" });
        }
    });
}());
