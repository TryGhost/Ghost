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
                process.env.NODE_ENV = 'development';
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                assert(refreshMentions.calledOnce);
            } finally {
                process.env.NODE_ENV = saved;
            }
        });

        it('ignores errors when update incoming recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'development';

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
});
