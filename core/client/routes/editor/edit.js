import base from 'ghost/mixins/editor-base-route';
import isNumber from 'ghost/utils/isNumber';
import isFinite from 'ghost/utils/isFinite';

var EditorEditRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, base, {
    classNames: ['editor'],

    model: function (params) {
        var self = this,
            post,
            postId,
            paginationSettings;

        postId = Number(params.post_id);

        if (!isNumber(postId) || !isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
            return this.transitionTo('error404', 'editor/' + params.post_id);
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

                if (user.get('isAuthor') && post.isAuthoredByUser(user)) {
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

    serialize: function (model) {
        return {post_id: model.get('id')};
    },

    setupController: function (controller, model) {
        this._super(controller, model);

        controller.set('scratch', model.get('markdown'));

        controller.set('titleScratch', model.get('title'));

        // used to check if anything has changed in the editor
        controller.set('previousTagNames', model.get('tags').mapBy('name'));

        // attach model-related listeners created in editor-base-route
        this.attachModelHooks(controller, model);
    }
});

export default EditorEditRoute;
