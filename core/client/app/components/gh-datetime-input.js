import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';
import boundOneWay from 'ghost/utils/bound-one-way';
import {formatDate} from 'ghost/utils/date-formatting';

const {Component} = Ember;

export default Component.extend(TextInputMixin, {
    tagName: 'span',
    classNames: 'input-icon icon-calendar',

    datetime: boundOneWay('value'),
    inputClass: null,
    inputId: null,
    inputName: null,

    didReceiveAttrs() {
        let datetime = this.get('datetime') || moment();

        if (!this.attrs.update) {
            throw new Error(`You must provide an \`update\` action to \`{{${this.templateName}}}\`.`);
        }

        this.set('datetime', formatDate(datetime));
    },

    focusOut() {
        let datetime = this.get('datetime');

        this.attrs.update(datetime);
    }
});
