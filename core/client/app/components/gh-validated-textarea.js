import Ember from 'ember';
import ValidatedInputMixin from 'ghost/mixins/validated-input';

const {
    Component,
    run
} = Ember;

export default Component.extend(ValidatedInputMixin, {
    classNames: 'form-group',
    classNameBindings: 'state',

    inputId: '',
    name: '',
    placeholder: '',
    label: '',
    helpText: '',
    disabled: false,

    didInsertElement() {
        this._super(...arguments);

        run.scheduleOnce('afterRender', () => {
            this.set('inputId', this.$('input').attr('id'));
        });
    }
});
