import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'h2',
    classNames: ['view-title'],
    actions: {
        openMobileMenu: function () {
            this.sendAction('openMobileMenu');
        }
    }
});
