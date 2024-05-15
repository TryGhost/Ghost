import Sinon from 'sinon';
import {Actor} from './actor.entity';
import {JSONLDService} from './jsonld.service';
import assert from 'assert';
import ObjectID from 'bson-objectid';

describe('JSONLDService', function () {
    describe('#getActor', function () {
        it('Returns JSONLD representation of Actor', async function () {
            const actor = Actor.create({username: 'freddy'});
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(actor),
                save: Sinon.stub().rejects()
            };
            const mockPostRepository = {
                getOne: Sinon.stub().resolves(null)
            };
            const url = new URL('https://example.com');

            const service = new JSONLDService(
                mockActorRepository,
                mockPostRepository,
                url
            );

            const result = await service.getActor(actor.id);

            assert(result);
            assert.equal(result.type, 'Person');
        });
    });
    describe('#getOutbox', function () {
        it('returns JSONLD representation of Outbox', async function () {
            const actor = Actor.create({username: 'freddy'});
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(actor),
                save: Sinon.stub().rejects()
            };
            const mockPostRepository = {
                getOne: Sinon.stub().resolves(null)
            };
            const url = new URL('https://example.com');

            const service = new JSONLDService(
                mockActorRepository,
                mockPostRepository,
                url
            );

            const result = await service.getOutbox(actor.id);

            assert(result);
            assert.equal(result.type, 'OrderedCollection');
        });
        it('returns null if actor not found', async function () {
            const actor = Actor.create({username: 'freddy'});
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().rejects()
            };
            const mockPostRepository = {
                getOne: Sinon.stub().resolves(null)
            };
            const url = new URL('https://example.com');

            const service = new JSONLDService(
                mockActorRepository,
                mockPostRepository,
                url
            );

            const result = await service.getOutbox(actor.id);

            assert.equal(result, null);
        });
    });
    describe('#getArticle', function () {
        it('Throws if no post found', async function () {
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().rejects()
            };
            const mockPostRepository = {
                getOne: Sinon.stub().resolves(null)
            };
            const url = new URL('https://example.com');

            const service = new JSONLDService(
                mockActorRepository,
                mockPostRepository,
                url
            );

            await assert.rejects(async () => {
                await service.getArticle(new ObjectID());
            });
        });

        it('Throws if post not public', async function () {
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().rejects()
            };
            const mockPostRepository = {
                getOne: Sinon.stub().resolves({
                    visibility: 'private'
                })
            };
            const url = new URL('https://example.com');

            const service = new JSONLDService(
                mockActorRepository,
                mockPostRepository,
                url
            );

            await assert.rejects(async () => {
                await service.getArticle(new ObjectID());
            });
        });
    });
});
