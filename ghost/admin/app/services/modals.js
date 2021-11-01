import EPMModalsService from 'ember-promise-modals/services/modals';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class ModalsService extends EPMModalsService {
    @service dropdown;
    @service themeManagement;

    DEFAULT_OPTIONS = {
        className: 'fullscreen-modal-action fullscreen-modal-wide'
    }

    MODAL_OPTIONS = {
        'modals/design/upload-theme': {
            beforeClose: () => {
                if (this.themeManagement.isUploading) {
                    return false;
                }
            }
        },
        'modals/design/view-theme': {
            className: 'fullscreen-modal-total-overlay',
            omitBackdrop: true
        }
    }

    // we manually close modals on backdrop clicks and escape rather than letting focus-trap
    // handle it so we can intercept/abort closing for things like unsaved change confirmations
    allowOutsideClick = true;
    clickOutsideDeactivates = false;
    escapeDeactivates = false;

    open(modal, data, options) {
        const mergedOptions = Object.assign({}, this.DEFAULT_OPTIONS, this.MODAL_OPTIONS[modal], options);
        return super.open(modal, data, mergedOptions);
    }

    _onFirstModalAdded() {
        super._onFirstModalAdded(...arguments);
        this.addEventHandlers();
        this.dropdown.closeDropdowns();
    }

    _onLastModalRemoved() {
        super._onLastModalRemoved(...arguments);
        this.removeEventHandlers();
    }

    addEventHandlers() {
        if (!this.backdropClickHandler) {
            this.backdropClickHandler = bind(this, this.handleBackdropClick);
            document.body.addEventListener('click', this.backdropClickHandler, {capture: true, passive: false});
        }

        if (!this.escapeKeyHandler) {
            this.escapeKeyHandler = bind(this, this.handleEscapeKey);
            document.addEventListener('keydown', this.escapeKeyHandler, {capture: true, passive: false});
        }
    }

    removeEventHandlers() {
        document.body.removeEventListener('click', this.backdropClickHandler, {capture: true, passive: false});
        this.backdropClickHandler = null;

        document.removeEventListener('keydown', this.escapeKeyHandler, {capture: true, passive: false});
        this.escapeKeyHandler = null;
    }

    handleBackdropClick(event) {
        let shouldClose = true;

        for (const elem of (event.path || event.composedPath())) {
            if (elem.matches?.('.modal-content, .fullscreen-modal-total-overlay, .ember-basic-dropdown-content')) {
                shouldClose = false;
                break;
            }
        }

        if (shouldClose) {
            this.top.close();
        }
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            this.top.close();
        }
    }
}
