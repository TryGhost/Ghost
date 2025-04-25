import assert from 'assert/strict';
import {Recommendation} from '../../../../../../core/server/services/recommendations/service';

describe('Recommendation', function () {
    describe('validate', function () {
        it('Throws for an empty title', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: '',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Title must not be empty'
            });
        });

        it('Throws for a long title', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: 'a'.repeat(2001),
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Title must be less than 2000 characters'
            });
        });

        it('Throws for a long description', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: 'Test',
                    description: 'a'.repeat(201),
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Description must be less than 200 characters'
            });
        });
    });

    describe('clean', function () {
        it('sets createdAt ms to 0', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.createdAt.getMilliseconds(), 0);
        });

        it('sets updatedAt ms to 0', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.updatedAt!.getMilliseconds(), 0);
        });

        it('sets empty description to null', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.description, null);
        });

        it('sets empty excerpt to null', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: '',
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.excerpt, null);
        });

        it('truncates long excerpts', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: 'a'.repeat(2001),
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.excerpt?.length, 2000);
        });

        it('keeps search and hash params', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/?query=1#hash',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.url.toString(), 'https://example.com/?query=1#hash');
        });
    });

    describe('plain', function () {
        it('does not return instance of self', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.plain instanceof Recommendation, false);
        });
    });

    describe('edit', function () {
        it('can edit known properties', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });

            recommendation.edit({
                title: 'Updated'
            });

            assert.equal(recommendation.title, 'Updated');
            assert.notEqual(recommendation.updatedAt, null);
        });

        it('does not change updatedAt if nothing changed', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });
            assert.equal(recommendation.updatedAt, null);

            recommendation.edit({
                title: 'Test',
                url: undefined
            } as any);

            assert.equal(recommendation.title, 'Test');
            assert.equal(recommendation.url.toString(), 'https://example.com/');
            assert.equal(recommendation.updatedAt, null);
        });

        it('can not edit unknown properties', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });

            recommendation.edit({
                bla: true
            } as any);

            assert.notEqual(recommendation.updatedAt, null);
            assert.equal((recommendation as any).bla, undefined);
        });
    });

    describe('delete', function () {
        it('can delete', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });

            assert.equal(recommendation.deleted, false);
            recommendation.delete();
            assert.equal(recommendation.deleted, true);
        });
    });
});
