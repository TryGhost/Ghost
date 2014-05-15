var Notifications = Ember.ArrayProxy.extend({
    content: Ember.A(),
    timeout: 3000,
    pushObject: function (object) {
        object.typeClass = 'notification-' + object.type;
        // This should be somewhere else.
        if (object.type === 'success') {
            object.typeClass = object.typeClass + " notification-passive";
        }
        this._super(object);
    },
    showError: function (message) {
        this.pushObject({
            type: 'error',
            message: message
        });
    },
    showErrors: function (errors) {
        for (var i = 0; i < errors.length; i += 1) {
            this.showError(errors[i].message || errors[i]);
        }
    },
    showAPIError: function (resp, defaultErrorText) {
        defaultErrorText = defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
            this.showError(resp.jqXHR.responseJSON.error);
        } else {
            this.showError(defaultErrorText);
        }
    },
    showInfo: function (message) {
        this.pushObject({
            type: 'info',
            message: message
        });
    },
    showSuccess: function (message) {
        this.pushObject({
            type: 'success',
            message: message
        });
    },
    showWarn: function (message) {
        this.pushObject({
            type: 'warn',
            message: message
        });
    }
});

export default Notifications;
