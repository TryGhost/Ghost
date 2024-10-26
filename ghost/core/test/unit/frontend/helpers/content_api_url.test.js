/* eslint-disable no-regex-spaces */
const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');

// Stuff we are testing
const content_api_url = require('../../../../core/frontend/helpers/content_api_url');
const logging = require('@tryghost/logging');
    
describe('{{content_api_url}} helper', function () {
    let logWarnStub;

    beforeEach(function () {
        logWarnStub = sinon.stub(logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('without sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/', 'admin:url': 'https://admin.tld:65535'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should output an absolute url', async function () {
            let result = content_api_url();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('https://admin.tld:65535/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output an absolute url when passed true', async function () {
            let result = content_api_url(true);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('https://admin.tld:65535/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output a relative url when passed false', async function () {
            let result = content_api_url(false);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
    });
    describe('with a sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/blog', 'admin:url': 'https://admin.tld:65535/blog'});
        });

        after(async function () {
            await configUtils.restore();
        });
    
        it('should output an absolute url', async function () {
            let result = content_api_url();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('https://admin.tld:65535/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output an absolute url when passed true', async function () {
            let result = content_api_url(true);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('https://admin.tld:65535/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('should output a relative url when passed false', async function () {
            let result = content_api_url(false);
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
    });
    describe('uses the site url if no admin:url is set', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('gives the site url without a subdirectory', async function () {
            let result = content_api_url();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
        it('gives the site url with a subdirectory', async function () {
            configUtils.set({url: 'http://localhost:65535/blog', 'admin:url': undefined});
            let result = content_api_url();
            const rendered = new String(result);
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/blog/ghost/api/content/');
            logWarnStub.called.should.be.false();
        });
    });
});

