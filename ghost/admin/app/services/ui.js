import Service, {inject as service} from '@ember/service';
import {get} from '@ember/object';
import {not, or, reads} from '@ember/object/computed';

function updateBodyClasses(transition) {
    let oldClasses = [];
    let newClasses = [];
    let {from, to} = transition;

    while (from) {
        oldClasses = oldClasses.concat(get(from, 'metadata.bodyClasses') || []);
        from = from.parent;
    }

    while (to) {
        newClasses = newClasses.concat(get(to, 'metadata.bodyClasses') || []);
        to = to.parent;
    }

    let {body} = document;
    oldClasses.forEach((oldClass) => {
        body.classList.remove(oldClass);
    });
    newClasses.forEach((newClass) => {
        body.classList.add(newClass);
    });
}

export default Service.extend({
    dropdown: service(),
    mediaQueries: service(),
    router: service(),

    isFullScreen: false,
    showMobileMenu: false,
    showSettingsMenu: false,

    hasSideNav: not('isSideNavHidden'),
    isMobile: reads('mediaQueries.isMobile'),
    isSideNavHidden: or('isFullScreen', 'isMobile'),

    init() {
        this._super(...arguments);
        this.router.on('routeDidChange', (transition) => {
            updateBodyClasses(transition);
        });
    },

    closeMenus() {
        this.dropdown.closeDropdowns();
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
