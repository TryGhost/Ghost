import ObjectID from 'bson-objectid';
import {ActivityService} from './activity.service';
import {Actor} from './actor.entity';
import assert from 'assert';
import {URI} from './uri.object';

describe('ActivityService', function () {
    describe('#createArticleForPost', function () {
        it('Adds a Create activity for an Article Object to the default actors Outbox', async function () {
            const actor = Actor.create({username: 'testing'});
            const mockActorRepository = {
                async getOne() {
                    return actor;
                },
                async save() {}
            };
            const mockPostRepository = {
                async getOne(id: ObjectID) {
                    return {
                        id: id,
                        title: 'Testing',
                        slug: 'testing',
                        html: '<p> Testing stuff.. </p>',
                        visibility: 'public',
                        authors: ['Mr Bean'],
                        publishedAt: new Date(),
                        featuredImage: null,
                        excerpt: 'Small text',
                        url: new URI('blah')
                    };
                }
            };
            const service = new ActivityService(
                mockActorRepository,
                mockPostRepository
            );

            const postId = new ObjectID();

            await service.createArticleForPost(postId);

            const found = actor.outbox.find(activity => activity.type === 'Create');

            assert.ok(found);
        });

        it('Does not add a Create activity for non public posts', async function () {
            const actor = Actor.create({username: 'testing'});
            const mockActorRepository = {
                async getOne() {
                    return actor;
                },
                async save() {}
            };
            const mockPostRepository = {
                async getOne(id: ObjectID) {
                    return {
                        id: id,
                        title: 'Testing',
                        slug: 'testing',
                        html: '<p> Testing stuff.. </p>',
                        visibility: 'private',
                        authors: ['Mr Bean'],
                        publishedAt: new Date(),
                        featuredImage: null,
                        excerpt: 'Small text',
                        url: new URI('blah')
                    };
                }
            };
            const service = new ActivityService(
                mockActorRepository,
                mockPostRepository
            );

            const postId = new ObjectID();

            await service.createArticleForPost(postId);

            const found = actor.outbox.find(activity => activity.type === 'Create');

            assert.ok(!found);
        });

        it('Throws when post is not found', async function () {
            const actor = Actor.create({username: 'testing'});
            const mockActorRepository = {
                async getOne() {
                    return actor;
                },
                async save() {}
            };
            const mockPostRepository = {
                async getOne() {
                    return null;
                }
            };
            const service = new ActivityService(
                mockActorRepository,
                mockPostRepository
            );

            const postId = new ObjectID();

            await assert.rejects(async () => {
                await service.createArticleForPost(postId);
            }, /Post not found/);
        });

        it('Throws when actor is not found', async function () {
            const mockActorRepository = {
                async getOne() {
                    return null;
                },
                async save() {}
            };
            const mockPostRepository = {
                async getOne(id: ObjectID) {
                    return {
                        id: id,
                        title: 'Testing',
                        slug: 'testing',
                        html: '<p> Testing stuff.. </p>',
                        visibility: 'private',
                        authors: ['Mr Bean'],
                        publishedAt: new Date(),
                        featuredImage: null,
                        excerpt: 'Small text',
                        url: new URI('blah')
                    };
                }
            };
            const service = new ActivityService(
                mockActorRepository,
                mockPostRepository
            );

            const postId = new ObjectID();

            await assert.rejects(async () => {
                await service.createArticleForPost(postId);
            }, /Actor not found/);
        });
    });
});
