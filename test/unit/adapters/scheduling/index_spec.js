var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    postScheduling = require('../../../../core/server/adapters/scheduling/post-scheduling');

describe('Scheduling', function () {
    var scope = {};

    before(function () {
        sinon.stub(postScheduling, 'init').returns(Promise.resolve());
        scope.scheduling = rewire('../../../../core/server/adapters/scheduling');
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
