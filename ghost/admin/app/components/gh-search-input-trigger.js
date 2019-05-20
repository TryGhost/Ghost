import Component from '@ember/component';
import {isBlank} from '@ember/utils';

export default Component.extend({
    actions: {
        captureMouseDown(e) {
            e.stopPropagation();
        },

        search(term) {
            // open dropdown if not open and term is present
            // close dropdown if open and term is blank
            if (isBlank(term) === this.get('select.isOpen')) {
                isBlank(term) ? this.close() : this.open();

                // ensure focus isn't lost when dropdown is closed
                if (isBlank(term)) {
                    this._focusInput();
                }
            }

            this.select.actions.search(term);
        },

        focusInput() {
            this._focusInput();
        },

        resetInput() {
            let input = this.element && this.element.querySelector('input');
            if (input) {
                input.value = '';
            }
        },

        handleKeydown(e) {
            let select = this.select;

            // TODO: remove keycode check once EPS is updated to 1.0
            if (!select.isOpen || e.keyCode === 32) {
                e.stopPropagation();
            }
        }
    },

    open() {
        this.select.actions.open();
    },

    close() {
        this.select.actions.close();
    },

    _focusInput() {
        let input = this.element && this.element.querySelector('input');
        if (input) {
            input.focus();
        }
    }
});
