import Mixin from '@ember/object/mixin';
import device from 'npm:current-device';
import {computed} from '@ember/object';

const keyCodes = {
    13: 'Enter',
    9: 'Tab'
};

export default Mixin.create({
    attributeBindings: ['autofocus'],

    selectOnClick: false,
    shouldFocus: false,
    stopEnterKeyDownPropagation: false,

    autofocus: computed(function () {
        if (this.get('shouldFocus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    didInsertElement() {
        this._super(...arguments);
        this._focus();
    },

    click(event) {
        if (this.get('selectOnClick')) {
            event.currentTarget.select();
        }
    },

    keyDown(event) {
        // stop event propagation when pressing "enter"
        // most useful in the case when undesired (global) keyboard shortcuts
        // are getting triggered while interacting with this particular input element.
        if (event.keyCode === 13 && this.get('stopEnterKeyDownPropagation')) {
            event.stopPropagation();

            return true;
        }

        // prevent default TAB behaviour if we have a keyEvent for it
        if (event.keyCode === 9 && typeof this.get('keyEvents.Tab') === 'function') {
            event.preventDefault();
        }

        this._super(...arguments);
    },

    keyPress(event) {
        // prevent default ENTER behaviour if we have a keyEvent for it
        if (event.keyCode === 13 && typeof this.get('keyEvents.Enter') === 'function') {
            event.preventDefault();
        }

        this._super(...arguments);
    },

    keyUp(event) {
        if (event.keyCode) {
            let methodName = this._getMethodFromKeyCode(event.keyCode);
            let method = this.get(`keyEvents.${methodName}`);
            if (method) {
                method(event.target.value);
            }
        }
    },

    _focus() {
        // Until mobile safari has better support
        // for focusing, we just ignore it
        if (this.get('shouldFocus') && !device.ios()) {
            this.element.focus();
        }
    },

    _getMethodFromKeyCode(keyCode) {
        let methodName = keyCodes[keyCode.toString()];
        return methodName;
    }
});
