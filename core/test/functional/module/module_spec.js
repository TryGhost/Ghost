// # Module tests
// This tests using Ghost as an npm module
var should = require('should'),
    testUtils = require('../../utils'),
    ghost = testUtils.startGhost,
    core = require('../../../../core'),
    i18n = require('../../../../core/server/i18n');

i18n.init();

describe('Module', function () {
    before(testUtils.teardown);

    it.only('should expose configuration values', function () {
        should.exist(core.config);
        should.exist(core.config.get('server'));
        should.exist(core.config.get('paths'));
    });

    describe('Setup', function () {
        it('should resolve with a ghost-server instance', function (done) {
            ghost().then(function (ghostServer) {
                should.exist(ghostServer);

                done();
            }).catch(done);
        });

        it('should expose an express instance', function (done) {
            ghost().then(function (ghostServer) {
                should.exist(ghostServer);
                should.exist(ghostServer.rootApp);

                done();
            }).catch(done);
        });

        it('should expose configuration values', function (done) {
            ghost().then(function (ghostServer) {
                should.exist(ghostServer);
                should.exist(ghostServer.config);
                should.exist(ghostServer.config.get('server'));
                should.exist(ghostServer.config.get('paths'));
                done();
            }).catch(done);
        });

        it('should have start/stop/restart functions', function (done) {
            ghost().then(function (ghostServer) {
                should.exist(ghostServer);
                ghostServer.start.should.be.a.Function();
                ghostServer.restart.should.be.a.Function();
                ghostServer.stop.should.be.a.Function();

                done();
            }).catch(done);
        });
    });
});
