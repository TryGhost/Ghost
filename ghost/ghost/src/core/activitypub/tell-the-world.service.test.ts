import assert from 'assert';
import {Activity} from './activity.entity';
import {Actor} from './actor.entity';
import {TheWorld} from './tell-the-world.service';
import {URI} from './uri.object';
import nock from 'nock';

describe('TheWorld', function () {
    describe('deliverActivity', function () {
        beforeEach(function () {
            nock.disableNetConnect();
        });
        afterEach(function () {
            nock.enableNetConnect();
        });
        it('Can deliver the activity to the inbox of the desired recipient', async function () {
            const service = new TheWorld(new URL('https://base.com'), console);

            const actor = Actor.create({
                username: 'Testing'
            });

            const toFollow = new URI('https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef');

            const activity = new Activity({
                type: 'Follow',
                activity: null,
                actor: actor,
                object: {
                    type: 'Person',
                    id: toFollow
                },
                to: toFollow
            });

            const actorFetch = nock('https://main.ghost.org')
                .get('/activitypub/actor/deadbeefdeadbeefdeadbeef')
                .reply(200, {
                    inbox: 'https://main.ghost.org/activitypub/inbox/deadbeefdeadbeefdeadbeef'
                });

            const activityDelivery = nock('https://main.ghost.org')
                .post('/activitypub/inbox/deadbeefdeadbeefdeadbeef')
                .reply(201, {});

            await service.deliverActivity(activity, actor);

            assert(actorFetch.isDone(), 'Expected actor to be fetched');
            assert(activityDelivery.isDone(), 'Expected activity to be delivered');
        });

        it('Can deliver the activity to the inboxes of a collection of actors', async function () {
            const service = new TheWorld(new URL('https://base.com'), console);

            const actor = Actor.create({
                username: 'Testing'
            });

            const followers = new URI('https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef');

            const activity = new Activity({
                type: 'Create',
                activity: null,
                actor: actor,
                object: {
                    id: new URI('https://main.ghost.org/hello-world'),
                    type: 'Note',
                    content: '<p> Hello, world. </p>'
                },
                to: followers
            });

            nock('https://main.ghost.org')
                .get('/activitypub/followers/deadbeefdeadbeefdeadbeef')
                .reply(200, {
                    '@context': '',
                    type: 'Collection',
                    totalItems: 3,
                    items: [
                        'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef',
                        {
                            id: 'https://main.ghost.org/activitypub/actor/beefdeadbeefdeadbeefdead'
                        },
                        {
                            invalid: true
                        }
                    ]
                });

            nock('https://main.ghost.org')
                .get('/activitypub/actor/deadbeefdeadbeefdeadbeef')
                .reply(200, {
                    inbox: 'https://main.ghost.org/activitypub/inbox/deadbeefdeadbeefdeadbeef'
                });

            nock('https://main.ghost.org')
                .get('/activitypub/actor/beefdeadbeefdeadbeefdead')
                .reply(200, {
                    inbox: 'https://main.ghost.org/activitypub/inbox/beefdeadbeefdeadbeefdead'
                });

            const firstActivityDelivery = nock('https://main.ghost.org')
                .post('/activitypub/inbox/deadbeefdeadbeefdeadbeef')
                .reply(201, {});

            const secondActivityDelivery = nock('https://main.ghost.org')
                .post('/activitypub/inbox/beefdeadbeefdeadbeefdead')
                .reply(201, {});

            await service.deliverActivity(activity, actor);

            assert(firstActivityDelivery.isDone(), 'Expected activity to be delivered');
            assert(secondActivityDelivery.isDone(), 'Expected activity to be delivered');
        });
    });
});
