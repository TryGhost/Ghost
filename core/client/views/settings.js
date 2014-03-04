/*global document, Ghost, $, _, Countable, validator */
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

            this.listenTo(Ghost.router, 'route:settings', this.changePane);
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
            // Hides apps UI unless config.js says otherwise
            // This will stay until apps UI is ready to ship
            if ($(this.el).attr('data-apps') !== "true") {
                this.menu.find('.apps').hide();
            }
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

            Ghost.router.navigate('/settings/' + id + '/');
            Ghost.trigger('urlchange');
            if (this.pane && id === this.pane.id) {
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
        },
        saveSuccess: function (model, response, options) {
            /*jshint unused:false*/
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'success',
                message: 'Saved',
                status: 'passive'
            });
        },
        saveError: function (model, xhr) {
            /*jshint unused:false*/
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                status: 'passive'
            });
        },
        validationError: function (message) {
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        }
    });

    // ### General settings
    Settings.general = Settings.Pane.extend({
        id: "general",

        events: {
            'click .button-save': 'saveSettings',
            'click .js-modal-logo': 'showLogo',
            'click .js-modal-cover': 'showCover'
        },

        saveSettings: function () {
            var self = this,
                title = this.$('#blog-title').val(),
                description = this.$('#blog-description').val(),
                email = this.$('#email-address').val(),
                postsPerPage = this.$('#postsPerPage').val(),
                permalinks = this.$('#permalinks').is(':checked') ? '/:year/:month/:day/:slug/' : '/:slug/',
                validationErrors = [];

            if (!validator.isLength(title, 0, 150)) {
                validationErrors.push({message: "Title is too long", el: $('#blog-title')});
            }

            if (!validator.isLength(description, 0, 200)) {
                validationErrors.push({message: "Description is too long", el: $('#blog-description')});
            }

            if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
                validationErrors.push({message: "Please supply a valid email address", el: $('#email-address')});
            }

            if (!validator.isInt(postsPerPage) || postsPerPage > 1000) {
                validationErrors.push({message: "Please use a number less than 1000", el: $('postsPerPage')});
            }

            if (!validator.isInt(postsPerPage) || postsPerPage < 0) {
                validationErrors.push({message: "Please use a number greater than 0", el: $('postsPerPage')});
            }


            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
            } else {
                this.model.save({
                    title: title,
                    description: description,
                    email: email,
                    postsPerPage: postsPerPage,
                    activeTheme: this.$('#activeTheme').val(),
                    permalinks: permalinks
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                }).then(function () { self.render(); });
            }
        },
        showLogo: function (e) {
            e.preventDefault();
            var settings = this.model.toJSON();
            this.showUpload('logo', settings.logo);
        },
        showCover: function (e) {
            e.preventDefault();
            var settings = this.model.toJSON();
            this.showUpload('cover', settings.cover);
        },
        showUpload: function (key, src) {
            var self = this,
                upload = new Ghost.Models.uploadModal({'key': key, 'src': src, 'id': this.id, 'accept': {
                    func: function () { // The function called on acceptance
                        var data = {};
                        if (this.$('.js-upload-url').val()) {
                            data[key] = this.$('.js-upload-url').val();
                        } else {
                            data[key] = this.$('.js-upload-target').attr('src');
                        }

                        self.model.save(data, {
                            success: self.saveSuccess,
                            error: self.saveError
                        }).then(function () {
                            self.saveSettings();
                        });

                        return true;
                    },
                    buttonClass: "button-save right",
                    text: "Save" // The accept button text
                }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },
        templateName: 'settings/general',

        afterRender: function () {
            var self = this;

            this.$('#permalinks').prop('checked', this.model.get('permalinks') !== '/:slug/');
            this.$('.js-drop-zone').upload();

            Countable.live(document.getElementById('blog-description'), function (counter) {
                var descriptionContainer = self.$('.description-container .word-count');
                if (counter.all > 180) {
                    descriptionContainer.css({color: "#e25440"});
                } else {
                    descriptionContainer.css({color: "#9E9D95"});
                }

                descriptionContainer.text(200 - counter.all);

            });

            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### User profile
    Settings.user = Settings.Pane.extend({
        templateName: 'settings/user-profile',

        id: 'user',

        options: {
            modelType: 'User'
        },

        events: {
            'click .button-save': 'saveUser',
            'click .button-change-password': 'changePassword',
            'click .js-modal-cover': 'showCover',
            'click .js-modal-image': 'showImage',
            'keyup .user-profile': 'handleEnterKeyOnForm'
        },
        showCover: function (e) {
            e.preventDefault();
            var user = this.model.toJSON();
            this.showUpload('cover', user.cover);
        },
        showImage: function (e) {
            e.preventDefault();
            var user = this.model.toJSON();
            this.showUpload('image', user.image);
        },
        showUpload: function (key, src) {
            var self = this, upload = new Ghost.Models.uploadModal({'key': key, 'src': src, 'id': this.id, 'accept': {
                func: function () { // The function called on acceptance
                    var data = {};
                    if (this.$('.js-upload-url').val()) {
                        data[key] = this.$('.js-upload-url').val();
                    } else {
                        data[key] = this.$('.js-upload-target').attr('src');
                    }
                    self.model.save(data, {
                        success: self.saveSuccess,
                        error: self.saveError
                    }).then(function () {
                        self.saveUser();
                    });
                    return true;
                },
                buttonClass: "button-save right",
                text: "Save" // The accept button text
            }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },

        handleEnterKeyOnForm: function (ev) {
            // Don't worry about it unless it's an enter key
            if (ev.which !== 13) {
                return;
            }

            var $target = $(ev.target);

            if ($target.is("textarea")) {
                // Allow enter key on user bio text area.
                return;
            }

            if ($target.is('input[type=password]')) {
                // Change password if on a password input
                return this.changePassword(ev);
            }

            // Simulate clicking save otherwise
            ev.preventDefault();

            this.saveUser(ev);

            return false;
        },

        saveUser: function () {
            var self = this,
                userName = this.$('#user-name').val(),
                userEmail = this.$('#user-email').val(),
                userLocation = this.$('#user-location').val(),
                userWebsite = this.$('#user-website').val(),
                userBio = this.$('#user-bio').val(),
                validationErrors = [];

            if (!validator.isLength(userName, 0, 150)) {
                validationErrors.push({message: "Name is too long", el: $('#user-name')});
            }

            if (!validator.isLength(userBio, 0, 200)) {
                validationErrors.push({message: "Bio is too long", el: $('#user-bio')});
            }

            if (!validator.isEmail(userEmail)) {
                validationErrors.push({message: "Please supply a valid email address", el: $('#user-email')});
            }

            if (!validator.isLength(userLocation, 0, 150)) {
                validationErrors.push({message: "Location is too long", el: $('#user-location')});
            }

            if (userWebsite.length) {
                if (!validator.isURL(userWebsite) || !validator.isLength(userWebsite, 0, 2000)) {
                    validationErrors.push({message: "Please use a valid url", el: $('#user-website')});
                }
            }

            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
            } else {

                this.model.save({
                    'name':             userName,
                    'email':            userEmail,
                    'location':         userLocation,
                    'website':          userWebsite,
                    'bio':              userBio
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                }).then(function () {
                    self.render();
                });
            }
        },

        changePassword: function (event) {
            event.preventDefault();
            var self = this,
                oldPassword = this.$('#user-password-old').val(),
                newPassword = this.$('#user-password-new').val(),
                ne2Password = this.$('#user-new-password-verification').val(),
                validationErrors = [];

            if (!validator.equals(newPassword, ne2Password)) {
                validationErrors.push("Your new passwords do not match");
            }

            if (!validator.isLength(newPassword, 8)) {
                validationErrors.push("Your password is not long enough. It must be at least 8 characters long.");
            }

            if (validationErrors.length) {
                validator.handleErrors(validationErrors);
            } else {
                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/changepw/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
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
                }).then(function () {
                    self.render();
                });
            }
        },

        afterRender: function () {
            var self = this;

            Countable.live(document.getElementById('user-bio'), function (counter) {
                var bioContainer = self.$('.bio-container .word-count');
                if (counter.all > 180) {
                    bioContainer.css({color: "#e25440"});
                } else {
                    bioContainer.css({color: "#9E9D95"});
                }

                bioContainer.text(200 - counter.all);

            });

            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### Apps page
    Settings.apps = Settings.Pane.extend({
        id: "apps",

        events: {
            'click .js-button-activate': 'activateApp',
            'click .js-button-deactivate': 'deactivateApp'
        },

        beforeRender: function () {
            this.availableApps = this.model.toJSON().availableApps;
        },

        activateApp: function (event) {
            var button = $(event.currentTarget);

            button.removeClass('button-add').addClass('button js-button-active').text('Working');

            this.saveStates();
        },

        deactivateApp: function (event) {
            var button = $(event.currentTarget);

            button.removeClass('button-delete js-button-active').addClass('button').text('Working');

            this.saveStates();
        },

        saveStates: function () {
            var activeButtons = this.$el.find('.js-apps .js-button-active'),
                toSave = [],
                self = this;

            _.each(activeButtons, function (app) {
                toSave.push($(app).data('app'));
            });

            this.model.save({
                activeApps: JSON.stringify(toSave)
            }, {
                success: this.saveSuccess,
                error: this.saveError
            }).then(function () { self.render(); });
        },

        saveSuccess: function () {
            Ghost.notifications.addItem({
                type: 'success',
                message: 'Active applications updated.',
                status: 'passive',
                id: 'success-1100'
            });
        },

        saveError: function (xhr) {
            Ghost.notifications.addItem({
                type: 'error',
                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                status: 'passive'
            });
        },

        templateName: 'settings/apps'
    });

}());
