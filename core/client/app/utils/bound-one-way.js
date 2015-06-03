import Ember from 'ember';
/**
 * Defines a property similarly to `Ember.computed.oneway`,
 * save that while a `oneway` loses its binding upon being set,
 * the `BoundOneWay` will continue to listen for upstream changes.
 *
 * This is an ideal tool for working with values inside of {{input}}
 * elements.
 * @param {*} upstream
 * @param {function} transform a function to transform the **upstream** value.
 */
var BoundOneWay = function (upstream, transform) {
    if (typeof transform !== 'function') {
        // default to the identity function
        transform = function (value) { return value; };
    }

    return Ember.computed(upstream, {
        get: function () {
            return transform(this.get(upstream));
        },
        set: function (key, value) {
            return value;
        }
    });
};

export default BoundOneWay;
