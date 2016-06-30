import Component from 'ember-component';
import {alias} from 'ember-computed';
import injectService from 'ember-service/inject';
import observer from 'ember-metal/observer';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: injectService(),

    messages: alias('notifications.alerts'),

    messageCountObserver: observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
