var Error404Route = Ember.Route.extend({
    controllerName: 'error',
    templateName: 'error',

    model: function () {
        return {
            status: 404
        };
    }
});

export default Error404Route;