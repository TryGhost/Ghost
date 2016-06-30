import injectService from 'ember-service/inject';
import GhostDropdown from 'ghost-admin/components/gh-dropdown';

export default GhostDropdown.extend({
    classNames: 'ghost-popover',
    dropdown: injectService()
});
