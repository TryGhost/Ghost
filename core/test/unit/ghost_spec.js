/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    path = require('path'),
    _ = require('underscore'),

    // Stuff we are testing
    config = require('../../server/config'),
    Ghost  = require('../../ghost');

describe("Ghost API", function () {
    var sandbox,
        ghost;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        sandbox = sinon.sandbox.create();

        testUtils.initData().then(function () {
            ghost = new Ghost();
            done();
        }, done);
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it("is a singleton", function () {
        var ghost2 = new Ghost();

        should.strictEqual(ghost, ghost2);
    });
});