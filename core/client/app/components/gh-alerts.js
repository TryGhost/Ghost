import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: Ember.inject.service(),

    messages: Ember.computed.alias('notifications.alerts'),

    messageCountObserver: Ember.observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
