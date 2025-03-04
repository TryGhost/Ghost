import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class MembersActivityRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);

        // give editors the ability to reach this route also.
        if (!this.session.user.isEditor && !this.session.user.isAdmin) {
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
