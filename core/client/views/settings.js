/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";

    var Settings = {};

    // Base view
    // ----------
    Ghost.Views.Settings = Ghost.View.extend({
        initialize: function (options) {
            $(".settings-content").removeClass('active');
            this.addSubview(new Settings.Sidebar({
                el: '.settings-sidebar',
                pane: options.pane,
                model: this.model
            }));

            this.$('input').iCheck({
                checkboxClass: 'icheckbox_ghost'
            });
        }
    });

    // Sidebar (tabs)
    // ---------------
    Settings.Sidebar = Ghost.View.extend({
        initialize: function (options) {
            this.render();
            this.menu = this.$('.settings-menu');
            this.showContent(options.pane || 'general');
        },

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
            Backbone.history.navigate('/settings/' + id);
            if (this.pane && id === this.pane.el.id) {
                return;
            }
            _.result(this.pane, 'destroy');
            this.setActive(id);
            this.pane = new Settings[id]({ el: '.settings-content', model: this.model });
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
        destroy: function () {
            this.$el.removeClass('active');
            this.undelegateEvents();
        },

        afterRender: function () {
            this.$el.attr('id', this.id);
            this.$el.addClass('active');
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
            var self = this;
            this.model.save({
                title: this.$('#blog-title').val(),
                email: this.$('#email-address').val()
            }, {
                success: function () {
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'success',
                            message: 'Saved',
                            status: 'passive'
                        }]
                    }));
                },
                error: function () {
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'error',
                            message: 'Something went wrong, not saved :(',
                            status: 'passive'
                        }]
                    }));
                }
            });
        },

        templateName: 'settings/general',

        beforeRender: function () {
            var settings = this.model.toJSON();
            this.$('#blog-title').val(settings.title);
            this.$('#email-address').val(settings.email);
        }
    });

    // ### Content settings
    Settings.content = Settings.Pane.extend({
        id: 'content',
        events: {
            'click .button-save': 'saveSettings'
        },
        saveSettings: function () {
            var self = this;
            this.model.save({
                description: this.$('#blog-description').val()
            }, {
                success: function () {
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'success',
                            message: 'Saved',
                            status: 'passive'
                        }]
                    }));

                },
                error: function () {
                    self.addSubview(new Ghost.Views.NotificationCollection({
                        model: [{
                            type: 'error',
                            message: 'Something went wrong, not saved :(',
                            status: 'passive'
                        }]
                    }));
                }
            });
        },

        templateName: 'settings/content',

        beforeRender: function () {
            var settings = this.model.toJSON();
            this.$('#blog-description').val(settings.description);
        }
    });

    // ### User settings
    Settings.users = Settings.Pane.extend({
        el: '#users',
        events: {
        }
    });

    // ### Appearance settings
    Settings.appearance = Settings.Pane.extend({
        el: '#appearance',
        events: {
        }
    });

    // ### Services settings
    Settings.services = Settings.Pane.extend({
        el: '#services',
        events: {
        }
    });

    // ### Plugins settings
    Settings.plugins = Settings.Pane.extend({
        el: '#plugins',
        events: {
        }
    });

}());
