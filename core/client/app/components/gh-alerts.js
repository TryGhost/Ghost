import Ember from 'ember';
var AlertsComponent = Ember.Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    messages: Ember.computed.filter('notifications', function (notification) {
        var displayStatus = (typeof notification.toJSON === 'function') ?
            notification.get('status') : notification.status;

        return displayStatus === 'persistent';
    }),

    messageCountObserver: Ember.observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});

export default AlertsComponent;
