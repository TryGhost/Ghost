import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import Ember from 'ember';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

// ember-cli-shims doesn't export canInvoke
const {canInvoke} = Ember;

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Sign Out',

    classNames: ['ghost-signout'],

    notifications: service(),

    afterModel(model, transition) {
        this.get('notifications').clearAll();
        if (canInvoke(transition, 'send')) {
            transition.send('invalidateSession');
        } else {
            this.send('invalidateSession');
        }
    }
});
