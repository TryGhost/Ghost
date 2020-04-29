const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const Promise = require('bluebird');
const postScheduling = require('../../../../core/server/adapters/scheduling/post-scheduling');

describe('Scheduling', function () {
    const scope = {};

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
