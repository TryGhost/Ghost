/*
This cute little component has two jobs.

On desktop, it toggles autoNav behaviour. It tracks
that state via the maximise property, and uses the
state to render the appropriate icon.

On mobile, it renders a closing icon, and clicking it
closes the mobile menu
*/

import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['gh-menu-toggle'],

    mediaQueries: Ember.inject.service(),
    isMobile: Ember.computed.reads('mediaQueries.isMobile'),
    maximise: false,

    iconClass: Ember.computed('maximise', 'isMobile', function () {
        if (this.get('maximise') && !this.get('isMobile')) {
            return 'icon-maximise';
        } else {
            return 'icon-minimise';
        }
    }),

    click: function () {
        if (this.get('isMobile')) {
            this.sendAction('mobileAction');
        } else {
            this.toggleProperty('maximise');
            this.sendAction('desktopAction');
        }
    }
});
