import Ember from 'ember';

const {Component, computed, inject} = Ember;
const {alias} = computed;

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    notifications: inject.service(),

    messages: alias('notifications.notifications')
});
