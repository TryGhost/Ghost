const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const rewire = require('rewire');
const templates = rewire('../../../../../core/frontend/services/rendering/templates');
const themeEngine = require('../../../../../core/frontend/services/theme-engine');

describe('templates', function () {
    let getActiveThemeStub;
    let hasTemplateStub;
    let _private = templates.__get__('_private');

    afterEach(function () {
        sinon.restore();
    });

    describe('[private fn] getEntriesTemplateHierarchy', function () {
        it('should return just index for empty options', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({}), ['index']);
        });

        it('should return just index if collection name is index', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'index'}), ['index']);
        });

        it('should return custom templates even if the collection is index', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'index', templates: ['something']}), ['something', 'index']);
        });

        it('should return collection name', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'podcast'}), ['podcast', 'index']);
        });

        it('should return custom templates', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'podcast', templates: ['mozart']}), ['mozart', 'podcast', 'index']);
        });

        it('should return just index if collection name is index even if slug is set', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'index', slugTemplate: true}, {slugParam: 'test'}), ['index']);
        });

        it('should return collection, index if collection has name', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({name: 'tag'}), ['tag', 'index']);
        });

        it('should return collection-slug, collection, index if collection has name & slug + slugTemplate set', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({
                name: 'tag',
                slugTemplate: true
            }, {slugParam: 'test'}), ['tag-test', 'tag', 'index']);
        });

        it('should return front, collection-slug, collection, index if name, slugParam+slugTemplate & frontPageTemplate+pageParam=1 is set', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({
                name: 'tag',
                slugTemplate: true,
                frontPageTemplate: 'front-tag'
            }, {page: 1, path: '/', slugParam: 'test'}), ['front-tag', 'tag-test', 'tag', 'index']);
        });

        it('should return home, index for index collection if front is set and pageParam = 1', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({
                name: 'index',
                frontPageTemplate: 'home'
            }, {path: '/'}), ['home', 'index']);
        });

        it('should not use frontPageTemplate if not / collection', function () {
            assert.deepEqual(_private.getEntriesTemplateHierarchy({
                name: 'index',
                frontPageTemplate: 'home'
            }, {path: '/magic/'}), ['index']);
        });
    });

    describe('[private fn] pickTemplate', function () {
        beforeEach(function () {
            hasTemplateStub = sinon.stub().returns(false);

            getActiveThemeStub = sinon.stub(themeEngine, 'getActive').returns({
                hasTemplate: hasTemplateStub
            });
        });

        it('returns fallback if there is no active_theme', function () {
            getActiveThemeStub.returns(undefined);

            assert.equal(_private.pickTemplate(['tag-test', 'tag', 'index'], 'fallback'), 'fallback');
            assert.equal(_private.pickTemplate(['page-my-post', 'page', 'post'], 'fallback'), 'fallback');
        });

        it('returns fallback if active_theme has no templates', function () {
            assert.equal(_private.pickTemplate(['tag-test', 'tag', 'index'], 'fallback'), 'fallback');
            assert.equal(_private.pickTemplate(['page-about', 'page', 'post'], 'fallback'), 'fallback');
        });

        describe('with many templates', function () {
            beforeEach(function () {
                // Set available Templates
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
                hasTemplateStub.withArgs('page').returns(true);
                hasTemplateStub.withArgs('page-about').returns(true);
                hasTemplateStub.withArgs('post').returns(true);
            });

            it('returns first matching template', function () {
                assert.equal(_private.pickTemplate(['page-about', 'page', 'post'], 'fallback'), 'page-about');
                assert.equal(_private.pickTemplate(['page-magic', 'page', 'post'], 'fallback'), 'page');
                assert.equal(_private.pickTemplate(['page', 'post'], 'fallback'), 'page');
            });

            it('returns correctly if template list is a string', function () {
                assert.equal(_private.pickTemplate('subscribe', 'fallback'), 'fallback');
                assert.equal(_private.pickTemplate('post', 'fallback'), 'post');
            });
        });
    });

    describe('[private fn] getTemplateForEntry', function () {
        beforeEach(function () {
            hasTemplateStub = sinon.stub().returns(false);

            getActiveThemeStub = sinon.stub(themeEngine, 'getActive').returns({
                hasTemplate: hasTemplateStub
            });
        });

        it('will fall back to post even if no index.hbs', function () {
            hasTemplateStub.returns(false);

            const view = _private.getTemplateForEntry({title: 'hey'}, 'page');
            assertExists(view);
            assert.equal(view, 'post');
        });

        describe('with many templates', function () {
            beforeEach(function () {
                // Set available Templates
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
                hasTemplateStub.withArgs('page').returns(true);
                hasTemplateStub.withArgs('page-about').returns(true);
                hasTemplateStub.withArgs('post').returns(true);
            });

            it('post without custom slug template', function () {
                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'test-post'
                });
                assertExists(view);
                assert.equal(view, 'post');
            });

            it('post with custom slug template', function () {
                hasTemplateStub.withArgs('post-welcome-to-ghost').returns(true);
                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'welcome-to-ghost'
                });
                assertExists(view);
                assert.equal(view, 'post-welcome-to-ghost');
            });

            it('page without custom slug template', function () {
                const view = _private.getTemplateForEntry({
                    slug: 'contact'
                }, 'page');
                assertExists(view);
                assert.equal(view, 'page');
            });

            it('page with custom slug template', function () {
                const view = _private.getTemplateForEntry({
                    slug: 'about'
                }, 'page');
                assertExists(view);
                assert.equal(view, 'page-about');
            });

            it('post with custom template', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    custom_template: 'custom-about'
                });
                assertExists(view);
                assert.equal(view, 'custom-about');
            });

            it('page with custom template', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 1,
                    custom_template: 'custom-about'
                });
                assertExists(view);
                assert.equal(view, 'custom-about');
            });

            it('post with custom template configured, but the template is missing', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    custom_template: 'custom-about'
                });
                assertExists(view);
                assert.equal(view, 'post');
            });

            it('page with custom template configured, but the template is missing', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);

                const view = _private.getTemplateForEntry({
                    custom_template: 'custom-about'
                }, 'page');
                assertExists(view);
                assert.equal(view, 'page');
            });

            it('post with custom template configured, but slug template exists', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);
                hasTemplateStub.withArgs('post-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'about',
                    custom_template: 'custom-about'
                });
                assertExists(view);
                assert.equal(view, 'post-about');
            });

            it('post with custom template configured, but slug template exists, but can\'t be found', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);
                hasTemplateStub.withArgs('post-about').returns(false);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'about',
                    custom_template: 'custom-about'
                });
                assertExists(view);
                assert.equal(view, 'post');
            });
        });
    });

    describe('[private fn] getTemplateForEntries', function () {
        beforeEach(function () {
            hasTemplateStub = sinon.stub().returns(false);

            getActiveThemeStub = sinon.stub(themeEngine, 'getActive').returns({
                hasTemplate: hasTemplateStub
            });
        });

        describe('without tag templates', function () {
            beforeEach(function () {
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
            });

            it('will return correct view for a tag', function () {
                const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'development'});
                assertExists(view);
                assert.equal(view, 'index');
            });
        });

        describe('with tag templates', function () {
            beforeEach(function () {
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
                hasTemplateStub.withArgs('tag').returns(true);
                hasTemplateStub.withArgs('tag-design').returns(true);
            });

            it('will return correct view for a tag when template exists', function () {
                const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'design'});
                assertExists(view);
                assert.equal(view, 'tag-design');
            });

            it('will return correct view for a tag', function () {
                const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'development'});
                assertExists(view);
                assert.equal(view, 'tag');
            });
        });

        it('will fall back to index even if no index.hbs', function () {
            const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'development'});
            assertExists(view);
            assert.equal(view, 'index');
        });
    });

    describe('[private fn] getTemplateForError', function () {
        beforeEach(function () {
            hasTemplateStub = sinon.stub().returns(false);

            getActiveThemeStub = sinon.stub(themeEngine, 'getActive').returns({
                hasTemplate: hasTemplateStub
            });
        });

        it('will fall back to default if there is no active_theme', function () {
            getActiveThemeStub.returns(undefined);

            assert.match(_private.getTemplateForError(500), /core\/server\/views\/error.hbs$/);
        });

        it('will fall back to default for all statusCodes with no custom error templates', function () {
            assert.match(_private.getTemplateForError(500), /core\/server\/views\/error.hbs$/);
            assert.match(_private.getTemplateForError(503), /core\/server\/views\/error.hbs$/);
            assert.match(_private.getTemplateForError(422), /core\/server\/views\/error.hbs$/);
            assert.match(_private.getTemplateForError(404), /core\/server\/views\/error.hbs$/);
        });

        it('will use custom error.hbs for all statusCodes if there are no other templates', function () {
            hasTemplateStub.withArgs('error').returns(true);

            assert.equal(_private.getTemplateForError(500), 'error');
            assert.equal(_private.getTemplateForError(503), 'error');
            assert.equal(_private.getTemplateForError(422), 'error');
            assert.equal(_private.getTemplateForError(404), 'error');
        });

        it('will use more specific error-4xx.hbs for all 4xx statusCodes if available', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);

            assert.equal(_private.getTemplateForError(500), 'error');
            assert.equal(_private.getTemplateForError(503), 'error');
            assert.equal(_private.getTemplateForError(422), 'error-4xx');
            assert.equal(_private.getTemplateForError(404), 'error-4xx');
        });

        it('will use explicit error-404.hbs for 404 statusCode if available', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);
            hasTemplateStub.withArgs('error-404').returns(true);

            assert.equal(_private.getTemplateForError(500), 'error');
            assert.equal(_private.getTemplateForError(503), 'error');
            assert.equal(_private.getTemplateForError(422), 'error-4xx');
            assert.equal(_private.getTemplateForError(404), 'error-404');
        });

        it('cascade works the same for 500 errors', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-5xx').returns(true);
            hasTemplateStub.withArgs('error-503').returns(true);

            assert.equal(_private.getTemplateForError(500), 'error-5xx');
            assert.equal(_private.getTemplateForError(503), 'error-503');
            assert.equal(_private.getTemplateForError(422), 'error');
            assert.equal(_private.getTemplateForError(404), 'error');
        });

        it('cascade works with many specific templates', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-5xx').returns(true);
            hasTemplateStub.withArgs('error-503').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);
            hasTemplateStub.withArgs('error-404').returns(true);

            assert.equal(_private.getTemplateForError(500), 'error-5xx');
            assert.equal(_private.getTemplateForError(503), 'error-503');
            assert.equal(_private.getTemplateForError(422), 'error-4xx');
            assert.equal(_private.getTemplateForError(404), 'error-404');
            assert.equal(_private.getTemplateForError(401), 'error-4xx');
            assert.equal(_private.getTemplateForError(501), 'error-5xx');
        });
    });

    describe('fn: setTemplate', function () {
        const stubs = {};
        let req;
        let res;
        let data;

        beforeEach(function () {
            req = {};
            res = {
                routerOptions: {}
            };
            data = {};

            stubs.pickTemplate = sinon.stub(_private, 'pickTemplate').returns('testFromPickTemplate');
            stubs.getTemplateForEntry = sinon.stub(_private, 'getTemplateForEntry').returns('testFromEntry');
            stubs.getTemplateForEntries = sinon.stub(_private, 'getTemplateForEntries').returns('testFromEntries');
            stubs.getTemplateForError = sinon.stub(_private, 'getTemplateForError').returns('testFromError');
        });

        it('does nothing if template is already set', function () {
            // Pre-set template
            res._template = 'thing';

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // It hasn't changed
            assert.equal(res._template, 'thing');

            // And nothing got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.notCalled(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);
        });

        it('defaults to index', function () {
            // No route or template config here!!!

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // It should be index
            assert.equal(res._template, 'index');

            // And nothing got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.notCalled(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);
        });

        it('calls pickTemplate for custom routes', function () {
            res.routerOptions = {
                type: 'custom',
                templates: 'test',
                defaultTemplate: 'path/to/local/test.hbs'
            };

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // should be testFromPickTemplate
            assert.equal(res._template, 'testFromPickTemplate');

            // Only pickTemplate got called
            sinon.assert.called(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.notCalled(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);

            sinon.assert.calledWith(stubs.pickTemplate, 'test', 'path/to/local/test.hbs');
        });

        it('calls getTemplateForEntry for entry routes', function () {
            res.routerOptions = {
                type: 'entry'
            };

            // Requires a post to be set
            data = {post: {slug: 'test'}};

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // should be getTemplateForEntry
            assert.equal(res._template, 'testFromEntry');

            // Only pickTemplate got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.called(stubs.getTemplateForEntry);
            sinon.assert.notCalled(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);

            sinon.assert.calledWith(stubs.getTemplateForEntry, {slug: 'test'});
        });

        it('calls getTemplateForEntries for type collection', function () {
            req.url = '/';
            req.params = {};

            res.routerOptions = {
                type: 'collection',
                testCollection: 'test'
            };

            // Call setTemplate
            templates.setTemplate(req, res, data);

            assert.equal(res._template, 'testFromEntries');

            // Only pickTemplate got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.called(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);

            sinon.assert.calledWith(stubs.getTemplateForEntries, {testCollection: 'test', type: 'collection'});
        });

        it('calls getTemplateForEntries for type channel', function () {
            req.url = '/';
            req.params = {};

            res.routerOptions = {
                type: 'channel',
                testChannel: 'test'
            };

            // Call setTemplate
            templates.setTemplate(req, res, data);

            assert.equal(res._template, 'testFromEntries');

            // Only pickTemplate got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.called(stubs.getTemplateForEntries);
            sinon.assert.notCalled(stubs.getTemplateForError);

            sinon.assert.calledWith(stubs.getTemplateForEntries, {testChannel: 'test', type: 'channel'});
        });

        it('calls getTemplateForError if there is an error', function () {
            // Make the config look like a custom route
            res.routerOptions = {
                type: 'custom',
                templateName: 'test',
                defaultTemplate: 'path/to/local/test.hbs'
            };

            // Setup an error
            res.statusCode = 404;
            req.err = new Error();

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // should be testFromError
            assert.equal(res._template, 'testFromError');

            // Only pickTemplate got called
            sinon.assert.notCalled(stubs.pickTemplate);
            sinon.assert.notCalled(stubs.getTemplateForEntry);
            sinon.assert.notCalled(stubs.getTemplateForEntries);
            sinon.assert.called(stubs.getTemplateForError);

            sinon.assert.calledWith(stubs.getTemplateForError, 404);
        });
    });
});
