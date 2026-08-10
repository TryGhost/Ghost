import assert from 'node:assert/strict';
import sinon from 'sinon';
import {recordGiftLinkAction, type RequestContext} from '../../../../../core/server/services/gift-links/actions';

const logging = require('@tryghost/logging');

const CTX: RequestContext = {actor: {id: 'actor-id', type: 'user'}};

// Pins the parts not observable through the actions API: the best-effort contract and the
// no-actor short-circuit. The verb->event mapping is covered there as an outcome.
describe('Unit: recordGiftLinkAction', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('does not propagate when the action recorder throws (logging instead)', async function () {
        const errorStub = sinon.stub(logging, 'error');
        const Action = {add: async () => {
            throw new Error('action write failed');
        }};

        await assert.doesNotReject(
            () => recordGiftLinkAction({Action, context: CTX, verb: 'add', subject: 'post-id'})
        );
        assert.equal(errorStub.calledOnce, true, 'the failure is logged');
    });

    it('records nothing when there is no actor', async function () {
        const add = sinon.stub().resolves();

        await recordGiftLinkAction({Action: {add}, context: {actor: null}, verb: 'add', subject: 'post-id'});

        assert.equal(add.called, false, 'no action is written without an actor');
    });
});
