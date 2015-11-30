import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: ['gh-upgrade-notification'],
    upgradeNotification: Ember.inject.service('upgrade-notification'),
    message: Ember.computed.alias('upgradeNotification.content')
});
