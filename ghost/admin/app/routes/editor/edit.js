import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    beforeModel(transition) {
        this._super(...arguments);

        // if the transition is not new->edit, reset the post on the controller
        // so that the editor view is cleared before showing the loading state
        if (transition.urlMethod !== 'replace') {
            let editor = this.controllerFor('editor');
            editor.set('post', null);
            editor.reset();
        }
    },

    model(params) {
        let query = {
            id: params.post_id,
            status: 'all',
            filter: 'page:[true,false]',
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
            if (user.get('isAuthorOrContributor') && !post.isAuthoredByUser(user)) {
                return this.replaceWith('posts.index');
            }

            // If the post is not a draft and user is contributor, redirect to index
            if (user.get('isContributor') && !post.get('isDraft')) {
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
