import Ember from 'ember';

const {Component, computed, isEmpty} = Ember;

/**
 * Renders one random error message when passed a DS.Errors object
 * and a property name. The message will be one of the ones associated with
 * that specific property. If there are no errors associated with the property,
 * nothing will be rendered.
 * @param  {DS.Errors} errors   The DS.Errors object
 * @param  {string} property    The property name
 */
export default Component.extend({
    tagName: 'p',
    classNames: ['response'],

    errors: null,
    property: '',

    isVisible: computed.notEmpty('errors'),

    message: computed('errors.[]', 'property', function () {
        let property = this.get('property');
        let errors = this.get('errors');
        let messages = [];
        let index;

        if (!isEmpty(errors) && errors.get(property)) {
            errors.get(property).forEach((error) => {
                messages.push(error);
            });
            index = Math.floor(Math.random() * messages.length);
            return messages[index].message;
        }
    })
});
