var NotificationComponent = Ember.Component.extend({
    classNames: ['js-bb-notification'],

    didInsertElement: function () {
        var self = this;

        self.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
            /* jshint unused: false */
            self.notifications.removeObject(self.get('message'));
        });
    },

    actions: {
        closeNotification: function () {
            var self = this;
            self.notifications.removeObject(self.get('message'));
        }
    }
});

export default NotificationComponent;