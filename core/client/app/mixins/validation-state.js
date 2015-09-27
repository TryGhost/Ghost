import Ember from 'ember';

export default Ember.Mixin.create({

    errors: null,
    property: '',
    hasValidated: Ember.A(),

    hasError: Ember.computed('errors.[]', 'property', 'hasValidated.[]', function () {
        var property = this.get('property'),
            errors = this.get('errors'),
            hasValidated = this.get('hasValidated');

        // if we aren't looking at a specific property we always want an error class
        if (!property && !Ember.isEmpty(errors)) {
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
