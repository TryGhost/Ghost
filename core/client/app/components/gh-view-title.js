import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        openMobileMenu () {
            this.sendAction('openMobileMenu');
        }
    }
});
