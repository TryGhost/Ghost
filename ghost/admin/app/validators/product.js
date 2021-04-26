import BaseValidator from './base';
import validator from 'validator';

export default BaseValidator.create({
    properties: ['name'],

    name(model) {
        if (!validator.isLength(model.name || '', 0, 191)) {
            model.errors.add('name', 'Name cannot be longer than 191 characters.');
            this.invalidate();
        }
    }
});
