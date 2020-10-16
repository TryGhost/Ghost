import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'mobiledoc'],

    name(model) {
        if (isBlank(model.get('name'))) {
            model.errors.add('name', 'Name cannot be blank');
            this.invalidate();
        }
        model.get('hasValidated').addObject('name');
    },

    mobiledoc(model) {
        if (isBlank(model.get('mobiledoc'))) {
            model.errors.add('mobiledoc', 'Content cannot be blank.');
            this.invalidate();
        }
        model.get('hasValidated').addObject('mobiledoc');
    }
});
