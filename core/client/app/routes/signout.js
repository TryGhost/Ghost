import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

const {canInvoke, inject} = Ember;

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Sign Out',

    classNames: ['ghost-signout'],

    notifications: inject.service(),

    afterModel(model, transition) {
        this.get('notifications').clearAll();
        if (canInvoke(transition, 'send')) {
            transition.send('invalidateSession');
            transition.abort();
        } else {
            this.send('invalidateSession');
        }
    }
});
