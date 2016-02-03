import Ember from 'ember';

const {
    Component,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    open: false,

    config: service(),
    session: service(),

    mouseEnter() {
        this.sendAction('onMouseEnter');
    },

    actions: {
        toggleAutoNav() {
            this.sendAction('toggleMaximise');
        },

        showMarkdownHelp() {
            this.sendAction('showMarkdownHelp');
        },

        closeMobileMenu() {
            this.sendAction('closeMobileMenu');
        },

        openAutoNav() {
            this.sendAction('openAutoNav');
        }
    }
});
