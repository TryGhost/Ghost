var NotificationsComponent = Ember.Component.extend({
    tagName: 'aside',
    classNames: 'notifications',
    messages: Ember.computed.alias('notifications')
});

export default NotificationsComponent;