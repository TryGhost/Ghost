import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';

@classic
export default class GhDropdownButton extends Component {
    tagName = '';

    @service dropdown;

    role = 'button';
    type = 'button';
    isOpen = false;

    // matches with the dropdown this button toggles
    dropdownName = null;

    @computed('isOpen')
    get openClosedClass() {
        return this.isOpen ? 'open' : 'closed';
    }

    // Notify dropdown service this dropdown should be toggled
    @action
    handleClick(event) {
        this.dropdown.toggleDropdown(this.dropdownName, this);
        event.stopPropagation();
        event.preventDefault();
    }
}
