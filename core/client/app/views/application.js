import Ember from 'ember';

var ApplicationView = Ember.View.extend({
    classNames: 'gh-app',

    showGlobalMobileNavObserver: function () {
        if (this.get('controller.showGlobalMobileNav')) {
            $('body').addClass('global-nav-expanded');
        } else {
            $('body').removeClass('global-nav-expanded');
        }
    }.observes('controller.showGlobalMobileNav'),

    toggleSettingsMenuBodyClass: function () {
        $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
    }.observes('controller.showSettingsMenu')
});

export default ApplicationView;
