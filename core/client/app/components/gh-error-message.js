import Ember from 'ember';

/**
 * Renders one random error message when passed a DS.Errors object
 * and a property name. The message will be one of the ones associated with
 * that specific property. If there are no errors associated with the property,
 * nothing will be rendered.
 * @param  {DS.Errors} errors   The DS.Errors object
 * @param  {string} property    The property name
 */
export default Ember.Component.extend({
    tagName: 'p',
    classNames: ['response'],

    errors: null,
    property: '',

    isVisible: Ember.computed.notEmpty('errors'),

    message: Ember.computed('errors.[]', 'property', function () {
        var property = this.get('property'),
            errors = this.get('errors'),
            messages = [],
            index;

        if (!Ember.isEmpty(errors) && errors.get(property)) {
            errors.get(property).forEach(function (error) {
                messages.push(error);
            });
            index = Math.floor(Math.random() * messages.length);
            return messages[index].message;
        }
    })
});
