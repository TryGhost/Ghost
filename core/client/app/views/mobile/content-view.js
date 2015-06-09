import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

var MobileContentView = Ember.View.extend({
    // Ensure that loading this view brings it into view on mobile
    showContent: function () {
        if (mobileQuery.matches) {
            var parent = this.get('parentView');
            if (parent.showContent) {
                parent.showContent();
            }
        }
    }.on('didInsertElement')
});

export default MobileContentView;
