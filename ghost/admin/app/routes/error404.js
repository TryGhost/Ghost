import Ember from 'ember';
var Error404Route = Ember.Route.extend({
    controllerName: 'error',
    templateName: 'error',
    titleToken: 'Error',

    model: function () {
        return {
            status: 404
        };
    }
});

export default Error404Route;
