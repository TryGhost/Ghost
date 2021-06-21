import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['label'],

    label(model) {
        let label = model.get('label');
        let hasValidated = model.get('hasValidated');

        if (isBlank(label)) {
            model.get('errors').add('label', 'You must specify a label');
            this.invalidate();
        }

        hasValidated.addObject('label');
    }
});
