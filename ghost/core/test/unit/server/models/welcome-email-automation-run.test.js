const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Unit: models/welcome-email-automation-run', function () {
    before(function () {
        models.init();
    });

    describe('tableName', function () {
        it('uses the correct table name', function () {
            const model = new models.WelcomeEmailAutomationRun();
            assert.equal(model.tableName, 'welcome_email_automation_runs');
        });
    });

    describe('defaults', function () {
        it('sets stepAttempts to 0', function () {
            const model = new models.WelcomeEmailAutomationRun();
            const defaults = model.defaults();
            assert.equal(defaults.stepAttempts, 0);
        });

        it('returns only stepAttempts as a default', function () {
            const model = new models.WelcomeEmailAutomationRun();
            const defaults = model.defaults();
            assert.deepEqual(Object.keys(defaults), ['stepAttempts']);
        });
    });

    describe('relationships', function () {
        it('has a welcomeEmailAutomation relationship', function () {
            const model = new models.WelcomeEmailAutomationRun();
            assert.equal(typeof model.welcomeEmailAutomation, 'function');
        });

        it('has a member relationship', function () {
            const model = new models.WelcomeEmailAutomationRun();
            assert.equal(typeof model.member, 'function');
        });

        it('has a nextWelcomeEmailAutomatedEmail relationship', function () {
            const model = new models.WelcomeEmailAutomationRun();
            assert.equal(typeof model.nextWelcomeEmailAutomatedEmail, 'function');
        });
    });
});
