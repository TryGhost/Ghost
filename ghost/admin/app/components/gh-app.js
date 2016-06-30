import $ from 'jquery';
import Component from 'ember-component';
import observer from 'ember-metal/observer';

export default Component.extend({
    classNames: ['gh-app'],

    showSettingsMenu: false,

    toggleSettingsMenuBodyClass: observer('showSettingsMenu', function () {
        let showSettingsMenu = this.get('showSettingsMenu');

        $('body').toggleClass('settings-menu-expanded', showSettingsMenu);
    })
});
