import injectService from 'ember-service/inject';
import DropdownButton from 'ghost-admin/components/gh-dropdown-button';

function K() {
    return this;
}

export default DropdownButton.extend({
    dropdown: injectService(),

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
