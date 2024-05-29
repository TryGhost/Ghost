import Sinon from 'sinon';
import {ActivityPubController} from './activitypub.controller';
import assert from 'assert';
import {ActivityPubService} from '../../../core/activitypub/activitypub.service';

describe('ActivityPubController', function () {
    describe('#follow', function () {
        it('Calls follow on the ActivityPubService and returns an empty object', async function () {
            const mockActivityPubService = {
                follow: Sinon.stub().resolves(),
                getFollowing: Sinon.stub().resolves([])
            } as unknown as ActivityPubService;
            const controller = new ActivityPubController(mockActivityPubService);

            await controller.follow('@egg@ghost.org');

            assert((mockActivityPubService.follow as Sinon.SinonStub).calledWith('@egg@ghost.org'));
        });
    });
});
