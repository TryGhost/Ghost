import AuthenticatedRoute from 'ghost/routes/authenticated';

var PostsPostRoute = AuthenticatedRoute.extend({
    model: function (params) {
        var self = this,
            post,
            postId;

        postId = Number(params.post_id);

        if (!Number.isInteger(postId) || !Number.isFinite(postId) || postId <= 0) {
            this.transitionTo('posts.index');
        }

        post = this.store.getById('post', postId);

        if (post) {
            return post;
        }

        return this.store.find('post', {
            id: params.post_id,
            status: 'all',
            staticPages: 'all'
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return post;
            }

            return self.transitionTo('posts.index');
        });
    },
});

export default PostsPostRoute;
