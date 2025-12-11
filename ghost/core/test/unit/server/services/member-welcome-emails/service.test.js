const assert = require('assert/strict');
const sinon = require('sinon');

const config = require('../../../../../core/shared/config');

// We need to mock AutomatedEmail before requiring the service
const AutomatedEmail = {
    findOne: sinon.stub()
};

// Mock the models module
const models = require('../../../../../core/server/models');
sinon.stub(models, 'AutomatedEmail').value(AutomatedEmail);

// Now require the service after mocking
const {service: memberWelcomeEmailService} = require('../../../../../core/server/services/member-welcome-emails');

describe('MemberWelcomeEmailService', function () {
    beforeEach(function () {
        memberWelcomeEmailService.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('shouldSendWelcomeEmail', function () {
        it('returns false when config is not set', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns(undefined);

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', 'member');

            assert.equal(result, false);
        });

        it('returns false for disallowed sources', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');

            const disallowedSources = ['import', 'admin', 'api'];

            for (const source of disallowedSources) {
                const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', source);
                assert.equal(result, false, `Expected false for source: ${source}`);
            }
        });

        it('returns false when email template does not exist', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            AutomatedEmail.findOne.resolves(null);

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', 'member');

            assert.equal(result, false);
        });

        it('returns false when email template has no lexical content', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            AutomatedEmail.findOne.resolves({
                get: sinon.stub().callsFake((key) => {
                    const data = {lexical: null, status: 'active'};
                    return data[key];
                })
            });

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', 'member');

            assert.equal(result, false);
        });

        it('returns false when email template is inactive', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            AutomatedEmail.findOne.resolves({
                get: sinon.stub().callsFake((key) => {
                    const data = {lexical: '{"root":{}}', status: 'inactive'};
                    return data[key];
                })
            });

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', 'member');

            assert.equal(result, false);
        });

        it('returns true when all conditions are met for free member', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            AutomatedEmail.findOne.resolves({
                get: sinon.stub().callsFake((key) => {
                    const data = {lexical: '{"root":{}}', status: 'active'};
                    return data[key];
                })
            });

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('free', 'member');

            assert.equal(result, true);
            sinon.assert.calledWith(AutomatedEmail.findOne, {slug: 'member-welcome-email-free'});
        });

        it('returns true when all conditions are met for paid member', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            AutomatedEmail.findOne.resolves({
                get: sinon.stub().callsFake((key) => {
                    const data = {lexical: '{"root":{}}', status: 'active'};
                    return data[key];
                })
            });

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('paid', 'member');

            assert.equal(result, true);
            sinon.assert.calledWith(AutomatedEmail.findOne, {slug: 'member-welcome-email-paid'});
        });

        it('returns false for invalid member status', async function () {
            sinon.stub(config, 'get').withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');

            const result = await memberWelcomeEmailService.api.shouldSendWelcomeEmail('invalid', 'member');

            assert.equal(result, false);
        });
    });
});
