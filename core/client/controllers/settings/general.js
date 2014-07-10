var SettingsGeneralController = Ember.ObjectController.extend({
    isDatedPermalinks: function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.set('permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');
        }

        // getter
        var slugForm = this.get('permalinks');

        return slugForm !== '/:slug/';
    }.property('permalinks'),

    themes: function () {
        return this.get('availableThemes').reduce(function (themes, t) {
            var theme = {};

            theme.name = t.name;
            theme.label = t.package ? t.package.name + ' - ' + t.package.version : t.name;
            theme.package = t.package;
            theme.active = !!t.active;

            themes.push(theme);

            return themes;
        }, []);
    }.property().readOnly(),

    actions: {
        save: function () {
            var self = this;

            return this.get('model').save().then(function (model) {
                self.notifications.closePassive();
                self.notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        },
    }
});

export default SettingsGeneralController;
