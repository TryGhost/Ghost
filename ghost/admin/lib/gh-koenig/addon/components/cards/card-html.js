import Component from '@ember/component';
import counter from 'ghost-admin/utils/word-count';
import layout from '../../templates/components/card-html';
import {computed} from '@ember/object';
import {invokeAction} from 'ember-invoke-action';
import {observer} from '@ember/object';

export default Component.extend({
    layout,
    hasRendered: false,

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

    // TODO: remove observer
    // eslint-disable-next-line ghost/ember/no-observers
    save: observer('doSave', function () {
        let payload = this.get('payload');
        payload.wordcount = counter(payload.html);
        this.get('env').save(payload, false);
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
