var SettingsUserView = Ember.View.extend({
    currentUser: Ember.computed.alias('controller.session.user'),
    
    isNotOwnProfile: Ember.computed('controller.user.id', 'currentUser.id', function () {
        return this.get('controller.user.id') !== this.get('currentUser.id');
    }),
    
    canAssignRoles: Ember.computed.or('currentUser.isAdmin', 'currentUser.isOwner'),
    
    rolesDropdownIsVisible: Ember.computed.and('isNotOwnProfile', 'canAssignRoles')
});

export default SettingsUserView;