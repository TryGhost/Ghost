import RSVP from 'rsvp';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modal-transfer-owner', function () {
    setupComponentTest('transfer-owner', {
        integration: true
    });

    it('triggers confirm action', function () {
        let confirm = sinon.stub();
        let closeModal = sinon.spy();

        confirm.returns(RSVP.resolve({}));

        this.on('confirm', confirm);
        this.on('closeModal', closeModal);

        this.render(hbs`{{modal-transfer-owner confirm=(action 'confirm') closeModal=(action 'closeModal')}}`);

        run(() => {
            this.$('.gh-btn.gh-btn-red').click();
        });

        expect(confirm.calledOnce, 'confirm called').to.be.true;
        expect(closeModal.calledOnce, 'closeModal called').to.be.true;
    });
});
