const LinkClickTrackingService = require('../../../../../core/server/services/link-tracking/link-click-tracking-service');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;
const PostLink = require('../../../../../core/server/services/link-tracking/post-link');
const RedirectEvent = require('../../../../../core/server/services/link-redirection/redirect-event');
const errors = require('@tryghost/errors');
const nql = require('@tryghost/nql');
const {escapeNqlString} = require('@tryghost/nql-string');

describe('LinkClickTrackingService', function () {
    it('exists', function () {
        require('../../../../../core/server/services/link-tracking/link-click-tracking-service');
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
            sinon.assert.calledOnce(subscribe);
            service.init();
            sinon.assert.calledOnce(subscribe);
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
            sinon.assert.calledOnce(getSlugUrl);

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
            sinon.assert.calledOnce(getSlugUrl);

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

    describe('addAutomationTrackingToUrl', function () {
        it('reuses the revision redirect and appends the member UUID', async function () {
            const getOrAddAutomationRedirect = sinon.stub().resolves({
                from: new URL('https://example.com/r/uniqueslug'),
                to: new URL('https://example.com/destination')
            });
            const service = new LinkClickTrackingService({
                linkRedirectService: {getOrAddAutomationRedirect}
            });

            const updatedUrl = await service.addAutomationTrackingToUrl(
                new URL('https://example.com/destination'),
                'revision-id',
                'run-step-id',
                '00000000-0000-4000-8000-000000000001'
            );

            assert.equal(updatedUrl.href, 'https://example.com/r/uniqueslug?m=00000000-0000-4000-8000-000000000001&step=run-step-id');
            sinon.assert.calledOnceWithExactly(
                getOrAddAutomationRedirect,
                'revision-id',
                new URL('https://example.com/destination')
            );
        });
    });

    describe('subscribe', function () {
        const CLICKED_AT = new Date('2026-07-29T12:34:56.000Z');

        let subscriber;
        let save;
        let trackEmailClicked;
        let runInTransaction;
        let transacting;

        const createRedirectEvent = ({
            memberUuid = 'memberUuid',
            automationActionRevisionId,
            automationRunStepId = 'run-step-id',
            linkId = new ObjectID(),
            timestamp = CLICKED_AT
        } = {}) => {
            const url = new URL('https://example.com/destination');
            if (memberUuid) {
                url.searchParams.set('m', memberUuid);
            }
            if (automationRunStepId) {
                url.searchParams.set('step', automationRunStepId);
            }

            return RedirectEvent.create({
                url,
                link: {
                    link_id: linkId,
                    ...(automationActionRevisionId ? {automationActionRevisionId} : {})
                }
            }, timestamp);
        };

        beforeEach(function () {
            transacting = {};
            save = sinon.stub().resolves('member-id');
            trackEmailClicked = sinon.stub().resolves();
            runInTransaction = sinon.stub().callsFake(callback => callback(transacting));

            const service = new LinkClickTrackingService({
                DomainEvents: {
                    subscribe: (eventType, callback) => {
                        assert.equal(eventType, RedirectEvent);
                        subscriber = callback;
                    }
                },
                linkClickRepository: {save},
                automationsApi: {trackEmailClicked},
                runInTransaction
            });

            service.subscribe();
        });

        it('Ignores redirects without a member id', async function () {
            await subscriber(createRedirectEvent({memberUuid: null}));

            sinon.assert.notCalled(save);
        });

        it('Saves member clicks for newsletter redirects', async function () {
            const linkId = new ObjectID();
            const event = createRedirectEvent({
                memberUuid: 'memberId',
                linkId
            });

            await subscriber(event);

            sinon.assert.calledOnceWithExactly(save, sinon.match({
                member_uuid: 'memberId',
                link_id: linkId,
                timestamp: CLICKED_AT
            }));
            sinon.assert.notCalled(runInTransaction);
        });

        it('Saves automation clicks and analytics in the same transaction', async function () {
            const linkId = new ObjectID();
            const event = createRedirectEvent({
                linkId,
                automationActionRevisionId: 'revision-id'
            });

            await subscriber(event);

            sinon.assert.calledOnceWithExactly(runInTransaction, sinon.match.func);
            sinon.assert.calledOnceWithExactly(save, sinon.match.object, {transacting});
            sinon.assert.calledOnceWithExactly(trackEmailClicked, {
                automationActionRevisionId: 'revision-id',
                automationRunStepId: 'run-step-id',
                memberId: 'member-id',
                clickedAt: CLICKED_AT
            }, {transacting});
        });

        it('Saves automation clicks without a step ID but skips recipient analytics', async function () {
            const event = createRedirectEvent({
                automationActionRevisionId: 'revision-id',
                automationRunStepId: null
            });

            await subscriber(event);

            sinon.assert.calledOnceWithExactly(save, sinon.match.object);
            sinon.assert.notCalled(runInTransaction);
            sinon.assert.notCalled(trackEmailClicked);
        });

        it('Propagates raw click persistence failures', async function () {
            const error = new Error('click insert failed');
            const event = createRedirectEvent({
                automationActionRevisionId: 'revision-id'
            });
            save.rejects(error);

            await assert.rejects(subscriber(event), error);
            sinon.assert.notCalled(trackEmailClicked);
        });

        it('Skips automation analytics when the member cannot be found', async function () {
            const event = createRedirectEvent({
                memberUuid: 'unknownMemberUuid',
                automationActionRevisionId: 'revision-id'
            });
            save.resolves();

            await subscriber(event);

            sinon.assert.notCalled(trackEmailClicked);
        });

        it('Propagates automation analytics failures so the transaction rolls back', async function () {
            const error = new Error('analytics update failed');
            const event = createRedirectEvent({
                automationActionRevisionId: 'revision-id'
            });
            trackEmailClicked.rejects(error);

            await assert.rejects(subscriber(event), error);
            sinon.assert.calledOnceWithExactly(trackEmailClicked, sinon.match.object, {transacting});
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
            assert.deepEqual(result, {
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

            sinon.assert.calledOnce(postLinkRepositoryStub.updateLinks);
            assert.deepEqual(result, {
                successful: 0,
                unsuccessful: 0,
                errors: [],
                unsuccessfulData: []
            });

            const [filterOptions] = linkRedirectServiceStub.getFilteredIds.firstCall.args;
            assert.equal(filterOptions.filter, 'post_id:\'1\'+to:\'https://example.com/path\'');
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

            sinon.assert.calledOnce(postLinkRepositoryStub.updateLinks);
            assert.deepEqual(result, {
                successful: 0,
                unsuccessful: 0,
                errors: [],
                unsuccessfulData: []
            });

            const [filterOptions] = linkRedirectServiceStub.getFilteredIds.firstCall.args;
            assert.equal(filterOptions.filter, 'post_id:\'1\'+to:\'https://example.com/path%2Ftestpath\'');
        });

        // A single quote is legal in a URL path and is the one hostile character
        // that survives `new URL()` normalisation. The url is deserialised from
        // NQL and then re-serialised back into NQL for getFilteredIds, so both
        // hops have to escape it - otherwise the filter fails to parse and the
        // edit silently no-ops.
        //
        // Only the two single-quote cases regress without the escaping. The `"`
        // and `\` cases pass either way and are here to pin the normalisation
        // that makes them harmless (`"` -> %22, `\` -> `/`), so if that ever
        // changes it surfaces as a failure here rather than as a new way to
        // break the filter in production.
        [
            {name: 'a single quote', url: 'https://example.com/foo-bar-baz/\'?ref=Test-newsletter'},
            {name: 'several single quotes', url: 'https://example.com/a\'b\'c?ref=Test-newsletter'},
            {name: 'a quote normalised out of the path', url: 'https://example.com/say"hi?ref=Test-newsletter'},
            {name: 'a backslash normalised out of the path', url: 'https://example.com/path\\?ref=Test-newsletter'}
        ].forEach(function ({name, url}) {
            it(`rebuilds a parseable filter for a url containing ${name}`, async function () {
                const linkRedirectServiceStub = {
                    getFilteredIds: sinon.stub().resolves(['id1'])
                };

                const service = new LinkClickTrackingService({
                    urlUtils: {
                        absoluteToTransformReady: sinon.stub().returnsArg(0),
                        isSiteUrl: sinon.stub().returns(false)
                    },
                    postLinkRepository: {
                        updateLinks: sinon.stub().resolves({
                            successful: 1,
                            unsuccessful: 0,
                            errors: [],
                            unsuccessfulData: []
                        })
                    },
                    linkRedirectService: linkRedirectServiceStub
                });

                await service.bulkEdit({
                    action: 'updateLink',
                    meta: {link: {to: 'https://example.com/fixed'}}
                }, {
                    filter: `post_id:'1'+to:${escapeNqlString(url)}`
                });

                const [filterOptions] = linkRedirectServiceStub.getFilteredIds.firstCall.args;

                // the rebuilt filter must still parse, and must still select the
                // url the service resolved rather than a truncated prefix of it
                const parsed = nql(filterOptions.filter).parse();
                assert.equal(parsed.$and[1].to, new URL(url).href);
            });
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

            await assert.rejects(
                service.bulkEdit(data, options),
                errors.BadRequestError
            );
        });

        it('does not duplicate ref when new redirect already includes ref', async function () {
            const urlUtilsStub = {
                absoluteToTransformReady: sinon.stub().returnsArg(0),
                isSiteUrl: sinon.stub().returns(false)
            };
            const postLinkRepositoryStub = {
                updateLinks: sinon.stub().resolves({
                    successful: 1,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            };
            const linkRedirectServiceStub = {
                getFilteredIds: sinon.stub().resolves(['id1'])
            };

            const service = new LinkClickTrackingService({
                urlUtils: urlUtilsStub,
                postLinkRepository: postLinkRepositoryStub,
                linkRedirectService: linkRedirectServiceStub
            });

            const options = {
                filter: 'post_id:1+to:\'https://example.com/subscripe?ref=Test-newsletter\''
            };

            await service.bulkEdit({
                action: 'updateLink',
                meta: {
                    link: {to: 'https://example.com/subscribe?ref=Test-newsletter'}
                }
            }, options);

            const [, updateData] = postLinkRepositoryStub.updateLinks.firstCall.args;
            assert.equal(updateData.to, 'https://example.com/subscribe?ref=Test-newsletter');
        });

        it('preserves hash when appending attribution params', async function () {
            const urlUtilsStub = {
                absoluteToTransformReady: sinon.stub().returnsArg(0),
                isSiteUrl: sinon.stub().returns(true)
            };
            const postLinkRepositoryStub = {
                updateLinks: sinon.stub().resolves({
                    successful: 1,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            };
            const linkRedirectServiceStub = {
                getFilteredIds: sinon.stub().resolves(['id1'])
            };

            const service = new LinkClickTrackingService({
                urlUtils: urlUtilsStub,
                postLinkRepository: postLinkRepositoryStub,
                linkRedirectService: linkRedirectServiceStub
            });

            const options = {
                filter: 'post_id:1+to:\'https://example.com/original?ref=Test-newsletter\''
            };

            await service.bulkEdit({
                action: 'updateLink',
                meta: {
                    link: {to: 'https://ghost.test/path?foo=1#section'}
                }
            }, options);

            const [, updateData] = postLinkRepositoryStub.updateLinks.firstCall.args;
            assert.equal(updateData.to, 'https://ghost.test/path?foo=1&ref=Test-newsletter&attribution_type=post&attribution_id=1#section');
        });
    });
});
