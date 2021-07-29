import Service, {inject as service} from '@ember/service';
import {
    Color,
    darkenToContrastThreshold,
    lightenToContrastThreshold,
    textColorForBackgroundColor
} from '@tryghost/color-utils';
import {action} from '@ember/object';
import {get} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {tracked} from '@glimmer/tracking';

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

export default class UiService extends Service {
    @service config;
    @service dropdown;
    @service feature;
    @service mediaQueries;
    @service router;
    @service settings;

    @tracked isFullScreen = false;
    @tracked mainClass = '';
    @tracked showMobileMenu = false;

    get isMobile() {
        return this.mediaQueries.isMobile;
    }

    get isSideNavHidden() {
        return this.isFullScreen || this.isMobile;
    }

    get hasSideNav() {
        return !this.isSideNavHidden;
    }

    get backgroundColor() {
        // hardcoded background colors because
        // grabbing color from .gh-main with getComputedStyle always returns #ffffff
        return this.feature.nightShift ? '#151719' : '#ffffff';
    }

    get adjustedAccentColor() {
        const accentColor = Color(this.settings.get('accentColor'));
        const backgroundColor = Color(this.backgroundColor);

        // WCAG contrast. 1 = lowest contrast, 21 = highest contrast
        const accentContrast = accentColor.contrast(backgroundColor);

        if (accentContrast > 2) {
            return accentColor.hex();
        }

        let adjustedAccentColor = accentColor;

        if (this.feature.nightShift) {
            adjustedAccentColor = lightenToContrastThreshold(accentColor, backgroundColor, 2);
        } else {
            adjustedAccentColor = darkenToContrastThreshold(accentColor, backgroundColor, 2);
        }

        return adjustedAccentColor.hex();
    }

    get textColorForAdjustedAccentBackground() {
        return textColorForBackgroundColor(this.settings.get('accentColor')).hex();
    }

    constructor() {
        super(...arguments);

        this.router.on('routeDidChange', (transition) => {
            updateBodyClasses(transition);

            this.updateDocumentTitle();

            let {newClasses: mainClasses} = collectMetadataClasses(transition, 'mainClasses');
            this.mainClass = mainClasses.join(' ');
        });
    }

    @action
    closeMenus() {
        this.dropdown.closeDropdowns();
        this.showMobileMenu = false;
    }

    @action
    closeMobileMenu() {
        this.showMobileMenu = false;
    }

    @action
    openMobileMenu() {
        this.showMobileMenu = true;
    }

    @action
    setMainClass(mainClass) {
        this.mainClass = mainClass;
    }

    @action
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
    }
}
