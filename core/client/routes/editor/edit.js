import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var EditorEditRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],

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

        return this.store.filter('post', { status: 'all', staticPages: 'all' }, function (post) {
            //post.get('id') returns a string, so compare with params.post_id
            return post.get('id') === params.post_id;
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return post;
            }

            return self.transitionTo('posts.index');
        });
    },
    serialize: function (model) {
        return {post_id: model.get('id')};
    }
});

export default EditorEditRoute;
