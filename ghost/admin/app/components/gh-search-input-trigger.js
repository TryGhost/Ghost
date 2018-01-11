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

            this.get('select').actions.search(term);
        },

        focusInput() {
            this._focusInput();
        },

        resetInput() {
            this.$('input').val('');
        },

        handleKeydown(e) {
            let select = this.get('select');

            // TODO: remove keycode check once EPS is updated to 1.0
            if (!select.isOpen || e.keyCode === 32) {
                e.stopPropagation();
            }
        }
    },

    open() {
        this.get('select.actions').open();
    },

    close() {
        this.get('select.actions').close();
    },

    _focusInput() {
        this.$('input')[0].focus();
    }
});
