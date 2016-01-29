import Ember from 'ember';

const {Component, observer} = Ember;

export default Component.extend({
    classNames: ['gh-app'],

    showSettingsMenu: false,

    toggleSettingsMenuBodyClass: observer('showSettingsMenu', function () {
        let showSettingsMenu = this.get('showSettingsMenu');

        Ember.$('body').toggleClass('settings-menu-expanded', showSettingsMenu);
    })
});
