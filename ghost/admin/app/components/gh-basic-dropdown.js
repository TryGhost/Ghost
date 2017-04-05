import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';
import layout from 'ember-basic-dropdown/templates/components/basic-dropdown';
import injectService from 'ember-service/inject';

export default BasicDropdown.extend({
    dropdown: injectService(),

    layout,

    didInsertElement() {
        this._super(...arguments);
        this.get('dropdown').on('close', this, this.close);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.get('dropdown').off('close');
    }
});
