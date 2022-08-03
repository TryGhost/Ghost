import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'email', 'note'],

    name(model) {
        if (!validator.isLength(model.name || '', 0, 191)) {
            model.errors.add('name', 'Name cannot be longer than 191 characters.');
            this.invalidate();
        }
    },

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.errors.add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.errors.add('email', 'Invalid Email.');
            this.invalidate();
        }
        if (!validator.isLength(model.email || '', 0, 191)) {
            model.errors.add('email', 'Email cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.get('hasValidated').addObject('email');
    },

    note(model) {
        let note = model.get('note');

        if (!validator.isLength(note || '', 0, 500)) {
            model.errors.add('note', 'Note is too long.');
            this.invalidate();
        }

        model.get('hasValidated').addObject('note');
    }
});
