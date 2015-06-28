import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['gh-app'],

    showSettingsMenu: false,

    toggleSettingsMenuBodyClass: Ember.observer('showSettingsMenu', function () {
        var showSettingsMenu = this.get('showSettingsMenu');

        Ember.$('body').toggleClass('settings-menu-expanded', showSettingsMenu);
    })
});
