const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyUuid} = matchers;

describe('Custom Theme Settings API', function () {
    /** @type {import('../../utils/agents').AdminAPITestAgent} */
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users:extra', 'custom_theme_settings');
        await agent.loginAsOwner();

        // require and init here so we know it's already been set up with models
        const customThemeSettingsService = require('../../../core/server/services/custom-theme-settings');
        await customThemeSettingsService.init();

        // fake a theme activation with custom settings - settings match fixtures
        await customThemeSettingsService.api.activateTheme('casper', {
            name: 'casper',
            customSettings: {
                header_typography: {
                    type: 'select',
                    options: ['Serif', 'Sans-serif'],
                    default: 'Sans-serif'
                },
                footer_type: {
                    type: 'select',
                    options: ['Full', 'Minimal', 'CTA'],
                    default: 'Full',
                    group: 'homepage'
                }
            }
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Browse', function () {
        it('can fetch settings for current theme', async function () {
            await agent
                .get(`custom_theme_settings/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    custom_theme_settings: Array(2).fill({
                        id: anyObjectId
                    })
                });
        });
    });

    describe('Edit', function () {
        it('can update all settings for current theme', async function () {
            // `.updateSettings()` only cares about `key` and `value`, everything else is set by the theme
            const custom_theme_settings = [{
                id: 'id',
                type: 'type',
                options: ['option'],
                default: 'default',
                key: 'header_typography',
                value: 'Sans-serif'
            }, {
                key: 'footer_type',
                value: 'Minimal'
            }];

            await agent
                .put(`custom_theme_settings/`)
                .body({custom_theme_settings})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    custom_theme_settings: Array(2).fill({
                        id: anyObjectId
                    })
                });
        });

        it('can update some settings', async function () {
            // `.updateSettings()` only cares about `key` and `value`, everything else is set by the theme
            const custom_theme_settings = [{
                key: 'footer_type',
                value: 'Minimal'
            }];

            await agent
                .put(`custom_theme_settings/`)
                .body({custom_theme_settings})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    custom_theme_settings: Array(2).fill({
                        id: anyObjectId
                    })
                });
        });

        it('errors for unknown key', async function () {
            const custom_theme_settings = [{
                key: 'unknown',
                value: 'Not gonna work'
            }];

            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .put(`custom_theme_settings/`)
                .body({custom_theme_settings})
                .expectStatus(422)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: Array(1).fill({
                        id: anyUuid
                    })
                });

            sinon.assert.calledOnce(loggingStub);
        });

        it('errors for invalid select value', async function () {
            const custom_theme_settings = [{
                key: 'header_typography',
                value: 'Not gonna work'
            }];

            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .put(`custom_theme_settings/`)
                .body({custom_theme_settings})
                .expectStatus(422)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: Array(1).fill({
                        id: anyUuid
                    })
                });

            sinon.assert.calledOnce(loggingStub);
        });
    });
});
