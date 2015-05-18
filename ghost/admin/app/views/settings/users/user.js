import Ember from 'ember';
import BaseView from 'ghost/views/settings/content-base';

var SettingsUserView = BaseView.extend({
    currentUser: Ember.computed.alias('controller.session.user'),

    isNotOwnProfile: Ember.computed('controller.user.id', 'currentUser.id', function () {
        return this.get('controller.user.id') !== this.get('currentUser.id');
    }),

    isNotOwnersProfile: Ember.computed.not('controller.user.isOwner'),

    canAssignRoles: Ember.computed.or('currentUser.isAdmin', 'currentUser.isOwner'),

    canMakeOwner: Ember.computed.and('currentUser.isOwner', 'isNotOwnProfile', 'controller.user.isAdmin'),

    rolesDropdownIsVisible: Ember.computed.and('isNotOwnProfile', 'canAssignRoles', 'isNotOwnersProfile'),

    deleteUserActionIsVisible: Ember.computed('currentUser', 'canAssignRoles', 'controller.user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('controller.user.isOwner')) ||
            (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile') ||
            this.get('controller.user.isAuthor')))) {
            return true;
        }
    }),

    userActionsAreVisible: Ember.computed.or('deleteUserActionIsVisible', 'canMakeOwner')

});

export default SettingsUserView;
