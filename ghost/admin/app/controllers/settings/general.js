import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import randomPassword from 'ghost/utils/random-password';

export default Ember.Controller.extend(SettingsSaveMixin, {
    notifications: Ember.inject.service(),
    config: Ember.inject.service(),

    selectedTheme: Ember.computed('model.activeTheme', 'themes', function () {
        var activeTheme = this.get('model.activeTheme'),
            themes = this.get('themes'),
            selectedTheme;

        themes.forEach(function (theme) {
            if (theme.name === activeTheme) {
                selectedTheme = theme;
            }
        });

        return selectedTheme;
    }),

    logoImageSource: Ember.computed('model.logo', function () {
        return this.get('model.logo') || '';
    }),

    coverImageSource: Ember.computed('model.cover', function () {
        return this.get('model.cover') || '';
    }),

    isDatedPermalinks: Ember.computed('model.permalinks', {
        set: function (key, value) {
            this.set('model.permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');

            var slugForm = this.get('model.permalinks');
            return slugForm !== '/:slug/';
        },
        get: function () {
            var slugForm = this.get('model.permalinks');

            return slugForm !== '/:slug/';
        }
    }),

    themes: Ember.computed(function () {
        return this.get('model.availableThemes').reduce(function (themes, t) {
            var theme = {};

            theme.name = t.name;
            theme.label = t.package ? t.package.name + ' - ' + t.package.version : t.name;
            theme.package = t.package;
            theme.active = !!t.active;

            themes.push(theme);

            return themes;
        }, []);
    }).readOnly(),

    generatePassword: Ember.observer('model.isPrivate', function () {
        if (this.get('model.isPrivate') && this.get('model.isDirty')) {
            this.get('model').set('password', randomPassword());
        }
    }),

    save: function () {
        var notifications = this.get('notifications'),
            config = this.get('config');

        return this.get('model').save().then(function (model) {
            config.set('blogTitle', model.get('title'));

            return model;
        }).catch(function (error) {
            if (error) {
                notifications.showAPIError(error);
            }
        });
    },

    actions: {
        validate: function () {
            this.get('model').validate(arguments);
        },

        checkPostsPerPage: function () {
            var postsPerPage = this.get('model.postsPerPage');

            if (postsPerPage < 1 || postsPerPage > 1000 || isNaN(postsPerPage)) {
                this.set('model.postsPerPage', 5);
            }
        },

        setTheme: function (theme) {
            this.set('model.activeTheme', theme.name);
        }
    }
});
