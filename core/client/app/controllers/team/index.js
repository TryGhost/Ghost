import Ember from 'ember';

export default Ember.Controller.extend({

    session: Ember.inject.service(),

    users: Ember.computed.alias('model'),

    activeUsers: Ember.computed.filter('users', function (user) {
        return /^active|warn-[1-4]|locked$/.test(user.get('status'));
    }),

    invitedUsers: Ember.computed.filter('users', function (user) {
        var status = user.get('status');

        return status === 'invited' || status === 'invited-pending';
    })
});
