import Service from 'ember-service';
import Evented from 'ember-evented';
// This is used by the dropdown initializer (and subsequently popovers) to manage closing & toggling
import BodyEventListener from 'ghost-admin/mixins/body-event-listener';

export default Service.extend(Evented, BodyEventListener, {
    bodyClick(event) {
        /*jshint unused:false */
        this.closeDropdowns();
    },

    closeDropdowns() {
        this.trigger('close');
    },

    toggleDropdown(dropdownName, dropdownButton) {
        this.trigger('toggle', {target: dropdownName, button: dropdownButton});
    }
});
