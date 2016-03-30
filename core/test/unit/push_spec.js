/*globals describe, beforeEach, afterEach, it*/
var should = require('should'),
    sinon  = require('sinon'),

    push   = require('../../server/push');

describe('PuSH', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should do something...', function () {
        true.should.be.true();
    });
});
