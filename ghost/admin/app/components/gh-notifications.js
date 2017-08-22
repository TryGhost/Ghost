import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as injectService} from '@ember/service';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    notifications: injectService(),

    messages: alias('notifications.notifications')
});
