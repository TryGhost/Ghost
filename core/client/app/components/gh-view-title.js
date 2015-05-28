import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        toggleMobileMenu () {
            this.sendAction('mobileMenuClick');
        }
    }
});
