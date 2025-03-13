import AuthenticatedRoute from './authenticated';
export default class MembersManagementRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user || !this.session.user.canManageMembers) {
            return this.transitionTo('home');
        }
    }
}
