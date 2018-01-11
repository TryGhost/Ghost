import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    notifications: service(),

    tagName: 'aside',
    classNames: 'gh-notifications',

    messages: alias('notifications.notifications')
});
