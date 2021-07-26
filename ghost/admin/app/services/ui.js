import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {
    contrast,
    darkenToContrastThreshold,
    hexToRgb,
    lightenToContrastThreshold,
    rgbToHex,
    textColorForBackgroundColor
} from 'ghost-admin/utils/color';
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
        const accentColor = this.settings.get('accentColor');
        const backgroundColor = this.backgroundColor;

        const accentRgb = hexToRgb(accentColor);
        const backgroundRgb = hexToRgb(backgroundColor);

        // WCAG contrast. 1 = lowest contrast, 21 = highest contrast
        const accentContrast = contrast(backgroundRgb, accentRgb);

        if (accentContrast > 2) {
            return accentColor;
        }

        let adjustedAccentRgb = accentRgb;

        if (this.feature.nightShift) {
            adjustedAccentRgb = lightenToContrastThreshold(accentRgb, backgroundRgb, 2);
        } else {
            adjustedAccentRgb = darkenToContrastThreshold(accentRgb, backgroundRgb, 2);
        }

        return rgbToHex(adjustedAccentRgb);
    }

    get textColorForAdjustedAccentBackground() {
        const accentColor = this.settings.get('accentColor');

        const accentColorRgb = hexToRgb(accentColor);
        const textColorRgb = textColorForBackgroundColor(accentColorRgb);

        return rgbToHex(textColorRgb);
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
