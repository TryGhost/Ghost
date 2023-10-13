import assert from 'assert/strict';
import {ClickEvent, InMemoryRecommendationRepository, Recommendation, RecommendationService, SubscribeEvent, WellknownService} from '../src';
import {InMemoryRepository} from '@tryghost/in-memory-repository';
import sinon from 'sinon';

class InMemoryClickEventRepository<T extends ClickEvent|SubscribeEvent> extends InMemoryRepository<string, T> {
    toPrimitive(entity: T): object {
        return entity;
    }
}

describe('RecommendationService', function () {
    let service: RecommendationService;
    let enabled = false;

    beforeEach(function () {
        enabled = false;
        service = new RecommendationService({
            repository: new InMemoryRecommendationRepository(),
            clickEventRepository: new InMemoryClickEventRepository<ClickEvent>(),
            subscribeEventRepository: new InMemoryClickEventRepository<SubscribeEvent>(),
            wellknownService: {
                getPath() {
                    return '';
                },
                getURL() {
                    return new URL('http://localhost/.well-known/recommendations.json');
                },
                set() {
                    return Promise.resolve();
                }
            } as unknown as WellknownService,
            mentionSendingService: {
                sendAll() {
                    return Promise.resolve();
                }
            },
            recommendationEnablerService: {
                getSetting() {
                    return enabled.toString();
                },
                setSetting(e) {
                    enabled = e === 'true';
                    return Promise.resolve();
                }
            }
        });
    });

    describe('init', function () {
        it('should update wellknown', async function () {
            const updateWellknown = sinon.stub(service.wellknownService, 'set').resolves();
            await service.init();
            assert(updateWellknown.calledOnce);
        });
    });

    describe('updateRecommendationsEnabledSetting', function () {
        it('should set to true if more than one', async function () {
            enabled = false;
            await service.updateRecommendationsEnabledSetting([
                Recommendation.create({
                    url: 'http://localhost/1',
                    title: 'Test',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    oneClickSubscribe: false
                })
            ]);
            assert(enabled);
        });

        it('should keep enabled true if already enabled', async function () {
            enabled = true;
            await service.updateRecommendationsEnabledSetting([
                Recommendation.create({
                    url: 'http://localhost/1',
                    title: 'Test',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    oneClickSubscribe: false
                })
            ]);
            assert(enabled);
        });

        it('should set to false if none', async function () {
            enabled = false;
            await service.updateRecommendationsEnabledSetting([]);
            assert.equal(enabled, false);
        });

        it('should set to false if none if currently enabled', async function () {
            enabled = true;
            await service.updateRecommendationsEnabledSetting([]);
            assert.equal(enabled, false);
        });
    });

    describe('readRecommendation', function () {
        it('throws if not found', async function () {
            await assert.rejects(() => service.readRecommendation('1'), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });

        it('returns plain if found', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const response = await service.readRecommendation('2');
            assert.deepEqual(response, recommendation.plain);

            // Check not instance of Recommendation
            assert.equal(response instanceof Recommendation, false);
        });
    });

    describe('addRecommendation', function () {
        it('throws if already exists', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            await assert.rejects(() => service.addRecommendation({
                url: 'http://localhost/1',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            }), {
                name: 'ValidationError',
                message: 'A recommendation with this URL already exists.'
            });
        });

        it('returns plain if sucessful', async function () {
            const response = await service.addRecommendation({
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            assert.deepEqual(response, {
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false,
                clickCount: undefined,
                subscriberCount: undefined,
                updatedAt: null,

                // Ignored
                url: response.url,
                id: response.id,
                createdAt: response.createdAt
            });

            assert(response.id);
            assert(response.url);
            assert(response.createdAt);

            assert(response.url instanceof URL);
            assert(response.createdAt instanceof Date);
        });

        it('does not throw if sendMentionToRecommendation throws', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });

            const updateRecommendationsEnabledSetting = sinon.stub(service.mentionSendingService, 'sendAll').rejects(new Error('Test'));
            await service.repository.save(recommendation);

            await assert.doesNotReject(() => service.addRecommendation({
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            }));

            assert(updateRecommendationsEnabledSetting.calledOnce);
        });
    });

    describe('editRecommendation', function () {
        it('throws if not found', async function () {
            await assert.rejects(() => service.editRecommendation('1', {
                title: 'Test 2'
            }), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });

        it('returns plain if sucessful', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const response = await service.editRecommendation('2', {
                title: 'Test 2'
            });
            assert.deepEqual(response, {
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false,
                clickCount: undefined,
                subscriberCount: undefined,

                // Ignored
                url: response.url,
                id: response.id,
                createdAt: response.createdAt,
                updatedAt: response.updatedAt
            });

            assert(response.id);
            assert(response.url);
            assert(response.createdAt);
            assert(response.updatedAt);

            assert(response.url instanceof URL);
            assert(response.createdAt instanceof Date);
            assert(response.updatedAt instanceof Date);
        });
    });

    describe('deleteRecommendation', function () {
        it('throws if not found', async function () {
            await assert.rejects(() => service.deleteRecommendation('1'), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });

        it('deletes if found', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            assert.equal(await service.repository.getCount({}), 1);
            await service.deleteRecommendation('2');
            assert.equal(await service.repository.getCount({}), 0);
        });
    });

    describe('listRecommendations', function () {
        it('returns plain if sucessful', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const response = await service.listRecommendations();
            assert.equal(response.length, 1);
            assert.equal(response[0] instanceof Recommendation, false);
        });

        it('returns pages', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const recommendation2 = Recommendation.create({
                id: '3',
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation2);

            const response = await service.listRecommendations({
                limit: 1,
                order: [
                    {
                        field: 'id',
                        direction: 'desc'
                    }
                ]
            });
            assert.equal(response.length, 1);
            assert.equal(response[0].id, '3');
            assert.equal(response[0] instanceof Recommendation, false);
        });

        it('uses a default limit and page', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const recommendation2 = Recommendation.create({
                id: '3',
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation2);

            const response = await service.listRecommendations({});
            assert.equal(response.length, 2);
            assert.equal(response[0] instanceof Recommendation, false);
            assert.equal(response[1] instanceof Recommendation, false);
        });
    });

    describe('countRecommendations', function () {
        it('returns count', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            assert.equal(await service.countRecommendations({}), 1);
        });
    });

    describe('trackClicked', function () {
        it('adds click event', async function () {
            await service.trackClicked({id: '1'});
            assert.equal(await service.clickEventRepository.getCount({}), 1);
        });
    });

    describe('trackSubscribed', function () {
        it('adds subscribe event', async function () {
            await service.trackSubscribed({id: '1', memberId: '1'});
            assert.equal(await service.subscribeEventRepository.getCount({}), 1);
        });
    });

    describe('readRecommendationByUrl', function () {
        it('returns if found', async function () {
            const recommendation = Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);

            const response = await service.readRecommendationByUrl(new URL('http://localhost/1'));
            assert.deepEqual(response, recommendation.plain);
        });

        it('returns null if not found', async function () {
            const response = await service.readRecommendationByUrl(new URL('http://localhost/1'));
            assert.equal(response, null);
        });
    });
});
