import $ from 'jquery';
import classic from 'ember-classic-decorator';
// This is used by the dropdown initializer to manage closing & toggling
import BodyEventListener from 'ghost-admin/mixins/body-event-listener';
import Evented from '@ember/object/evented';
import Service from '@ember/service';
import {action} from '@ember/object';

@classic
export default class DropdownService extends Service.extend(Evented, BodyEventListener) {
    bodyClick(event) {
        let dropdownSelector = '.ember-basic-dropdown-trigger, .ember-basic-dropdown-content';

        if ($(event.target).closest(dropdownSelector).length <= 0) {
            this.closeDropdowns();
        }
    }

    @action
    closeDropdowns() {
        this.trigger('close');
    }

    @action
    toggleDropdown(dropdownName, dropdownButton, options = {}) {
        this.trigger('toggle', {target: dropdownName, button: dropdownButton, ...options});
    }
}
