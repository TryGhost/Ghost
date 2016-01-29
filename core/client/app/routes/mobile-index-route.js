import Ember from 'ember';

const {
    Route,
    addObserver,
    inject: {service},
    removeObserver,
    K
} = Ember;

// Routes that extend MobileIndexRoute need to implement
// desktopTransition, a function which is called when
// the user resizes to desktop levels.
export default Route.extend({
    desktopTransition: K,
    _callDesktopTransition: null,

    mediaQueries: service(),

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
