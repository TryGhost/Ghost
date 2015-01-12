var SettingsGeneralController = Ember.Controller.extend({
    selectedTheme: null,

    isDatedPermalinks: Ember.computed('model.permalinks', function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.set('model.permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');
        }

        // getter
        var slugForm = this.get('model.permalinks');

        return slugForm !== '/:slug/';
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
            var postsPerPage = this.get('model.postsPerPage');

            if (postsPerPage < 1 || postsPerPage > 1000 || isNaN(postsPerPage)) {
                this.set('model.postsPerPage', 5);
            }
        }
    }
});

export default SettingsGeneralController;
