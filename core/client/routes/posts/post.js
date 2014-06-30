import loadingIndicator from 'ghost/mixins/loading-indicator';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';

var PostsPostRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, ShortcutsRoute, {
    model: function (params) {
        var self = this,
            post,
            postId;

        postId = Number(params.post_id);

        if (!Number.isInteger(postId) || !Number.isFinite(postId) || postId <= 0) {
            this.transitionTo('error404', params.post_id);
        }

        post = this.store.getById('post', postId);

        if (post) {
            return post;
        }

        return this.store.find('post', {
            id: params.post_id,
            status: 'all',
            staticPages: 'all',
            include: 'tags'
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return post;
            }

            return self.transitionTo('posts.index');
        });
    },
    shortcuts: {
        'enter': 'openEditor'
    },
    actions: {
        openEditor: function () {
            this.transitionTo('editor.edit', this.get('controller.model'));
        }
    }
});

export default PostsPostRoute;
