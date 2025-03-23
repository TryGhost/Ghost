const os = require('os');
const should = require('should');

const configUtils = require('../../../utils/configUtils');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
});

describe('getContentPath', function () {
    it('should return the correct path for type: public', function () {
        const publicPath = configUtils.config.getContentPath('public');

        // Path should be in the tmpdir
        const tmpdir = os.tmpdir();

        publicPath.startsWith(tmpdir).should.be.true();

        // Path should end with /public/
        publicPath.endsWith('/public/').should.be.true();

        // Path should include /ghost_
        publicPath.includes('/ghost_').should.be.true();

        // Path should contain a uuid at the correct location
        const publicPathParts = publicPath.split('/');
        const uuidPart = publicPathParts[publicPathParts.length - 3].replace('ghost_', '');

        UUID_REGEX.test(uuidPart).should.be.true();

        // Path should be memoized
        configUtils.config.getContentPath('public').should.eql(publicPath);
    });
});
