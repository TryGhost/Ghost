/*global device*/
import computed from 'ember-computed';
import GhostInput from 'ghost-admin/components/gh-input';

/**
 * This doesn't override the OneWayInput component because
 * we need finer control. It borrows
 * parts from both the OneWayInput component and Ember's default
 * input component
 */
const TrimFocusInputComponent = GhostInput.extend({

    shouldFocus: true,

    attributeBindings: ['autofocus'],

    autofocus: computed(function () {
        if (this.get('shouldFocus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    init() {
        this._super(...arguments);
    },

    didInsertElement() {
        this._super(...arguments);
        this._focus();
    },

    sanitizeInput(input) {
        if (input && typeof input.trim === 'function') {
            return input.trim();
        } else {
            return input;
        }
    },

    _focus() {
        // Until mobile safari has better support
        // for focusing, we just ignore it
        if (this.get('shouldFocus') && !device.ios()) {
            this.element.focus();
        }
    }
});

export default TrimFocusInputComponent;
