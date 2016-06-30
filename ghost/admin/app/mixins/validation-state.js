import Mixin from 'ember-metal/mixin';
import computed from 'ember-computed';
import {isEmpty} from 'ember-utils';
import {A as emberA} from 'ember-array/utils';

export default Mixin.create({

    errors: null,
    property: '',
    hasValidated: emberA(),

    hasError: computed('errors.[]', 'property', 'hasValidated.[]', function () {
        let property = this.get('property');
        let errors = this.get('errors');
        let hasValidated = this.get('hasValidated');

        // if we aren't looking at a specific property we always want an error class
        if (!property && !isEmpty(errors)) {
            return true;
        }

        // If we haven't yet validated this field, there is no validation class needed
        if (!hasValidated || !hasValidated.contains(property)) {
            return false;
        }

        if (errors) {
            return errors.get(property);
        }

        return false;
    })

});
