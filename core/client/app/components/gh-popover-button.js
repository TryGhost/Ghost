import Ember from 'ember';
import DropdownButton from 'ghost/components/gh-dropdown-button';

const {
    inject: {service}
} = Ember;

function K() {
    return this;
}

export default DropdownButton.extend({
    dropdown: service(),

    click: K,

    mouseEnter() {
        this._super(...arguments);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    },

    mouseLeave() {
        this._super(...arguments);
        this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
    }
});
