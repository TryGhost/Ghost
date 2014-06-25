import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = AuthenticatedRoute.extend(loadingIndicator, {
    // redirect to first post subroute unless no posts exist
    beforeModel: function () {
        var self = this;

        return this.store.find('post', {
            status: 'all',
            staticPages: 'all'
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return self.transitionTo('posts.post', post);
            }
        });
    }
});

export default PostsIndexRoute;
