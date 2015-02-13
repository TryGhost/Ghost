import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

// A mobile parent view needs to implement three methods,
// showContent, showAll, and showMenu
// Which are called by MobileIndex and MobileContent views
var MobileParentView = Ember.View.extend({
    showContent: Ember.K,
    showMenu: Ember.K,
    showAll: Ember.K,

    setChangeLayout: function () {
        var self = this;
        this.set('changeLayout', function changeLayout() {
            if (mobileQuery.matches) {
                // transitioned to mobile layout, so show content
                self.showContent();
            } else {
                // went from mobile to desktop
                self.showAll();
            }
        });
    }.on('init'),

    attachChangeLayout: function () {
        mobileQuery.addListener(this.changeLayout);
    }.on('didInsertElement'),

    detachChangeLayout: function () {
        mobileQuery.removeListener(this.changeLayout);
    }.on('willDestroyElement')
});

export default MobileParentView;
