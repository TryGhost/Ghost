/* global key */
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
            if (isBlank(term) === this.select.isOpen) {
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

        // hacky workaround to let Escape clear the input if there's text,
        // but still allow it to close the search modal if there's no text
        handleKeydown(e) {
            if ((e.key === 'Escape' && e.target.value) || e.key === 'Enter') {
                this._previousKeyScope = key.getScope();
                key.setScope('ignore');
            }
        },

        handleKeyup() {
            if (key.getScope() === 'ignore') {
                key.setScope(this._previousKeyScope);
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
