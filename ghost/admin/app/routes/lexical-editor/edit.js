import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {ALL_POST_INCLUDES} from '../../adapters/post';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
export default class EditRoute extends AuthenticatedRoute {
    @service feature;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // if the transition is not new->edit, reset the post on the controller
        // so that the editor view is cleared before showing the loading state
        if (transition.urlMethod !== 'replace') {
            let editor = this.controllerFor('lexical-editor');
            editor.set('post', null);
            editor.reset();
        }
    }

    async model(params, transition) {
        // eslint-disable-next-line camelcase
        let {type: modelName, post_id} = params;

        if (!['post', 'page'].includes(modelName)) {
            let path = transition.intent.url.replace(/^\//, '');
            return this.replaceWith('error404', {path, status: 404});
        }

        let query = {
            // eslint-disable-next-line camelcase
            id: post_id,
            // we need to explicitly request post_revisions which means we need
            // to specify every post include option
            include: ALL_POST_INCLUDES
        };

        const records = await this.store.query(modelName, query);
        let post = records.firstObject;

        // CASE: Post is in mobiledoc — convert to lexical
        if (post.mobiledoc) {
            post = await post.save({adapterOptions: {convertToLexical: 1}});
        }

        return post;
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
    // handling is done on the editor route/controller
    setupController(controller, post) {
        let editor = this.controllerFor('lexical-editor');
        editor.setPost(post);
    }
}
