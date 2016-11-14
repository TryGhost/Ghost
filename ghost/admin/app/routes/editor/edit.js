/* eslint-disable camelcase */
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import base from 'ghost-admin/mixins/editor-base-route';

export default AuthenticatedRoute.extend(base, {
    titleToken: 'Editor',

    beforeModel(transition) {
        this.set('_transitionedFromNew', transition.data.fromNew);

        this._super(...arguments);
    },

    model(params) {
        /* eslint-disable camelcase */
        let query = {
            id: params.post_id,
            status: 'all',
            staticPages: 'all'
        };
        /* eslint-enable camelcase */

        return this.store.query('post', query).then((records) => {
            let post = records.get('firstObject');

            if (post) {
                return post;
            }

            return this.replaceWith('posts.index');
        });
    },

    afterModel(post) {
        this._super(...arguments);

        return this.get('session.user').then((user) => {
            if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                return this.replaceWith('posts.index');
            }
        });
    },

    setupController(controller) {
        this._super(...arguments);
        controller.set('shouldFocusEditor', this.get('_transitionedFromNew'));
    },

    actions: {
        authorizationFailed() {
            this.get('controller').send('toggleReAuthenticateModal');
        }
    }
});
