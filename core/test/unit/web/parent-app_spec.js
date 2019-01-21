var should = require('should'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire');

describe('parent app', function () {
    let expressStub;
    let use;
    let apiSpy;
    let parentApp;
    let adminSpy;
    let siteSpy;

    beforeEach(function () {
        use = sinon.spy();
        expressStub = () => ({
            use,
            enable: () => {}
        });

        apiSpy = sinon.spy();
        adminSpy = sinon.spy();
        siteSpy = sinon.spy();

        parentApp = proxyquire('../../../server/web/parent-app', {
            express: expressStub,
            './api': apiSpy,
            './admin': adminSpy,
            './site': siteSpy
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should mount 3 apps and assign correct routes to them', function () {
        parentApp();

        use.calledWith('/ghost/api').should.be.true();
        use.calledWith('/ghost').should.be.true();

        apiSpy.called.should.be.true();
        adminSpy.called.should.be.true();
        siteSpy.called.should.be.true();
    });
});
