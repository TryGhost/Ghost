import BaseValidator from './base';
import PasswordValidatorMixin from './mixins/password';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.extend(PasswordValidatorMixin, {
    init() {
        this.properties = this.properties || ['name', 'email', 'password'];
        this._super(...arguments);
    },

    name(model) {
        let name = model.get('name');

        if (!validator.isLength(name || '', 1)) {
            model.get('errors').add('name', 'Please enter a name.');
            model.get('hasValidated').addObject('email');
            this.invalidate();
        }
    },

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid Email.');
            this.invalidate();
        }

        model.get('hasValidated').addObject('email');
    },

    password(model) {
        this.passwordValidation(model);
    }
});
