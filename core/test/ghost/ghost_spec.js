/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var should = require('should'),
        when = require('when'),
        sinon = require('sinon'),
        Ghost = require('../../ghost');

    describe("Ghost API", function () {

        it("is a singleton", function () {
            var ghost1 = new Ghost(),
                ghost2 = new Ghost();

            should.strictEqual(ghost1, ghost2);
        });

        it("uses init() to initialize", function (done) {
            var ghost = new Ghost(),
                fakeDataProvider = {
                    init: function() {
                        return when.resolve();
                    }
                },
                dataProviderInitSpy = sinon.spy(fakeDataProvider, "init");

            // Stub out the dataProvider
            sinon.stub(ghost, "dataProvider", function () {
                return fakeDataProvider;
            });

            should.not.exist(ghost.globals());

            ghost.init().then(function () {
                should.exist(ghost.globals());

                dataProviderInitSpy.called.should.equal(true);

                done();
            }, done);
        });

    });

}());