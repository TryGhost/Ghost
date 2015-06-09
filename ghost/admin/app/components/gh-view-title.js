import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'h2',
    classNames: ['view-title'],
    actions: {
        openMobileMenu () {
            this.sendAction('openMobileMenu');
        }
    }
});
