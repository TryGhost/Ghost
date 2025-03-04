import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class MembersImportRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        // - TODO: redirect if members is disabled?

        // give editors the ability to reach this route also.
        if (!this.session.user.isEditor && !this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }
}
