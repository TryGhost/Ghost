import EPMModalsService from 'ember-promise-modals/services/modals';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class ModalsService extends EPMModalsService {
    @service dropdown;

    // we manually close modals on backdrop clicks and escape rather than letting focus-trap
    // handle it so we can intercept/abort closing for things like unsaved change confirmations
    allowOutsideClick = true;
    clickOutsideDeactivates = false;
    escapeDeactivates = false;

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
            if (elem.matches?.('.modal-content, .ember-basic-dropdown-content')) {
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
