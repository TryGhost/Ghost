import Ember from 'ember';

const {Route} = Ember;

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
