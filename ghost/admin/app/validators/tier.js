import BaseValidator from './base';
import validator from 'validator';

export default BaseValidator.create({
    properties: ['name'],

    name(model) {
        if (!model.name) {
            model.errors.add('name', 'Please enter Name.');
            this.invalidate();
        }
        if (!validator.isLength(model.name || '', 0, 191)) {
            model.errors.add('name', 'Name cannot be longer than 191 characters.');
            this.invalidate();
        }
    }
});
