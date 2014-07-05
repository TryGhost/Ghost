var UsersIndexController = Ember.ArrayController.extend({
    users: Ember.computed.alias('model'),

    activeUsers: Ember.computed.filterBy('users', 'status', 'active'),

    invitedUsers: Ember.computed.filterBy('users', 'status', 'invited')
});

export default UsersIndexController;
