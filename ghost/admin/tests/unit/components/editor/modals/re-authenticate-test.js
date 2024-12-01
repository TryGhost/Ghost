import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {isTwoFactorTokenRequiredError} from 'ghost-admin/services/ajax';
import sinon from 'sinon';

describe('Unit | Component | editor/modals/re-authenticate', function () {
    setupTest();
    setupMirage();

    it('handles 2FA error correctly', async function () {
        // Create component instance
        const component = this.owner.lookup('component:editor/modals/re-authenticate');
        
        // Setup mocks
        const modalsService = this.owner.lookup('service:modals');
        const sessionService = this.owner.lookup('service:session');
        
        component.modals = modalsService;
        component.session = sessionService;
        component.args = {
            close: sinon.stub()
        };

        // Mock session authenticate to throw 2FA error
        sinon.stub(sessionService, 'authenticate').rejects({
            payload: {
                errors: [{
                    type: 'TwoFactorAuthRequired'
                }]
            }
        });

        // Mock modals.open
        const openStub = sinon.stub(modalsService, 'open').resolves();

        // Setup signin data
        component.signin = {
            identification: 'test@example.com',
            password: 'password',
            validate: sinon.stub().resolves(),
            hasValidated: [],
            errors: {
                add: sinon.stub()
            }
        };

        // Execute reauthenticate task
        const result = await component.reauthenticateTask.perform();

        // Verify 2FA handling
        expect(result).to.be.true;
        expect(openStub.calledOnce).to.be.true;
        expect(openStub.calledWith('editor/modals/re-verify')).to.be.true;
        expect(component.args.close.calledOnce).to.be.true;
    });

    it('handles authentication success', async function () {
        const component = this.owner.lookup('component:editor/modals/re-authenticate');
        
        const sessionService = this.owner.lookup('service:session');
        const notificationsService = this.owner.lookup('service:notifications');
        
        component.session = sessionService;
        component.notifications = notificationsService;
        component.args = {
            close: sinon.stub()
        };

        // Mock successful authentication
        sinon.stub(sessionService, 'authenticate').resolves();
        
        component.signin = {
            identification: 'test@example.com',
            password: 'password',
            validate: sinon.stub().resolves(),
            hasValidated: [],
            errors: {
                add: sinon.stub()
            }
        };

        const result = await component.reauthenticateTask.perform();

        expect(result).to.be.true;
        expect(component.args.close.calledOnce).to.be.true;
    });
}); 