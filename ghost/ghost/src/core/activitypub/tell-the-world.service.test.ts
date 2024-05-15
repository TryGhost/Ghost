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
            const service = new TheWorld(new URL('https://base.com'));

            const actor = Actor.create({
                username: 'Testing'
            });

            const toFollow = new URI('https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef');

            const activity = new Activity({
                type: 'Follow',
                activity: null,
                actor: actor.actorId,
                object: {
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
    });
});
