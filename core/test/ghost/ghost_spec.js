/*globals describe, beforeEach, it*/
var should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    Ghost = require('../../ghost');

describe("Ghost API", function () {

    it("is a singleton", function () {
        var logStub = sinon.stub(console, "log"),
            ghost1 = new Ghost(),
            ghost2 = new Ghost();

        should.strictEqual(ghost1, ghost2);
        logStub.restore();
    });

    it("uses init() to initialize", function (done) {
        var ghost = new Ghost(),
            fakeDataProvider = {
                init: function () {
                    return when.resolve();
                }
            },
            dataProviderInitSpy = sinon.spy(fakeDataProvider, "init"),
            oldDataProvider = ghost.dataProvider;

        ghost.dataProvider = fakeDataProvider;

        should.not.exist(ghost.settings());

        ghost.init().then(function () {

            should.exist(ghost.settings());

            dataProviderInitSpy.called.should.equal(true);

            ghost.dataProvider = oldDataProvider;

            done();
        }, done);

    });

    it("can register filters with specific priority", function () {
        var ghost = new Ghost(),
            filterName = 'test',
            filterPriority = 9,
            testFilterHandler = sinon.spy();

        ghost.registerFilter(filterName, filterPriority, testFilterHandler);

        should.exist(ghost.filterCallbacks[filterName]);
        should.exist(ghost.filterCallbacks[filterName][filterPriority]);

        ghost.filterCallbacks[filterName][filterPriority].should.include(testFilterHandler);
    });

    it("can register filters with default priority", function () {
        var ghost = new Ghost(),
            filterName = 'test',
            defaultPriority = 5,
            testFilterHandler = sinon.spy();

        ghost.registerFilter(filterName, testFilterHandler);

        should.exist(ghost.filterCallbacks[filterName]);
        should.exist(ghost.filterCallbacks[filterName][defaultPriority]);

        ghost.filterCallbacks[filterName][defaultPriority].should.include(testFilterHandler);
    });

    it("executes filters in priority order", function (done) {
        var ghost = new Ghost(),
            filterName = 'testpriority',
            testFilterHandler1 = sinon.spy(),
            testFilterHandler2 = sinon.spy(),
            testFilterHandler3 = sinon.spy();

        ghost.registerFilter(filterName, 0, testFilterHandler1);
        ghost.registerFilter(filterName, 2, testFilterHandler2);
        ghost.registerFilter(filterName, 9, testFilterHandler3);

        ghost.doFilter(filterName, null, function () {

            testFilterHandler1.calledBefore(testFilterHandler2).should.equal(true);
            testFilterHandler2.calledBefore(testFilterHandler3).should.equal(true);

            testFilterHandler3.called.should.equal(true);

            done();
        });
    });
});