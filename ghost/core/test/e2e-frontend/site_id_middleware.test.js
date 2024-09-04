const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');

describe('Site id middleware execution', function () {
    let request;

    before(async function () {
        configUtils.set('hostSettings:siteId', '123123');
        configUtils.set('hostSettings:validateSiteId', true);

        // Ensure we do a forced start so that spy is in place when the server starts
        await testUtils.startGhost({forceStart: true});

        request = supertest.agent(configUtils.config.get('url'));
    });

    after(async function () {
        sinon.restore();

        configUtils.restore();

        await testUtils.stopGhost();
    });

    describe('Using site-id middleware', function () {
        it('should allow requests with the correct site id header', function () {
            return request.get('/')
                .set('x-site-id', '123123')
                .expect(200);
        });

        it('should allow API requests with the correct site id header', function () {
            return request.get('/ghost/api/v4/content/posts/')
                .set('x-site-id', '123123')
                // NOTE: This is a 403 because we aren't supplying an API key
                .expect(403);
        });

        it('should reject API requests without a site id header', function () {
            return request.get('/ghost/api/v4/content/posts/')
                .expect(500);
        });

        it('should allow static asset requests with the correct site id header', function () {
            return request.get('/content/images/ghost.png')
                .set('x-site-id', '123123')
                .expect(404);
        });

        it('should reject static asset requests without a site id header', function () {
            return request.get('/assets/img/ghost-logo.svg')
                .expect(500);
        });

        it('should allow admin requests with the correct site id header', function () {
            return request.get('/ghost/')
                .set('x-site-id', '123123')
                .expect(200);
        });

        it('should reject admin requests without a site id header', function () {
            return request.get('/ghost/')
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
});
