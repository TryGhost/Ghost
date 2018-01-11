import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    notifications: service(),

    classNames: 'gh-alerts',
    tagName: 'aside',

    messages: alias('notifications.alerts')
});
