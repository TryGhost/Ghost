import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';

export default AuthenticatedRoute.extend(ShortcutsRoute, {
    model(params) {
        /* eslint-disable camelcase */
        let post = this.store.peekRecord('post', params.post_id);
        let query = {
            id: params.post_id,
            status: 'all',
            staticPages: 'all'
        };
        /* eslint-enable camelcase */

        if (post) {
            return post;
        }

        return this.store.query('post', query).then((records) => {
            let post = records.get('firstObject');

            if (post) {
                return post;
            }

            return this.replaceWith('posts.index');
        });
    },

    afterModel(post) {
        return this.get('session.user').then((user) => {
            if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                return this.replaceWith('posts.index');
            }
        });
    },

    setupController(controller, model) {
        this._super(controller, model);

        this.controllerFor('posts').set('currentPost', model);
    },

    shortcuts: {
        'enter, o': 'openEditor',
        'command+backspace, ctrl+backspace': 'deletePost'
    },

    actions: {
        openEditor(post) {
            post = post || this.get('controller.model');

            if (!post) {
                return;
            }

            this.transitionTo('editor.edit', post.get('id'));
        },

        deletePost() {
            this.controllerFor('posts').send('toggleDeletePostModal');
        }
    }
});
