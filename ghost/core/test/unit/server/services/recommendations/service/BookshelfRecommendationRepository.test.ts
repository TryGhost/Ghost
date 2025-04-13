import assert from 'assert/strict';
import {BookshelfRecommendationRepository, Recommendation} from '../../../../../../core/server/services/recommendations/service';
import sinon from 'sinon';

describe('BookshelfRecommendationRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('toPrimitive', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        assert.deepEqual(
            repository.toPrimitive(Recommendation.create({
                id: 'id',
                title: 'title',
                description: 'description',
                excerpt: 'excerpt',
                featuredImage: new URL('https://example.com'),
                favicon: new URL('https://example.com'),
                url: new URL('https://example.com'),
                oneClickSubscribe: true,
                createdAt: new Date('2021-01-01'),
                updatedAt: new Date('2021-01-02')
            })),
            {
                id: 'id',
                title: 'title',
                description: 'description',
                excerpt: 'excerpt',
                featured_image: 'https://example.com/',
                favicon: 'https://example.com/',
                url: 'https://example.com/',
                one_click_subscribe: true,
                created_at: new Date('2021-01-01'),
                updated_at: new Date('2021-01-02')
            }
        );
    });

    it('modelToEntity', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key: string) => {
                return {
                    title: 'title',
                    description: 'description',
                    excerpt: 'excerpt',
                    featured_image: 'https://example.com/',
                    favicon: 'https://example.com/',
                    url: 'https://example.com/',
                    one_click_subscribe: true,
                    created_at: new Date('2021-01-01'),
                    updated_at: new Date('2021-01-02')
                }[key];
            }
        } as any);

        assert.deepEqual(
            entity,
            Recommendation.create({
                id: 'id',
                title: 'title',
                description: 'description',
                excerpt: 'excerpt',
                featuredImage: new URL('https://example.com'),
                favicon: new URL('https://example.com'),
                url: new URL('https://example.com'),
                oneClickSubscribe: true,
                createdAt: new Date('2021-01-01'),
                updatedAt: new Date('2021-01-02')
            })
        );
    });

    it('modelToEntity returns null on errors', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: {
                captureException
            }
        });

        sinon.stub(Recommendation, 'create').throws(new Error('test'));
        const entity = repository.modelToEntity({
            id: 'id',
            get: () => {
                return null;
            }
        } as any);

        assert.deepEqual(
            entity,
            null
        );
        sinon.assert.calledOnce(captureException);
    });

    it('getByUrl returns null if not found', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const stub = sinon.stub(repository, 'getAll').returns(Promise.resolve([]));
        const entity = await repository.getByUrl(new URL('https://example.com'));

        assert.deepEqual(
            entity,
            null
        );
        sinon.assert.calledOnce(stub);
    });

    it('getByUrl returns null if not matching path', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const recommendation = Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/other-path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));

        assert.equal(
            entity,
            null
        );
        sinon.assert.calledOnce(stub);
    });

    it('getByUrl returns if matching hostname and pathname', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const recommendation = Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));

        assert.equal(
            entity,
            recommendation
        );
        sinon.assert.calledOnce(stub);
    });

    it('getByUrl returns if matching hostname and pathname, but not query params', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const recommendation = Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path/?query=param'));

        assert.equal(
            entity,
            recommendation
        );
        sinon.assert.calledOnce(stub);
    });

    it('getByUrl returns if matching hostname and pathname, but not hash fragments', async function () {
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: undefined
        });
        const recommendation = Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path/#section1'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));

        assert.equal(
            entity,
            recommendation
        );
        sinon.assert.calledOnce(stub);
    });

    it('getFieldToColumnMap returns', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: {
                captureException
            }
        });

        assert.ok(repository.getFieldToColumnMap());
    });

    it('applyCustomQuery returns', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfRecommendationRepository({} as any, {
            sentry: {
                captureException
            }
        });

        const builder = {
            select: function (arg: any) {
                if (typeof arg === 'function') {
                    arg(this);
                }
            },
            count: function () {
                return this;
            },
            from: function () {
                return this;
            },
            where: function () {
                return this;
            },
            as: function () {
                return this;
            },
            client: {
                raw: function () {
                    return '';
                }
            }
        } as any;

        assert.doesNotThrow(() => {
            repository.applyCustomQuery(
                builder,
                {
                    include: ['clickCount', 'subscriberCount']
                }
            );
        });

        assert.doesNotThrow(() => {
            repository.applyCustomQuery(
                builder,
                {
                    include: [],
                    order: [
                        {
                            field: 'clickCount',
                            direction: 'asc'
                        },
                        {
                            field: 'subscriberCount',
                            direction: 'desc'
                        }
                    ]
                }
            );
        });
    });
});
