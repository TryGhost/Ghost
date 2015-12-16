import Ember from 'ember';

const {Route, addObserver, inject, removeObserver} = Ember;

// Routes that extend MobileIndexRoute need to implement
// desktopTransition, a function which is called when
// the user resizes to desktop levels.
export default Route.extend({
    desktopTransition: Ember.K,
    _callDesktopTransition: null,

    mediaQueries: inject.service(),

    activate() {
        this._super(...arguments);
        this._callDesktopTransition = () => {
            if (!this.get('mediaQueries.isMobile')) {
                this.desktopTransition();
            }
        };
        addObserver(this, 'mediaQueries.isMobile', this._callDesktopTransition);
    },

    deactivate() {
        this._super(...arguments);
        if (this._callDesktopTransition) {
            removeObserver(this, 'mediaQueries.isMobile', this._callDesktopTransition);
            this._callDesktopTransition = null;
        }
    }
});
