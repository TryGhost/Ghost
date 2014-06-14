import AuthenticatedRoute from 'ghost/routes/authenticated';

var PostsIndexRoute = AuthenticatedRoute.extend({
    // redirect to first post subroute
    redirect: function () {
        var firstPost = (this.modelFor('posts') || []).get('firstObject');

        if (firstPost) {
            this.transitionTo('posts.post', firstPost);
        }
    }
});

export default PostsIndexRoute;
