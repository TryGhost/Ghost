const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const urlUtils = require('../../../../../core/shared/url-utils');
const ParentRouter = require('../../../../../core/frontend/services/routing/ParentRouter');

describe('UNIT - services/routing/ParentRouter', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        sinon.stub(urlUtils, 'redirect301');

        req = sinon.stub();
        req.app = {
            _router: {
                stack: []
            }
        };

        res = sinon.stub();
        next = sinon.stub();

        res.locals = {};
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('fn: _getSiteRouter', function () {
        it('find site router', function () {
            const parentRouter = new ParentRouter();

            req.app = {
                _router: {
                    stack: [{
                        name: 'SiteRouter'
                    }]
                }
            };

            should.exist(parentRouter._getSiteRouter(req));
        });
    });

    describe('fn: _respectDominantRouter', function () {
        it('redirect', function () {
            const parentRouter = new ParentRouter();
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/tag/bacon/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/channel/').calledOnce.should.be.true();
        });

        it('redirect with query params', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/tag/bacon/?a=b';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/channel/?a=b').calledOnce.should.be.true();
        });

        it('redirect rss', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/rss/';
            req.originalUrl = '/tag/bacon/rss/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/channel/rss/').calledOnce.should.be.true();
        });

        it('redirect pagination', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/page/2/';
            req.originalUrl = '/tag/bacon/page/2/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/channel/page/2/').calledOnce.should.be.true();
        });

        it('redirect correctly with subdirectory', function () {
            sinon.stub(urlUtils, 'createUrl').returns('/blog/channel/');

            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/blog/tag/bacon/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/blog/channel/').calledOnce.should.be.true();
        });

        it('no redirect: different data key', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(false),
                                getRoute: sinon.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(true);
            urlUtils.redirect301.called.should.be.false();
        });

        it('no redirect: no channel defined', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sinon.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/tag/:slug/')
            };

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticPagesRouter',
                        handle: {}
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(true);
            urlUtils.redirect301.called.should.be.false();
        });

        it('redirect primary tag permalink', function () {
            const parentRouter = new ParentRouter('index');
            parentRouter.getResourceType = sinon.stub().returns('posts');
            parentRouter.permalinks = {
                getValue: sinon.stub().returns('/:primary_tag/:slug/')
            };

            req.url = '/bacon/welcome/';
            req.originalUrl = `${req.url}?x=y`;

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sinon.stub().returns(true),
                                getRoute: sinon.stub().returns('/route/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'welcome');
            next.called.should.eql(false);
            urlUtils.redirect301.withArgs(res, '/route/?x=y').calledOnce.should.be.true();
        });
    });

    describe('fn: isRedirectEnabled', function () {
        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = undefined;
            parentRouter.isRedirectEnabled('tags', 'bacon').should.be.false();
        });

        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = {query: {}, router: {}};
            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'cheese'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: false, slug: 'bacon'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'bacon'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    pages: [{redirect: true, slug: 'home'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('pages', 'home'));
        });
    });
});
