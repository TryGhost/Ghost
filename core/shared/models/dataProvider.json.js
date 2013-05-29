/**
 * Dummy dataProvider returns hardcoded JSON data until we finish migrating settings data to a datastore
 */

/*globals module, require */
(function () {
    "use strict";

    var _ = require('underscore'),
        when = require('when'),
        DataProvider,
        instance;

    DataProvider = function () {
        if (!instance) {
            instance = this;
            _.extend(instance, {
                data: [],
                findAll: function(callback) {
                    callback(null, instance.data);
                },
                save: function (globals) {
                    _.each(globals, function (global, key) {
                        instance.data[key] = global;
                    }, instance);

                    return when(globals);
                }
            });
        }
        return instance;
    };

    module.exports = DataProvider;
}());