import Component from 'ember-component';

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-mobile-nav-bar'],

    actions: {
        openMobileMenu() {
            this.sendAction('openMobileMenu');
        }
    }
});
