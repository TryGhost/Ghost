require('should');
const configUtils = require('../../../utils/configUtils');

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

    describe('getStaticUrlPrefix', function () {
        it('should return the correct static url prefix', function () {
            configUtils.config.getStaticUrlPrefix('images').should.eql('content/images');
            configUtils.config.getStaticUrlPrefix('media').should.eql('content/media');
            configUtils.config.getStaticUrlPrefix('files').should.eql('content/files');
        });

        it('should throw an error if the type is not valid', function () {
            (function () {
                configUtils.config.getStaticUrlPrefix('invalid');
            }).should.throw('getStaticUrlPrefix was called with: invalid');
        });
    });
});