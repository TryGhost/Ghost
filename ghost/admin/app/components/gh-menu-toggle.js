import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

/*
    This cute little component has two jobs.

    On desktop, it toggles autoNav behaviour. It tracks
    that state via the maximise property, and uses the
    state to render the appropriate icon.

    On mobile, it renders a closing icon, and clicking it
    closes the mobile menu
*/
export default Component.extend({
    mediaQueries: service(),

    classNames: ['gh-menu-toggle'],
    maximise: false,

    // closure actions
    desktopAction() {},
    mobileAction() {},

    isMobile: reads('mediaQueries.isMobile'),

    iconClass: computed('maximise', 'isMobile', function () {
        if (this.get('maximise') && !this.get('isMobile')) {
            return 'icon-maximise';
        } else {
            return 'icon-minimise';
        }
    }),

    click() {
        if (this.get('isMobile')) {
            this.mobileAction();
        } else {
            this.toggleProperty('maximise');
            this.desktopAction();
        }
    }
});
