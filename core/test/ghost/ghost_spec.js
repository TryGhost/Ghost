/*globals describe, beforeEach, it*/

(function () {
    "use strict";

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
                oldDataProvder = ghost.dataProvider;

            ghost.dataProvider = fakeDataProvider;

            should.not.exist(ghost.globals());

            ghost.init().then(function () {

                should.exist(ghost.globals());

                dataProviderInitSpy.called.should.equal(true);

                ghost.dataProvider = oldDataProvder;

                done();
            }).then(null, done);

        });

    });

}());