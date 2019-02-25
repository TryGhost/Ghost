import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {pluralize} from 'ember-inflector';

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
            status: 'all'
        };

        return this.store.query(params.type, query)
            .then(records => records.get('firstObject'));
    },

    // the API will return a post even if the logged in user doesn't have
    // permission to edit it (all posts are public) so we need to do our
    // own permissions check and redirect if necessary
    afterModel(post) {
        this._super(...arguments);

        return this.get('session.user').then((user) => {
            let returnRoute = `${pluralize(post.constructor.modelName)}.index`;

            if (user.get('isAuthorOrContributor') && !post.isAuthoredByUser(user)) {
                return this.replaceWith(returnRoute);
            }

            // If the post is not a draft and user is contributor, redirect to index
            if (user.get('isContributor') && !post.get('isDraft')) {
                return this.replaceWith(returnRoute);
            }
        });
    },

    serialize(model) {
        return {
            type: model.constructor.modelName,
            post_id: model.id
        };
    },

    // there's no specific controller for this route, instead all editor
    // handling is done on the editor route/controler
    setupController(controller, post) {
        let editor = this.controllerFor('editor');
        editor.setPost(post);
    }
});
