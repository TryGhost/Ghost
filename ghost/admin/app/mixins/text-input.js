/* global device */
import Mixin from '@ember/object/mixin';
import {computed} from '@ember/object';

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
        if (this.get('stopEnterKeyDownPropagation') && event.keyCode === 13) {
            event.stopPropagation();

            return true;
        }

        // prevent default TAB behaviour if we have a keyEvent for it
        if (event.keyCode === 9 && typeof this.get('keyEvents.9') === 'function') {
            event.preventDefault();
        }

        this._super(...arguments);
    },

    keyPress(event) {
        // prevent default ENTER behaviour if we have a keyEvent for it
        if (event.keyCode === 13 && typeof this.get('keyEvents.13') === 'function') {
            event.preventDefault();
        }

        this._super(...arguments);
    },

    _focus() {
        // Until mobile safari has better support
        // for focusing, we just ignore it
        if (this.get('shouldFocus') && !device.ios()) {
            this.element.focus();
        }
    }
});
