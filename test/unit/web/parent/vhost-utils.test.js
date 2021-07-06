const should = require('should');
const configUtils = require('../../../utils/configUtils');

const vhostUtils = require('../../../../core/server/web/parent/vhost-utils');

describe('vhost utils', function () {
    beforeEach(function () {
        configUtils.set('url', 'http://ghost.blog');
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('exposes two methods', function () {
        Object.keys(vhostUtils).should.be.an.Array().with.lengthOf(2);
        vhostUtils.should.have.properties('getBackendHostArg', 'getFrontendHostArg');
    });

    // url = 'https://ghost.blog'
    describe('without separate admin url', function () {
        it('uses the default arg for both backend and frontend', function () {
            vhostUtils.getBackendHostArg().should.eql(/.*/);
            vhostUtils.getFrontendHostArg().should.eql(/.*/);
        });
    });

    // url       = 'https://ghost.blog'
    // admin.url = 'https://admin.ghost.blog'
    describe('with separate admin url', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://admin.ghost.blog');
        });

        it('should use admin url and inverse as args', function () {
            vhostUtils.getBackendHostArg().should.eql('admin.ghost.blog');
            vhostUtils.getFrontendHostArg().should.eql(/^(?!admin\.ghost\.blog).*/);
        });

        it('should have regex that excludes admin traffic on front-end', function () {
            const frontendRegex = vhostUtils.getFrontendHostArg();

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
            vhostUtils.getBackendHostArg().should.eql(/.*/);
            vhostUtils.getFrontendHostArg().should.eql(/.*/);
        });
    });
});
