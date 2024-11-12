import {describe, it} from 'mocha';
import {assert, expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {isTwoFactorTokenRequiredError} from 'ghost-admin/services/ajax';
import sinon from 'sinon';

describe('Unit | Component | editor/modals/re-authenticate', function () {
    setupTest();
    setupMirage();

    let component;

    beforeEach(function () {
        component = this.owner.factoryFor('component:editor/modals/re-authenticate').create({
            args: {
                close: sinon.stub()
            }
        });
    });

    it('sets user email as identification on init', function () {
        const sessionStub = this.owner.lookup('service:session');
        sessionStub.user = { email: 'test@example.com' };

        component = this.owner.factoryFor('component:editor/modals/re-authenticate').create({
            args: {
                close: sinon.stub()
            }
        });

        expect(component.signin.identification).to.equal('test@example.com');
    });

    describe('reauthenticateTask', function () {
        it('handles 2FA required error', async function () {
            const modalsStub = this.owner.lookup('service:modals');
            const sessionStub = this.owner.lookup('service:session');

            sinon.stub(sessionStub, 'authenticate').rejects({
                payload: {
                    errors: [{
                        type: 'TwoFactorAuthRequired'
                    }]
                }
            });

            const openStub = sinon.stub(modalsStub, 'open').resolves();

            await component.reauthenticateTask.perform();
            

            expect(openStub.calledWith('editor/modals/re-verify')).to.be.true;
            expect(openStub.calledWith('editor/modals/re-verify')).to.be.false;
            expect(component.args.close.called).to.be.true;
        });

        it('handles incorrect password error', async function () {
            const sessionStub = this.owner.lookup('service:session');
            const notificationsStub = this.owner.lookup('service:notifications');

            sinon.stub(sessionStub, 'authenticate').rejects({
                payload: {
                    errors: [{
                        message: 'Invalid password'
                    }]
                }
            });

            sinon.stub(notificationsStub, 'showAPIError');

            await component.reauthenticateTask.perform();

            expect(component.signin.errors.get('password')).to.equal('Incorrect password');
            expect(component.authenticationError).to.exist;
        });

        it('successfully authenticates', async function () {
            const sessionStub = this.owner.lookup('service:session');
            const notificationsStub = this.owner.lookup('service:notifications');

            sinon.stub(sessionStub, 'authenticate').resolves();
            sinon.stub(notificationsStub, 'closeAlerts');

            await component.reauthenticateTask.perform();

            expect(notificationsStub.closeAlerts.called).to.be.true;
            expect(component.args.close.called).to.be.true;
        });
    });
}); 