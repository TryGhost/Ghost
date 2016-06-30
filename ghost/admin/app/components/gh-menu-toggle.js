import Component from 'ember-component';
import computed, {reads} from 'ember-computed';
import injectService from 'ember-service/inject';

/*
    This cute little component has two jobs.

    On desktop, it toggles autoNav behaviour. It tracks
    that state via the maximise property, and uses the
    state to render the appropriate icon.

    On mobile, it renders a closing icon, and clicking it
    closes the mobile menu
*/
export default Component.extend({
    classNames: ['gh-menu-toggle'],

    mediaQueries: injectService(),
    isMobile: reads('mediaQueries.isMobile'),
    maximise: false,

    iconClass: computed('maximise', 'isMobile', function () {
        if (this.get('maximise') && !this.get('isMobile')) {
            return 'icon-maximise';
        } else {
            return 'icon-minimise';
        }
    }),

    click() {
        if (this.get('isMobile')) {
            this.sendAction('mobileAction');
        } else {
            this.toggleProperty('maximise');
            this.sendAction('desktopAction');
        }
    }
});
