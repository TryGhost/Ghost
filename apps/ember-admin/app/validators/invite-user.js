import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email', 'role'],

    email(model) {
        const email = model.email;

        if (isBlank(email)) {
            model.errors.add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.errors.add('email', 'Invalid Email.');
            this.invalidate();
        }
    },

    role(model) {
        const role = model.role;

        if (isBlank(role)) {
            model.errors.add('role', 'Please select a role.');
            model.hasValidated.pushObject('role');
            this.invalidate();
        }
    }
});
