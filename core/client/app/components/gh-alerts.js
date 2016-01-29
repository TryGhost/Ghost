import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service},
    observer
} = Ember;
const {alias} = computed;

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: service(),

    messages: alias('notifications.alerts'),

    messageCountObserver: observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
