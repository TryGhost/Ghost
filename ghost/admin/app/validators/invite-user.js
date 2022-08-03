import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email', 'role'],

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid Email.');
            this.invalidate();
        }
    },

    role(model) {
        let role = model.get('role');

        if (isBlank(role)) {
            model.get('errors').add('role', 'Please select a role.');
            model.get('hasValidated').pushObject('role');
            this.invalidate();
        }
    }
});
