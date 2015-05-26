import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var SignoutRoute = AuthenticatedRoute.extend(styleBody,  {
    titleToken: 'Sign Out',

    classNames: ['ghost-signout'],

    afterModel: function (model, transition) {
        this.notifications.clear();
        if (Ember.canInvoke(transition, 'send')) {
            transition.send('invalidateSession');
            transition.abort();
        } else {
            this.send('invalidateSession');
        }
    }
});

export default SignoutRoute;
