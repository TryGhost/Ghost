import $ from 'jquery';
import PowerSelectMultiple from 'ember-power-select/components/power-select-multiple';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {tagName} from '@ember-decorators/component';

// TODO: convert from jQuery to native DOM
const END_ACTIONS = 'click.ghToken mouseup.ghToken touchend.ghToken';

// triggering focus on the search input within ESA's onfocus event breaks the
// drag-n-drop functionality in ember-drag-drop so we watch for events that
// could be the start of a drag and disable the default focus behaviour until
// we get another event signalling the end of a drag

@tagName('div')
class GhTokenInputSelectMultiple extends PowerSelectMultiple {
    _canFocus = true;

    willDestroyElement() {
        super.willDestroyElement(...arguments);

        if (this._allowFocusListener) {
            $(window).off(END_ACTIONS, this._allowFocusListener);
        }
    }

    // actions

    @action
    optionMouseDown(event) {
        if (event.which === 1 && !event.ctrlKey) {
            this._denyFocus(event);
        }
    }

    @action
    optionTouchStart(event) {
        this._denyFocus(event);
    }

    @action
    handleFocus() {
        if (this._canFocus) {
            super.handleFocus(...arguments);
        }
    }

    // internal

    _denyFocus() {
        if (this._canFocus) {
            this._canFocus = false;

            this._allowFocusListener = bind(this, this._allowFocus);

            $(window).on(END_ACTIONS, this._allowFocusListener);
        }
    }

    _allowFocus() {
        this._canFocus = true;

        $(window).off(END_ACTIONS, this._allowFocusListener);
        this._allowFocusListener = null;
    }
}

export default GhTokenInputSelectMultiple;
