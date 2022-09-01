import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email'],

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid email.');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        } else if (!validator.isLength(email, 0, 191)) {
            model.get('errors').add('email', 'Email is too long');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        }
    }
});
