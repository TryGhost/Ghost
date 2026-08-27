import Component from '@ember/component';
import DropdownMixin from 'ghost-admin/mixins/dropdown-mixin';
import classic from 'ember-classic-decorator';
import {attributeBindings, tagName} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

@classic
@tagName('button')
@attributeBindings('href', 'role', 'type')
export default class GhDropdownButton extends Component.extend(DropdownMixin) {
    @service dropdown;

    role = 'button';

    // matches with the dropdown this button toggles
    dropdownName = null;

    @computed
    get type() {
        return this.tagName === 'button' ? 'button' : null;
    }

    // Notify dropdown service this dropdown should be toggled
    click() {
        super.click(...arguments);

        this.dropdown.toggleDropdown(this.dropdownName, this);

        if (this.tagName === 'a') {
            return false;
        }
    }
}
