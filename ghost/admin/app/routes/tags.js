import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class TagsRoute extends AuthenticatedRoute {
    // authors aren't allowed to manage tags
    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    model() {
        return null;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Tags'
        };
    }
}
