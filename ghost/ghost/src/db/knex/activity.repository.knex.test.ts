import assert from 'assert';
import Sinon from 'sinon';
import {ActivityRepositoryKnex} from './activity.repository.knex';
import {Activity} from '../../core/activitypub/activity.entity';
import {Actor} from '../../core/activitypub/actor.entity';
import {Article} from '../../core/activitypub/article.object';
import {URI} from '../../core/activitypub/uri.object';
import ObjectID from 'bson-objectid';

describe('ActivityRepositoryKnex', function () {
    describe('#getOne', function () {
        it('Returns null if no activity found', async function () {
            const mockKnex = Sinon.stub().callsFake(() => {
                return {
                    select: Sinon.stub().resolves(null),
                    where: Sinon.stub().returnsThis(),
                    first: Sinon.stub().resolves(null)
                };
            });

            const repository = new ActivityRepositoryKnex(
                mockKnex
            );

            const id = new URL('https://example.com/test');

            const result = await repository.getOne(id);
            assert.strictEqual(result, null);
        });

        it('Returns an activity if found', async function () {
            const mockKnex = Sinon.stub().callsFake(() => {
                return {
                    select: Sinon.stub().resolves(null),
                    where: Sinon.stub().returnsThis(),
                    first: Sinon.stub().resolves({
                        id: '5f7a7b2b7e3b3c001f3f4e8b',
                        url: 'https://main.ghost.org/activitypub/activity/664e1c647c594100013c6d57',
                        type: 'Create',
                        created_at: '2024-05-22 16:25:09',
                        updated_at: '2024-05-22 16:25:10',
                        data: {id: '664e1c654705e237455472e3',
                            to: 'https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef',
                            type: 'Create',
                            actor: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', url: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', icon: '', name: 'The Main', type: 'Person', image: '', inbox: 'https://main.ghost.org/activitypub/inbox/deadbeefdeadbeefdeadbeef', outbox: 'https://main.ghost.org/activitypub/outbox/deadbeefdeadbeefdeadbeef', summary: 'The bio for the actor', '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1', {featured: {'@id': 'http://joinmastodon.org/ns#featured', '@type': '@id'}}, {discoverable: {'@id': 'http://joinmastodon.org/ns#discoverable', '@type': '@id'}}, {manuallyApprovesFollowers: {'@id': 'http://joinmastodon.org/ns#manuallyApprovesFollowers', '@type': '@id'}}, {value: 'schema:value', schema: 'http://schema.org#', PropertyValue: 'schema:PropertyValue'}], featured: 'https://main.ghost.org/activitypub/featured/deadbeefdeadbeefdeadbeef', followers: 'https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef', following: 'https://main.ghost.org/activitypub/following/deadbeefdeadbeefdeadbeef', publicKey: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef#main-key', owner: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', publicKeyPem: '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBANRpUrwk7x7bJDddHmrYSWVw9enVPMFm5qAW7fTgoZ7x2PoJUIqy/bkqpXZ0SmZs\nsLO3UZm+yN/DqxioD8BnhhD0N8Ydv6+UniT7hE2tHvsMxQIq2jet1auSBZNFmUIWodsBxI/R\ntm+KwFBFk+P+MvVsGZ2K3Rkd4K0dv0/45dtXAgMBAAE=\n-----END RSA PUBLIC KEY-----\n'}, published: '1970-01-01T00:00:00Z', attachment: [{name: 'Website', type: 'PropertyValue', value: '<a href=\'https://main.ghost.org/activitypub/\'>main.ghost.org</a>'}], discoverable: true, preferredUsername: 'index', manuallyApprovesFollowers: false}, object: {id: 'https://main.ghost.org/activitypub/article/664e1c557c594100013c6d44', url: 'https://main.ghost.org/activitypub/', name: 'My Post to you', type: 'Article', content: '<p>... proudly delivered by ActivityPub</p>', preview: {type: 'Note', content: '... proudly delivered by ActivityPub'}, '@context': 'https://www.w3.org/ns/activitystreams', published: '2024-05-22T16:25:07.000Z', attributedTo: [{name: 'Main Owner', type: 'Person'}]}},
                        internal: 0
                    })
                };
            });

            const repository = new ActivityRepositoryKnex(
                mockKnex
            );

            const id = new URL('https://main.ghost.org/activitypub/activity/664e1c647c594100013c6d57');

            const result = await repository.getOne(id);
            assert.ok(result);
            assert.strictEqual(result.id.toString(), '5f7a7b2b7e3b3c001f3f4e8b');

            assert.equal(result instanceof Activity, true);

            assert.equal(result.activityId instanceof URI, true);
            assert.equal(result.activityId?.href, 'https://main.ghost.org/activitypub/activity/664e1c647c594100013c6d57');

            assert.equal(result.type, 'Create');
            assert.ok(result.getObject(id));

            const objectResult = result.getObject(id);
            assert.ok(objectResult['@context']);
            assert.equal(objectResult.type, 'Article');
            assert.equal(objectResult.name , 'My Post to you');

            assert.ok(result.getActor(id));

            const actorResult = result.getActor(id);
            assert.ok(actorResult['@context']);
            assert.equal(actorResult.type, 'Person');
            assert.ok(actorResult.id);
            assert.ok(actorResult.inbox);
            assert.ok(actorResult.outbox);
            assert.ok(actorResult.following);
            assert.ok(actorResult.followers);

            assert.ok(actorResult.publicKey);
            assert.ok(actorResult.publicKey.publicKeyPem);
        });
    });

    describe('#save', function () {
        it('Saves a new activity', async function () {
            const mockKnex = Sinon.stub().callsFake(() => {
                return {
                    where: Sinon.stub().returnsThis(),
                    first: Sinon.stub().resolves(null),
                    insert: Sinon.stub().resolves()
                };
            });

            const repository = new ActivityRepositoryKnex(
                mockKnex
            );

            const actor = Actor.create({username: 'test'});
            const articleObject = Article.fromPost({
                id: ObjectID.createFromHexString('5f7a7b2b7e3b3c001f3f4e8b'),
                title: 'My Title',
                slug: 'my-title',
                html: '<p> big boi contents </p>',
                visibility: 'public',
                featuredImage: null,
                url: new URI('https://example.com/test'),
                publishedAt: new Date(),
                authors: ['Jeremy Paxman'],
                excerpt: 'lil contents'
            });

            const activity = Activity.create({
                activity: new URI('https://example.com/test'),
                type: 'Create',
                actor,
                object: articleObject,
                to: new URI('https://example.com/test')
            });

            // expect not to throw an error
            await repository.save(activity);
        });

        it('Updates an existing activity', async function () {
            const mockKnex = Sinon.stub().callsFake(() => {
                return {
                    where: Sinon.stub().returnsThis(),
                    first: Sinon.stub().resolves({
                        id: '5f7a7b2b7e3b3c001f3f4e8b',
                        url: 'https://main.ghost.org/activitypub/activity/664e1c647c594100013c6d57',
                        type: 'Create',
                        created_at: '2024-05-22 16:25:09',
                        updated_at: '2024-05-22 16:25:10',
                        data: {id: '664e1c654705e237455472e3',
                            to: 'https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef',
                            type: 'Create',
                            actor: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', url: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', icon: '', name: 'The Main', type: 'Person', image: '', inbox: 'https://main.ghost.org/activitypub/inbox/deadbeefdeadbeefdeadbeef', outbox: 'https://main.ghost.org/activitypub/outbox/deadbeefdeadbeefdeadbeef', summary: 'The bio for the actor', '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1', {featured: {'@id': 'http://joinmastodon.org/ns#featured', '@type': '@id'}}, {discoverable: {'@id': 'http://joinmastodon.org/ns#discoverable', '@type': '@id'}}, {manuallyApprovesFollowers: {'@id': 'http://joinmastodon.org/ns#manuallyApprovesFollowers', '@type': '@id'}}, {value: 'schema:value', schema: 'http://schema.org#', PropertyValue: 'schema:PropertyValue'}], featured: 'https://main.ghost.org/activitypub/featured/deadbeefdeadbeefdeadbeef', followers: 'https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef', following: 'https://main.ghost.org/activitypub/following/deadbeefdeadbeefdeadbeef', publicKey: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef#main-key', owner: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', publicKeyPem: '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBANRpUrwk7x7bJDddHmrYSWVw9enVPMFm5qAW7fTgoZ7x2PoJUIqy/bkqpXZ0SmZs\nsLO3UZm+yN/DqxioD8BnhhD0N8Ydv6+UniT7hE2tHvsMxQIq2jet1auSBZNFmUIWodsBxI/R\ntm+KwFBFk+P+MvVsGZ2K3Rkd4K0dv0/45dtXAgMBAAE=\n-----END RSA PUBLIC KEY-----\n'}, published: '1970-01-01T00:00:00Z', attachment: [{name: 'Website', type: 'PropertyValue', value: '<a href=\'https://main.ghost.org/activitypub/\'>main.ghost.org</a>'}], discoverable: true, preferredUsername: 'index', manuallyApprovesFollowers: false}, object: {id: 'https://main.ghost.org/activitypub/article/664e1c557c594100013c6d44', url: 'https://main.ghost.org/activitypub/', name: 'My Post to you', type: 'Article', content: '<p>... proudly delivered by ActivityPub</p>', preview: {type: 'Note', content: '... proudly delivered by ActivityPub'}, '@context': 'https://www.w3.org/ns/activitystreams', published: '2024-05-22T16:25:07.000Z', attributedTo: [{name: 'Main Owner', type: 'Person'}]}},
                        internal: 0
                    }),
                    update: Sinon.stub().resolves()
                };
            });

            const repository = new ActivityRepositoryKnex(
                mockKnex
            );

            const actor = Actor.create({username: 'test'});
            const articleObject = Article.fromPost({
                id: ObjectID.createFromHexString('5f7a7b2b7e3b3c001f3f4e8b'),
                title: 'Updated Title',
                slug: 'update-title',
                html: '<p> big boi contents </p>',
                visibility: 'public',
                featuredImage: null,
                url: new URI('https://example.com/test'),
                publishedAt: new Date(),
                authors: ['Jeremy Paxman'],
                excerpt: 'lil contents'
            });

            const activity = Activity.create({
                activity: new URI('https://example.com/test'),
                type: 'Update',
                actor,
                object: articleObject,
                to: new URI('https://example.com/test')
            });

            // expect not to throw an error
            await repository.save(activity);
        });
    });
});
