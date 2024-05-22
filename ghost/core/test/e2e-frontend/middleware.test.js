const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const membersService = require('../../core/server/services/members');

describe('Middleware Execution', function () {
    let loadMemberSessionMiddlewareSpy;
    let request;

    before(async function () {
        loadMemberSessionMiddlewareSpy = sinon.spy(membersService.middleware, 'loadMemberSession');

        // Ensure we do a forced start so that spy is in place when the server starts
        await testUtils.startGhost({forceStart: true});

        request = supertest.agent(configUtils.config.get('url'));
    });

    after(async function () {
        sinon.restore();

        await testUtils.stopGhost();
    });

    afterEach(function () {
        loadMemberSessionMiddlewareSpy.resetHistory();
    });

    describe('Loading a member session', function () {
        describe('Page with member content', function () {
            it('should load member session on home route', async function () {
                await request.get('/');
                sinon.assert.calledOnce(loadMemberSessionMiddlewareSpy);
            });

            it('should load member session on post route', async function () {
                await request.get('/welcome/');
                sinon.assert.calledOnce(loadMemberSessionMiddlewareSpy);
            });
        });

        describe('Sitemap', function () {
            it('should not load member session on sitemap route', async function () {
                await request.get('/sitemap.xml');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on sitemap-pages route', async function () {
                await request.get('/sitemap-pages.xml');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on sitemap-posts route', async function () {
                await request.get('/sitemap-posts.xml');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on sitemap-tags route', async function () {
                await request.get('/sitemap-tags.xml');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on sitemap-authors route', async function () {
                await request.get('/sitemap-authors.xml');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });
        });

        describe('Recommendations', function () {
            it('should not load member session on recommendations route', async function () {
                await request.get('/.well-known/recommendations.json');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });
        });

        describe('Static assets', function () {
            it('should not load member session on fonts route', async function () {
                await request.get('/assets/fonts/inter-roman.woff2');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on source.js route', async function () {
                await request.get('/assets/built/source.js');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });

            it('should not load member session on screen.css route', async function () {
                await request.get('/assets/built/screen.css');
                sinon.assert.notCalled(loadMemberSessionMiddlewareSpy);
            });
        });
    });
});
