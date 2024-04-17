const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const membersService = require('../../core/server/services/members');
describe('Middleware Execution', function () {
    let memberSessionSpy;
    let request;

    before(async function () {
        memberSessionSpy = sinon.spy(membersService.middleware, 'loadMemberSession');
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    afterEach(function () {
        memberSessionSpy.resetHistory();
    });

    after(function () {
        sinon.restore();
    });

    // Add your specific route tests here
    describe('loadMemberSession', function () {
        it('should call middleware on home route', async function () {
            await request.get('/');
            sinon.assert.calledOnce(memberSessionSpy);
        });

        it('should call middleware on post route', async function () {
            await request.get('/welcome/');
            sinon.assert.calledOnce(memberSessionSpy);
        });

        it('should not call middleware on sitemap route', async function () {
            await request.get('/sitemap.xml');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on sitemap-pages route', async function () {
            await request.get('/sitemap-pages.xml');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on sitemap-posts route', async function () {
            await request.get('/sitemap-posts.xml');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on sitemap-tags route', async function () {
            await request.get('/sitemap-tags.xml');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on sitemap-authors route', async function () {
            await request.get('/sitemap-authors.xml');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on recommendations route', async function () {
            await request.get('/.well-known/recommendations.json');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on fonts route', async function () {
            await request.get('/assets/fonts/inter-roman.woff2');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on source.js route', async function () {
            await request.get('/assets/built/source.js');
            sinon.assert.notCalled(memberSessionSpy);
        });

        it('should not call middleware on screen.js route', async function () {
            await request.get('/assets/built/screen.css');
            sinon.assert.notCalled(memberSessionSpy);
        });
    });
});
