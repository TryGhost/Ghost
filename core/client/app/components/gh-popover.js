import Ember from 'ember';
import GhostDropdown from 'ghost/components/gh-dropdown';

const {inject} = Ember;

export default GhostDropdown.extend({
    classNames: 'ghost-popover',
    dropdown: inject.service()
});
