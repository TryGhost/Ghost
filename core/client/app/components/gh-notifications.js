import Ember from 'ember';
var NotificationsComponent = Ember.Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    messages: Ember.computed.filter('notifications', function (notification) {
        var displayStatus = (typeof notification.toJSON === 'function') ?
            notification.get('status') : notification.status;

        return displayStatus === 'passive';
    }),
});

export default NotificationsComponent;
