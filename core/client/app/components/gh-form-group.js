import Ember from 'ember';

/**
 * Handles the CSS necessary to show a specific property state. When passed a
 * DS.Errors object and a property name, if the DS.Errors object has errors for
 * the specified property, it will change the CSS to reflect the error state
 * @param  {DS.Errors} errors   The DS.Errors object
 * @param  {string} property    Name of the property
 */
export default Ember.Component.extend({
    classNames: 'form-group',
    classNameBindings: ['errorClass'],

    errors: null,
    property: '',

    errorClass: Ember.computed('errors.[]', 'property', function () {
        var property = this.get('property'),
            errors = this.get('errors');

        if (errors) {
            return errors.get(property) ? 'error' : 'success';
        }
    })
});
