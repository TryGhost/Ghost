import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';
import templateLayout from 'ember-basic-dropdown/templates/components/basic-dropdown';
import {layout} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@layout(templateLayout)
class GhBasicDropdown extends BasicDropdown {
    @service dropdown

    onInit() {
        this.dropdown.on('close', this, this.close);
    }

    willDestroy() {
        this.dropdown.off('close', this, this.close);
        super.willDestroyElement(...arguments);
    }
}

export default GhBasicDropdown;
