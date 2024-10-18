/* eslint-disable no-regex-spaces */
const proxy = require('../../../../core/frontend/services/proxy');
const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');

// Stuff we are testing
const content_api_path = require('../../../../core/frontend/helpers/content_api_path');
const logging = require('@tryghost/logging');
    
describe('{{content_api_path}} helper', function () {
    let logWarnStub;

    beforeEach(function () {
        logWarnStub = sinon.stub(logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('without sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should output an absolute url', async function () {
            let result = await content_api_path();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output an absolute url when passed true', async function () {
            let result = await content_api_path(true);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output a relative url when passed false', async function () {
            let result = await content_api_path(false);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
    });
    describe('with a sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/blog'});
        });

        after(async function () {
            await configUtils.restore();
        });
    
        it('should output an absolute url', async function () {
            let result = await content_api_path();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output an absolute url when passed true', async function () {
            let result = await content_api_path(true);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output a relative url when passed false', async function () {
            let result = await content_api_path(false);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
    });
});

