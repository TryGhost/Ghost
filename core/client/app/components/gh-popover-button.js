import Ember from 'ember';
import DropdownButton from 'ghost/components/gh-dropdown-button';

var PopoverButton = DropdownButton.extend({
    click: Ember.K, // We don't want clicks on popovers, but dropdowns have them. So `K`ill them here.

    mouseEnter: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    },

    mouseLeave: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    }
});

export default PopoverButton;
