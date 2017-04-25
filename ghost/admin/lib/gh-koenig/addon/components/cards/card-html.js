import Component from 'ember-component';
import layout from '../../templates/components/card-html';
import computed from 'ember-computed';
import observer from 'ember-metal/observer';
import {invokeAction} from 'ember-invoke-action';
import counter from 'ghost-admin/utils/word-count';

export default Component.extend({
    layout,
    hasRendered: false,

    save: observer('doSave', function () {
        let payload = this.get('payload');
        payload.wordcount = counter(payload.html);
        this.get('env').save(payload, false);
    }),

    value: computed('payload', {
        get() {
            return this.get('payload').html || '';
        },
        set(_, value) {
            this.get('payload').html = value;
            this.get('env').save(this.get('payload'), false);
            return this.get('payload').html;
        }
    }),

    actions: {
        selectCard() {
            invokeAction(this, 'selectCard');
        }
    }
});

// non editor cards need to be vanilla javascript
export let html = {

};
