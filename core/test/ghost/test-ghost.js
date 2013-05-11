/*global require, module */
(function () {
    "use strict";

    var Ghost = require('../../ghost');

    module.exports = {
        'singleton': function (test) {
            var ghost1 = new Ghost(),
                ghost2 = new Ghost();

            test.equal(ghost1, ghost2);
            test.done();
        }
    };
}());