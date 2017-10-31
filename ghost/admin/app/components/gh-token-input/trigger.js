import EmberPowerSelectMultipleTrigger from 'ember-power-select/components/power-select-multiple/trigger';
import {copy} from '@ember/object/internals';

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
        }
    }
});
