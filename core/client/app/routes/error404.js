import Ember from 'ember';

export default Ember.Route.extend({
    controllerName: 'error',
    templateName: 'error',
    titleToken: 'Error',

    model: function () {
        return {
            status: 404
        };
    }
});
