import AuthenticatedRoute from "./authenticated";

export default class MembersActivityRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);

        // give editors the ability to reach this route also.
        if (!this.session.user.canManageMembers) {
            return this.transitionTo('home');
        }
    }
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Activity',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
