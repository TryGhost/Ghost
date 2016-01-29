import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;
const {alias} = computed;

export default Component.extend({
    tagName: 'aside',
    classNames: 'gh-notifications',

    notifications: service(),

    messages: alias('notifications.notifications')
});
