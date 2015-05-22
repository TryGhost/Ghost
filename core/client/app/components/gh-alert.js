import Ember from 'ember';

var AlertComponent = Ember.Component.extend({
    tagName: 'article',
    classNames: ['gh-alert', 'gh-alert-blue'],
    classNameBindings: ['typeClass'],

    typeClass: Ember.computed(function () {
        var classes = '',
            message = this.get('message'),
            type,
            dismissible;

        // Check to see if we're working with a DS.Model or a plain JS object
        if (typeof message.toJSON === 'function') {
            type = message.get('type');
            dismissible = message.get('dismissible');
        } else {
            type = message.type;
            dismissible = message.dismissible;
        }

        classes += 'notification-' + type;

        if (type === 'success' && dismissible !== false) {
            classes += ' notification-passive';
        }

        return classes;
    }),

    actions: {
        closeNotification: function () {
            var self = this;
            self.notifications.closeNotification(self.get('message'));
        }
    }
});

export default AlertComponent;
