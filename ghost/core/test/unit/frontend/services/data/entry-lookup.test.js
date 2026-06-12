const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');

const api = require('../../../../../core/frontend/services/proxy').api;
const data = require('../../../../../core/frontend/services/data');
const matchPermalinkParams = require('../../../../../core/frontend/services/data/match-permalink-params');
const testUtils = require('../../../../utils');

describe('Unit - frontend/data/entry-lookup', function () {
    let locals;

    afterEach(function () {
        sinon.restore();
    });

    describe('static pages', function () {
        const routerOptions = {
            permalinks: '/:slug/',
            query: {controller: 'pagesPublic', resource: 'pages'}
        };

        let pages;
        let postsReadStub;
        let pagesReadStub;

        beforeEach(function () {
            pages = [
                testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test', page: true})
            ];

            postsReadStub = sinon.stub();
            pagesReadStub = sinon.stub();

            pagesReadStub//.withArgs({slug: pages[0].slug, include: 'author,authors,tags,tiers'})
                .resolves({
                    pages: pages
                });

            sinon.stub(api, 'posts').get(() => {
                return {
                    read: postsReadStub
                };
            });

            sinon.stub(api, 'pagesPublic').get(() => {
                return {
                    read: pagesReadStub
                };
            });

            locals = {};
        });

        it('ensure pages controller is triggered', function () {
            const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                sinon.assert.notCalled(postsReadStub);
                sinon.assert.calledOnce(pagesReadStub);
                assertExists(lookup.entry);
                assert.equal(lookup.entry.url, pages[0].url);
                assert.equal(lookup.isEditURL, false);
            });
        });
    });

    describe('posts', function () {
        const routerOptions = {
            permalinks: '/:slug/:options(edit)?/',
            query: {controller: 'posts', resource: 'posts'}
        };

        let posts;
        let postsReadStub;
        let pagesReadStub;

        beforeEach(function () {
            posts = [
                testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test'})
            ];

            postsReadStub = sinon.stub();
            pagesReadStub = sinon.stub();

            postsReadStub//.withArgs({slug: posts[0].slug, include: 'author,authors,tags,tiers'})
                .resolves({
                    posts: posts
                });

            sinon.stub(api, 'posts').get(() => {
                return {
                    read: postsReadStub
                };
            });

            sinon.stub(api, 'pagesPublic').get(() => {
                return {
                    read: pagesReadStub
                };
            });

            locals = {};
        });

        it('ensure posts controller is triggered', function () {
            const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                sinon.assert.calledOnce(postsReadStub);
                sinon.assert.notCalled(pagesReadStub);
                assertExists(lookup.entry);
                assert.equal(lookup.entry.url, posts[0].url);
                assert.equal(lookup.isEditURL, false);
            });
        });

        it('can handle an edit url', function () {
            const testUrl = `http://127.0.0.1:2369${posts[0].url}edit/`;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                sinon.assert.calledOnce(postsReadStub);
                sinon.assert.notCalled(pagesReadStub);
                assertExists(lookup.entry);
                assert.equal(lookup.entry.url, posts[0].url);
                assert.equal(lookup.isEditURL, true);
            });
        });

        it('matches hyphen-separated date permalinks with hyphenated slugs', function () {
            const datedRouterOptions = {
                permalinks: '/articles/:year-:month-:day-:slug/:options(edit)?/',
                query: {controller: 'posts', resource: 'posts'}
            };

            postsReadStub.resolves({
                posts: [
                    testUtils.DataGenerator.forKnex.createPost({
                        url: '/articles/2026-05-22-sample-hyphenated-post-title/',
                        slug: 'sample-hyphenated-post-title'
                    })
                ]
            });

            return data.entryLookup('http://127.0.0.1:2369/articles/2026-05-22-sample-hyphenated-post-title/', datedRouterOptions, locals).then(function (lookup) {
                sinon.assert.calledOnce(postsReadStub);
                assert.equal(postsReadStub.firstCall.args[0].slug, 'sample-hyphenated-post-title');
                assertExists(lookup.entry);
                assert.equal(lookup.isEditURL, false);
            });
        });

        it('matches edit URLs for hyphen-separated date permalinks with hyphenated slugs', function () {
            const datedRouterOptions = {
                permalinks: '/articles/:year-:month-:day-:slug/:options(edit)?/',
                query: {controller: 'posts', resource: 'posts'}
            };

            postsReadStub.resolves({
                posts: [
                    testUtils.DataGenerator.forKnex.createPost({
                        url: '/articles/2026-05-22-sample-hyphenated-post-title/',
                        slug: 'sample-hyphenated-post-title'
                    })
                ]
            });

            return data.entryLookup('http://127.0.0.1:2369/articles/2026-05-22-sample-hyphenated-post-title/edit/', datedRouterOptions, locals).then(function (lookup) {
                sinon.assert.calledOnce(postsReadStub);
                assert.equal(postsReadStub.firstCall.args[0].slug, 'sample-hyphenated-post-title');
                assertExists(lookup.entry);
                assert.equal(lookup.isEditURL, true);
                assert.equal(lookup.isUnknownOption, false);
            });
        });

        it('matches generic hyphen-separated params with hyphenated slugs', function () {
            const sectionRouterOptions = {
                permalinks: '/articles/:section-:slug/:options(edit)?/',
                query: {controller: 'posts', resource: 'posts'}
            };

            postsReadStub.resolves({
                posts: [
                    testUtils.DataGenerator.forKnex.createPost({
                        url: '/articles/news-sample-hyphenated-post-title/',
                        slug: 'sample-hyphenated-post-title'
                    })
                ]
            });

            return data.entryLookup('http://127.0.0.1:2369/articles/news-sample-hyphenated-post-title/', sectionRouterOptions, locals).then(function (lookup) {
                sinon.assert.calledOnce(postsReadStub);
                assert.equal(postsReadStub.firstCall.args[0].slug, 'sample-hyphenated-post-title');
                assertExists(lookup.entry);
                assert.equal(lookup.isEditURL, false);
            });
        });
    });

    describe('permalink param matching', function () {
        it('extracts date params and full slug from hyphen-separated date permalinks', function () {
            const params = matchPermalinkParams(
                '/articles/:year-:month-:day-:slug/:options(edit)?/',
                '/articles/2026-05-22-sample-hyphenated-post-title/'
            );

            assert.deepEqual(params, {
                year: '2026',
                month: '05',
                day: '22',
                slug: 'sample-hyphenated-post-title'
            });
        });

        it('extracts generic params and full slug from hyphen-separated permalinks', function () {
            const params = matchPermalinkParams(
                '/articles/:section-:slug/:options(edit)?/',
                '/articles/news-sample-hyphenated-post-title/edit/'
            );

            assert.deepEqual(params, {
                section: 'news',
                slug: 'sample-hyphenated-post-title',
                options: 'edit'
            });
        });
    });
});
