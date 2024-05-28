import Sinon from 'sinon';
import {InboxService} from './inbox.service';
import assert from 'assert';
import ObjectID from 'bson-objectid';
import {Activity} from './activity.entity';
import {URI} from './uri.object';
import {Actor} from './actor.entity';

describe('InboxService', function () {
    describe('#post', function () {
        it('Throws if it cannot find the actor', async function () {
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().rejects()
            };
            const mockActivityRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().rejects()
            };
            const service = new InboxService(
                mockActorRepository,
                mockActivityRepository
            );

            const owner = new ObjectID();
            const activity = new Activity({
                type: 'Follow',
                activity: null,
                object: {
                    type: 'Application',
                    id: new URI('https://whatever.com')
                },
                actor: {
                    type: 'Person',
                    id: new URI('https://blak.com')
                },
                to: new URI('https://whatever.com')
            });

            await assert.rejects(async () => {
                await service.post(owner, activity);
            }, /Not Found/);
        });
        it('Posts the activity to the actors inbox, saves the actor & the activity', async function () {
            const actor = Actor.create({username: 'username'});
            const mockActorRepository = {
                getOne: Sinon.stub().resolves(actor),
                save: Sinon.stub().resolves()
            };
            const mockActivityRepository = {
                getOne: Sinon.stub().resolves(null),
                save: Sinon.stub().resolves()
            };
            const service = new InboxService(
                mockActorRepository,
                mockActivityRepository
            );

            const postToInboxStub = Sinon.stub(actor, 'postToInbox');

            const owner = new ObjectID();
            const activity = new Activity({
                type: 'Follow',
                activity: null,
                object: {
                    type: 'Person',
                    id: new URI('https://whatever.com')
                },
                actor: {
                    type: 'Person',
                    id: new URI('https://blak.com')
                },
                to: new URI('https://whatever.com')
            });

            await service.post(owner, activity);

            assert(postToInboxStub.calledWith(activity));
            assert(mockActorRepository.save.calledWith(actor));
            assert(mockActivityRepository.save.calledWith(activity));
        });
    });
});
