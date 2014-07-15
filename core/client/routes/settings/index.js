import {mobileQuery} from 'ghost/utils/mobile';

var SettingsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
    activate: function () {
        this._super();
    },
    // redirect to general tab, unless on a mobile phone
    beforeModel: function () {
        if (!mobileQuery.matches) {
            this.transitionTo('settings.general');
        } else {
            //fill the empty {{outlet}} in settings.hbs if the user
            //goes to fullscreen

            //fillOutlet needs special treatment so that it is
            //properly bound to this when called from a MQ event
            this.set('fillOutlet', _.bind(function fillOutlet(mq) {
                if (!mq.matches) {
                    this.transitionTo('settings.general');
                }
            }, this));
            mobileQuery.addListener(this.fillOutlet);
        }
    },
    deactivate: function () {
        if (this.get('fillOutlet')) {
            mobileQuery.removeListener(this.fillOutlet);
        }
    }
});

export default SettingsIndexRoute;
