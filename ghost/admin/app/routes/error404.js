import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class Error404Route extends Route {
    controllerName = 'error';
    templateName = 'error';

    @service router;

    beforeModel(transition) {
        // handle redirects for old routes
        if (transition.to?.params?.path?.startsWith?.('editor-beta')) {
            const [, type, postId] = transition.to.params.path.split('/');

            const route = postId ? 'lexical-editor.edit' : 'lexical-editor.new';
            const models = [type];

            if (postId) {
                models.push(postId);
            }

            return this.router.transitionTo(route, ...models);
        }
    }

    model() {
        return {
            status: 404
        };
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Error'
        };
    }
}
