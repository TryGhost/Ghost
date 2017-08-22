import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {inject as injectService} from '@ember/service';

export default Component.extend({
    tagName: 'section',

    classNames: ['gh-upgrade-notification'],

    upgradeNotification: injectService('upgrade-notification'),

    message: alias('upgradeNotification.content')
});
