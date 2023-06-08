import EPMModalsService from '@tryghost/ember-promise-modals/services/modals';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class ModalsService extends EPMModalsService {
    @service dropdown;

    DEFAULT_OPTIONS = {
        className: 'fullscreen-modal-action fullscreen-modal-wide'
    };

    // we manually close modals on backdrop clicks and escape rather than letting focus-trap
    // handle it so we can intercept/abort closing for things like unsaved change confirmations
    focusTrapOptions = {
        allowOutsideClick: true,
        clickOutsideDeactivates: false,
        escapeDeactivates: false
    };

    open(modal, data, options) {
        const mergedOptions = Object.assign({}, this.DEFAULT_OPTIONS, modal.modalOptions, options);
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
            document.body.addEventListener('mousedown', this.backdropClickHandler, {capture: true, passive: false});
        }

        if (!this.escapeKeyHandler) {
            this.escapeKeyHandler = bind(this, this.handleEscapeKey);
            document.addEventListener('keydown', this.escapeKeyHandler, {capture: true, passive: false});
        }
    }

    removeEventHandlers() {
        document.body.removeEventListener('mousedown', this.backdropClickHandler, {capture: true, passive: false});
        this.backdropClickHandler = null;

        document.removeEventListener('keydown', this.escapeKeyHandler, {capture: true, passive: false});
        this.escapeKeyHandler = null;
    }

    handleBackdropClick(event) {
        let shouldClose = true;

        for (const elem of (event.path || event.composedPath())) {
            if (elem.matches?.('.modal-content, .fullscreen-modal-total-overlay, .ember-basic-dropdown-content, a[download], .pintura-editor')) {
                shouldClose = false;
                break;
            }
        }

        if ((this.top.options || this.top._options)?.ignoreBackdropClick) {
            shouldClose = false;
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
