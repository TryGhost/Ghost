import assert from 'assert';
import {Activity} from '../core/activitypub/activity.entity';
import {ActivityEvent} from '../core/activitypub/activity.event';
import {Actor} from '../core/activitypub/actor.entity';
import {TheWorld} from '../core/activitypub/tell-the-world.service';
import {URI} from '../core/activitypub/uri.object';
import {ActivityListener} from './activity.listener';

describe('ActivityListener', function () {
    describe('#dispatchActivity', function () {
        it('uses the service to deliver the activity', function () {
            let called = false;
            const calledWith: [unknown, unknown][] = [];
            class MockTheWorld extends TheWorld {
                async deliverActivity(activity: Activity, actor: Actor): Promise<void> {
                    called = true;
                    calledWith.push([activity, actor]);
                }
            }
            const listener = new ActivityListener(new MockTheWorld(new URL('https://example.com'), console));

            const actor = Actor.create({
                username: 'Testing'
            });

            const toFollow = new URI('https://example.com/user');

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

            const event = new ActivityEvent({
                activity,
                actor
            });

            listener.dispatchActivity(event);

            assert.equal(called, true);
            assert.equal(calledWith[0][0], activity);
            assert.equal(calledWith[0][1], actor);
        });
    });
});
