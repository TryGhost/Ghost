import assert from 'assert/strict';
import sinon from 'sinon';
import {IncomingRecommendationEmailRenderer, IncomingRecommendationService, RecommendationService} from '../src';

describe('IncomingRecommendationService', function () {
    let service: IncomingRecommendationService;
    let refreshMentions: sinon.SinonStub;
    let clock: sinon.SinonFakeTimers;
    let send: sinon.SinonStub;
    let readRecommendationByUrl: sinon.SinonStub;

    beforeEach(function () {
        refreshMentions = sinon.stub().resolves();
        send = sinon.stub().resolves();
        readRecommendationByUrl = sinon.stub().resolves(null);
        service = new IncomingRecommendationService({
            recommendationService: {
                readRecommendationByUrl
            } as any as RecommendationService,
            mentionsApi: {
                refreshMentions,
                listMentions: () => Promise.resolve({data: []})
            },
            emailService: {
                send
            },
            emailRenderer: {
                renderSubject: () => Promise.resolve(''),
                renderHTML: () => Promise.resolve(''),
                renderText: () => Promise.resolve('')
            } as any as IncomingRecommendationEmailRenderer,
            getEmailRecipients: () => Promise.resolve([
                {
                    email: 'example@example.com'
                }
            ])
        });
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        sinon.restore();
        clock.restore();
    });

    describe('init', function () {
        it('should update incoming recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'nottesting';
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                assert(refreshMentions.calledOnce);
                assert(refreshMentions.calledWith({
                    filter: `source:~$'/.well-known/recommendations.json'+deleted:[true,false]`,
                    limit: 100
                }));
            } finally {
                process.env.NODE_ENV = saved;
            }
        });

        it('ignores errors when update incoming recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'nottesting';

                refreshMentions.rejects(new Error('test'));
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                assert(refreshMentions.calledOnce);
            } finally {
                process.env.NODE_ENV = saved;
            }
        });
    });

    describe('sendRecommendationEmail', function () {
        it('should send email', async function () {
            await service.sendRecommendationEmail({
                id: 'test',
                source: new URL('https://example.com'),
                sourceTitle: 'Example',
                sourceSiteTitle: 'Example',
                sourceAuthor: 'Example',
                sourceExcerpt: 'Example',
                sourceFavicon: new URL('https://example.com/favicon.ico'),
                sourceFeaturedImage: new URL('https://example.com/featured.png')
            });
            assert(send.calledOnce);
        });

        it('ignores when mention not convertable to incoming recommendation', async function () {
            readRecommendationByUrl.rejects(new Error('test'));
            await service.sendRecommendationEmail({
                id: 'test',
                source: new URL('https://example.com'),
                sourceTitle: 'Example',
                sourceSiteTitle: 'Example',
                sourceAuthor: 'Example',
                sourceExcerpt: 'Example',
                sourceFavicon: new URL('https://example.com/favicon.ico'),
                sourceFeaturedImage: new URL('https://example.com/featured.png')
            });
            assert(!send.calledOnce);
        });
    });

    describe('listIncomingRecommendations', function () {
        beforeEach(function () {
            refreshMentions = sinon.stub().resolves();
            send = sinon.stub().resolves();
            readRecommendationByUrl = sinon.stub().resolves(null);
            service = new IncomingRecommendationService({
                recommendationService: {
                    readRecommendationByUrl
                } as any as RecommendationService,
                mentionsApi: {
                    refreshMentions,
                    listMentions: () => Promise.resolve({data: [
                        {
                            id: 'Incoming recommendation',
                            source: new URL('https://incoming-rec.com/.well-known/recommendations.json'),
                            sourceTitle: 'Incoming recommendation title',
                            sourceSiteTitle: null,
                            sourceAuthor: null,
                            sourceExcerpt: 'Incoming recommendation excerpt',
                            sourceFavicon: new URL('https://incoming-rec.com/favicon.ico'),
                            sourceFeaturedImage: new URL('https://incoming-rec.com/image.png')
                        }
                    ], meta: {
                        pagination: {
                            page: 1,
                            limit: 5,
                            pages: 1,
                            total: 1,
                            next: null,
                            prev: null
                        }
                    }})
                },
                emailService: {
                    send
                },
                emailRenderer: {
                    renderSubject: () => Promise.resolve(''),
                    renderHTML: () => Promise.resolve(''),
                    renderText: () => Promise.resolve('')
                } as any as IncomingRecommendationEmailRenderer,
                getEmailRecipients: () => Promise.resolve([
                    {
                        email: 'example@example.com'
                    }
                ])
            });
        });

        it('returns a list of incoming recommendations and pagination', async function () {
            const list = await service.listIncomingRecommendations({});

            assert.equal(list.incomingRecommendations.length, 1);
            assert.equal(list.incomingRecommendations[0].id, 'Incoming recommendation');
            assert.equal(list.incomingRecommendations[0].title, 'Incoming recommendation title');
            assert.equal(list.incomingRecommendations[0].excerpt, 'Incoming recommendation excerpt');
            assert.equal(list.incomingRecommendations[0].url.toString(), 'https://incoming-rec.com/');
            assert.equal(list.incomingRecommendations[0].favicon?.toString(), 'https://incoming-rec.com/favicon.ico');
            assert.equal(list.incomingRecommendations[0].featuredImage?.toString(), 'https://incoming-rec.com/image.png');

            assert.equal(list.meta?.pagination.page, 1);
            assert.equal(list.meta?.pagination.limit, 5);
            assert.equal(list.meta?.pagination.pages, 1);
            assert.equal(list.meta?.pagination.total, 1);
            assert.equal(list.meta?.pagination.prev, null);
            assert.equal(list.meta?.pagination.next, null);
        });
    });
});
