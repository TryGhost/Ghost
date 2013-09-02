/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";

    var Settings = {};

    // Base view
    // ----------
    Ghost.Views.Settings = Ghost.View.extend({
        initialize: function (options) {
            $(".settings-content").removeClass('active');

            this.sidebar = new Settings.Sidebar({
                el: '.settings-sidebar',
                pane: options.pane,
                model: this.model
            });

            this.addSubview(this.sidebar);

            this.listenTo(Ghost.router, "route:settings", this.changePane);
        },

        changePane: function (pane) {
            if (!pane) {
                // Can happen when trying to load /settings with no pane specified
                // let the router navigate itself to /settings/general
                return;
            }

            this.sidebar.showContent(pane);
        }
    });

    // Sidebar (tabs)
    // ---------------
    Settings.Sidebar = Ghost.View.extend({
        initialize: function (options) {
            this.render();
            this.menu = this.$('.settings-menu');
            this.showContent(options.pane);
        },

        models: {},

        events: {
            'click .settings-menu li' : 'switchPane'
        },

        switchPane: function (e) {
            e.preventDefault();
            var item = $(e.currentTarget),
                id = item.find('a').attr('href').substring(1);

            this.showContent(id);
        },

        showContent: function (id) {
            var self = this,
                model;

            Ghost.router.navigate('/settings/' + id);
            Ghost.trigger('urlchange');
            if (this.pane && id === this.pane.el.id) {
                return;
            }
            _.result(this.pane, 'destroy');
            this.setActive(id);
            this.pane = new Settings[id]({ el: '.settings-content'});

            if (!this.models.hasOwnProperty(this.pane.options.modelType)) {
                model = this.models[this.pane.options.modelType] = new Ghost.Models[this.pane.options.modelType]();
                model.fetch().then(function () {
                    self.renderPane(model);
                });
            } else {
                model = this.models[this.pane.options.modelType];
                self.renderPane(model);
            }
        },

        renderPane: function (model) {
            this.pane.model = model;
            this.pane.render();
        },

        setActive: function (id) {
            this.menu.find('li').removeClass('active');
            this.menu.find('a[href=#' + id + ']').parent().addClass('active');
        },

        templateName: 'settings/sidebar'
    });

    // Content panes
    // --------------
    Settings.Pane = Ghost.View.extend({
        options: {
            modelType: 'Settings'
        },
        destroy: function () {
            this.$el.removeClass('active');
            this.undelegateEvents();
        },
        render: function () {
            this.$el.hide();
            Ghost.View.prototype.render.call(this);
            this.$el.fadeIn(300);
        },
        afterRender: function () {
            this.$el.attr('id', this.id);
            this.$el.addClass('active');

            this.$('input').iCheck({
                checkboxClass: 'icheckbox_ghost'
            });
        },
        saveSuccess: function (model, response, options) {
            // TODO: better messaging here?
            Ghost.notifications.addItem({
                type: 'success',
                message: 'Saved',
                status: 'passive'
            });
        },
        saveError: function (model, xhr) {
            Ghost.notifications.addItem({
                type: 'error',
                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                status: 'passive'
            });
        },
        validationError: function (message) {
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        }
    });

    // TODO: use some kind of data-binding for forms

    // ### General settings
    Settings.general = Settings.Pane.extend({
        id: "general",

        events: {
            'click .button-save': 'saveSettings'
        },

        saveSettings: function () {
            this.model.save({
                title: this.$('#blog-title').val(),
                email: this.$('#email-address').val(),
                logo: this.$('#logo').attr("src"),
                icon: this.$('#icon').attr("src")

            }, {
                success: this.saveSuccess,
                error: this.saveError
            });
        },

        templateName: 'settings/general',

        beforeRender: function () {
            var settings = this.model.toJSON();
            this.$('#blog-title').val(settings.title);
            this.$('#email-address').val(settings.email);
        },

        afterRender: function () {
            this.$('.js-drop-zone').upload();
            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### Content settings
    Settings.content = Settings.Pane.extend({
        id: 'content',
        events: {
            'click .button-save': 'saveSettings'
        },
        saveSettings: function () {
            this.model.save({
                description: this.$('#blog-description').val()
            }, {
                success: this.saveSuccess,
                error: this.saveError
            });
        },

        templateName: 'settings/content',

        beforeRender: function () {
            var settings = this.model.toJSON();
            this.$('#blog-description').val(settings.description);
        }
    });

     // ### User profile
    Settings.user = Settings.Pane.extend({
        id: 'user',

        options: {
            modelType: 'User'
        },

        events: {
            'click .button-save': 'saveUser',
            'click .button-change-password': 'changePassword'
        },


        saveUser: function () {
            this.model.save({
                'full_name':        this.$('#user-name').val(),
                'email_address':    this.$('#user-email').val(),
                'location':         this.$('#user-location').val(),
                'url':              this.$('#user-website').val(),
                'bio':              this.$('#user-bio').val(),
                'profile_picture':  this.$('#user-profile-picture').attr('src'),
                'cover_picture':    this.$('#user-cover-picture').attr('src')
            }, {
                success: this.saveSuccess,
                error: this.saveError
            });
        },

        changePassword: function (event) {
            event.preventDefault();

            var self = this,
                oldPassword = this.$('#user-password-old').val(),
                newPassword = this.$('#user-password-new').val(),
                ne2Password = this.$('#user-new-password-verification').val();

            if (newPassword !== ne2Password) {
                this.validationError('Your new passwords do not match');
                return;
            }

            if (newPassword.length < 8) {
                this.validationError('Your password is not long enough. It must be at least 8 chars long.');
                return;
            }

            $.ajax({
                url: '/ghost/changepw/',
                type: 'POST',
                data: {
                    password: oldPassword,
                    newpassword: newPassword,
                    ne2password: ne2Password
                },
                success: function (msg) {
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: msg.msg,
                        status: 'passive',
                        id: 'success-98'
                    });
                    self.$('#user-password-old, #user-password-new, #user-new-password-verification').val('');
                },
                error: function (xhr) {
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        },

        templateName: 'settings/user-profile',

        beforeRender: function () {
            var user = this.model.toJSON();
            this.$('#user-name').val(user.full_name);
            this.$('#user-email').val(user.email_address);
            this.$('#user-location').val(user.location);
            this.$('#user-website').val(user.url);
            this.$('#user-bio').val(user.bio);
            this.$('#user-profile-picture').attr('src', user.profile_picture);
            this.$('#user-cover-picture').attr('src', user.cover_picture);
        }
    });

    // ### User settings
    Settings.users = Settings.Pane.extend({
        id: 'users',
        events: {
        }
    });

    // ### Appearance settings
    Settings.appearance = Settings.Pane.extend({
        id: 'appearance',
        events: {
        }
    });

    // ### Services settings
    Settings.services = Settings.Pane.extend({
        id: 'services',
        events: {
        }
    });

    // ### Plugins settings
    Settings.plugins = Settings.Pane.extend({
        id: 'plugins',
        events: {
        }
    });

}());
