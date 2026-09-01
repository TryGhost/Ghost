import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: signin', function () {
    setupTest();

    it('cancels conditional WebAuthn before explicit passkey sign-in', async function () {
        const controller = this.owner.lookup('controller:signin');

        const cancelCeremony = sinon.stub(SimpleWebAuthnBrowser.WebAuthnAbortService, 'cancelCeremony');
        controller.ghostPaths = {apiRoot: '/ghost/api/admin'};
        controller.ajax = {
            post: sinon.stub().rejects(new Error('stop after begin'))
        };

        const result = await controller.passkeySigninTask.perform();

        expect(result).to.be.false;
        expect(cancelCeremony.calledOnce).to.be.true;
        expect(controller.ajax.post.calledOnce).to.be.true;
        expect(cancelCeremony.calledBefore(controller.ajax.post)).to.be.true;

        cancelCeremony.restore();
    });
});
