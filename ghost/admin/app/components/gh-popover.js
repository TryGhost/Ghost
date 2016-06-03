import Ember from 'ember';
import GhostDropdown from 'ghost-admin/components/gh-dropdown';

const {
    inject: {service}
} = Ember;

export default GhostDropdown.extend({
    classNames: 'ghost-popover',
    dropdown: service()
});
