import RSVP from 'rsvp';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: modal-transfer-owner', function () {
    setupRenderingTest();

    it('triggers confirm action', async function () {
        let confirm = sinon.stub();
        let closeModal = sinon.spy();

        confirm.returns(RSVP.resolve({}));

        this.set('confirm', confirm);
        this.set('closeModal', closeModal);

        await render(hbs`{{modal-transfer-owner confirm=(action confirm) closeModal=(action closeModal)}}`);
        await click('.gh-btn.gh-btn-red');

        expect(confirm.calledOnce, 'confirm called').to.be.true;
        expect(closeModal.calledOnce, 'closeModal called').to.be.true;
    });
});
