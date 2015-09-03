import Ember from 'ember';
import DropdownButton from 'ghost/components/gh-dropdown-button';

export default DropdownButton.extend({
    dropdown: Ember.inject.service(),

    click: Ember.K,

    mouseEnter: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    },

    mouseLeave: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    }
});
