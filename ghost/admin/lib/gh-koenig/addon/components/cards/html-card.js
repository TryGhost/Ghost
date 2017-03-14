import Component from 'ember-component';
import layout from '../../templates/components/html-card';
import computed from 'ember-computed';
import observer from 'ember-metal/observer';

export default Component.extend({
    layout,
    isEditing: true,

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

    didRender() {
    }
});

// non editor cards need to be vanilla javascript
export let html = {

};
