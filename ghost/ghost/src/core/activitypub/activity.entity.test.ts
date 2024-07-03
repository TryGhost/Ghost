import assert from 'assert';
import {Activity} from './activity.entity';
import {URI} from './uri.object';
import {Article} from './article.object';
import ObjectID from 'bson-objectid';
import {Actor} from './actor.entity';

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

        it('Can correctly reconstruct', function () {
            const actor = Actor.create({username: 'testing'});
            const article = Article.fromPost({
                id: new ObjectID(),
                title: 'My Title',
                slug: 'my-title',
                html: '<p> big boi contents </p>',
                excerpt: 'lil contents',
                authors: ['Jeremy Paxman'],
                url: new URI('blah'),
                publishedAt: new Date(),
                featuredImage: null,
                visibility: 'public'
            });
            const activity = new Activity({
                type: 'Create',
                activity: null,
                actor: actor,
                object: article,
                to: new URI('bloo')
            });

            const baseUrl = new URL('https://ghost.org');

            const input = activity.getJSONLD(baseUrl);

            const created = Activity.fromJSONLD(input);

            assert.deepEqual(created.getJSONLD(baseUrl), input);
        });
    });
});
