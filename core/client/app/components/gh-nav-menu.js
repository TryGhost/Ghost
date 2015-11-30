import Ember from 'ember';

const {Component, inject} = Ember;

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    open: false,

    config: inject.service(),
    session: inject.service(),

    mouseEnter() {
        this.sendAction('onMouseEnter');
    },

    actions: {
        toggleAutoNav() {
            this.sendAction('toggleMaximise');
        },

        openModal(modal) {
            this.sendAction('openModal', modal);
        },

        closeMobileMenu() {
            this.sendAction('closeMobileMenu');
        },

        openAutoNav() {
            this.sendAction('openAutoNav');
        }
    }
});
