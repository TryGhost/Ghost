import crypto from 'node:crypto';
import {Actor} from './actor.entity';
import {HTTPSignature} from './http-signature.service';
import assert from 'node:assert';
import {URI} from './uri.object';
import {ActivityEvent} from './activity.event';
import {Activity} from './activity.entity';

describe('Actor', function () {
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

            const actorToFollow = new URI('https://activitypub.server/actor');

            actor.follow(actorToFollow);

            Actor.getActivitiesToSave(actor, function (activities) {
                const followActivity = activities.find(activity => activity.type === 'Follow');

                assert.equal(followActivity?.objectId.href, actorToFollow.href);
            });

            Actor.getEventsToDispatch(actor, function (events) {
                const followActivityEvent: ActivityEvent = (events.find(event => (event as ActivityEvent).data.activity?.type === 'Follow') as ActivityEvent);

                assert.equal(followActivityEvent.data.activity.objectId.href, actorToFollow.href);
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
                actor: newFollower,
                object: actor.actorId,
                to: actor.actorId
            });

            await actor.postToInbox(followActivity);

            assert(actor.followers.find(follower => follower.href === newFollower.href));
        });
    });
});
