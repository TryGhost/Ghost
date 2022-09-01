import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';
import {inject as service} from '@ember/service';

class GhBasicDropdown extends BasicDropdown {
    @service dropdown;

    constructor() {
        super(...arguments);
        this.dropdown.on('close', this, this.close);
    }

    willDestroy() {
        this.dropdown.off('close', this, this.close);
    }
}

export default GhBasicDropdown;
