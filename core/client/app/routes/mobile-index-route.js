import Ember from 'ember';

// Routes that extend MobileIndexRoute need to implement
// desktopTransition, a function which is called when
// the user resizes to desktop levels.
export default Ember.Route.extend({
    desktopTransition: Ember.K,
    _callDesktopTransition: null,

    mediaQueries: Ember.inject.service(),

    activate: function () {
        this._callDesktopTransition = () => {
            if (!this.get('mediaQueries.isMobile')) {
                this.desktopTransition();
            }
        };
        Ember.addObserver(this, 'mediaQueries.isMobile', this._callDesktopTransition);
    },

    deactivate: function () {
        if (this._callDesktopTransition) {
            Ember.removeObserver(this, 'mediaQueries.isMobile', this._callDesktopTransition);
            this._callDesktopTransition = null;
        }
    }

});
