import Component from '@ember/component';
import layout from '../templates/components/koenig-card-markdown';
import {set} from '@ember/object';

export default Component.extend({
    tagName: '',
    layout,

    payload: null,
    saveCard: null,

    actions: {
        updateMarkdown(markdown) {
            let payload = this.get('payload');
            let save = this.get('saveCard');

            set(payload, 'markdown', markdown);

            // update the mobiledoc and stay in edit mode
            save(payload, false);
        }
    }
});
