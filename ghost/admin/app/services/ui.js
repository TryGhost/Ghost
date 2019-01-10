import Service, {inject as service} from '@ember/service';
import {not, or, reads} from '@ember/object/computed';

export default Service.extend({
    dropdown: service(),
    mediaQueries: service(),

    isFullScreen: false,
    showMobileMenu: false,
    showSettingsMenu: false,

    hasSideNav: not('isSideNavHidden'),
    isMobile: reads('mediaQueries.isMobile'),
    isSideNavHidden: or('isFullScreen', 'isMobile'),

    closeMenus() {
        this.get('dropdown').closeDropdowns();
        this.setProperties({
            showSettingsMenu: false,
            showMobileMenu: false
        });
    },

    closeMobileMenu() {
        this.set('showMobileMenu', false);
    },

    openMobileMenu() {
        this.set('showMobileMenu', true);
    },

    openSettingsMenu() {
        this.set('showSettingsMenu', true);
    },

    actions: {
        closeMenus() {
            this.closeMenus();
        },

        closeMobileMenu() {
            this.closeMobileMenu();
        },

        openMobileMenu() {
            this.openMobileMenu();
        },

        openSettingsMenu() {
            this.openSettingsMenu();
        }
    }
});
