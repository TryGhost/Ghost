var SettingsGeneralController = Ember.ObjectController.extend({
    themes: Ember.computed(function () {
        return this.get('availableThemes').reduce(function (themes, t) {
            var theme = {};

            theme.name = t.name;
            theme.label = t.package ? t.package.name + ' - ' + t.package.version : t.name;
            theme.package = t.package;
            theme.active = !!t.active;

            themes.push(theme);

            return themes;
        }, []);
    }).readOnly(),

    actions: {
        save: function () {
            var self = this;

            return this.get('model').save().then(function (model) {
                self.notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        },

        checkPostsPerPage: function () {
            if (this.get('postsPerPage') < 1 || this.get('postsPerPage') > 1000 || isNaN(this.get('postsPerPage'))) {
                this.set('postsPerPage', 5);
            }
        },

        checkPermalinks: function () {
            var permalinks = this.get('permalinks');
            if (! permalinks) {
                permalinks = '/:slug/';
            }

            // ensure leading slash
            if (! /^\//.test(permalinks)) {
                permalinks = '/' + permalinks;
            }

            // ensure trailing slash
            if (! /\/$/.test(permalinks)) {
                permalinks = permalinks + '/';
            }

            this.set('permalinks', permalinks);
        }
    }
});

export default SettingsGeneralController;
