import EmberPowerSelectMultipleTrigger from 'ember-power-select/components/power-select-multiple/trigger';
import {action, get} from '@ember/object';
import {assert} from '@ember/debug';
import {isBlank} from '@ember/utils';

export default class Trigger extends EmberPowerSelectMultipleTrigger {
    @action
    handleOptionMouseDown(event) {
        if (!event.target.closest('[data-selected-index]')) {
            let optionMouseDown = this.get('extra.optionMouseDown');
            if (optionMouseDown) {
                return optionMouseDown(event);
            }
        }

        return this.chooseOption(event);
    }

    @action
    handleOptionTouchStart(event) {
        let optionTouchStart = this.get('extra.optionTouchStart');
        if (optionTouchStart) {
            return optionTouchStart(event);
        }
    }

    @action
    reorderItems() {
        // ember-drag-drop's sortable-objects has two-way bindings and will
        // update EPS' selected value directly. We have to create a copy
        // after sorting in order to force the onchange action to be triggered
        let selectedCopy = this.select.selected.slice();
        this.select.actions.select(selectedCopy);
    }

    // copied directly from EPS, the default behaviour of stopping propagation
    // of keydown events prevents our shortcuts from being triggered
    @action
    handleKeydown(e) {
        if (this.onKeydown && this.onKeydown(e) === false) {
            e.stopPropagation();
            return false;
        }
        if (e.keyCode === 8) {
            e.stopPropagation();
            if (isBlank(e.target.value)) {
                let lastSelection = this.select.selected[this.select.selected.length - 1];
                if (lastSelection) {
                    this.select.actions.select(this.get('buildSelection')(lastSelection, this.select), e);
                    if (typeof lastSelection === 'string') {
                        this.select.actions.search(lastSelection);
                    } else {
                        let searchField = this.get('searchField');
                        assert('`{{power-select-multiple}}` requires a `searchField` when the options are not strings to remove options using backspace', searchField);
                        this.select.actions.search(get(lastSelection, searchField));
                    }
                    this.select.actions.open(e);
                }
            }
        }
        // Disable the propagation cancellation so that our shortcuts still work
        // } else if (e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 32) { // Keys 0-9, a-z or SPACE
        //     e.stopPropagation();
        // }
    }
}
