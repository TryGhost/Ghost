const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const configUtils = require('../../utils/configUtils');

describe('parent app', function () {
    let expressStub;
    let vhostSpy;
    let use;
    let apiSpy;
    let parentApp;
    let adminSpy;
    let wellKnownSpy;
    let siteSpy;
    let gatewaySpy;
    let authPagesSpy;

    beforeEach(function () {
        use = sinon.spy();
        expressStub = () => ({
            use,
            enable: () => {}
        });

        vhostSpy = sinon.spy();
        apiSpy = sinon.spy();
        adminSpy = sinon.spy();
        wellKnownSpy = sinon.spy();
        siteSpy = sinon.spy();
        gatewaySpy = sinon.spy();
        authPagesSpy = sinon.spy();

        parentApp = proxyquire('../../../server/web/parent-app', {
            express: expressStub,
            '@tryghost/vhost-middleware': vhostSpy,
            './api': apiSpy,
            './admin': adminSpy,
            './well-known': wellKnownSpy,
            './site': siteSpy,
            '../services/members': {
                gateway: gatewaySpy,
                authPages: authPagesSpy
            }
        });

        configUtils.set('url', 'http://ghost.blog');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    // url = 'https://ghost.blog'
    describe('without separate admin url', function () {
        it('should mount and assign correct routes', function () {
            parentApp();

            use.calledWith('/ghost/api').should.be.true();
            use.calledWith('/ghost/.well-known').should.be.true();
            use.calledWith('/ghost').should.be.true();
            use.calledWith('/content/images').should.be.false();

            apiSpy.called.should.be.true();
            wellKnownSpy.called.should.be.true();
            adminSpy.called.should.be.true();
            siteSpy.called.should.be.true();

            vhostSpy.calledTwice.should.be.true();
            vhostSpy.firstCall.calledWith(/.*/).should.be.true();
            vhostSpy.secondCall.calledWith(/.*/).should.be.true();
        });
    });

    // url       = 'https://ghost.blog'
    // admin.url = 'https://admin.ghost.blog'
    describe('with separate admin url', function () {
        beforeEach(function () {
            configUtils.set('admin:url', 'https://admin.ghost.blog');
        });

        it('should mount and assign correct routes', function () {
            parentApp();

            use.calledWith('/content/images').should.be.true();

            vhostSpy.calledTwice.should.be.true();
            vhostSpy.firstCall.calledWith('admin.ghost.blog').should.be.true();
            vhostSpy.secondCall.calledWith(/^(?!admin\.ghost\.blog).*/).should.be.true();
        });

        it('should have regex that excludes admin traffic on front-end', function () {
            parentApp();
            const frontendRegex = vhostSpy.secondCall.args[0];

            frontendRegex.test('localhost').should.be.true();
            frontendRegex.test('ghost.blog').should.be.true();
            frontendRegex.test('admin.ghost.blog').should.be.false();
        });
    });

    // url       = 'http://ghost.blog'
    // admin.url = 'https://ghost.blog'
    describe('with separate admin protocol', function () {
        it('should mount and assign correct routes', function () {
            configUtils.set('admin:url', 'https://ghost.blog');

            parentApp();

            vhostSpy.calledTwice.should.be.true();
            vhostSpy.firstCall.calledWith(/.*/).should.be.true();
            vhostSpy.secondCall.calledWith(/.*/).should.be.true();
        });
    });
});
