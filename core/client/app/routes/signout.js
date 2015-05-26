import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Sign Out',

    classNames: ['ghost-signout'],

    notifications: Ember.inject.service(),

    afterModel: function (model, transition) {
        this.get('notifications').closeAll();
        if (Ember.canInvoke(transition, 'send')) {
            transition.send('invalidateSession');
            transition.abort();
        } else {
            this.send('invalidateSession');
        }
    }
});
