/*global require, module */
(function () {
    "use strict";

    var DataProvider = require('../../shared/models/dataProvider.json');

    module.exports = {
        'singleton': function (test) {
            var provider1 = new DataProvider(),
                provider2 = new DataProvider();

            test.equal(provider1, provider2);
            test.done();
        }
    };
}());