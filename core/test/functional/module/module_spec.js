// # Module tests
// This tests using Ghost as an npm module
var should = require('should'),
    testUtils = require('../../utils'),
    ghost = testUtils.startGhost,
    common = require('../../../server/lib/common');

common.i18n.init();

describe('Module', function () {
    describe('Setup', function () {
        it('expose ghost server', function () {
            return ghost()
                .then(function (ghostServer) {
                    should.exist(ghostServer);
                    should.exist(ghostServer.rootApp);
                    should.exist(ghostServer.config);
                    should.exist(ghostServer.config.get('server'));
                    should.exist(ghostServer.config.get('paths'));
                    ghostServer.start.should.be.a.Function();
                    ghostServer.restart.should.be.a.Function();
                    ghostServer.stop.should.be.a.Function();
                });
        });
    });
});
