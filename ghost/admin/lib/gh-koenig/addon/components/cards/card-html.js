import Component from 'ember-component';
import layout from '../../templates/components/card-html';
import computed from 'ember-computed';
import observer from 'ember-metal/observer';
import {invokeAction} from 'ember-invoke-action';

export default Component.extend({
    layout,
    hasRendered: false,
    save: observer('doSave', function () {
        this.get('env').save(this.get('payload'), false);
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

    init() {
        this._super(...arguments);
        let payload = this.get('payload');
        this.isEditing = !payload.hasOwnProperty('html');
        this.isEditing = true;
    },
    actions: {
        selectCard() {
            invokeAction(this, 'selectCard');
        }
    }
});

// non editor cards need to be vanilla javascript
export let html = {

};
