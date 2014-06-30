import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    // redirect to first post subroute unless no posts exist
    beforeModel: function () {
        var self = this;

        return this.store.find('post', {
            status: 'all',
            staticPages: 'all',
            include: 'tags'
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return self.transitionTo('posts.post', post);
            }
        });
    }
});

export default PostsIndexRoute;
