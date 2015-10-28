import Ember from 'ember';
import ValidationStateMixin from 'ghost/mixins/validation-state';

const {Component, computed} = Ember;

/**
 * Handles the CSS necessary to show a specific property state. When passed a
 * DS.Errors object and a property name, if the DS.Errors object has errors for
 * the specified property, it will change the CSS to reflect the error state
 * @param  {DS.Errors} errors   The DS.Errors object
 * @param  {string} property    Name of the property
 */
export default Component.extend(ValidationStateMixin, {
    classNameBindings: ['errorClass'],

    errorClass: computed('property', 'hasError', 'hasValidated.[]', function () {
        let hasValidated = this.get('hasValidated');
        let property = this.get('property');

        if (hasValidated && hasValidated.contains(property)) {
            return this.get('hasError') ? 'error' : 'success';
        } else {
            return '';
        }
    })
});
