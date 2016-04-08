/*globals describe, beforeEach, afterEach, it*/
var should            = require('should'),
    sinon             = require('sinon'),

    pushHubController = require('../../../../server/controllers/frontend/push-hub'),
    sandbox           = sinon.sandbox.create();

describe('Controller: PuSH Hub', function () {
    var next;

    beforeEach(function () {
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should do something...', function () {

    });
});
