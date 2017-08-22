import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as injectService} from '@ember/service';
import {observer} from '@ember/object';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-alerts',

    notifications: injectService(),

    messages: alias('notifications.alerts'),

    messageCountObserver: observer('messages.[]', function () {
        this.sendAction('notify', this.get('messages').length);
    })
});
