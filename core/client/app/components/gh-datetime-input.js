import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';
import boundOneWay from 'ghost/utils/bound-one-way';
import {formatDate} from 'ghost/utils/date-formatting';
import {invokeAction} from 'ember-invoke-action';

const {
    Component,
    RSVP
} = Ember;

export default Component.extend(TextInputMixin, {
    tagName: 'span',
    classNames: 'input-icon icon-calendar',

    datetime: boundOneWay('value'),
    inputClass: null,
    inputId: null,
    inputName: null,

    didReceiveAttrs() {
        let datetime = RSVP.resolve(this.get('datetime') || moment.utc());

        if (!this.get('update')) {
            throw new Error(`You must provide an \`update\` action to \`{{${this.templateName}}}\`.`);
        }

        datetime.then((date) => {
            this.set('datetime', formatDate(date));
        });
    },

    focusOut() {
        let datetime = this.get('datetime') || moment.utc();

        invokeAction(this, 'update', datetime);
    }
});
