import Ember from 'ember';
import GhostDropdown from 'ghost/components/gh-dropdown';

export default GhostDropdown.extend({
    classNames: 'ghost-popover',
    dropdown: Ember.inject.service()
});
