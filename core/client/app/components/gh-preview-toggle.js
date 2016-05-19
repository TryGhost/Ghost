import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

/*
 This cute little component has one job.

 On desktop, it toggles the markdown preview tab.

 */
export default Component.extend({
    classNames: ['gh-preview-toggle'],

    mediaQueries: service(),
    isMobile: computed.reads('mediaQueries.isMobile'),
    maximise: false,

    iconClass: computed('maximise', 'isMobile', function () {
        if (this.get('maximise') && !this.get('isMobile')) {
            return 'icon-maximise';
        } else {
            return 'icon-minimise';
        }
    }),

    click() {
        if (!this.get('isMobile')) {
            this.toggleProperty('maximise');
            this.sendAction('desktopAction');
        }
    }
});
