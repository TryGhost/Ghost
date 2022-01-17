import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    session: service(),

    beforeModel() {
        this._super(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.transitionTo('settings.staff.user', user);
        }
    }
});
