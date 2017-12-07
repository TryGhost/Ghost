import EmberPowerSelectMultipleTrigger from 'ember-power-select/components/power-select-multiple/trigger';
import {assert} from '@ember/debug';
import {copy} from '@ember/object/internals';
import {get} from '@ember/object';
import {isBlank} from '@ember/utils';

export default EmberPowerSelectMultipleTrigger.extend({

    actions: {
        handleOptionMouseDown(event) {
            let action = this.get('extra.optionMouseDown');
            if (action) {
                return action(event);
            }
        },

        handleOptionTouchStart(event) {
            let action = this.get('extra.optionTouchStart');
            if (action) {
                return action(event);
            }
        },

        reorderItems() {
            // ember-drag-drop's sortable-objects has two-way bindings and will
            // update EPS' selected value directly. We have to create a copy
            // after sorting in order to force the onchange action to be triggered
            this.get('select').actions.select(copy(this.get('select.selected')));
        },

        // copied directly from EPS, the default behaviour of stopping propagation
        // of keydown events prevents our shortcuts from being triggered
        onKeydown(e) {
            let {onKeydown, select} = this.getProperties('onKeydown', 'select');
            if (onKeydown && onKeydown(e) === false) {
                e.stopPropagation();
                return false;
            }
            if (e.keyCode === 8) {
                e.stopPropagation();
                if (isBlank(e.target.value)) {
                    let lastSelection = select.selected[select.selected.length - 1];
                    if (lastSelection) {
                        select.actions.select(this.get('buildSelection')(lastSelection, select), e);
                        if (typeof lastSelection === 'string') {
                            select.actions.search(lastSelection);
                        } else {
                            let searchField = this.get('searchField');
                            assert('`{{power-select-multiple}}` requires a `searchField` when the options are not strings to remove options using backspace', searchField);
                            select.actions.search(get(lastSelection, searchField));
                        }
                        select.actions.open(e);
                    }
                }
            }
            // Disable the propagation cancellation so that our shortcuts still work
            // } else if (e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 32) { // Keys 0-9, a-z or SPACE
            //     e.stopPropagation();
            // }
        }
    }
});
