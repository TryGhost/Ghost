import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';
import layout from 'ember-basic-dropdown/templates/components/basic-dropdown';
import {inject as service} from '@ember/service';

export default BasicDropdown.extend({
    dropdown: service(),

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
