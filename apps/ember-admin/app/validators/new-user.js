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
        const name = model.name;

        if (!validator.isLength(name || '', {min: 1})) {
            model.errors.add('name', 'Enter a name.');
            model.hasValidated.addObject('email');
            this.invalidate();
        }
    },

    email(model) {
        const email = model.email;

        if (isBlank(email)) {
            model.errors.add('email', 'Enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.errors.add('email', 'Invalid Email.');
            this.invalidate();
        }

        model.hasValidated.addObject('email');
    },

    password(model) {
        this.passwordValidation(model);
    }
});
