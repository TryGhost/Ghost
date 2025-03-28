import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email'],

    email(model) {
        let email = model.email;

        if (isBlank(email)) {
            model.errors.add('email', 'Please enter an email.');
            model.hasValidated.pushObject('email');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.errors.add('email', 'Invalid email.');
            model.hasValidated.pushObject('email');
            this.invalidate();
        } else if (!validator.isLength(email, 0, 191)) {
            model.errors.add('email', 'Email is too long');
            model.hasValidated.pushObject('email');
            this.invalidate();
        }
    }
});
