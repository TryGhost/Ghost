import BaseValidator from 'ember-cp-validations/validators/base';

export default BaseValidator.extend({
    validate(value, options, model, attribute) {
        return (model.get('invalidProperty') === attribute) ? false : true;
    }
});
