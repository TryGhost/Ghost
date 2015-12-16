import Ember from 'ember';

const {Component} = Ember;

export default Component.extend({
    tagName: 'h2',
    classNames: ['view-title'],

    actions: {
        openMobileMenu() {
            this.sendAction('openMobileMenu');
        }
    }
});
