const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');
const urlUtils = require('../../../../../core/shared/url-utils');
const ParentRouter = require('../../../../../core/frontend/services/routing/parent-router');

describe('UNIT - services/routing/ParentRouter', function () {
    let req;
    let res;
    let next;
    let redirect301Stub;

    beforeEach(function () {
        redirect301Stub = sinon.stub(urlUtils, 'redirect301');

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

            assertExists(parentRouter._getSiteRouter(req));
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/channel/').calledOnce, true);
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/channel/?a=b').calledOnce, true);
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/channel/rss/').calledOnce, true);
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/channel/page/2/').calledOnce, true);
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/blog/channel/').calledOnce, true);
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
            assert.equal(next.called, true);
            assert.equal(redirect301Stub.called, false);
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
            assert.equal(next.called, true);
            assert.equal(redirect301Stub.called, false);
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
            assert.equal(next.called, false);
            assert.equal(redirect301Stub.withArgs(res, '/route/?x=y').calledOnce, true);
        });
    });

    describe('fn: isRedirectEnabled', function () {
        it('data is undefined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = undefined;
            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('data keys are undefined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = {query: {}, router: {}};
            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), undefined);
        });

        it('no redirect when unspecified slug', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true}]
                }
            };

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), undefined);
        });

        it('no redirect when wrong slug', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'cheese'}]
                }
            };

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), undefined);
        });

        it('no redirect when tag redirect=false', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: false, slug: 'bacon'}]
                }
            };

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), undefined);
        });

        it('redirect (tags)', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'bacon'}]
                }
            };

            assertExists(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect (pages)', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    pages: [{redirect: true, slug: 'home'}]
                }
            };

            assertExists(parentRouter.isRedirectEnabled('pages', 'home'));
        });
    });
});
