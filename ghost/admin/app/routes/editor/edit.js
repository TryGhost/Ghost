import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    model(params) {
        let query = {
            id: params.post_id,
            status: 'all',
            staticPages: 'all',
            formats: 'mobiledoc,plaintext'
        };

        return this.store.query('post', query)
            .then(records => records.get('firstObject'));
    },

    // the API will return a post even if the logged in user doesn't have
    // permission to edit it (all posts are public) so we need to do our
    // own permissions check and redirect if necessary
    afterModel(post) {
        this._super(...arguments);

        return this.get('session.user').then((user) => {
            if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                return this.replaceWith('posts.index');
            }
        });
    },

    // there's no specific controller for this route, instead all editor
    // handling is done on the editor route/controler
    setupController(controller, post) {
        let editor = this.controllerFor('editor');
        editor.setPost(post);
    }
});
