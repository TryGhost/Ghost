import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['title'],

    name(model) {
        let title = model.title;
        let hasValidated = model.hasValidated;

        if (isBlank(title)) {
            model.errors.add('title', 'Please enter a title.');
            this.invalidate();
        }

        hasValidated.addObject('title');
    }
});
