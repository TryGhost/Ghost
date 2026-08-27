import Service, {inject as service} from '@ember/service';
import {
    Color,
    darkenToContrastThreshold,
    lightenToContrastThreshold
} from '@tryghost/color-utils';
import {action, get} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
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
    @service router;
    @service settings;
    @service('state-bridge') stateBridge;

    @inject config;

    @tracked _isFullScreen = false;
    @tracked mainClass = '';
    get isFullScreen() {
        return this._isFullScreen;
    }

    set isFullScreen(value) {
        this._isFullScreen = value;
        // Trigger sidebar visibility event whenever fullscreen mode changes
        this.stateBridge.setSidebarVisible(!value);
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

        window.document.title = `Ghost Admin - ${blogTitle}`;
    }

    @action
    initBodyDragHandlers() {
        // when any drag event is occurring we add `data-user-is-dragging` to the
        // body element so that we can have dropzones start listening to pointer
        // events allowing us to have interactive elements "underneath" drop zones
        //
        // We use a depth counter rather than a boolean because `dragenter`/`dragleave`
        // fire on each child element a drag crosses. Tracking depth lets us know when
        // the drag has truly left the document without relying on the unreliable
        // `screenX/Y === 0` heuristic (which fails when leaving via the title bar,
        // to another monitor, or in Safari generally).
        //
        // We also reset state on `dragend`, `drop`, `window.blur` and
        // `visibilitychange`. Safari is known to drop `dragend` if the drag source
        // is removed from the DOM mid-drag (e.g. via autosave re-render). Without
        // these safety nets the `userIsDragging` attribute could stay set for the
        // rest of the page lifetime, leaving invisible dropzones blocking clicks
        // on the buttons beneath them.
        this.dragDepth = 0;

        this.resetDragState = () => {
            this.dragDepth = 0;
            delete document.body.dataset.userIsDragging;
        };

        this.bodyDragEnterHandler = () => {
            this.dragDepth += 1;
            document.body.dataset.userIsDragging = true;
        };

        this.bodyDragLeaveHandler = () => {
            // `Math.max` guards against any enter/leave imbalance so the counter
            // can't go negative and get stuck above zero on the next enter.
            this.dragDepth = Math.max(0, this.dragDepth - 1);
            if (this.dragDepth === 0) {
                delete document.body.dataset.userIsDragging;
            }
        };

        this.windowBlurHandler = () => {
            // If the user drags out of the window and releases the mouse (common
            // way to get a stuck state in Safari), we won't see `dragend` or
            // `drop`. The window losing focus is a reliable signal that any drag
            // is no longer relevant. We reset unconditionally rather than gating
            // on `dragDepth` because the whole point of this safety net is to
            // recover when our depth tracking has drifted out of sync.
            this.resetDragState();
        };

        this.visibilityChangeHandler = () => {
            // Switching tabs is another path that can leave drag state stranded
            // in Safari, so treat tab hide the same as window blur.
            if (document.hidden) {
                this.resetDragState();
            }
        };

        document.body.addEventListener('dragenter', this.bodyDragEnterHandler, {capture: true});
        document.body.addEventListener('dragleave', this.bodyDragLeaveHandler, {capture: true});
        document.body.addEventListener('dragend', this.resetDragState, {capture: true});
        document.body.addEventListener('drop', this.resetDragState, {capture: true});
        window.addEventListener('blur', this.windowBlurHandler);
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    @action
    cleanupBodyDragHandlers() {
        document.body.removeEventListener('dragenter', this.bodyDragEnterHandler, {capture: true});
        document.body.removeEventListener('dragleave', this.bodyDragLeaveHandler, {capture: true});
        document.body.removeEventListener('dragend', this.resetDragState, {capture: true});
        document.body.removeEventListener('drop', this.resetDragState, {capture: true});
        window.removeEventListener('blur', this.windowBlurHandler);
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
}
