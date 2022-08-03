import PowerSelectTrigger from 'ember-power-select/components/power-select/trigger';
import {inject as service} from '@ember/service';

export default class Trigger extends PowerSelectTrigger {
    @service dropdown;

    constructor() {
        super(...arguments);
        this.dropdown.on('close', this, this.closeFromDropdown);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.dropdown.off('close', this, this.closeFromDropdown);
    }

    closeFromDropdown() {
        this.args.select.actions.close();
    }
}
