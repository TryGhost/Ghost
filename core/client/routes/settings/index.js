import MobileIndexRoute from 'ghost/routes/mobile-index-route';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import mobileQuery from 'ghost/utils/mobile';

var SettingsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, CurrentUserSettings, {
    titleToken: 'Settings',

    // Redirect users without permission to view settings,
    // and show the settings.general route unless the user
    // is mobile
    beforeModel: function () {
        var self = this;
        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(function () {
                if (!mobileQuery.matches) {
                    self.transitionTo('settings.general');
                }
            });
    },

    desktopTransition: function () {
        this.transitionTo('settings.general');
    }
});

export default SettingsIndexRoute;
