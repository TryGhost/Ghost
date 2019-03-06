import GhostTextInput from 'ghost-admin/components/gh-text-input';

/**
 * This doesn't override the OneWayInput component because
 * we need finer control. It borrows
 * parts from both the OneWayInput component and Ember's default
 * input component
 */
const TrimFocusInputComponent = GhostTextInput.extend({

    shouldFocus: true,

    focusOut(event) {
        this._trimInput(event.target.value, event);
        this._super(...arguments);
    },

    _trimInput(value, event) {
        if (value && typeof value.trim === 'function') {
            value = value.trim();
        }

        this.element.value = value;
        this._elementValueDidChange(event);

        let inputMethod = this.input;
        if (inputMethod) {
            inputMethod(event);
        }
    }
});

export default TrimFocusInputComponent;
