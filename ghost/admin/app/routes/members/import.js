import AuthenticatedRoute
 from "../authenticated";
export default class MembersImportRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.canManageMembers) {
            return this.transitionTo('home');
        }
    }
}
