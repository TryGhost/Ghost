const LinkClickTrackingService = require('../lib/LinkClickTrackingService');
const sinon = require('sinon');
const should = require('should');
const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const PostLink = require('../lib/PostLink');
const {RedirectEvent} = require('@tryghost/link-redirects');
const errors = require('@tryghost/errors');

describe('LinkClickTrackingService', function () {
    it('exists', function () {
        require('../');
    });

    describe('init', function () {
        it('initialises only once', function () {
            const subscribe = sinon.stub();
            const service = new LinkClickTrackingService({
                DomainEvents: {
                    subscribe
                }
            });
            service.init();
            assert.ok(subscribe.calledOnce);
            service.init();
            assert.ok(subscribe.calledOnce);
        });
    });

    describe('getLinks', function () {
        it('passes call to postLinkRepository', async function () {
            const getAll = sinon.stub().resolves(['test']);
            const service = new LinkClickTrackingService({
                postLinkRepository: {
                    getAll
                }
            });
            const links = await service.getLinks({filter: 'post_id:1'});

            // Check called with filter
            assert.ok(getAll.calledOnceWithExactly({filter: 'post_id:1'}));

            // Check returned value
            assert.deepEqual(links, ['test']);
        });
    });

    describe('addRedirectToUrl', function () {
        it('Creates a redirect', async function () {
            const getSlugUrl = sinon.stub().resolves(new URL('https://example.com/r/uniqueslug'));
            const save = sinon.stub().resolves();
            const linkId = new ObjectID();
            const addRedirect = sinon.stub().resolves({link_id: linkId, to: new URL('https://example.com/destination'), from: new URL('https://example.com/r/uniqueslug')});

            const service = new LinkClickTrackingService({
                linkRedirectService: {
                    getSlugUrl,
                    addRedirect
                },
                postLinkRepository: {
                    save
                }
            });

            const postId = new ObjectID().toHexString();
            const updatedUrl = await service.addRedirectToUrl(new URL('https://example.com/destination'), {id: postId});
            assert.equal(updatedUrl.toString(), 'https://example.com/r/uniqueslug');

            // Check getSlugUrl called
            assert(getSlugUrl.calledOnce);

            // Check save called
            assert(
                save.calledOnceWithExactly(
                    new PostLink({
                        post_id: postId,
                        link_id: linkId
                    })
                )
            );
        });
    });

    describe('addTrackingToUrl', function () {
        it('Creates a redirect', async function () {
            const getSlugUrl = sinon.stub().resolves(new URL('https://example.com/r/uniqueslug'));
            const save = sinon.stub().resolves();
            const linkId = new ObjectID();
            const addRedirect = sinon.stub().resolves({link_id: linkId, to: new URL('https://example.com/destination'), from: new URL('https://example.com/r/uniqueslug')});

            const service = new LinkClickTrackingService({
                linkRedirectService: {
                    getSlugUrl,
                    addRedirect
                },
                postLinkRepository: {
                    save
                }
            });

            const postId = new ObjectID().toHexString();
            const updatedUrl = await service.addTrackingToUrl(new URL('https://example.com/destination'), {id: postId}, '123');
            assert.equal(updatedUrl.toString(), 'https://example.com/r/uniqueslug?m=123');

            // Check getSlugUrl called
            assert(getSlugUrl.calledOnce);

            // Check save called
            assert(
                save.calledOnceWithExactly(
                    new PostLink({
                        post_id: postId,
                        link_id: linkId
                    })
                )
            );
        });
    });

    describe('subscribe', function () {
        it('Ignores redirects without a member id', async function () {
            const event = RedirectEvent.create({
                url: new URL('https://example.com/destination'),
                link: {}
            });
            const save = sinon.stub().resolves();

            const service = new LinkClickTrackingService({
                DomainEvents: {
                    subscribe: (eventType, callback) => {
                        assert.equal(eventType, RedirectEvent);
                        callback(event);
                    }
                },
                linkClickRepository: {
                    save
                }
            });

            service.subscribe();
            assert(!save.called);
        });

        it('Tracks redirects with a member id', async function () {
            const linkId = new ObjectID();
            const event = RedirectEvent.create({
                url: new URL('https://example.com/destination?m=memberId'),
                link: {
                    link_id: linkId
                }
            });
            const save = sinon.stub().resolves();

            const service = new LinkClickTrackingService({
                DomainEvents: {
                    subscribe: (eventType, callback) => {
                        assert.equal(eventType, RedirectEvent);
                        callback(event);
                    }
                },
                linkClickRepository: {
                    save
                }
            });

            service.subscribe();
            assert(save.calledOnce);

            assert.equal(save.firstCall.args[0].member_uuid, 'memberId');
            assert.equal(save.firstCall.args[0].link_id, linkId);
        });
    });

    describe('bulkEdit', function () {
        it('returns the result of updating links', async function () {
            const service = new LinkClickTrackingService({
                urlUtils: {
                    absoluteToTransformReady: (d) => {
                        return d;
                    },
                    isSiteUrl: sinon.stub().returns(true)
                },
                postLinkRepository: {
                    updateLinks: sinon.stub().resolves({
                        successful: 0,
                        unsuccessful: 0,
                        errors: [],
                        unsuccessfulData: []
                    })
                },
                linkRedirectService: {
                    getFilteredIds: sinon.stub().resolves([])
                }
            });
            const options = {
                filter: `post_id:1+to:'https://test.com'`
            };

            const result = await service.bulkEdit({
                action: 'updateLink',
                meta: {
                    link: {to: 'https://example.com'}
                }
            }, options);
            should(result).eql({
                successful: 0,
                unsuccessful: 0,
                errors: [],
                unsuccessfulData: []
            });
        });

        //test for #parseLinkFilter method
        it('correctly decodes and parses the filter', async function () {
            const urlUtilsStub = {
                absoluteToTransformReady: sinon.stub().returnsArg(0),
                isSiteUrl: sinon.stub().returns(true)
            };
            const postLinkRepositoryStub = {
                updateLinks: sinon.stub().resolves({
                    successful: 0,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            };
            const linkRedirectServiceStub = {
                getFilteredIds: sinon.stub().resolves([])
            };

            const service = new LinkClickTrackingService({
                urlUtils: urlUtilsStub,
                postLinkRepository: postLinkRepositoryStub,
                linkRedirectService: linkRedirectServiceStub
            });

            const options = {
                filter: 'post_id:1+to:\'https://example.com/path\''
            };

            const data = {
                action: 'updateLink',
                meta: {
                    link: {to: 'https://example.com/new-path'}
                }
            };

            const result = await service.bulkEdit(data, options);

            should(postLinkRepositoryStub.updateLinks.calledOnce).be.true();
            should(result).eql({
                successful: 0,
                unsuccessful: 0,
                errors: [],
                unsuccessfulData: []
            });

            const [filterOptions] = linkRedirectServiceStub.getFilteredIds.firstCall.args;
            should(filterOptions.filter).equal('post_id:\'1\'+to:\'https://example.com/path\'');
        });

        //test for #parseLinkFilter method
        it('correctly decodes and parses the filter for encoded urls', async function () {
            const urlUtilsStub = {
                absoluteToTransformReady: sinon.stub().returnsArg(0),
                isSiteUrl: sinon.stub().returns(true)
            };
            const postLinkRepositoryStub = {
                updateLinks: sinon.stub().resolves({
                    successful: 0,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            };
            const linkRedirectServiceStub = {
                getFilteredIds: sinon.stub().resolves([])
            };

            const service = new LinkClickTrackingService({
                urlUtils: urlUtilsStub,
                postLinkRepository: postLinkRepositoryStub,
                linkRedirectService: linkRedirectServiceStub
            });

            const options = {
                filter: 'post_id:1+to:\'https://example.com/path%2Ftestpath\''
            };

            const data = {
                action: 'updateLink',
                meta: {
                    link: {to: 'https://example.com/new-path'}
                }
            };

            const result = await service.bulkEdit(data, options);

            should(postLinkRepositoryStub.updateLinks.calledOnce).be.true();
            should(result).eql({
                successful: 0,
                unsuccessful: 0,
                errors: [],
                unsuccessfulData: []
            });

            const [filterOptions] = linkRedirectServiceStub.getFilteredIds.firstCall.args;
            should(filterOptions.filter).equal('post_id:\'1\'+to:\'https://example.com/path%2Ftestpath\'');
        });

        //test for #parseLinkFilter method
        it('throws BadRequestError for invalid filter', async function () {
            const urlUtilsStub = {
                absoluteToTransformReady: sinon.stub().returnsArg(0),
                isSiteUrl: sinon.stub().returns(true)
            };
            const postLinkRepositoryStub = {
                updateLinks: sinon.stub().resolves({
                    successful: 0,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            };
            const linkRedirectServiceStub = {
                getFilteredIds: sinon.stub().resolves([])
            };

            const service = new LinkClickTrackingService({
                urlUtils: urlUtilsStub,
                postLinkRepository: postLinkRepositoryStub,
                linkRedirectService: linkRedirectServiceStub
            });

            const options = {
                filter: 'invalid_filter'
            };

            const data = {
                action: 'updateLink',
                meta: {
                    link: {to: 'https://example.com/new-path'}
                }
            };

            await should(service.bulkEdit(data, options)).be.rejectedWith(errors.BadRequestError);
        });
    });
});
