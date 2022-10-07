const should = require('should');
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
            _private.getEntriesTemplateHierarchy({}).should.eql(['index']);
        });

        it('should return just index if collection name is index', function () {
            _private.getEntriesTemplateHierarchy({name: 'index'}).should.eql(['index']);
        });

        it('should return custom templates even if the collection is index', function () {
            _private.getEntriesTemplateHierarchy({name: 'index', templates: ['something']}).should.eql(['something', 'index']);
        });

        it('should return collection name', function () {
            _private.getEntriesTemplateHierarchy({name: 'podcast'}).should.eql(['podcast', 'index']);
        });

        it('should return custom templates', function () {
            _private.getEntriesTemplateHierarchy({name: 'podcast', templates: ['mozart']}).should.eql(['mozart', 'podcast', 'index']);
        });

        it('should return just index if collection name is index even if slug is set', function () {
            _private.getEntriesTemplateHierarchy({name: 'index', slugTemplate: true}, {slugParam: 'test'}).should.eql(['index']);
        });

        it('should return collection, index if collection has name', function () {
            _private.getEntriesTemplateHierarchy({name: 'tag'}).should.eql(['tag', 'index']);
        });

        it('should return collection-slug, collection, index if collection has name & slug + slugTemplate set', function () {
            _private.getEntriesTemplateHierarchy({
                name: 'tag',
                slugTemplate: true
            }, {slugParam: 'test'}).should.eql(['tag-test', 'tag', 'index']);
        });

        it('should return front, collection-slug, collection, index if name, slugParam+slugTemplate & frontPageTemplate+pageParam=1 is set', function () {
            _private.getEntriesTemplateHierarchy({
                name: 'tag',
                slugTemplate: true,
                frontPageTemplate: 'front-tag'
            }, {page: 1, path: '/', slugParam: 'test'}).should.eql(['front-tag', 'tag-test', 'tag', 'index']);
        });

        it('should return home, index for index collection if front is set and pageParam = 1', function () {
            _private.getEntriesTemplateHierarchy({
                name: 'index',
                frontPageTemplate: 'home'
            }, {path: '/'}).should.eql(['home', 'index']);
        });

        it('should not use frontPageTemplate if not / collection', function () {
            _private.getEntriesTemplateHierarchy({
                name: 'index',
                frontPageTemplate: 'home'
            }, {path: '/magic/'}).should.eql(['index']);
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

            _private.pickTemplate(['tag-test', 'tag', 'index'], 'fallback').should.eql('fallback');
            _private.pickTemplate(['page-my-post', 'page', 'post'], 'fallback').should.eql('fallback');
        });

        it('returns fallback if active_theme has no templates', function () {
            _private.pickTemplate(['tag-test', 'tag', 'index'], 'fallback').should.eql('fallback');
            _private.pickTemplate(['page-about', 'page', 'post'], 'fallback').should.eql('fallback');
        });

        describe('with many templates', function () {
            beforeEach(function () {
                // Set available Templates
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
                hasTemplateStub.withArgs('page').returns(true);
                hasTemplateStub.withArgs('page-about').returns(true);
                hasTemplateStub.withArgs('post').returns(true);
                hasTemplateStub.withArgs('amp').returns(true);
            });

            it('returns first matching template', function () {
                _private.pickTemplate(['page-about', 'page', 'post'], 'fallback').should.eql('page-about');
                _private.pickTemplate(['page-magic', 'page', 'post'], 'fallback').should.eql('page');
                _private.pickTemplate(['page', 'post'], 'fallback').should.eql('page');
            });

            it('returns correctly if template list is a string', function () {
                _private.pickTemplate('amp', 'fallback').should.eql('amp');
                _private.pickTemplate('subscribe', 'fallback').should.eql('fallback');
                _private.pickTemplate('post', 'fallback').should.eql('post');
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
            should.exist(view);
            view.should.eql('post');
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
                should.exist(view);
                view.should.eql('post');
            });

            it('post with custom slug template', function () {
                hasTemplateStub.withArgs('post-welcome-to-ghost').returns(true);
                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'welcome-to-ghost'
                });
                should.exist(view);
                view.should.eql('post-welcome-to-ghost');
            });

            it('page without custom slug template', function () {
                const view = _private.getTemplateForEntry({
                    slug: 'contact'
                }, 'page');
                should.exist(view);
                view.should.eql('page');
            });

            it('page with custom slug template', function () {
                const view = _private.getTemplateForEntry({
                    slug: 'about'
                }, 'page');
                should.exist(view);
                view.should.eql('page-about');
            });

            it('post with custom template', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    custom_template: 'custom-about'
                });
                should.exist(view);
                view.should.eql('custom-about');
            });

            it('page with custom template', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 1,
                    custom_template: 'custom-about'
                });
                should.exist(view);
                view.should.eql('custom-about');
            });

            it('post with custom template configured, but the template is missing', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    custom_template: 'custom-about'
                });
                should.exist(view);
                view.should.eql('post');
            });

            it('page with custom template configured, but the template is missing', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);

                const view = _private.getTemplateForEntry({
                    custom_template: 'custom-about'
                }, 'page');
                should.exist(view);
                view.should.eql('page');
            });

            it('post with custom template configured, but slug template exists', function () {
                hasTemplateStub.withArgs('custom-about').returns(true);
                hasTemplateStub.withArgs('post-about').returns(true);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'about',
                    custom_template: 'custom-about'
                });
                should.exist(view);
                view.should.eql('post-about');
            });

            it('post with custom template configured, but slug template exists, but can\'t be found', function () {
                hasTemplateStub.withArgs('custom-about').returns(false);
                hasTemplateStub.withArgs('post-about').returns(false);

                const view = _private.getTemplateForEntry({
                    page: 0,
                    slug: 'about',
                    custom_template: 'custom-about'
                });
                should.exist(view);
                view.should.eql('post');
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
                should.exist(view);
                view.should.eql('index');
            });
        });

        describe('with tag templates', function () {
            beforeEach(function () {
                hasTemplateStub.withArgs('default').returns(true);
                hasTemplateStub.withArgs('index').returns(true);
                hasTemplateStub.withArgs('tag').returns(true);
                hasTemplateStub.withArgs('tag-design').returns(true);
            });

            it('will return correct view for a tag', function () {
                const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'design'});
                should.exist(view);
                view.should.eql('tag-design');
            });

            it('will return correct view for a tag', function () {
                const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'development'});
                should.exist(view);
                view.should.eql('tag');
            });
        });

        it('will fall back to index even if no index.hbs', function () {
            const view = _private.getTemplateForEntries({name: 'tag', slugTemplate: true}, {slugParam: 'development'});
            should.exist(view);
            view.should.eql('index');
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

            _private.getTemplateForError(500).should.match(/core\/server\/views\/error.hbs$/);
        });

        it('will fall back to default for all statusCodes with no custom error templates', function () {
            _private.getTemplateForError(500).should.match(/core\/server\/views\/error.hbs$/);
            _private.getTemplateForError(503).should.match(/core\/server\/views\/error.hbs$/);
            _private.getTemplateForError(422).should.match(/core\/server\/views\/error.hbs$/);
            _private.getTemplateForError(404).should.match(/core\/server\/views\/error.hbs$/);
        });

        it('will use custom error.hbs for all statusCodes if there are no other templates', function () {
            hasTemplateStub.withArgs('error').returns(true);

            _private.getTemplateForError(500).should.eql('error');
            _private.getTemplateForError(503).should.eql('error');
            _private.getTemplateForError(422).should.eql('error');
            _private.getTemplateForError(404).should.eql('error');
        });

        it('will use more specific error-4xx.hbs for all 4xx statusCodes if available', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);

            _private.getTemplateForError(500).should.eql('error');
            _private.getTemplateForError(503).should.eql('error');
            _private.getTemplateForError(422).should.eql('error-4xx');
            _private.getTemplateForError(404).should.eql('error-4xx');
        });

        it('will use explicit error-404.hbs for 404 statusCode if available', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);
            hasTemplateStub.withArgs('error-404').returns(true);

            _private.getTemplateForError(500).should.eql('error');
            _private.getTemplateForError(503).should.eql('error');
            _private.getTemplateForError(422).should.eql('error-4xx');
            _private.getTemplateForError(404).should.eql('error-404');
        });

        it('cascade works the same for 500 errors', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-5xx').returns(true);
            hasTemplateStub.withArgs('error-503').returns(true);

            _private.getTemplateForError(500).should.eql('error-5xx');
            _private.getTemplateForError(503).should.eql('error-503');
            _private.getTemplateForError(422).should.eql('error');
            _private.getTemplateForError(404).should.eql('error');
        });

        it('cascade works with many specific templates', function () {
            hasTemplateStub.withArgs('error').returns(true);
            hasTemplateStub.withArgs('error-5xx').returns(true);
            hasTemplateStub.withArgs('error-503').returns(true);
            hasTemplateStub.withArgs('error-4xx').returns(true);
            hasTemplateStub.withArgs('error-404').returns(true);

            _private.getTemplateForError(500).should.eql('error-5xx');
            _private.getTemplateForError(503).should.eql('error-503');
            _private.getTemplateForError(422).should.eql('error-4xx');
            _private.getTemplateForError(404).should.eql('error-404');
            _private.getTemplateForError(401).should.eql('error-4xx');
            _private.getTemplateForError(501).should.eql('error-5xx');
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
            res._template.should.eql('thing');

            // And nothing got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.false();
        });

        it('defaults to index', function () {
            // No route or template config here!!!

            // Call setTemplate
            templates.setTemplate(req, res, data);

            // It should be index
            res._template.should.eql('index');

            // And nothing got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.false();
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
            res._template.should.eql('testFromPickTemplate');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.true();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.false();

            stubs.pickTemplate.calledWith('test', 'path/to/local/test.hbs').should.be.true();
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
            res._template.should.eql('testFromPickTemplate');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.true();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.false();

            stubs.pickTemplate.calledWith('test', 'path/to/local/test.hbs').should.be.true();
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
            res._template.should.eql('testFromEntry');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.true();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.false();

            stubs.getTemplateForEntry.calledWith({slug: 'test'}).should.be.true();
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

            res._template.should.eql('testFromEntries');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.true();
            stubs.getTemplateForError.called.should.be.false();

            stubs.getTemplateForEntries.calledWith({testCollection: 'test', type: 'collection'}).should.be.true();
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

            res._template.should.eql('testFromEntries');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.true();
            stubs.getTemplateForError.called.should.be.false();

            stubs.getTemplateForEntries.calledWith({testChannel: 'test', type: 'channel'}).should.be.true();
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
            res._template.should.eql('testFromError');

            // Only pickTemplate got called
            stubs.pickTemplate.called.should.be.false();
            stubs.getTemplateForEntry.called.should.be.false();
            stubs.getTemplateForEntries.called.should.be.false();
            stubs.getTemplateForError.called.should.be.true();

            stubs.getTemplateForError.calledWith(404).should.be.true();
        });
    });
});
