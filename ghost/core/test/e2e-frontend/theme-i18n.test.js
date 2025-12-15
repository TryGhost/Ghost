// # Theme i18n E2E Tests
// Tests theme translations using the {{t}} helper
// Uses the Admin API to change locale and labs settings

const cheerio = require('cheerio');
const {agentProvider, fixtureManager} = require('../utils/e2e-framework');
const config = require('../../core/shared/config');

// i18n singletons - need to reset basePath when content folder changes between tests
const themeI18n = require('../../core/frontend/services/theme-engine/i18n');
const themeI18next = require('../../core/frontend/services/theme-engine/i18next');

describe('Theme i18n', function () {
    let frontendAgent;
    let adminAgent;
    let ghostServer;

    // Helper to set locale and optionally labs flag
    async function setLocale(locale, labs = null) {
        const settings = [{key: 'locale', value: locale}];
        if (labs !== null) {
            settings.push({key: 'labs', value: JSON.stringify(labs)});
        }
        await adminAgent.put('settings/')
            .body({settings})
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
                    $('.translation-test .translated').text().should.equal(translated);
                }
                if (untranslated) {
                    $('.translation-test .untranslated').text().should.equal(untranslated);
                }
                if (interpolated) {
                    $('.translation-test .interpolated').text().should.equal(interpolated);
                }
            });
    }

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        frontendAgent = agents.frontendAgent;
        adminAgent = agents.adminAgent;
        ghostServer = agents.ghostServer;

        // Reset i18n singletons basePath to use current test content folder
        // This is needed because the singletons capture basePath at module load time
        // and it may point to a different content folder from a previous test
        const themesPath = config.getContentPath('themes');
        themeI18n.basePath = themesPath;
        themeI18next.basePath = themesPath;

        await fixtureManager.init();
        await adminAgent.loginAsOwner();

        await adminAgent.put('themes/locale-theme/activate/')
            .expectStatus(200);
    });

    after(async function () {
        await adminAgent.put('themes/source/activate/');
        await setLocale('en', {});
        await ghostServer.stop();
    });

    describe('Legacy translation service (themeI18n)', function () {
        before(async function () {
            await setLocale('en', {themeTranslation: false});
        });

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
    });

    describe('New translation service (themeI18next)', function () {
        before(async function () {
            await setLocale('en', {themeTranslation: true});
        });

        after(async function () {
            await setLocale('en', {});
        });

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
