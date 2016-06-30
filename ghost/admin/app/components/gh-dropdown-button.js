import Component from 'ember-component';
import injectService from 'ember-service/inject';
import DropdownMixin from 'ghost-admin/mixins/dropdown-mixin';

export default Component.extend(DropdownMixin, {
    tagName: 'button',
    attributeBindings: 'role',
    role: 'button',

    // matches with the dropdown this button toggles
    dropdownName: null,

    dropdown: injectService(),

    // Notify dropdown service this dropdown should be toggled
    click(event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
    }
});
