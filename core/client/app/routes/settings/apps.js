import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Apps',

    classNames: ['settings-view-apps'],

    config: Ember.inject.service(),

    beforeModel: function () {
        if (!this.get('config.apps')) {
            return this.transitionTo('settings.general');
        }

        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.find('app');
    }
});
