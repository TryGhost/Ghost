/*global alert */
var UsersIndexController = Ember.ArrayController.extend({
    activeUsers: function () {
        return this.content.filterBy('status', 'active');
    }.property('model'),

    invitedUsers: function () {
        return this.content.filterBy('status', 'invited');
    }.property('model'),

    actions: {
        addUser: function () {
            alert('@TODO: needs to show the "add user" modal - see issue #3079 on GitHub');
        }
    }
});

export default UsersIndexController;
