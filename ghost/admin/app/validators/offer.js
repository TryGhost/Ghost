import BaseValidator from './base';
import validator from 'validator';

export default BaseValidator.create({
    properties: ['name', 'amount', 'displayTitle', 'displayDescription', 'code', 'durationInMonths'],

    name(model) {
        if (!model.name) {
            model.errors.add('name', 'Please enter a name.');
            this.invalidate();
        }
        if (!validator.isLength(model.name || '', 0, 40)) {
            model.errors.add('name', 'Name cannot be longer than 40 characters.');
            this.invalidate();
        }
    },

    amount(model) {
        if (!model.amount) {
            model.errors.add('amount', 'Please enter the amount.');
            this.invalidate();
        }
    },

    displayDescription(model) {
        if (!validator.isLength(model.displayDescription || '', 0, 191)) {
            model.errors.add('displayDescription', 'Display description cannot be longer than 191 characters.');
            this.invalidate();
        }
    },

    durationInMonths(model) {
        if (model.duration === 'repeating' && !model.durationInMonths) {
            model.errors.add('durationInMonths', 'Please enter the duration in months.');
            this.invalidate();
        }
    },

    code(model) {
        if (!model.code) {
            model.errors.add('code', 'Please enter an offer code.');
            this.invalidate();
        }
    }
});
