var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    config = require(__dirname + '/../../../../server/config'),
    postScheduling = require(__dirname + '/../../../../server/adapters/scheduling/post-scheduling');

describe('Scheduling', function () {
    var scope = {};

    before(function () {
        sinon.stub(postScheduling, 'init').returns(Promise.resolve());
        scope.scheduling = rewire(config.get('paths').corePath + '/server/adapters/scheduling');
    });

    after(function () {
        sinon.restore();
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
