import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {pluralize} from 'ember-inflector';

export default class EditRoute extends AuthenticatedRoute {
    beforeModel(transition) {
        super.beforeModel(...arguments);

        // if the transition is not new->edit, reset the post on the controller
        // so that the editor view is cleared before showing the loading state
        if (transition.urlMethod !== 'replace') {
            let editor = this.controllerFor('editor');
            editor.set('post', null);
            editor.reset();
        }
    }

    model(params, transition) {
        // eslint-disable-next-line camelcase
        let {type: modelName, post_id} = params;

        if (!['post', 'page'].includes(modelName)) {
            let path = transition.intent.url.replace(/^\//, '');
            return this.replaceWith('error404', {path, status: 404});
        }

        let query = {
            // eslint-disable-next-line camelcase
            id: post_id
        };

        return this.store.query(modelName, query)
            .then(records => records.get('firstObject'));
    }

    // the API will return a post even if the logged in user doesn't have
    // permission to edit it (all posts are public) so we need to do our
    // own permissions check and redirect if necessary
    afterModel(post) {
        super.afterModel(...arguments);

        const user = this.session.user;
        const returnRoute = pluralize(post.constructor.modelName);

        if (user.isAuthorOrContributor && !post.isAuthoredByUser(user)) {
            return this.replaceWith(returnRoute);
        }

        // If the post is not a draft and user is contributor, redirect to index
        if (user.isContributor && !post.isDraft) {
            return this.replaceWith(returnRoute);
        }
    }

    serialize(model) {
        return {
            type: model.constructor.modelName,
            post_id: model.id
        };
    }

    // there's no specific controller for this route, instead all editor
    // handling is done on the editor route/controler
    setupController(controller, post) {
        let editor = this.controllerFor('editor');
        editor.setPost(post);
    }
}
