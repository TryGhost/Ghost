/*globals describe, beforeEach, it*/
var should   = require('should'),

    // Stuff we are testing
    setResponseContext = require('../../../../server/controllers/frontend/context');

describe('Contexts', function () {
    var req, res, data;

    beforeEach(function () {
        req = {
            params: {}
        };
        res = {
            locals: {}
        };
        data = {};
    });

    describe('Unknown', function () {
        it('should return empty array with no error if all parameters are empty', function () {
            // Reset all parameters to empty;
            req = {};
            res = {};
            data = {};
            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('should return empty array with no error with basic parameters', function () {
            // BeforeEach sets each of these to the bare minimum that should be provided for determining context
            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });
    });

    describe('Index', function () {
        it('should correctly identify `/` as index', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('home');
            res.locals.context[1].should.eql('index');
        });

        it('should correctly identify `/` as home & index', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('home');
            res.locals.context[1].should.eql('index');
        });

        it('will not identify `/page/2/` as index & paged without page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/page/2/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('index');
        });

        it('should identify `/page/2/` as index & paged with page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/page/2/';
            req.params.page = 2;

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('index');
        });
    });

    describe('RSS', function () {
        it('should correctly identify `/rss/` as rss', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/rss/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('rss');
        });

        it('will not identify `/rss/2/` as rss & paged without page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/rss/2/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('rss');
        });

        it('should correctly identify `/rss/2/` as rss & paged with page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/rss/2/';
            req.params.page = 2;

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('rss');
        });
    });

    describe('Tag', function () {
        it('should correctly identify `/tag/getting-started/` as tag', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/tag/getting-started/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('tag');
        });

        it('should not identify just `/tag/` as being the tag context', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/tag/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });

        it('will not identify `/tag/getting-started/page/2/ as paged without page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/tag/getting-started/page/2/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('tag');
        });

        it('should correctly identify `/tag/getting-started/page/2/ as paged with page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/tag/getting-started/page/2/';
            req.params.page = 2;

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('tag');
        });
    });

    describe('Author', function () {
        it('should correctly identify `/author/pat/` as author', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/author/pat/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('author');
        });

        it('should not identify just `/author/` as being the author context', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/author/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });

        it('will not identify `/author/pat/page/2/ as paged without page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/author/pat/page/2/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('author');
        });

        it('should correctly identify `/author/pat/page/2/ as paged with page param', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/author/pat/page/2/';
            req.params.page = 2;

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('author');
        });
    });

    describe('Posts & Pages', function () {
        it('should correctly identify a post', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/welcome-to-ghost/';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });

        it('should correctly idenfity a page', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/about/';
            data.post = {page: true};

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('page');
        });
    });

    describe('Private', function () {
        it('should correctly identify `/private/` as the private route', function () {
            // Setup test by setting relativeUrl
            res.locals.relativeUrl = '/private/?r=';

            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('private');
        });
    });
});
