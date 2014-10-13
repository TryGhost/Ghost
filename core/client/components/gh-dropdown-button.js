import DropdownMixin from 'ghost/mixins/dropdown-mixin';

var DropdownButton = Ember.Component.extend(DropdownMixin, {
    tagName: 'button',
    /*matches with the dropdown this button toggles*/
    dropdownName: null,
    /*Notify dropdown service this dropdown should be toggled*/

    openOnHover: false,

    click: function (event) {
        this._super(event);
        this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
    },
    mouseEnter: function(event){
        this._super(event);
        if (this.openOnHover) {
            this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
        }
    },
    mouseLeave: function(event){
        this._super(event);
        if (this.openOnHover) {
            this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
        }
    }
});

export default DropdownButton;