import $ from 'jquery';
import PowerSelectMultiple from 'ember-power-select/components/power-select-multiple';
import {bind} from '@ember/runloop';

const endActions = 'click.ghToken mouseup.ghToken touchend.ghToken';

// triggering focus on the search input within ESA's onfocus event breaks the
// drag-n-drop functionality in ember-drag-drop so we watch for events that
// could be the start of a drag and disable the default focus behaviour until
// we get another event signalling the end of a drag

export default PowerSelectMultiple.extend({

    _canFocus: true,

    willDestroyElement() {
        this._super(...arguments);

        if (this._allowFocusListener) {
            $(window).off(endActions, this._allowFocusListener);
        }
    },

    actions: {
        optionMouseDown(event) {
            if (event.which === 1 && !event.ctrlKey) {
                this._denyFocus(event);
            }
        },

        optionTouchStart(event) {
            this._denyFocus(event);
        },

        handleFocus() {
            if (this._canFocus) {
                this._super(...arguments);
            }
        }
    },

    _denyFocus() {
        if (this._canFocus) {
            this._canFocus = false;

            this._allowFocusListener = bind(this, this._allowFocus);

            $(window).on(endActions, this._allowFocusListener);
        }
    },

    _allowFocus() {
        this._canFocus = true;

        $(window).off(endActions, this._allowFocusListener);
        this._allowFocusListener = null;
    }
});
