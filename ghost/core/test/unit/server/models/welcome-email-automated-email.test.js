const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');

describe('Unit: models/welcome-email-automated-email', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('parse', function () {
        it('transforms __GHOST_URL__ to absolute URL in lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                lexical: '{"root":{"children":[{"type":"paragraph","children":[{"type":"link","url":"__GHOST_URL__/test"}]}]}}'
            });

            assert.ok(result.lexical.includes(`${config.get('url')}/test`));
            assert.ok(!result.lexical.includes('__GHOST_URL__'));
        });

        it('handles null lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                lexical: null
            });

            assert.equal(result.lexical, null);
        });

        it('handles undefined lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.parse({
                id: '123'
            });

            assert.equal(result.lexical, undefined);
        });

        it('preserves other fields', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                subject: 'Welcome!',
                lexical: '{"root":{"children":[]}}'
            });

            assert.equal(result.id, '123');
            assert.equal(result.subject, 'Welcome!');
        });
    });

    describe('formatOnWrite', function () {
        it('transforms absolute URLs to __GHOST_URL__ in lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const siteUrl = config.get('url');
            const result = model.formatOnWrite({
                lexical: `{"root":{"children":[{"type":"paragraph","children":[{"type":"link","url":"${siteUrl}/test"}]}]}}`
            });

            assert.ok(result.lexical.includes('__GHOST_URL__/test'));
            assert.ok(!result.lexical.includes(siteUrl));
        });

        it('handles null lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.formatOnWrite({
                lexical: null
            });

            assert.equal(result.lexical, null);
        });

        it('handles undefined lexical field', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.formatOnWrite({
                subject: 'Welcome!'
            });

            assert.equal(result.lexical, undefined);
            assert.equal(result.subject, 'Welcome!');
        });

        it('preserves other fields', function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();

            const result = model.formatOnWrite({
                id: '123',
                subject: 'Welcome!',
                lexical: '{"root":{"children":[]}}'
            });

            assert.equal(result.id, '123');
            assert.equal(result.subject, 'Welcome!');
        });
    });

    describe('onCreating', function () {
        it('assigns the default email design setting when not provided', async function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();
            const baseOnCreating = sinon.stub(Object.getPrototypeOf(models.WelcomeEmailAutomatedEmail.prototype), 'onCreating').resolves();
            const findOne = sinon.stub(models.EmailDesignSetting, 'findOne').resolves(models.EmailDesignSetting.forge({id: 'default-setting-id'}));

            await model.onCreating(model, {}, {});

            assert.equal(model.get('email_design_setting_id'), 'default-setting-id');
            sinon.assert.calledOnce(findOne);
            sinon.assert.calledOnce(baseOnCreating);
        });

        it('assigns the default email design setting when null is provided', async function () {
            const model = models.WelcomeEmailAutomatedEmail.forge({email_design_setting_id: null});
            sinon.stub(Object.getPrototypeOf(models.WelcomeEmailAutomatedEmail.prototype), 'onCreating').resolves();
            sinon.stub(models.EmailDesignSetting, 'findOne').resolves(models.EmailDesignSetting.forge({id: 'default-setting-id'}));

            await model.onCreating(model, {}, {});

            assert.equal(model.get('email_design_setting_id'), 'default-setting-id');
        });

        it('keeps the provided email design setting id', async function () {
            const model = models.WelcomeEmailAutomatedEmail.forge({email_design_setting_id: 'custom-setting-id'});
            const baseOnCreating = sinon.stub(Object.getPrototypeOf(models.WelcomeEmailAutomatedEmail.prototype), 'onCreating').resolves();
            const findOne = sinon.stub(models.EmailDesignSetting, 'findOne');

            await model.onCreating(model, {}, {});

            assert.equal(model.get('email_design_setting_id'), 'custom-setting-id');
            sinon.assert.notCalled(findOne);
            sinon.assert.calledOnce(baseOnCreating);
        });

        it('throws when the default email design setting is missing', async function () {
            const model = models.WelcomeEmailAutomatedEmail.forge();
            sinon.stub(Object.getPrototypeOf(models.WelcomeEmailAutomatedEmail.prototype), 'onCreating').resolves();
            sinon.stub(models.EmailDesignSetting, 'findOne').resolves(null);

            await assert.rejects(
                () => model.onCreating(model, {}, {}),
                {message: 'Missing default email design setting for automated emails'}
            );
        });
    });
});
