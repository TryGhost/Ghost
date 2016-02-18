/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import AuthenticatedRoute from 'ghost/routes/authenticated';
import base from 'ghost/mixins/editor-base-route';
import NotFoundHandler from 'ghost/mixins/404-handler';
import isNumber from 'ghost/utils/isNumber';
import isFinite from 'ghost/utils/isFinite';

export default AuthenticatedRoute.extend(base, NotFoundHandler, {
    titleToken: 'Editor',

    beforeModel(transition) {
        this.set('_transitionedFromNew', transition.data.fromNew);

        this._super(...arguments);
    },

    model(params) {
        let postId,
            query;

        postId = Number(params.post_id);

        if (!isNumber(postId) || !isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
            return this.transitionTo('error404', `editor/${params.post_id}`);
        }

        query = {
            id: postId,
            status: 'all',
            staticPages: 'all'
        };

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
