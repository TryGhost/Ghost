import Ember from 'ember';

const {
    Mixin,
    computed,
    defineProperty
} = Ember;

export default Mixin.create({
    valuePath: '',
    validation: null,
    value: null,
    model: null,

    didReceiveAttrs() {
        this._super(...arguments);

        let valuePath = this.get('valuePath');

        defineProperty(this, 'validation', computed.reads(`model.validations.attrs.${valuePath}`));
        defineProperty(this, 'value', computed.alias(`model.${valuePath}`));
        defineProperty(this, 'didValidate', computed('model.hasValidated.[]', function () {
            return this.get('model.hasValidated').contains(valuePath);
        }));
    },

    concatenatedClasses: computed('classes', function () {
        let classes = [this.get('classes')];
        classes.push('gh-input');
        return classes.join(' ');
    }),

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
        update(value) {
            let valuePath = this.get('valuePath');

            this.get('model.hasValidated').removeObject(valuePath);
            this.invokeAction('update', value);
        },

        focusOut() {
            let valuePath = this.get('valuePath');
            this.get('model').validate({on: [valuePath]}).then(() => {
                this.get('model.hasValidated').pushObject(valuePath);
            });
        }
    }
});
