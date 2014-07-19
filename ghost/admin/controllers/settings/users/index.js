var UsersIndexController = Ember.ArrayController.extend({
    users: Ember.computed.alias('model'),

    activeUsers: Ember.computed.filterBy('users', 'active', true).property('users'),

    invitedUsers: Ember.computed.filterBy('users', 'invited', true).property('users')
});

export default UsersIndexController;
