import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

// Routes that extend MobileIndexRoute need to implement
// desktopTransition, a function which is called when
// the user resizes to desktop levels.
var MobileIndexRoute = Ember.Route.extend({
    desktopTransition: Ember.K,

    activate: function attachDesktopTransition() {
        this._super();
        mobileQuery.addListener(this.desktopTransitionMQ);
    },

    deactivate: function removeDesktopTransition() {
        this._super();
        mobileQuery.removeListener(this.desktopTransitionMQ);
    },

    setDesktopTransitionMQ: Ember.on('init', function () {
        var self = this;
        this.set('desktopTransitionMQ', function desktopTransitionMQ() {
            if (!mobileQuery.matches) {
                self.desktopTransition();
            }
        });
    })
});

export default MobileIndexRoute;
