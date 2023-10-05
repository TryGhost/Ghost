import assert from 'assert/strict';
import {Recommendation} from '../src';

describe('Recommendation', function () {
    describe('validate', function () {
        it('Throws for an empty title', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: '',
                    reason: null,
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
                    reason: null,
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

        it('Throws for a long reason', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: 'Test',
                    reason: 'a'.repeat(2001),
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Reason must be less than 2000 characters'
            });
        });

        it('Throws for a long excerpt', function () {
            assert.throws(() => {
                Recommendation.validate({
                    title: 'Test',
                    reason: null,
                    excerpt: 'a'.repeat(2001),
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Excerpt must be less than 2000 characters'
            });
        });
    });

    describe('clean', function () {
        it('sets createdAt ms to 0', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                reason: null,
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
                reason: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.updatedAt!.getMilliseconds(), 0);
        });

        it('sets empty reason to null', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                reason: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.reason, null);
        });

        it('removes search and hash params', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                reason: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/?query=1#hash',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });

            assert.equal(recommendation.url.toString(), 'https://example.com/');
        });
    });

    describe('plain', function () {
        it('does not return instance of self', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                reason: null,
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
                reason: null,
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

        it('can not edit unknown properties', function () {
            const recommendation = Recommendation.create({
                title: 'Test',
                reason: null,
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
                reason: null,
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
