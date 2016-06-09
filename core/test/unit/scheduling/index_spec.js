
var sinon = require('sinon'),
    rewire = require('rewire'),
    /*jshint unused:false*/
    should = require('should'),
    Promise = require('bluebird'),
    config = require(__dirname + '/../../../server/config'),
    postScheduling = require(__dirname + '/../../../server/scheduling/post-scheduling');

describe('Scheduling', function () {
    var scope = {};

    before(function () {
        sinon.stub(postScheduling, 'init').returns(Promise.resolve());
        scope.scheduling = rewire(config.paths.corePath + '/server/scheduling');
    });

    after(function () {
        postScheduling.init.restore();
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
