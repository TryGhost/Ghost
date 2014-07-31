var SettingsUserView = Ember.View.extend({
    currentUser: Ember.computed.alias('controller.session.user'),
    
    isNotOwnProfile: Ember.computed('controller.user.id', 'currentUser.id', function () {
        return this.get('controller.user.id') !== this.get('currentUser.id');
    }),
    
    canAssignRoles: Ember.computed.or('currentUser.isAdmin', 'currentUser.isOwner'),
    
    rolesDropdownIsVisible: Ember.computed.and('isNotOwnProfile', 'canAssignRoles'),

    deleteUserActionIsVisible: Ember.computed('currentUser', 'canAssignRoles', 'controller.user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('controller.user.isOwner')) ||
            (this.get('currentUser.isEditor') && (!this.get('isNotOwnProfile') ||
            this.get('controller.user.isAuthor')))) {
            return true;
        }
    }),

    userActionsAreVisible: Ember.computed.or('deleteUserActionIsVisible', 'rolesDropdownIsVisible')

});

export default SettingsUserView;