import Route from '@ember/routing/route';

export default Route.extend({
    controllerName: 'error',
    templateName: 'error',

    model() {
        return {
            status: 404
        };
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Error',
            mainClasses: ['gh-main-white']
        };
    }
});
