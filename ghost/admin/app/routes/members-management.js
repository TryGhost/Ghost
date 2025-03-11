import AuthenticatedRoute from './authenticated';
import {didCancel} from 'ember-concurrency';
import {inject as service} from '@ember/service';

export default class MembersManagementRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.canManageMembers) {
            return this.transitionTo('home');
        }
    }
}