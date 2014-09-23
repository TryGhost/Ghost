import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var AppsRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, CurrentUserSettings, {
    classNames: ['settings-view-apps'],

    beforeModel: function () {
        if (!this.get('config.apps')) {
            return this.transitionTo('settings.general');
        }

        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },
    
    model: function () {
        return this.store.find('app');
    }
});

export default AppsRoute;
