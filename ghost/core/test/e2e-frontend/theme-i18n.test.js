// # Theme i18n E2E Tests
// Tests theme translations using the {{t}} helper
// Uses the Admin API to change locale

const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const {agentProvider, fixtureManager} = require('../utils/e2e-framework');
const config = require('../../core/shared/config');

// i18n singleton - need to reset basePath when content folder changes between tests
const themeI18n = require('../../core/frontend/services/theme-engine/i18n');

describe('Theme i18n', function () {
    let frontendAgent;
    let adminAgent;
    let ghostServer;

    async function setLocale(locale) {
        await adminAgent.put('settings/')
            .body({settings: [{key: 'locale', value: locale}]})
            .expectStatus(200);
    }

    /**
     * Helper to assert translations on homepage
     * @param {object} expected
     * @param {string} [expected.translated]
     * @param {string} [expected.untranslated]
     * @param {string} [expected.interpolated]
     */
    async function assertTranslations({translated, untranslated, interpolated}) {
        await frontendAgent.get('/')
            .expect(200)
            .expect((res) => {
                const $ = cheerio.load(res.text);
                if (translated) {
                    assert.equal($('.translation-test .translated').text(), translated);
                }
                if (untranslated) {
                    assert.equal($('.translation-test .untranslated').text(), untranslated);
                }
                if (interpolated) {
                    assert.equal($('.translation-test .interpolated').text(), interpolated);
                }
            });
    }

    beforeAll(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        frontendAgent = agents.frontendAgent;
        adminAgent = agents.adminAgent;
        ghostServer = agents.ghostServer;

        // Reset i18n singleton basePath to use current test content folder
        // This is needed because the singleton captures basePath at module load time
        // and it may point to a different content folder from a previous test
        themeI18n.basePath = config.getContentPath('themes');

        await fixtureManager.init();
        await adminAgent.loginAsOwner();

        await adminAgent.put('themes/locale-theme/activate/')
            .expectStatus(200);
    });

    afterAll(async function () {
        await adminAgent.put('themes/source/activate/');
        await setLocale('en');
        await ghostServer.stop();
    });

    describe('{{t}} helper', function () {
        it('translates keys in English', async function () {
            await assertTranslations({translated: 'Left Button on Top'});
        });

        it('returns key when translation is missing', async function () {
            await assertTranslations({untranslated: 'Missing Key'});
        });

        it('interpolates variables', async function () {
            await assertTranslations({interpolated: 'Welcome, Ghost'});
        });

        it('translates keys in German', async function () {
            await setLocale('de');
            await assertTranslations({
                translated: 'Oben Links.',
                interpolated: 'Willkommen, Ghost'
            });
            await setLocale('en');
        });

        it('falls back to English when locale file is missing', async function () {
            await setLocale('fr');
            await assertTranslations({translated: 'Left Button on Top'});
            await setLocale('en');
        });
    });
});
