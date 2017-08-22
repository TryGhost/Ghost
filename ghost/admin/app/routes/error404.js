import Route from '@ember/routing/route';

export default Route.extend({
    controllerName: 'error',
    templateName: 'error',
    titleToken: 'Error',

    model() {
        return {
            status: 404
        };
    }
});
