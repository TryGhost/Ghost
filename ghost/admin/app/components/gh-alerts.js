import Component from 'ember-component';
import injectService from 'ember-service/inject';
import observer from 'ember-metal/observer';
import {alias} from 'ember-computed';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: injectService(),

    messages: alias('notifications.alerts'),

    messageCountObserver: observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
