import Component from 'ember-component';

export default Component.extend({
    tagName: 'h2',
    classNames: ['view-title'],

    actions: {
        openMobileMenu() {
            this.sendAction('openMobileMenu');
        }
    }
});
