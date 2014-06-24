var ErrorController = Ember.Controller.extend({
    code: function () {
        return this.get('content.status') > 200 ? this.get('content.status') : 500;
    }.property('content.status'),
    message: function () {
        if (this.get('code') === 404) {
            return 'No Ghost Found';
        }

        return this.get('content.statusText') !== 'error' ? this.get('content.statusText') : 'Internal Server Error';
    }.property('content.statusText'),
    stack: false
});

export default ErrorController;