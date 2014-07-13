import {mobileQuery} from 'ghost/utils/mobile';

var SettingsView = Ember.View.extend({
    classNames: ['wrapper'],
    // used by SettingsContentBaseView and on resize to mobile from desktop
    showSettingsContent: function () {
        if (mobileQuery.matches) {
            $('.settings-sidebar').animate({right: '100%', left: '-110%', 'margin-right': '15px'}, 300);
            $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
            $('.settings-header-inner').css('display', 'block');
        }
    },
    // used by SettingsIndexView
    showSettingsMenu: function () {
        if (mobileQuery.matches) {
            $('.settings-header-inner').css('display', 'none');
            $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
            $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
        }
    },
    showAll: function () {
        //Remove any styles applied by jQuery#animate
        $('.settings-sidebar, .settings-content').removeAttr('style');
    },

    mobileInteractions: function () {
        this.set('changeLayout', _.bind(function changeLayout(mq) {
            if (mq.matches) {
                //transitioned to mobile layout, so show content
                this.showSettingsContent();
            } else {
                //went from mobile to desktop
                this.showAll();
            }
        }, this));
        mobileQuery.addListener(this.changeLayout);
    }.on('didInsertElement'),

    removeMobileInteractions: function () {
        mobileQuery.removeListener(this.changeLayout);
    }.on('willDestroyElement')
});

export default SettingsView;
