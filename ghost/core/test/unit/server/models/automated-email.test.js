const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');

describe('Unit: models/automated-email', function () {
    before(function () {
        models.init();
    });

    describe('defaults', function () {
        it('sets default status to inactive', function () {
            const model = new models.AutomatedEmail();
            const defaults = model.defaults();

            assert.equal(defaults.status, 'inactive');
        });

        it('returns expected default values', function () {
            const model = new models.AutomatedEmail();
            const defaults = model.defaults();

            assert.ok(defaults);
            assert.equal(Object.keys(defaults).length, 1);
            assert.equal(defaults.status, 'inactive');
        });
    });

    describe('parse', function () {
        it('transforms __GHOST_URL__ to absolute URL in lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                lexical: '{"root":{"children":[{"type":"paragraph","children":[{"type":"link","url":"__GHOST_URL__/test"}]}]}}'
            });

            assert.ok(result.lexical.includes(`${config.get('url')}/test`));
            assert.ok(!result.lexical.includes('__GHOST_URL__'));
        });

        it('handles null lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                lexical: null
            });

            assert.equal(result.lexical, null);
        });

        it('handles undefined lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.parse({
                id: '123'
            });

            assert.equal(result.lexical, undefined);
        });

        it('preserves other fields', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.parse({
                id: '123',
                name: 'welcome_email',
                subject: 'Welcome!',
                status: 'active',
                lexical: '{"root":{"children":[]}}'
            });

            assert.equal(result.id, '123');
            assert.equal(result.name, 'welcome_email');
            assert.equal(result.subject, 'Welcome!');
            assert.equal(result.status, 'active');
        });
    });

    describe('formatOnWrite', function () {
        it('transforms absolute URLs to __GHOST_URL__ in lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const siteUrl = config.get('url');
            const result = model.formatOnWrite({
                lexical: `{"root":{"children":[{"type":"paragraph","children":[{"type":"link","url":"${siteUrl}/test"}]}]}}`
            });

            assert.ok(result.lexical.includes('__GHOST_URL__/test'));
            assert.ok(!result.lexical.includes(siteUrl));
        });

        it('handles null lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.formatOnWrite({
                lexical: null
            });

            assert.equal(result.lexical, null);
        });

        it('handles undefined lexical field', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.formatOnWrite({
                name: 'welcome_email'
            });

            assert.equal(result.lexical, undefined);
            assert.equal(result.name, 'welcome_email');
        });

        it('preserves other fields', function () {
            const model = models.AutomatedEmail.forge();

            const result = model.formatOnWrite({
                id: '123',
                name: 'welcome_email',
                subject: 'Welcome!',
                status: 'active',
                lexical: '{"root":{"children":[]}}'
            });

            assert.equal(result.id, '123');
            assert.equal(result.name, 'welcome_email');
            assert.equal(result.subject, 'Welcome!');
            assert.equal(result.status, 'active');
        });
    });
});
