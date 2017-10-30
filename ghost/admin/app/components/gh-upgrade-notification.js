import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    tagName: 'section',

    classNames: ['gh-upgrade-notification'],

    upgradeNotification: service('upgrade-notification'),

    message: alias('upgradeNotification.content')
});
