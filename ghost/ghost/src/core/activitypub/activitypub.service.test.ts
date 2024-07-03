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
});
