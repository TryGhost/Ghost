const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');
const urlUtils = require('../../../../../core/shared/url-utils').default;
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/channel/'));
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/channel/?a=b'));
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/channel/rss/'));
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/channel/page/2/'));
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/blog/channel/'));
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
            sinon.assert.called(next);
            sinon.assert.notCalled(redirect301Stub);
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
            sinon.assert.called(next);
            sinon.assert.notCalled(redirect301Stub);
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(redirect301Stub.withArgs(res, '/route/?x=y'));
        });
    });

    describe('fn: isRedirectEnabled', function () {
        it('data is undefined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = undefined;
            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('data is empty', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = {};
            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('no redirect for a browse entry', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {featured: {type: 'browse', resource: 'tags'}};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('no redirect when wrong slug', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {tag: {type: 'read', resource: 'tags', slug: 'cheese'}};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('no redirect when wrong resource', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {page: {type: 'read', resource: 'pages', slug: 'bacon'}};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('no redirect when the entry opts out', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {tag: {type: 'read', resource: 'tags', slug: 'bacon', redirect: false}};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), false);
        });

        it('redirect (tags)', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {tag: {type: 'read', resource: 'tags', slug: 'bacon'}};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), true);
        });

        it('redirect (pages)', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {home: {type: 'read', resource: 'pages', slug: 'home'}};

            assert.equal(parentRouter.isRedirectEnabled('pages', 'home'), true);
        });

        it('redirect from a named shorthand entry', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {'my-tag': 'tag.bacon'};

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), true);
        });

        it('redirect from top-level shorthand', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = 'tag.bacon';

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), true);
        });

        it('redirect when one of several entries matches', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                featured: {type: 'browse', resource: 'posts', filter: 'featured:true'},
                tag: 'tag.bacon'
            };

            assert.equal(parentRouter.isRedirectEnabled('tags', 'bacon'), true);
        });
    });
});
