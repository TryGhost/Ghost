import EmberObject from '@ember/object';

/**
 * Base validator that all validators should extend
 * Handles checking of individual properties or the entire model
 */
export default EmberObject.extend({
    passed: false,

    init() {
        this._super(...arguments);
        this.properties = this.properties || [];
    },

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
            this.properties.forEach((property) => {
                if (this[property]) {
                    this[property](model);
                }
            });
        }
        return this.passed;
    },

    invalidate() {
        this.set('passed', false);
    }
});
