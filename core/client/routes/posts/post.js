var PostsPostRoute = Ember.Route.extend({
    model: function (params) {
        var post = this.modelFor('posts').findBy('id', params.post_id);

        if (!post) {
            this.transitionTo('posts.index');
        }

        return post;
    }
});

export default PostsPostRoute;