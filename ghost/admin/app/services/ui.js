import Service, {inject as service} from '@ember/service';
import {
    Color,
    darkenToContrastThreshold,
    lightenToContrastThreshold
} from '@tryghost/color-utils';
import {action, get} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
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
    @service dropdown;
    @service feature;
    @service mediaQueries;
    @service router;
    @service settings;

    @inject config;

    @tracked contextualNavMenu = null;
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
        const accentColor = Color(this.settings.accentColor);
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

        let blogTitle = this.config.blogTitle;

        if (!isEmpty(tokens)) {
            window.document.title = `${tokens.join(' - ')} - ${blogTitle}`;
        } else {
            window.document.title = blogTitle;
        }
    }

    @action
    initBodyDragHandlers() {
        // when any drag event is occurring we add `data-user-is-dragging` to the
        // body element so that we can have dropzones start listening to pointer
        // events allowing us to have interactive elements "underneath" drop zones
        this.bodyDragEnterHandler = (event) => {
            if (!event.dataTransfer) {
                return;
            }

            document.body.dataset.userIsDragging = true;
            window.clearTimeout(this.dragTimer);
        };

        this.bodyDragLeaveHandler = (event) => {
            // only remove document-level "user is dragging" indicator when leaving the document
            if (event.screenX !== 0 || event.screenY !== 0) {
                return;
            }

            window.clearTimeout(this.dragTimer);
            this.dragTimer = window.setTimeout(() => {
                delete document.body.dataset.userIsDragging;
            }, 50);
        };

        this.cancelDrag = () => {
            delete document.body.dataset.userIsDragging;
        };

        document.body.addEventListener('dragenter', this.bodyDragEnterHandler, {capture: true});
        document.body.addEventListener('dragleave', this.bodyDragLeaveHandler, {capture: true});
        document.body.addEventListener('dragend', this.cancelDrag, {capture: true});
        document.body.addEventListener('drop', this.cancelDrag, {capture: true});
    }

    @action
    cleanupBodyDragHandlers() {
        document.body.removeEventListener('dragenter', this.bodyDragEnterHandler, {capture: true});
        document.body.removeEventListener('dragleave', this.bodyDragLeaveHandler, {capture: true});
        document.body.removeEventListener('dragend', this.cancelDrag, {capture: true});
        document.body.removeEventListener('drop', this.cancelDrag, {capture: true});
    }
}
