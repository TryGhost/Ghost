import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {hbs} from 'ember-cli-htmlbars';
import {render, click, fillIn} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

// Create stub services
class MockModalsService extends Service {
    open() {}
}

class MockSessionService extends Service {
    authenticate() {}
}

describe('Integration | Component | editor/modals/re-authenticate', function () {
    setupRenderingTest();

    beforeEach(function () {
        // Register mock services
        this.owner.register('service:modals', MockModalsService);
        this.owner.register('service:session', MockSessionService);
    });

    it('handles 2FA error correctly', async function () {
        // Get service instances
        const modalsService = this.owner.lookup('service:modals');
        const sessionService = this.owner.lookup('service:session');
        
        // Setup stubs
        sinon.stub(sessionService, 'authenticate').rejects({
            payload: {
                errors: [{
                    type: 'TwoFactorAuthRequired'
                }]
            }
        });
        
        const openStub = sinon.stub(modalsService, 'open').resolves();
        const closeStub = sinon.stub();

        // Set component arguments
        this.set('close', closeStub);
        
        await render(hbs`
            <Editor::Modals::ReAuthenticate
                @close={{this.close}}
            />
        `);

        // Fill in the form fields (adjust selectors as needed)
        await fillIn('[data-test-input="identification"]', 'test@example.com');
        await fillIn('[data-test-input="password"]', 'password123');

        // Trigger re-authentication
        await click('[data-test-button="auth-submit"]');

        // Verify expectations
        expect(openStub.calledWith('editor/modals/re-verify')).to.be.true;
        expect(closeStub.calledOnce).to.be.true;
    });

    it('handles authentication success', async function () {
        const sessionService = this.owner.lookup('service:session');
        const closeStub = sinon.stub();

        // Mock successful authentication
        sinon.stub(sessionService, 'authenticate').resolves();

        this.set('close', closeStub);
        
        await render(hbs`
            <Editor::Modals::ReAuthenticate
                @close={{this.close}}
            />
        `);

        // Simulate form submission
        await click('[data-test-button="auth-submit"]');

        expect(closeStub.calledOnce).to.be.true;
    });
});
