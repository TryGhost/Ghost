import Ember from 'ember';
import DropdownMixin from 'ghost/mixins/dropdown-mixin';

const {Component, inject} = Ember;

export default Component.extend(DropdownMixin, {
    tagName: 'button',
    attributeBindings: 'role',
    role: 'button',

    // matches with the dropdown this button toggles
    dropdownName: null,

    dropdown: inject.service(),

    // Notify dropdown service this dropdown should be toggled
    click(event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
    }
});
