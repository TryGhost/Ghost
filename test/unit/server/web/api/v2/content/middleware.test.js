const should = require('should');
const middleware = require('../../../../../../../core/server/web/api/v2/content/middleware');

describe('Content Api v2 middleware', function () {
    it('exports an authenticatePublic middleware', function () {
        should.exist(middleware.authenticatePublic);
    });

    describe('authenticatePublic', function () {
        it('uses brute content api middleware as the first middleware in the chain', function () {
            const firstMiddleware = middleware.authenticatePublic[0];
            const brute = require('../../../../../../../core/server/web/shared/middleware/brute');

            should.equal(firstMiddleware, brute.contentApiKey);
        });
    });
});
