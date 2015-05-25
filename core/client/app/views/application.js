import Ember from 'ember';

export default Ember.View.extend({
    classNames: 'gh-app',

    toggleSettingsMenuBodyClass: function () {
        $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
    }.observes('controller.showSettingsMenu')
});
