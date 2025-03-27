import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class TagsRoute extends AuthenticatedRoute {
    queryParams = {
        type: {
            refreshModel: true,
            replace: true
        }
    };

    // authors aren't allowed to manage tags
    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    // set model to a live array so all tags are shown and created/deleted tags
    // are automatically added/removed. Also load all tags in the background,
    // pausing to show the loading spinner if no tags have been loaded yet
    model() {
        let promise = this.store.query('tag', {limit: 'all', include: 'count.posts'});
        let tags = this.store.peekAll('tag');
        if (this.store.peekAll('tag').get('length') === 0) {
            return promise.then(() => tags);
        } else {
            return tags;
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Tags'
        };
    }
}
