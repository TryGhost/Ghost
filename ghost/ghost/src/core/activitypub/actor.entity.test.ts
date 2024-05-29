import crypto from 'node:crypto';
import {Actor} from './actor.entity';
import {HTTPSignature} from './http-signature.service';
import assert from 'node:assert';
import {URI} from './uri.object';
import {ActivityEvent} from './activity.event';
import {Activity} from './activity.entity';
import {Article} from './article.object';
import ObjectID from 'bson-objectid';

describe('Actor', function () {
    describe('getters', function () {
        describe('displayName', function () {
            it('Uses displayName, but falls back to username', function () {
                const hasDisplayName = Actor.create({
                    username: 'username',
                    displayName: 'displayName'
                });

                const doesnaeHaveDisplayName = Actor.create({
                    username: 'username'
                });

                assert.equal(hasDisplayName.displayName, 'displayName');
                assert.equal(doesnaeHaveDisplayName.displayName, 'username');
            });
        });

        describe('actorId', function () {
            it('Correctly returns the actor url', function () {
                const actor = Actor.create({username: 'testing'});
                const idString = actor.id.toHexString();
                const actorId = actor.actorId;

                const baseUrl = new URL('https://domain.tld/base');

                assert.equal(
                    actorId.getValue(baseUrl),
                    `https://domain.tld/base/actor/${idString}`
                );
            });
        });
    });

    describe('#createArticle', function () {
        it('Adds an activity to the outbox', function () {
            const actor = Actor.create({username: 'username'});

            const article = Article.fromPost({
                id: new ObjectID(),
                title: 'Post Title',
                slug: 'post-slug',
                html: '<p>Hello world</p>',
                visibility: 'public',
                url: new URI(''),
                authors: ['Mr Burns'],
                featuredImage: null,
                publishedAt: null,
                excerpt: 'Hey'
            });

            actor.createArticle(article);

            const found = actor.outbox.find((value) => {
                return value.type === 'Create';
            });

            assert.ok(found);
        });
    });

    describe('#sign', function () {
        it('returns a request with a valid Signature header', async function () {
            const baseUrl = new URL('https://example.com/ap');
            const actor = Actor.create({
                username: 'Testing'
            });

            const url = new URL('https://some-server.com/users/username/inbox');
            const date = new Date();
            const request = new Request(url, {
                headers: {
                    Host: url.host,
                    Date: date.toISOString(),
                    Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
                }
            });

            const signedRequest = await actor.sign(request, baseUrl);

            const publicKey = actor.getJSONLD(baseUrl).publicKey;

            class MockHTTPSignature extends HTTPSignature {
                protected static async getPublicKey() {
                    return crypto.createPublicKey(publicKey.publicKeyPem);
                }
            }

            const signedRequestURL = new URL(signedRequest.url);

            const actual = await MockHTTPSignature.validate(
                signedRequest.method,
                signedRequestURL.pathname,
                signedRequest.headers
            );

            const expected = true;

            assert.equal(actual, expected, 'The signature should have been valid');
        });
    });

    describe('#follow', function () {
        it('Creates a Follow activity', async function () {
            const actor = Actor.create({username: 'TestingFollow'});

            const actorToFollow = {
                id: new URI('https://activitypub.server/actor'),
                username: '@user@domain'
            };

            actor.follow(actorToFollow);

            Actor.getActivitiesToSave(actor, function (activities) {
                const followActivity = activities.find(activity => activity.type === 'Follow');

                assert.equal(followActivity?.objectId.href, actorToFollow.id.href);
            });

            Actor.getEventsToDispatch(actor, function (events) {
                const followActivityEvent: ActivityEvent = (events.find(event => (event as ActivityEvent).data.activity?.type === 'Follow') as ActivityEvent);

                assert.equal(followActivityEvent.data.activity.objectId.href, actorToFollow.id.href);
            });
        });
    });

    describe('#postToInbox', function () {
        it('Handles Follow activities', async function () {
            const actor = Actor.create({username: 'TestingPostToInbox'});

            const newFollower = new URI('https://activitypub.server/actor');

            const followActivity = new Activity({
                activity: new URI(`https://activitypub.server/activity`),
                type: 'Follow',
                actor: {
                    id: newFollower,
                    type: 'Person'
                },
                object: {
                    id: actor.actorId,
                    type: 'Person'
                },
                to: actor.actorId
            });

            await actor.postToInbox(followActivity);

            assert(actor.followers.find(follower => follower.id.href === newFollower.href));
        });

        it('Throws if the Follow activity is anonymous', async function () {
            const actor = Actor.create({username: 'TestingPostToInbox'});

            const newFollower = new URI('https://activitypub.server/actor');

            const followActivity = new Activity({
                activity: null,
                type: 'Follow',
                actor: {
                    id: newFollower,
                    type: 'Person'
                },
                object: {
                    id: actor.actorId,
                    type: 'Person'
                },
                to: actor.actorId
            });

            let error: unknown = null;
            try {
                await actor.postToInbox(followActivity);
            } catch (err) {
                error = err;
            }

            assert.ok(error);
        });

        it('Handles Accept activities', async function () {
            const actor = Actor.create({username: 'TestingPostToInbox'});

            const newFollower = new URI('https://activitypub.server/actor');

            const activity = new Activity({
                activity: null,
                type: 'Accept',
                actor: {
                    id: newFollower,
                    type: 'Person'
                },
                object: {
                    id: newFollower,
                    type: 'Person'
                },
                to: actor.actorId
            });

            await actor.postToInbox(activity);

            assert(actor.following.find(follower => follower.id.href === newFollower.href));
            assert(actor.following.find(follower => follower.username === '@index@activitypub.server'));
        });
    });

    describe('#toJSONLD', function () {
        it('Returns valid JSONLD', async function () {
            const actor = Actor.create({username: 'TestingJSONLD'});

            const baseUrl = new URL('https://example.com');

            const jsonld = actor.getJSONLD(baseUrl);

            assert.ok(jsonld);
        });
    });
});
