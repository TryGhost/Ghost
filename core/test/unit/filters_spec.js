/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should  = require('should'),
    sinon   = require('sinon'),
    Promise = require('bluebird'),
    _       = require('lodash'),

    // Stuff we are testing
    Filters = require('../../server/filters').Filters;

describe('Filters', function () {
    var filters, sandbox;

    beforeEach(function () {
        filters = new Filters();
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        filters = null;
        sandbox.restore();
    });

    it('can register filters with specific priority', function () {
        var filterName = 'test',
            filterPriority = 9,
            testFilterHandler = sandbox.spy();

        filters.registerFilter(filterName, filterPriority, testFilterHandler);

        should.exist(filters.filterCallbacks[filterName]);
        should.exist(filters.filterCallbacks[filterName][filterPriority]);

        filters.filterCallbacks[filterName][filterPriority].should.containEql(testFilterHandler);
    });

    it('can register filters with default priority', function () {
        var filterName = 'test',
            defaultPriority = 5,
            testFilterHandler = sandbox.spy();

        filters.registerFilter(filterName, testFilterHandler);

        should.exist(filters.filterCallbacks[filterName]);
        should.exist(filters.filterCallbacks[filterName][defaultPriority]);

        filters.filterCallbacks[filterName][defaultPriority].should.containEql(testFilterHandler);
    });

    it('can register filters with priority null with default priority', function () {
        var filterName = 'test',
            defaultPriority = 5,
            testFilterHandler = sandbox.spy();

        filters.registerFilter(filterName, null, testFilterHandler);

        should.exist(filters.filterCallbacks[filterName]);
        should.exist(filters.filterCallbacks[filterName][defaultPriority]);

        filters.filterCallbacks[filterName][defaultPriority].should.containEql(testFilterHandler);
    });

    it('executes filters in priority order', function (done) {
        var filterName = 'testpriority',
            testFilterHandler1 = sandbox.spy(),
            testFilterHandler2 = sandbox.spy(),
            testFilterHandler3 = sandbox.spy();

        filters.registerFilter(filterName, 0, testFilterHandler1);
        filters.registerFilter(filterName, 2, testFilterHandler2);
        filters.registerFilter(filterName, 9, testFilterHandler3);

        filters.doFilter(filterName, null).then(function () {
            testFilterHandler1.calledBefore(testFilterHandler2).should.equal(true);
            testFilterHandler2.calledBefore(testFilterHandler3).should.equal(true);

            testFilterHandler3.called.should.equal(true);

            done();
        });
    });

    it('executes filters that return a promise', function (done) {
        var filterName = 'testprioritypromise',
            testFilterHandler1 = sinon.spy(function (args) {
                return new Promise(function (resolve) {
                    process.nextTick(function () {
                        args.filter1 = true;

                        resolve(args);
                    });
                });
            }),
            testFilterHandler2 = sinon.spy(function (args) {
                args.filter2 = true;

                return args;
            }),
            testFilterHandler3 = sinon.spy(function (args) {
                return new Promise(function (resolve) {
                    process.nextTick(function () {
                        args.filter3 = true;

                        resolve(args);
                    });
                });
            });

        filters.registerFilter(filterName, 0, testFilterHandler1);
        filters.registerFilter(filterName, 2, testFilterHandler2);
        filters.registerFilter(filterName, 9, testFilterHandler3);

        filters.doFilter(filterName, {test: true}).then(function (newArgs) {
            testFilterHandler1.calledBefore(testFilterHandler2).should.equal(true);
            testFilterHandler2.calledBefore(testFilterHandler3).should.equal(true);

            testFilterHandler3.called.should.equal(true);

            newArgs.filter1.should.equal(true);
            newArgs.filter2.should.equal(true);
            newArgs.filter3.should.equal(true);

            done();
        }).catch(done);
    });

    it('executes filters with a context', function (done) {
        var filterName = 'textContext',
            testFilterHandler1 = sinon.spy(function (args, context) {
                args.context1 = _.isObject(context);
                return args;
            }),
            testFilterHandler2 = sinon.spy(function (args, context) {
                args.context2 = _.isObject(context);
                return args;
            });

        filters.registerFilter(filterName, 0, testFilterHandler1);
        filters.registerFilter(filterName, 1, testFilterHandler2);

        filters.doFilter(filterName, {test: true}, {context: true}).then(function (newArgs) {
            newArgs.context1.should.equal(true);
            newArgs.context2.should.equal(true);
            done();
        }).catch(done);
    });
});
