import EPMModalsService from 'ember-promise-modals/services/modals';
import {inject as service} from '@ember/service';

// functions passed from service to focus-trap are not bound to `this` so keep
// the selector outside of the modal instance scope
const ALLOWED_CLICK_SELECTOR = '.modal-content, .ember-basic-dropdown-content';

export default class ModalsService extends EPMModalsService {
    @service dropdown;

    clickOutsideDeactivates(event) {
        let shouldClose = true;

        for (const elem of event.path) {
            if (elem.matches?.(ALLOWED_CLICK_SELECTOR)) {
                shouldClose = false;
                break;
            }
        }

        return shouldClose;
    }

    allowOutsideClick(event) {
        let shouldAllow = false;

        for (const elem of event.path) {
            if (elem.matches?.(ALLOWED_CLICK_SELECTOR)) {
                shouldAllow = true;
                break;
            }
        }

        return shouldAllow;
    }

    _onFirstModalAdded() {
        super._onFirstModalAdded();
        this.dropdown.closeDropdowns();
    }
}
