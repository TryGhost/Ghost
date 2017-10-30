import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {observer} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: service(),

    messages: alias('notifications.alerts'),

    messageCountObserver: observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
