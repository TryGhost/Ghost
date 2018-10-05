import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, {
    notifications: service(),

    titleToken: 'Sign Out',

    classNames: ['ghost-signout'],

    afterModel(/*model, transition*/) {
        this.notifications.clearAll();
        this.session.invalidate();
    }
});
