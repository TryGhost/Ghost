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
            if (this.pane && '#' + id === this.pane.el) {
                return;
            }
            _.result(this.pane, 'destroy');
            this.setActive(id);
            this.pane = new Settings[id]({ model: this.model });
            this.pane.render();
        },

        setActive: function (id) {
            this.menu.find('li').removeClass('active');
            this.menu.find('a[href=#' + id + ']').parent().addClass('active');
        }
    });

    // Content panes
    // --------------
    Settings.Pane = Ghost.View.extend({
        destroy: function () {
            this.$el.removeClass('active');
            this.undelegateEvents();
        },

        render: function () {
            this.$el.addClass('active');
        }
    });

    // TODO: render templates on the client
    // TODO: use some kind of data-binding for forms

    // ### General settings
    Settings.general = Settings.Pane.extend({
        el: '#general',
        events: {
            'click .button-save': 'saveSettings'
        },

        saveSettings: function () {
            this.model.save({
                title: this.$('#blog-title').val(),
                email: this.$('#email-address').val()
            }, {
                success: function () {
                    window.alert('Saved');
                }
            });
        },

        render: function () {
            var settings = this.model.toJSON();
            this.$('#blog-title').val(settings.title);
            this.$('#email-address').val(settings.email);
            Settings.Pane.prototype.render.call(this);
        }
    });

    // ### Content settings
    Settings.content = Settings.Pane.extend({
        el: '#content',
        events: {
            'click .button-save': 'saveSettings'
        },
        saveSettings: function () {
            this.model.save({
                description: this.$('#blog-description').val()
            }, {
                success: function () {
                    window.alert('Saved');
                }
            });
        },

        render: function () {
            var settings = this.model.toJSON();
            this.$('#blog-description').val(settings.description);
            Settings.Pane.prototype.render.call(this);
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