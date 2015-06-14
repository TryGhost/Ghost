import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    config: Ember.inject.service(),

    open: false,

    mouseEnter () {
        this.sendAction('onMouseEnter');
    },

    actions: {
        toggleAutoNav () {
            this.sendAction('toggleAutoNav');
        },

        openModal (modal) {
            this.sendAction('openModal', modal);
        },

        closeMobileMenu () {
            this.sendAction('closeMobileMenu');
        }
    }
});
