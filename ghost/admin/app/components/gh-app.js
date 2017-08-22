import $ from 'jquery';
import Component from '@ember/component';

export default Component.extend({
    classNames: ['gh-app'],

    showSettingsMenu: false,

    didReceiveAttrs() {
        this._super(...arguments);
        let showSettingsMenu = this.get('showSettingsMenu');

        $('body').toggleClass('settings-menu-expanded', showSettingsMenu);
    }
});
