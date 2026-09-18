import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name'],

    name(model) {
        const name = model.name;
        const hasValidated = model.hasValidated;

        if (isBlank(name)) {
            model.errors.add('name', 'Please enter a benefit');
            this.invalidate();
        }

        hasValidated.addObject('name');
    }
});
