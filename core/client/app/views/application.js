import Ember from 'ember';

export default Ember.View.extend({
    classNames: 'gh-app',

    toggleSettingsMenuBodyClass: Ember.observer('controller.showSettingsMenu', function () {
        $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
    })
});
