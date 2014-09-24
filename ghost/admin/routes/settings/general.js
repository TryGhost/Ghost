import loadingIndicator from 'ghost/mixins/loading-indicator';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var SettingsGeneralRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, CurrentUserSettings, {
    classNames: ['settings-view-general'],

    beforeModel: function () {
        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default SettingsGeneralRoute;
