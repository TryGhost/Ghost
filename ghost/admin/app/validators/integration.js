import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name'],

    name(model) {
        if (isBlank(model.name)) {
            model.errors.add('name', 'Please enter a name');
            model.hasValidated.pushObject('name');
            this.invalidate();
        } else if (!validator.isLength(model.name, 0, 191)) {
            model.errors.add('name', 'Name is too long, max 191 chars');
            model.hasValidated.pushObject('name');
            this.invalidate();
        }
    }
});
