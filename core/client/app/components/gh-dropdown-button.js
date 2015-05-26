import Ember from 'ember';
import DropdownMixin from 'ghost/mixins/dropdown-mixin';

export default Ember.Component.extend(DropdownMixin, {
    tagName: 'button',
    attributeBindings: 'role',
    role: 'button',

    // matches with the dropdown this button toggles
    dropdownName: null,

    dropdown: Ember.inject.service(),

    // Notify dropdown service this dropdown should be toggled
    click: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
    }
});
