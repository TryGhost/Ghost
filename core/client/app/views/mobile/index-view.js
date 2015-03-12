import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

var MobileIndexView = Ember.View.extend({
    // Ensure that going to the index brings the menu into view on mobile.
    showMenu: function () {
        if (mobileQuery.matches) {
            this.get('parentView').showMenu();
        }
    }.on('didInsertElement')
});

export default MobileIndexView;
