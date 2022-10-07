import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'mobiledoc'],

    name(model) {
        let {name} = model;

        if (!validator.isLength(name || '', 0, 191)) {
            model.errors.add('name', 'Name cannot be longer than 191 characters');
            this.invalidate();
        }

        if (isBlank(name)) {
            model.errors.add('name', 'Name cannot be blank');
            this.invalidate();
        }

        model.hasValidated.addObject('name');
    },

    mobiledoc(model) {
        if (isBlank(model.mobiledoc)) {
            model.errors.add('mobiledoc', 'Content cannot be blank.');
            this.invalidate();
        }
        model.hasValidated.addObject('mobiledoc');
    }
});
