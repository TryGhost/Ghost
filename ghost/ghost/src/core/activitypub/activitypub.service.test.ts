import assert from 'assert';
import {ActivityPubService} from './activitypub.service';
import {ActorRepository} from './actor.repository';
import {WebFingerService} from './webfinger.service';
import {Actor} from './actor.entity';
import Sinon from 'sinon';
import {URI} from './uri.object';

describe('ActivityPubService', function () {
    describe('#follow', function () {
        it('Throws if it cannot find the default actor', async function () {
            const mockWebFingerService: WebFingerService = {
                async finger() {
                    return {};
                }
            } as unknown as WebFingerService;
            const mockActorRepository = {
                async getOne() {
                    return null;
                }
            } as unknown as ActorRepository;

            const service = new ActivityPubService(
                mockWebFingerService,
                mockActorRepository
            );

            await assert.rejects(async () => {
                await service.follow('@egg@ghost.org');
            }, /Could not find default actor/);
        });

        it('Follows the actor and saves', async function () {
            const mockWebFingerService: WebFingerService = {
                finger: Sinon.stub().resolves({
                    id: 'https://example.com/user-to-follow'
                })
            } as unknown as WebFingerService;
            const actor = Actor.create({username: 'testing'});
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(actor),
                save: Sinon.stub().resolves()
            };

            const service = new ActivityPubService(
                mockWebFingerService,
                mockActorRepository
            );

            const followStub = Sinon.stub(actor, 'follow');
            await service.follow('@egg@ghost.org');

            assert(followStub.calledWithMatch({
                id: new URI('https://example.com/user-to-follow'),
                username: '@egg@ghost.org'
            }));

            assert(mockActorRepository.save.calledWith(actor));
        });
    });

    describe('#getFollowing', function () {
        it('Throws if the default actor is not found', async function () {
            const mockWebFingerService: WebFingerService = {
                finger: Sinon.stub().resolves({
                    id: 'https://example.com/user-to-follow'
                })
            } as unknown as WebFingerService;
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().resolves()
            };

            const service = new ActivityPubService(
                mockWebFingerService,
                mockActorRepository
            );

            await assert.rejects(async () => {
                await service.getFollowing();
            }, /Could not find default actor/);
        });

        it('Returns a list of the default actors following', async function () {
            const mockWebFingerService: WebFingerService = {
                finger: Sinon.stub().resolves({
                    id: 'https://example.com/user-to-follow'
                })
            } as unknown as WebFingerService;
            const actor = Actor.create({
                username: 'testing',
                following: [{
                    id: new URI('https://site.com/user'),
                    username: '@person@site.com'
                }]
            });
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(actor),
                save: Sinon.stub().resolves()
            };

            const service = new ActivityPubService(
                mockWebFingerService,
                mockActorRepository
            );

            const result = await service.getFollowing();

            assert.deepEqual(result, [{
                id: 'https://site.com/user',
                username: '@person@site.com'
            }]);
        });
    });
});
