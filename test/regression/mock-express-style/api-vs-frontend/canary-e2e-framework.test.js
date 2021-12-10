const sinon = require('sinon');
const testUtils = require('../../../utils');
const localUtils = require('../utils');
const configUtils = require('../../../utils/configUtils');

const themeEngine = require('../../../../core/frontend/services/theme-engine');
const {expect} = require('chai');

describe('Integration - Web - Site canary', function () {
    let app;
    let request;

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));

    describe('default routes.yaml', function () {
        before(async function () {
            localUtils.overrideGhostConfig(configUtils);

            request = await localUtils.getAgent(app);
        });

        beforeEach(function () {
            sinon.stub(themeEngine.getActive(), 'engine').withArgs('ghost-api').returns('canary');
            sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);
        });

        afterEach(function () {
            sinon.restore();
        });

        after(function () {
            configUtils.restore();
        });

        describe('behavior: default cases', function () {
            it('serves a post page', async function () {
                const res = await request.get('/html-ipsum/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="post-template/, 'should render using a post template');
                expect(res.body).to.match(/<h1>HTML Ipsum Presents<\/h1>/, 'should render lorem ipsum post fixture content');
            });

            it('serves an amp page', async function () {
                const res = await request.get('/html-ipsum/amp/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="amp-template/, 'should render using a amp template');
                expect(res.body).to.match(/<h1>HTML Ipsum Presents<\/h1>/, 'should render lorem ipsum post fixture content');
            });

            it('serves a not found page', async function () {
                const res = await request.get('/i-am-lost/');

                expect(res.statusCode).to.equal(404);
                expect(res.body).to.match(/class="error-template/, 'should render a 404 error template');
            });

            it('serves a static page', async function () {
                const res = await request.get('/static-page-test/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="page-template/, 'should render a page template');
            });

            it('serves an author page', async function () {
                const res = await request.get('/author/joe-bloggs/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="author-template/, 'should render an author template');
            });

            it('serves a tag page', async function () {
                const res = await request.get('/tag/bacon/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="tag-template/, 'should render a tag template');
            });

            it('serves a tag rss', async function () {
                const res = await request.get('/tag/bacon/rss/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/<rss/, 'should render a tag rss feed');
            });

            it('serves a collection', async function () {
                const res = await request.get('/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="home-template/, 'should render a home collection template');
                expect(res.body).to.match(/.post-card/, 'should render post cards');
            });

            it('serve collection: page 2', async function () {
                const res = await request.get('/page/2/');

                expect(res.statusCode).to.equal(200);
                expect(res.body).to.match(/class="paged/, 'should render a paged collection template');
                expect(res.body).to.match(/.post-card/, 'should render post cards');
            });

            it('serve theme asset', async function () {
                const res = await request.get('/assets/css/screen.css');

                expect(res.statusCode).to.equal(200);
            });
        });
    });
});
