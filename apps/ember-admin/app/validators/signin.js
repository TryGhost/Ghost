import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['identification', 'signin', 'forgotPassword'],
    invalidMessage: 'Email address is not valid',

    identification(model) {
        let id = model.identification;

        if (!isBlank(id) && !validator.isEmail(id)) {
            model.errors.add('identification', this.invalidMessage);
            this.invalidate();
        }
    },

    signin(model) {
        let id = model.identification;
        let password = model.password;

        model.errors.clear();

        if (isBlank(id)) {
            model.errors.add('identification', 'Please enter an email');
            this.invalidate();
        }

        if (!isBlank(id) && !validator.isEmail(id)) {
            model.errors.add('identification', this.invalidMessage);
            this.invalidate();
        }

        if (isBlank(password)) {
            model.errors.add('password', 'Please enter a password');
            this.invalidate();
        }
    },

    forgotPassword(model) {
        let id = model.identification;

        model.errors.clear();

        if (isBlank(id) || !validator.isEmail(id)) {
            model.errors.add('identification', this.invalidMessage);
            this.invalidate();
        }
    }
});
