import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    notifications: Ember.inject.service(),

    messages: Ember.computed.filter('notifications.content', function (notification) {
        var displayStatus = (typeof notification.toJSON === 'function') ?
            notification.get('status') : notification.status;

        return displayStatus === 'passive';
    })
});
