import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var EditorRoute = AuthenticatedRoute.extend(styleBody, {
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
            return post.get('id') === postId;
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return post;
            }

            return self.transitionTo('posts.index');
        });
    }
});

export default EditorRoute;
