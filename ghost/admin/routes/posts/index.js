import AuthenticatedRoute from 'ghost/routes/authenticated';

var PostsIndexRoute = AuthenticatedRoute.extend({
    // redirect to first post subroute
    beforeModel: function () {
        var self = this;

        return this.store.find('post', {
            status: 'all',
            staticPages: 'all'
        }).then(function (records) {
            var post = records.get('firstObject');
            return self.transitionTo('posts.post', post);
        });
    }
});

export default PostsIndexRoute;
