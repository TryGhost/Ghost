/*
This cute little component has two jobs.

On desktop, it toggles autoNav behaviour. It tracks
that state via the maximise property, and uses the
state to render the appropriate icon.

On mobile, it renders a closing icon, and clicking it
closes the mobile menu
*/

import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

export default Ember.Component.extend({
    classNames: ['gh-menu-toggle'],

    isMobile: false,
    maximise: false,

    iconClass: Ember.computed('maximise', 'isMobile', function () {
        if (this.get('maximise') && !this.get('isMobile')) {
            return 'icon-maximise';
        } else {
            return 'icon-minimise';
        }
    }),

    didInsertElement: function () {
        this.set('isMobile', mobileQuery.matches);
        this.set('mqListener', Ember.run.bind(this, function (mql) {
            this.set('isMobile', mql.matches);
        }));
        mobileQuery.addListener(this.get('mqListener'));
    },

    willDestroyElement: function () {
        mobileQuery.removeListener(this.get('mqListener'));
    },

    click: function () {
        if (this.get('isMobile')) {
            this.sendAction('mobileAction');
        } else {
            this.toggleProperty('maximise');
            this.sendAction('desktopAction');
        }
    }
});
