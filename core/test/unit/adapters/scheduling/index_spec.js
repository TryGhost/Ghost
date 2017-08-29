var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    config = require(__dirname + '/../../../../server/config'),
    postScheduling = require(__dirname + '/../../../../server/adapters/scheduling/post-scheduling'),
    subscribersScheduling = require(__dirname + '/../../../../server/adapters/scheduling/subscribers-scheduling'),

    sandbox = sinon.sandbox.create();

describe('Scheduling', function () {
    var scope = {};

    before(function () {
        sandbox.stub(postScheduling, 'init').returns(Promise.resolve());
        sandbox.stub(subscribersScheduling, 'init').returns(Promise.resolve());
        scope.scheduling = rewire(config.get('paths').corePath + '/server/adapters/scheduling');
    });

    after(function () {
        sandbox.restore();
    });

    describe('success', function () {
        it('ensure post scheduling init is called', function (done) {
            scope.scheduling.init({
                postScheduling: {}
            }).then(function () {
                postScheduling.init.calledOnce.should.eql(true);
                done();
            }).catch(done);
        });
    });
});
