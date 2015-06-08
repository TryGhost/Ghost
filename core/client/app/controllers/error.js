import Ember from 'ember';
var ErrorController = Ember.Controller.extend({
    code: Ember.computed('content.status', function () {
        return this.get('content.status') > 200 ? this.get('content.status') : 500;
    }),
    message: Ember.computed('content.statusText', function () {
        if (this.get('code') === 404) {
            return 'Page not found';
        }

        return this.get('content.statusText') !== 'error' ? this.get('content.statusText') : 'Internal Server Error';
    }),
    stack: false
});

export default ErrorController;
