import Ember from 'ember';
// This is used by the dropdown initializer (and subsequently popovers) to manage closing & toggling
import BodyEventListener from 'ghost/mixins/body-event-listener';

const {Service, Evented} = Ember;

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
