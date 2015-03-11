import DropdownMixin from 'ghost/mixins/dropdown-mixin';

var DropdownButton = Ember.Component.extend(DropdownMixin, {
    tagName: 'button',
    attributeBindings: 'role',
    role: 'button',

    // matches with the dropdown this button toggles
    dropdownName: null,

    // Notify dropdown service this dropdown should be toggled
    click: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
    }
});

export default DropdownButton;
