const assert = require('node:assert/strict');
const configUtils = require('../../../utils/config-utils');

describe('vhost utils', function () {
    beforeEach(function () {
        configUtils.set('url', 'http://ghost.blog');
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    // url = 'https://ghost.blog'
    describe('without separate admin url', function () {
        it('uses the default arg for both backend and frontend', function () {
            assert.deepEqual(configUtils.config.getBackendMountPath(), /.*/);
            assert.deepEqual(configUtils.config.getFrontendMountPath(), /.*/);
        });
    });

    // url       = 'https://ghost.blog'
    // admin.url = 'https://admin.ghost.blog'
    describe('with separate admin url', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://admin.ghost.blog');
        });

        it('should use admin url and inverse as args', function () {
            assert.equal(configUtils.config.getBackendMountPath(), 'admin.ghost.blog');
            assert.deepEqual(configUtils.config.getFrontendMountPath(), /^(?!admin\.ghost\.blog).*/);
        });

        it('should have regex that excludes admin traffic on front-end', function () {
            const frontendRegex = configUtils.config.getFrontendMountPath();

            assert.equal(frontendRegex.test('localhost'), true);
            assert.equal(frontendRegex.test('ghost.blog'), true);
            assert.equal(frontendRegex.test('admin.ghost.blog'), false);
        });
    });

    // url       = 'http://ghost.blog'
    // admin.url = 'https://ghost.blog'
    describe('with separate admin protocol', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://ghost.blog');
        });

        it('should mount and assign correct routes', function () {
            assert.deepEqual(configUtils.config.getBackendMountPath(), /.*/);
            assert.deepEqual(configUtils.config.getFrontendMountPath(), /.*/);
        });
    });
});
