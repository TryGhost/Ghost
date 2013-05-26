/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var should = require('should'),
        Ghost = require('../../ghost');

    describe("Ghost API", function () {

        it("is a singleton", function() {
            var ghost1 = new Ghost(),
                ghost2 = new Ghost();

            should.strictEqual(ghost1, ghost2);
        });

    });

}());