const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');

describe('Site id middleware execution', function () {
    let request;

    describe('Using site-id middleware', function () {
        before(async function () {
            configUtils.set('hostSettings:siteId', '123123');

            // Ensure we do a forced start so that spy is in place when the server starts
            await testUtils.startGhost({forceStart: true});

            request = supertest.agent(configUtils.config.get('url'));
        });

        after(async function () {
            sinon.restore();

            configUtils.restore();

            await testUtils.stopGhost();
        });

        it('should allow requests with the correct site id header', function () {
            return request.get('/')
                .set('x-site-id', '123123')
                .expect(200);
        });

        it('should allow requests with numeric site id header', function () {
            return request.get('/')
                .set('x-site-id', 123123)
                .expect(200);
        });

        it('should prevent requests with incorrect numeric site id header', function () {
            return request.get('/')
                .set('x-site-id', 1231230)
                .expect(500);
        });

        it('should allow static asset requests with the correct site id header', function () {
            return request.get('/content/images/ghost.png')
                .set('x-site-id', '123123')
                .expect(404);
        });

        it('should reject static asset requests without a site id header', function () {
            return request.get('/content/images/ghost.png')
                .expect(500);
        });

        it('should reject requests with an incorrect site id header', function () {
            return request.get('/')
                .set('x-site-id', '456456')
                .expect(500);
        });

        it('should reject requests without a site id header', function () {
            return request.get('/')
                .expect(500);
        });

        it('should reject requests with an empty site id header', function () {
            return request.get('/')
                .set('x-site-id', '')
                .expect(500);
        });

        it('should reject requests with a malformed site id header', function () {
            return request.get('/')
                .set('x-ghost-site-id', 'not-a-valid-id')
                .expect(500);
        });
    });

    describe('Not using site-id middleware', function () {
        before(async function () {
            configUtils.set('hostSettings:siteId', undefined);

            // Ensure we do a forced start so that spy is in place when the server starts
            await testUtils.startGhost({forceStart: true});

            request = supertest.agent(configUtils.config.get('url'));
        });

        after(async function () {
            sinon.restore();

            configUtils.restore();

            await testUtils.stopGhost();
        });

        it('should allow requests without a site id header', function () {
            return request.get('/')
                .expect(200);
        });

        it('should allow requests with a site id header', function () {
            return request.get('/')
                .set('x-site-id', '123123')
                .expect(200);
        });
    });
});
