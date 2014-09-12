import {mobileQuery} from 'ghost/utils/mobile';

var SettingsView = Ember.View.extend({
    // used by SettingsContentBaseView and on resize to mobile from desktop
    showSettingsContent: function () {
        if (mobileQuery.matches) {
            $('.settings-menu').css({right: '100%', left: '-110%', 'margin-right': '15px'});
            $('.settings-content').css({right: '0', left: '0', 'margin-left': '0'});
            $('.settings-header-inner').css('display', 'block');
        }
    },
    // used by SettingsIndexView
    showSettingsMenu: function () {
        if (mobileQuery.matches) {
            $('.settings-header-inner').css('display', 'none');
            $('.settings-menu').css({right: '0', left: '0', 'margin-right': '0'});
            $('.settings-content').css({right: '-100%', left: '100%', 'margin-left': '15'});
        }
    },
    showAll: function () {
        //Remove any styles applied by jQuery#css
        $('.settings-menu, .settings-content').removeAttr('style');
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
