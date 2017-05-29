import Component from 'ember-component';
import injectService from 'ember-service/inject';
import {alias} from 'ember-computed';

export default Component.extend({
    tagName: 'section',

    classNames: ['gh-upgrade-notification'],

    upgradeNotification: injectService('upgrade-notification'),

    message: alias('upgradeNotification.content')
});
