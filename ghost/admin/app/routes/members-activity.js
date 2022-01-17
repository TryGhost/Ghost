import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class MembersActivityRoute extends AdminRoute {
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.feature.membersActivityFeed) {
            return this.transitionTo('home');
        }
    }
}
