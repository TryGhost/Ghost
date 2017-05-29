import Component from 'ember-component';
import injectService from 'ember-service/inject';
import {alias} from 'ember-computed';

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    notifications: injectService(),

    messages: alias('notifications.notifications')
});
