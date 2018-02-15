import Component from '@ember/component';
import layout from '../templates/components/koenig-card-html';
import {set} from '@ember/object';

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,

    // closure actions
    saveCard: null,

    init() {
        this._super(...arguments);

        if (!this.get('payload.html')) {
            this.set('payload.html', '');
        }
    },

    actions: {
        updateHtml(html) {
            let payload = this.get('payload');
            let save = this.get('saveCard');

            set(payload, 'html', html);

            // update the mobiledoc and stay in edit mode
            save(payload, false);
        }
    }
});
