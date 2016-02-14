/*globals describe, afterEach, it*/
var should  = require('should'),
    sinon   = require('sinon'),
    Promise = require('bluebird'),

// Stuff we are testing
    pipeline = require('../../server/utils/pipeline'),

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

// These tests are based on the tests in https://github.com/cujojs/when/blob/3.7.4/test/pipeline-test.js
function createTask(y) {
    return function (x) {
        return x + y;
    };
}

describe('Pipeline', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should execute tasks in order', function (done) {
        return pipeline([createTask('b'), createTask('c'), createTask('d')], 'a').then(
            function (result) {
                result.should.eql('abcd');
                done();
            }
        );
    });

    it('should resolve to initial args when no tasks supplied', function (done) {
        return pipeline([], 'a', 'b').then(
            function (result) {
                result.should.eql(['a', 'b']);
                done();
            }
        );
    });

    it('should resolve to empty array when no tasks and no args supplied', function (done) {
        return pipeline([]).then(
            function (result) {
                result.should.eql([]);
                done();
            }
        );
    });

    it('should pass args to initial task', function (done) {
        var expected = [1, 2, 3],
            tasks = [sandbox.spy()];

        return pipeline(tasks, 1, 2, 3).then(
            function () {
                tasks[0].calledOnce.should.be.true();
                tasks[0].firstCall.args.should.eql(expected);

                done();
            }
        );
    });

    it('should allow initial args to be promises', function (done) {
        var expected = [1, 2, 3],
            tasks = [sandbox.spy()],
            Resolver = Promise.resolve;

        return pipeline(tasks, new Resolver(1), new Resolver(2), new Resolver(3)).then(
            function () {
                tasks[0].calledOnce.should.be.true();
                tasks[0].firstCall.args.should.eql(expected);

                done();
            }
        );
    });

    it('should allow tasks to be promises', function (done) {
        var expected = [1, 2, 3],
            tasks = [
                sandbox.stub().returns(new Promise.resolve(4)),
                sandbox.stub().returns(new Promise.resolve(5)),
                sandbox.stub().returns(new Promise.resolve(6))
            ];

        return pipeline(tasks, 1, 2, 3).then(
            function (result) {
                result.should.eql(6);
                tasks[0].calledOnce.should.be.true();
                tasks[0].firstCall.args.should.eql(expected);
                tasks[1].calledOnce.should.be.true();
                tasks[1].firstCall.calledWith(4).should.be.true();
                tasks[2].calledOnce.should.be.true();
                tasks[2].firstCall.calledWith(5).should.be.true();

                done();
            }
        );
    });

    it('should allow tasks and args to be promises', function (done) {
        var expected = [1, 2, 3],
            tasks = [
                sandbox.stub().returns(new Promise.resolve(4)),
                sandbox.stub().returns(new Promise.resolve(5)),
                sandbox.stub().returns(new Promise.resolve(6))
            ],
            Resolver = Promise.resolve;

        return pipeline(tasks, new Resolver(1), new Resolver(2), new Resolver(3)).then(
            function (result) {
                result.should.eql(6);
                tasks[0].calledOnce.should.be.true();
                tasks[0].firstCall.args.should.eql(expected);
                tasks[1].calledOnce.should.be.true();
                tasks[1].firstCall.calledWith(4).should.be.true();
                tasks[2].calledOnce.should.be.true();
                tasks[2].firstCall.calledWith(5).should.be.true();

                done();
            }
        );
    });
});
