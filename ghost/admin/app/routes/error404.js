import Route from '@ember/routing/route';

export default class Error404Route extends Route {
    controllerName = 'error';
    templateName = 'error';

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
