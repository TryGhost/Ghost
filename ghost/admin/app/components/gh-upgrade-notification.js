import Component from 'ember-component';
import {alias} from 'ember-computed';
import injectService from 'ember-service/inject';

export default Component.extend({
    tagName: 'section',

    classNames: ['gh-upgrade-notification'],

    upgradeNotification: injectService('upgrade-notification'),

    message: alias('upgradeNotification.content')
});
