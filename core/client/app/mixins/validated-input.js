import Ember from 'ember';

const {
    Mixin,
    computed,
    defineProperty
} = Ember;

export default Mixin.create({
    didValidate: false,

    valuePath: '',
    validation: null,
    value: null,
    model: null,

    didReceiveAttrs() {
        this._super(...arguments);

        let valuePath = this.get('valuePath');

        defineProperty(this, 'validation', computed.reads(`model.validations.attrs.${valuePath}`));
        defineProperty(this, 'value', computed.alias(`model.${valuePath}`));
    },

    notValidating: computed.not('validation.isValidating'),
    isValid: computed.and('validation.isValid', 'notValidating', 'didValidate'),
    isInvalid: computed.reads('validation.isInvalid'),
    hasError: computed.and('notValidating', 'showErrorMessage', 'validation'),
    showErrorMessage: computed.and('didValidate', 'isInvalid', 'notValidating'),

    state: computed('isValid', 'hasError', 'didValidate', function () {
        if (!this.get('didValidate')) {
            return '';
        }

        if (this.get('hasError')) {
            return 'error';
        }

        if (this.get('isValid')) {
            return 'success';
        }

        return '';
    }),

    actions: {
        focusOut() {
            let valuePath = this.get('valuePath');
            this.get('model.validations').validate({on: [valuePath]}).then(() => {
                this.set('didValidate', true);
            });
        }
    }
});
