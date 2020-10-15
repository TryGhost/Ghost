import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['title', 'mobiledoc'],

    title(model) {
        if (isBlank(model.get('title'))) {
            model.errors.add('title', 'Title cannot be blank');
            this.invalidate();
        }
        model.get('hasValidated').addObject('title');
    },

    mobiledoc(model) {
        if (isBlank(model.get('mobiledoc'))) {
            model.errors.add('mobiledoc', 'Content cannot be blank.');
            this.invalidate();
        }
        model.get('hasValidated').addObject('mobiledoc');
    }
});
