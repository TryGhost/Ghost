import Service from '@ember/service';
import injectService from 'ember-service/inject';
import {computed} from '@ember/object';

export default Service.extend({
    dropdown: injectService(),

    autoNav: false,
    showMobileMenu: false,
    showSettingsMenu: false,

    autoNavOpen: computed('autoNav', {
        get() {
            return false;
        },
        set(key, value) {
            if (this.get('autoNav')) {
                return value;
            }
            return false;
        }
    }),

    closeMenus() {
        this.get('dropdown').closeDropdowns();
        this.setProperties({
            showSettingsMenu: false,
            showMobileMenu: false
        });
    },

    openAutoNav() {
        this.set('autoNavOpen', true);
    },

    closeAutoNav() {
        if (this.get('autoNavOpen')) {
            this.get('dropdown').closeDropdowns();
        }
        this.set('autoNavOpen', false);
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

    toggleAutoNav() {
        this.toggleProperty('autoNav');
    },

    actions: {
        closeMenus() {
            this.closeMenus();
        },

        openAutoNav() {
            this.openAutoNav();
        },

        closeAutoNav() {
            this.closeAutoNav();
        },

        closeMobileMenu() {
            this.closeMobileMenu();
        },

        openMobileMenu() {
            this.openMobileMenu();
        },

        openSettingsMenu() {
            this.openSettingsMenu();
        },

        toggleAutoNav() {
            this.toggleAutoNav();
        }
    }
});
