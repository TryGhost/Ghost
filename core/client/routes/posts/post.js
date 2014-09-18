import loadingIndicator from 'ghost/mixins/loading-indicator';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';

var PostsPostRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, ShortcutsRoute, {
    model: function (params) {
        var self = this,
            post,
            postId,
            paginationSettings;

        postId = Number(params.post_id);

        if (!_.isNumber(postId) || !_.isFinite(postId) || postId % 1 !== 0 || postId <= 0)
        {
            return this.transitionTo('error404', params.post_id);
        }

        post = this.store.getById('post', postId);

        if (post) {
            return post;
        }

        paginationSettings = {
            id: postId,
            status: 'all',
            staticPages: 'all'
        };

        return this.store.find('user', 'me').then(function (user) {
            if (user.get('isAuthor')) {
                paginationSettings.author = user.get('slug');
            }

            return self.store.find('post', paginationSettings).then(function (records) {
                var post = records.get('firstObject');

                if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                    // do not show the post if they are an author but not this posts author
                    post = null;
                }

                if (post) {
                    return post;
                }

                return self.transitionTo('posts.index');
            });
        });
    },
    setupController: function (controller, model) {
        this._super(controller, model);

        this.controllerFor('posts').set('currentPost', model);
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
