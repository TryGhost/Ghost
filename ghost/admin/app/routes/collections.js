import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class CollectionsRoute extends AuthenticatedRoute {
    // authors aren't allowed to manage tags
    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    // set model to a live array so all collections are shown and created/deleted collections
    // are automatically added/removed. Also load all collections in the background,
    // pausing to show the loading spinner if no collections have been loaded yet
    model() {
        let promise = this.store.query('collection', {limit: 'all', include: 'count.posts'});
        let collections = this.store.peekAll('collection');
        if (this.store.peekAll('collection').get('length') === 0) {
            return promise.then(() => collections);
        } else {
            return collections;
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Collections'
        };
    }
}
