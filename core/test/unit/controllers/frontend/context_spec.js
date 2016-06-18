var should   = require('should'),
    _        = require('lodash'),

    // Stuff we are testing
    channelConfig      = require('../../../../server/controllers/frontend/channel-config'),
    setResponseContext = require('../../../../server/controllers/frontend/context');

describe('Contexts', function () {
    var req, res, data, setupContext;

    beforeEach(function () {
        req = {
            params: {}
        };
        res = {
            locals: {}
        };
        data = {};
    });

    /**
     * A context is created based on the URL, and the channel config if we're rendering
     * any part of a channel
     * @param {String} url
     * @param {String|Object|Integer} [channel]
     * @param {Integer} [pageParam]
     */
    setupContext = function setupContext(url, channel, pageParam) {
        res.locals.relativeUrl = url;

        if (channel && _.isString(channel)) {
            req.channelConfig = channelConfig.get(channel);
        } else if (channel && _.isNumber(channel)) {
            pageParam = channel;
        } else if (channel) {
            req.channelConfig = channel;
        }

        if (pageParam) {
            req.params.page = pageParam;
        }
    };

    describe('Unknown', function () {
        it('should return empty array with no error if all parameters are empty', function () {
            // Reset all parameters to empty;
            req = {};
            res = {};
            data = {};

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('should return empty array with no error with basic parameters', function () {
            // Setup test
            // BeforeEach sets each of these to the bare minimum that should be provided for determining context

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });
    });

    describe('Channels', function () {
        describe('Index', function () {
            it('should correctly identify index channel', function () {
                // Setup test
                setupContext('/does/not/matter/', 'index');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('index');
            });

            it('should correctly identify / as home', function () {
                // Setup test
                setupContext('/', 'index');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(2);
                res.locals.context[0].should.eql('home');
                res.locals.context[1].should.eql('index');
            });

            it('will not identify / as index without config', function () {
                // Setup test
                setupContext('/');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('home');
            });

            it('will not identify /page/2/ as index & paged without page param', function () {
                // Setup test
                setupContext('/page/2/', 'index');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('index');
            });

            it('should identify /page/2/ as index & paged with page param', function () {
                // Setup test
                setupContext('/page/2/', 'index', 2);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(2);
                res.locals.context[0].should.eql('paged');
                res.locals.context[1].should.eql('index');
            });
        });

        describe('Tag', function () {
            it('should correctly identify tag channel', function () {
                // Setup test
                setupContext('/tag/getting-started/', 'tag');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('tag');
            });

            it('will not identify tag channel url without config', function () {
                // Setup test
                setupContext('/tag/getting-started/');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(0);
            });

            it('will not identify /page/2/ as paged without page param', function () {
                // Setup test
                setupContext('/tag/getting-started/page/2/', 'tag');

                // Execute test
                setResponseContext(req, res, data);

                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('tag');
            });

            it('should correctly identify /page/2/ as paged with page param', function () {
                // Setup test
                setupContext('/tag/getting-started/page/2/', 'tag', 2);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(2);
                res.locals.context[0].should.eql('paged');
                res.locals.context[1].should.eql('tag');
            });
        });

        describe('Author', function () {
            it('should correctly identify author channel', function () {
                // Setup test
                setupContext('/author/pat/', 'author');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('author');
            });

            it('will not identify author channel url without config', function () {
                // Setup test
                setupContext('/author/pat/');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(0);
            });

            it('will not identify /page/2/ as paged without page param', function () {
                // Setup test
                setupContext('/author/pat/page/2/', 'author');

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('author');
            });

            it('should correctly identify /page/2/ as paged with page param', function () {
                // Setup test
                setupContext('/author/pat/page/2/', 'author', 2);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(2);
                res.locals.context[0].should.eql('paged');
                res.locals.context[1].should.eql('author');
            });
        });

        describe('Custom', function () {
            var featuredChannel = {
                name: 'featured'
            };

            it('will use the channel name for a custom channel', function () {
                // Setup test
                setupContext('/featured/', featuredChannel);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('featured');
            });

            it('will not identify /page/2/ as paged without page param', function () {
                // Setup test
                setupContext('/featured/page/2/', featuredChannel);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(1);
                res.locals.context[0].should.eql('featured');
            });

            it('should correctly identify /page/2/ as paged with page param', function () {
                // Setup test
                setupContext('/featured/page/2/', featuredChannel, 2);

                // Execute test
                setResponseContext(req, res, data);

                // Check context
                should.exist(res.locals.context);
                res.locals.context.should.be.an.Array().with.lengthOf(2);
                res.locals.context[0].should.eql('paged');
                res.locals.context[1].should.eql('featured');
            });
        });
    });

    describe('Posts & Pages', function () {
        it('should correctly identify a post', function () {
            // Setup test
            setupContext('/welcome-to-ghost/');
            data.post = {};

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });

        it('will not identify a post without data being set', function () {
            // Setup test
            setupContext('/welcome-to-ghost/');

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('should correctly identify a page', function () {
            // Setup test
            setupContext('/about/');
            data.post = {page: true};

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('page');
        });
    });

    describe('Private', function () {
        it('should correctly identify /private/ as the private route', function () {
            // Setup test
            setupContext('/private/?r=');

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('private');
        });
    });

    describe('Subscribe', function () {
        it('should correctly identify /subscribe/ as the subscribe route', function () {
            // Setup test
            setupContext('/subscribe/');

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('subscribe');
        });
    });

    describe('RSS', function () {
        // NOTE: this works, but is never used in reality, as setResponseContext isn't called
        // for RSS feeds at the moment.
        it('should correctly identify /rss/ as rss', function () {
            // Setup test
            setupContext('/rss/');

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('rss');
        });

        it('will not identify /rss/2/ as rss & paged without page param', function () {
            // Setup test by setting relativeUrl
            setupContext('/rss/2/');

            // Execute test
            setResponseContext(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('rss');
        });

        it('should correctly identify /rss/2/ as rss & paged with page param', function () {
            // Setup test by setting relativeUrl
            setupContext('/rss/2/', 2);

            // Execute test
            setResponseContext(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('rss');
        });
    });
});
