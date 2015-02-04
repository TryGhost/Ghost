var ApplicationController = Ember.Controller.extend({
    // jscs: disable
    hideNav: Ember.computed.match('currentPath', /(error|signin|signup|setup|forgotten|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showGlobalMobileNav: false,
    showSettingsMenu: false,

    userImage: Ember.computed('session.user.image', function () {
        return this.get('session.user.image') || this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: Ember.computed('userImage', function () {
        return 'background-image: url(' + this.get('userImage') + ')';
    }),

    userImageAlt: Ember.computed('session.user.name', function () {
        var name = this.get('session.user.name');

        return (name) ? name + '\'s profile picture' : 'Profile picture';
    }),

    actions: {
        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        }
    }
});

export default ApplicationController;
