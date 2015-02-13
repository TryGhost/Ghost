import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var SettingsCodeInjectionRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
    classNames: ['settings-view-code'],

    beforeModel: function () {
        var feature = this.controllerFor('feature'),
            self = this;

        if (!feature) {
            this.generateController('feature');
            feature = this.controllerFor('feature');
        }

        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(function () {
                return feature.then(function () {
                    if (!feature.get('codeInjectionUI')) {
                        return self.transitionTo('settings.general');
                    }
                });
            });
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});

export default SettingsCodeInjectionRoute;
