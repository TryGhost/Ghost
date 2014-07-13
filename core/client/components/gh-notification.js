var NotificationComponent = Ember.Component.extend({
    classNames: ['js-bb-notification'],

    typeClass: function () {
        var classes = '',
            message = this.get('message'),
            type,
            dismissible;

        // Check to see if we're working with a DS.Model or a plain JS object
        if (typeof message.toJSON === 'function') {
            type = message.get('type');
            dismissible = message.get('dismissible');
        }
        else {
            type = message.type;
            dismissible = message.dismissible;
        }

        classes += 'notification-' + type;

        if (type === 'success' && dismissible !== false) {
            classes += ' notification-passive';
        }

        return classes;
    }.property(),

    didInsertElement: function () {
        var self = this;

        self.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
            /* jshint unused: false */
            if (event.originalEvent.animationName === 'fade-out') {
                self.notifications.removeObject(self.get('message'));
            }
        });
    },

    actions: {
        closeNotification: function () {
            var self = this;
            self.notifications.closeNotification(self.get('message'));
        }
    }
});

export default NotificationComponent;
