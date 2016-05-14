import Ember from 'ember';
import {InvokeActionMixin} from 'ember-invoke-action';
import ValidatedInputMixin from 'ghost/mixins/validated-input';

const {
    Component,
    run
} = Ember;

export default Component.extend(InvokeActionMixin, ValidatedInputMixin, {
    classNames: 'form-group',
    classNameBindings: 'state',

    inputId: '',
    type: 'text',
    name: '',
    placeholder: null,
    label: '',
    helpText: '',
    disabled: false,

    // other options
    readonly: null,
    size: null,
    maxlength: null,
    autocomplete: null,
    autofocus: null,
    novalidate: null,
    min: null,
    max: null,
    pattern: null,

    didInsertElement() {
        this._super(...arguments);

        run.scheduleOnce('afterRender', () => {
            this.set('inputId', this.$('input').attr('id'));
        });
    }
});
