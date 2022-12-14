import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class NewRoute extends AuthenticatedRoute {
    @service feature;
    @service router;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (this.feature.lexicalEditor) {
            return this.transitionTo('lexical-editor.new', transition.to.params.type);
        }
    }

    model(params, transition) {
        let {type: modelName} = params;

        if (!['post','page'].includes(modelName)) {
            let path = transition.intent.url.replace(/^\//, '');
            return this.replaceWith('error404', {path, status: 404});
        }

        return this.store.createRecord(modelName, {authors: [this.session.user]});
    }

    // there's no specific controller for this route, instead all editor
    // handling is done on the editor route/controller
    setupController(controller, newPost) {
        let editor = this.controllerFor('editor');
        editor.setPost(newPost);
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['editor-new']
        };
    }
}
