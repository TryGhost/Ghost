const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');

const config = require('../../../core/shared/config');

describe('Custom Theme Settings API', function () {
    let request;

    before(async function () {
        // NOTE: needs force start to be able to reinitialize Ghost process with frontend services - custom-theme-settings, to be specific
        await localUtils.startGhost({
        });
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'users:extra', 'custom_theme_settings');

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

    describe('Browse', function () {
        it('can fetch settings for current theme', async function () {
            const res = await request
                .get(localUtils.API.getApiQuery(`custom_theme_settings/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.custom_theme_settings);

            jsonResponse.custom_theme_settings.length.should.equal(2);

            jsonResponse.custom_theme_settings[0].should.match({
                id: /.+/,
                key: 'header_typography',
                type: 'select',
                options: ['Serif', 'Sans-serif'],
                default: 'Sans-serif',
                value: 'Serif'
            });

            jsonResponse.custom_theme_settings[1].should.match({
                id: /.+/,
                key: 'footer_type',
                type: 'select',
                options: ['Full', 'Minimal', 'CTA'],
                default: 'Full',
                value: 'Full',
                group: 'homepage'
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

            const res = await request
                .put(localUtils.API.getApiQuery(`custom_theme_settings/`))
                .set('Origin', config.get('url'))
                .send({custom_theme_settings})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.exist(res.headers['x-cache-invalidate']);

            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.custom_theme_settings);

            jsonResponse.custom_theme_settings.length.should.equal(2);

            jsonResponse.custom_theme_settings[0].should.match({
                id: /.+/,
                key: 'header_typography',
                type: 'select',
                options: ['Serif', 'Sans-serif'],
                default: 'Sans-serif',
                value: 'Sans-serif'
            });

            jsonResponse.custom_theme_settings[1].should.match({
                id: /.+/,
                key: 'footer_type',
                type: 'select',
                options: ['Full', 'Minimal', 'CTA'],
                default: 'Full',
                value: 'Minimal',
                group: 'homepage'
            });
        });

        it('can update some settings', async function () {
            // `.updateSettings()` only cares about `key` and `value`, everything else is set by the theme
            const custom_theme_settings = [{
                key: 'footer_type',
                value: 'Minimal'
            }];

            const res = await request
                .put(localUtils.API.getApiQuery(`custom_theme_settings/`))
                .set('Origin', config.get('url'))
                .send({custom_theme_settings})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.exist(res.headers['x-cache-invalidate']);

            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.custom_theme_settings);

            jsonResponse.custom_theme_settings.length.should.equal(2);

            jsonResponse.custom_theme_settings[0].should.match({
                id: /.+/,
                key: 'header_typography',
                type: 'select',
                options: ['Serif', 'Sans-serif'],
                default: 'Sans-serif',
                value: 'Sans-serif' // set in previous test
            });

            jsonResponse.custom_theme_settings[1].should.match({
                id: /.+/,
                key: 'footer_type',
                type: 'select',
                options: ['Full', 'Minimal', 'CTA'],
                default: 'Full',
                value: 'Minimal',
                group: 'homepage'
            });
        });

        it('errors for unknown key', async function () {
            const custom_theme_settings = [{
                key: 'unknown',
                value: 'Not gonna work'
            }];

            const res = await request
                .put(localUtils.API.getApiQuery(`custom_theme_settings/`))
                .set('Origin', config.get('url'))
                .send({custom_theme_settings})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            should.not.exist(res.headers['x-cache-invalidate']);

            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.errors);
        });

        it('errors for invalid select value', async function () {
            const custom_theme_settings = [{
                key: 'header_typography',
                value: 'Not gonna work'
            }];

            const res = await request
                .put(localUtils.API.getApiQuery(`custom_theme_settings/`))
                .set('Origin', config.get('url'))
                .send({custom_theme_settings})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            should.not.exist(res.headers['x-cache-invalidate']);

            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.errors);
        });
    });
});
