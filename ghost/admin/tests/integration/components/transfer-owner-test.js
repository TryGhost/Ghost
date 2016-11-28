/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import run from 'ember-runloop';
import RSVP from 'rsvp';
import sinon from 'sinon';

describe('Integration: Component: modals/transfer-owner', function() {
    setupComponentTest('transfer-owner', {
        integration: true
    });

    it('triggers confirm action', function() {
        let confirm = sinon.stub();
        let closeModal = sinon.spy();

        confirm.returns(RSVP.resolve({}));

        this.on('confirm', confirm);
        this.on('closeModal', closeModal);

        this.render(hbs`{{modals/transfer-owner confirm=(action 'confirm') closeModal=(action 'closeModal')}}`);

        run(() => {
            this.$('.btn.btn-red').click();
        });

        expect(confirm.calledOnce, 'confirm called').to.be.true;
        expect(closeModal.calledOnce, 'closeModal called').to.be.true;
    });
});
