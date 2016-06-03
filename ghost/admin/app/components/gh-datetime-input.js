import Ember from 'ember';
import TextInputMixin from 'ghost-admin/mixins/text-input';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {formatDate} from 'ghost-admin/utils/date-formatting';
import {invokeAction} from 'ember-invoke-action';

const {
    Component,
    RSVP,
    inject: {service}
} = Ember;

export default Component.extend(TextInputMixin, {
    tagName: 'span',
    classNames: 'input-icon icon-calendar',

    datetime: boundOneWay('value'),
    inputClass: null,
    inputId: null,
    inputName: null,
    timeZone: service(),

    didReceiveAttrs() {
        let promises = {
            datetime: RSVP.resolve(this.get('datetime') || moment.utc()),
            offset: RSVP.resolve(this.get('timeZone.offset'))
        };

        if (!this.get('update')) {
            throw new Error(`You must provide an \`update\` action to \`{{${this.templateName}}}\`.`);
        }

        RSVP.hash(promises).then((hash) => {
            this.set('datetime', formatDate(hash.datetime || moment.utc(), hash.offset));
        });
    },

    focusOut() {
        let datetime = this.get('datetime');

        invokeAction(this, 'update', datetime);
    }
});
