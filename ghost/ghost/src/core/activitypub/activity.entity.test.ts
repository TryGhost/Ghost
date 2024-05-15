import assert from 'assert';
import {Activity} from './activity.entity';
import {URI} from './uri.object';

describe('Activity', function () {
    describe('fromJSONLD', function () {
        it('Can construct an entity from JSONLD with various id types', async function () {
            const input = {
                id: new URI('https://site.com/activity'),
                type: 'Follow',
                actor: {
                    id: 'https://site.com/actor'
                },
                object: 'https://site.com/object'
            };

            const activity = Activity.fromJSONLD(input);
            assert(activity);
        });

        it('Will throw for unknown types', async function () {
            const input = {
                id: new URI('https://site.com/activity'),
                type: 'Unknown',
                actor: {
                    id: 'https://site.com/actor'
                },
                object: 'https://site.com/object'
            };

            assert.throws(() => {
                Activity.fromJSONLD(input);
            });
        });

        it('Will throw for missing actor,object or type', async function () {
            const input = {
                id: new URI('https://site.com/activity'),
                type: 'Unknown',
                actor: {
                    id: 'https://site.com/actor'
                },
                object: 'https://site.com/object'
            };

            for (const prop of ['actor', 'object', 'type']) {
                const modifiedInput = Object.create(input);
                delete modifiedInput[prop];
                assert.throws(() => {
                    Activity.fromJSONLD(modifiedInput);
                });
            }
        });
    });
});
