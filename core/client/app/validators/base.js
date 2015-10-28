import Ember from 'ember';

/**
 * Base validator that all validators should extend
 * Handles checking of individual properties or the entire model
 */
export default Ember.Object.extend({
    properties: [],
    passed: false,

    /**
     * When passed a model and (optionally) a property name,
     * checks it against a list of validation functions
     * @param  {Ember.Object} model Model to validate
     * @param  {string} prop  Property name to check
     * @return {boolean}      True if the model passed all (or one) validation(s),
     *                        false if not
     */
    check(model, prop) {
        this.set('passed', true);

        if (prop && this[prop]) {
            this[prop](model);
        } else {
            this.get('properties').forEach((property) => {
                if (this[property]) {
                    this[property](model);
                }
            });
        }
        return this.get('passed');
    },

    invalidate() {
        this.set('passed', false);
    }
});
