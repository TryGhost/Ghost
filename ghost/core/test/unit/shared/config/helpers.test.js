const should = require('should');
const configUtils = require('../../../utils/configUtils');

describe('vhost utils', function () {
    beforeEach(function () {
        configUtils.set('url', 'http://ghost.blog');
    });

    afterEach(function () {
        configUtils.restore();
    });

    // url = 'https://ghost.blog'
    describe('without separate admin url', function () {
        it('uses the default arg for both backend and frontend', function () {
            configUtils.config.getBackendMountPath().should.eql(/.*/);
            configUtils.config.getFrontendMountPath().should.eql(/.*/);
        });
    });

    // url       = 'https://ghost.blog'
    // admin.url = 'https://admin.ghost.blog'
    describe('with separate admin url', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://admin.ghost.blog');
        });

        it('should use admin url and inverse as args', function () {
            configUtils.config.getBackendMountPath().should.eql('admin.ghost.blog');
            configUtils.config.getFrontendMountPath().should.eql(/^(?!admin\.ghost\.blog).*/);
        });

        it('should have regex that excludes admin traffic on front-end', function () {
            const frontendRegex = configUtils.config.getFrontendMountPath();

            frontendRegex.test('localhost').should.be.true();
            frontendRegex.test('ghost.blog').should.be.true();
            frontendRegex.test('admin.ghost.blog').should.be.false();
        });
    });

    // url       = 'http://ghost.blog'
    // admin.url = 'https://ghost.blog'
    describe('with separate admin protocol', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://ghost.blog');
        });

        it('should mount and assign correct routes', function () {
            configUtils.config.getBackendMountPath().should.eql(/.*/);
            configUtils.config.getFrontendMountPath().should.eql(/.*/);
        });
    });
});
