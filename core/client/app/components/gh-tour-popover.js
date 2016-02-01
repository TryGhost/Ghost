import Ember from 'ember';
import GhostDropdown from 'ghost/components/gh-dropdown';

const {
    inject: {service}
} = Ember;

export default GhostDropdown.extend({
    classNames: ['popover', 'tour'],
    dropdown: service()
});
