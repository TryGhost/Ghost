import Service, {inject as service} from '@ember/service';
import {get} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {not, or, reads} from '@ember/object/computed';

function collectMetadataClasses(transition, prop) {
    let oldClasses = [];
    let newClasses = [];
    let {from, to} = transition;

    while (from) {
        oldClasses = oldClasses.concat(get(from, `metadata.${prop}`) || []);
        from = from.parent;
    }

    while (to) {
        newClasses = newClasses.concat(get(to, `metadata.${prop}`) || []);
        to = to.parent;
    }

    return {oldClasses, newClasses};
}

function updateBodyClasses(transition) {
    let {body} = document;
    let {oldClasses, newClasses} = collectMetadataClasses(transition, 'bodyClasses');

    oldClasses.forEach((oldClass) => {
        body.classList.remove(oldClass);
    });
    newClasses.forEach((newClass) => {
        body.classList.add(newClass);
    });
}

export default Service.extend({
    config: service(),
    dropdown: service(),
    mediaQueries: service(),
    router: service(),

    isFullScreen: false,
    showMobileMenu: false,
    showSettingsMenu: false,
    mainClass: '',

    hasSideNav: not('isSideNavHidden'),
    isMobile: reads('mediaQueries.isMobile'),
    isSideNavHidden: or('isFullScreen', 'isMobile'),

    init() {
        this._super(...arguments);

        this.router.on('routeDidChange', (transition) => {
            updateBodyClasses(transition);

            this.updateDocumentTitle();

            let {newClasses: mainClasses} = collectMetadataClasses(transition, 'mainClasses');
            this.set('mainClass', mainClasses.join(' '));
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

    updateDocumentTitle() {
        let {currentRoute} = this.router;
        let tokens = [];

        while (currentRoute) {
            let titleToken = get(currentRoute, 'metadata.titleToken');

            if (typeof titleToken === 'function') {
                titleToken = titleToken();
            }

            if (titleToken) {
                tokens.unshift(titleToken);
            }

            currentRoute = currentRoute.parent;
        }

        let blogTitle = this.config.get('blogTitle');

        if (!isEmpty(tokens)) {
            window.document.title = `${tokens.join(' - ')} - ${blogTitle}`;
        } else {
            window.document.title = blogTitle;
        }
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
        },

        setMainClass(cls) {
            this.set('mainClass', cls);
        }
    }
});
