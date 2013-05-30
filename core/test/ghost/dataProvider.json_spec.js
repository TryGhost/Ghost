/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var should = require('should'),
        DataProvider = require('../../shared/models/dataProvider.json');

    describe("dataProvider.json", function () {

        it("is a singleton", function () {
            var provider1 = new DataProvider(),
                provider2 = new DataProvider();

            should.strictEqual(provider1, provider2);
        });

    });

}());