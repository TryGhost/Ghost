import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: reset', function () {
    setupTest();

    it('performs resetPasswordTask successfully', async function () {
        const controller = this.owner.lookup('controller:reset');

        controller.token = btoa('token|test@example.com|moredata');
        controller.newPassword = 'newpassword123';
        controller.ne2Password = 'newpassword123';
        controller.hasValidated = {
            addObjects: sinon.stub()
        };
        controller.validate = sinon.stub().resolves();
        
        controller.ghostPaths = {
            url: {
                api: sinon.stub().returns('/api/endpoint')
            }
        };
        
        controller.ajax = {
            put: sinon.stub().resolves({
                password_reset: [{message: 'Password reset successful'}]
            })
        };
        
        controller.notifications = {
            showNotification: sinon.stub()
        };
        
        controller.session = {
            authenticate: sinon.stub().resolves()
        };

        const result = await controller.resetPasswordTask.perform();

        expect(result).to.be.true;
        expect(controller.flowErrors).to.equal('');
        expect(controller.hasValidated.addObjects.calledWith(['newPassword', 'ne2Password'])).to.be.true;
        expect(controller.ajax.put.calledOnce).to.be.true;
        expect(controller.ajax.put.args[0][1]).to.deep.equal({
            data: {
                password_reset: [{
                    newPassword: 'newpassword123',
                    ne2Password: 'newpassword123',
                    token: controller.token
                }]
            }
        });
        expect(controller.notifications.showNotification.calledOnce).to.be.true;
        expect(controller.session.authenticate.calledWith(
            'authenticator:cookie',
            {
                identification: 'test@example.com',
                password: 'newpassword123',
                skipEmailVerification: true
            }
        )).to.be.true;
    });

    it('handles validation errors correctly', async function () {
        const controller = this.owner.lookup('controller:reset');
        
        controller.token = btoa('token|test@example.com|moredata');
        controller.newPassword = 'short';
        controller.ne2Password = 'short';
        controller.hasValidated = {
            addObjects: sinon.stub()
        };
        
        // Simulate validation error
        controller.errors = {
            errorsFor: sinon.stub().returns([{message: 'Password too short'}]),
            clear: sinon.stub()
        };
        controller.validate = sinon.stub().rejects();

        await controller.resetPasswordTask.perform();

        expect(controller.flowErrors).to.equal('Password too short');
        expect(controller.hasValidated.addObjects.calledWith(['newPassword', 'ne2Password'])).to.be.true;
    });

    it('handles API errors correctly', async function () {
        const controller = this.owner.lookup('controller:reset');
        
        controller.token = btoa('token|test@example.com|moredata');
        controller.newPassword = 'newpassword123';
        controller.ne2Password = 'newpassword123';
        controller.hasValidated = {
            addObjects: sinon.stub()
        };
        controller.validate = sinon.stub().resolves();
        
        controller.ghostPaths = {
            url: {
                api: sinon.stub().returns('/api/endpoint')
            }
        };
        
        const apiError = new Error('API Error');
        controller.ajax = {
            put: sinon.stub().rejects(apiError)
        };
        
        controller.notifications = {
            showAPIError: sinon.stub()
        };

        await controller.resetPasswordTask.perform();

        expect(controller.notifications.showAPIError.calledOnce).to.be.true;
        expect(controller.notifications.showAPIError.calledWith(apiError, {key: 'password.reset'})).to.be.true;
    });

    it('handles password mismatch validation error', async function () {
        const controller = this.owner.lookup('controller:reset');
        
        controller.token = btoa('token|test@example.com|moredata');
        controller.newPassword = 'newpassword123';
        controller.ne2Password = 'differentpassword';
        controller.hasValidated = {
            addObjects: sinon.stub()
        };
        
        // Simulate ne2Password validation error
        controller.errors = {
            errorsFor: sinon.stub(),
            clear: sinon.stub()
        };
        controller.errors.errorsFor.withArgs('ne2Password').returns([{message: 'Passwords do not match'}]);
        controller.errors.errorsFor.withArgs('newPassword').returns([]);
        controller.validate = sinon.stub().rejects();

        await controller.resetPasswordTask.perform();

        expect(controller.flowErrors).to.equal('Passwords do not match');
        expect(controller.hasValidated.addObjects.calledWith(['newPassword', 'ne2Password'])).to.be.true;
    });
});
