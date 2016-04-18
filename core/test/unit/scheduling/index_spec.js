/*globals describe, it, before, after*/

var sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    testUtils = require(__dirname + '/../../utils'),
    config = require(__dirname + '/../../../server/config');

describe('Scheduling', function () {
    var scope = {};

    before(function () {
        testUtils.mockNotExistingModule(/scheduling\/post-scheduling/, {
            init: sinon.sandbox.create().stub().returns(Promise.resolve())
        });

        scope.scheduling = rewire(config.paths.corePath + '/server/scheduling');
    });

    after(function () {
        testUtils.unmockNotExistingModule();
    });

    describe('success', function () {
        it('ensure post scheduling init is called', function (done) {
            scope.scheduling.init({
                postScheduling: {}
            }).then(function () {
                scope.scheduling.__get__('postScheduling').init.calledOnce.should.eql(true);
                done();
            }).catch(done);
        });
    });
});
