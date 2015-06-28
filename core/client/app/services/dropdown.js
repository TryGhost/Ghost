import Ember from 'ember';
// This is used by the dropdown initializer (and subsequently popovers) to manage closing & toggling
import BodyEventListener from 'ghost/mixins/body-event-listener';

export default Ember.Service.extend(Ember.Evented, BodyEventListener, {
    bodyClick: function (event) {
        /*jshint unused:false */
        this.closeDropdowns();
    },

    closeDropdowns: function () {
        this.trigger('close');
    },

    toggleDropdown: function (dropdownName, dropdownButton) {
        this.trigger('toggle', {target: dropdownName, button: dropdownButton});
    }
});
