import Ember from 'ember';
var NotificationsComponent = Ember.Component.extend({
    tagName: 'aside',
    classNames: 'notifications',
    classNameBindings: ['location'],

    messages: Ember.computed.filter('notifications', function (notification) {
        // If this instance of the notifications component has no location affinity
        // then it gets all notifications
        if (!this.get('location')) {
            return true;
        }

        var displayLocation = (typeof notification.toJSON === 'function') ?
            notification.get('location') : notification.location;

        return this.get('location') === displayLocation;
    }),

    messageCountObserver: function () {
        this.sendAction('notify', this.get('messages').length);
    }.observes('messages.[]')
});

export default NotificationsComponent;
