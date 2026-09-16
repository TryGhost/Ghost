import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name'],

    name(model) {
        if (isBlank(model.name)) {
            model.errors.add('name', 'Please enter a name');
            model.hasValidated.pushObject('name');
            this.invalidate();
        }
    }
});