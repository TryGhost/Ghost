import {mobileQuery} from 'ghost/utils/mobile';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';

var SettingsIndexRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, CurrentUserSettings, {
    // redirect to general tab, unless on a mobile phone
    beforeModel: function () {
        var self = this;
        this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(function () {
                if (!mobileQuery.matches) {
                    self.transitionTo('settings.general');
                } else {
                    //fill the empty {{outlet}} in settings.hbs if the user
                    //goes to fullscreen

                    //fillOutlet needs special treatment so that it is
                    //properly bound to this when called from a MQ event
                    self.set('fillOutlet', _.bind(function fillOutlet(mq) {
                        if (!mq.matches) {
                            self.transitionTo('settings.general');
                        }
                    }, self));
                    mobileQuery.addListener(self.fillOutlet);
                }
            });
    },
    
    deactivate: function () {
        if (this.get('fillOutlet')) {
            mobileQuery.removeListener(this.fillOutlet);
        }
    }
});

export default SettingsIndexRoute;
