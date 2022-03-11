const should = require('should');
const sinon = require('sinon');
const themeEngines = require('../../../../../../core/frontend/services/theme-engine/engines');

/**
 * @NOTE
 *
 * If this test fails for you, you are probably modifying supported theme engines.
 *
 * When you make a change, please test that:
 *
 * 1. Please check that uploading a theme with newly added/modified engine version works
 * 2. Check other places that potentially need updates (e.g.: frontends resource cache config, )
 * 3. Add the a protective test for when next verstion (v6?) is planned it has to be changed again
 */
describe('Themes: engines', function () {
    // NOTE: This is deliberately hard-coded so that when the default version is upgraded this test fails and needs reading!
    const DEFAULT_ENGINE_VERSION = 'v4';

    afterEach(function () {
        sinon.restore();
    });

    it('no engines', function () {
        const engines = themeEngines.create();
        engines.should.eql({
            'ghost-api': DEFAULT_ENGINE_VERSION
        });
    });

    describe('ghost-api', function () {
        it('unknown version falls back to default version', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'v100'
                }
            });

            engines.should.eql({
                'ghost-api': DEFAULT_ENGINE_VERSION
            });
        });

        it('deprecated and not supported version falls back to default version', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '^0.1'
                }
            });

            engines.should.eql({
                'ghost-api': DEFAULT_ENGINE_VERSION
            });
        });

        it('not supported upcoming version falls back to default version', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'v6'
                }
            });

            engines.should.eql({
                'ghost-api': DEFAULT_ENGINE_VERSION
            });
        });

        it('v2', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'v2'
                }
            });

            engines.should.eql({
                'ghost-api': 'v2'
            });
        });

        it('^2', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '^2'
                }
            });

            engines.should.eql({
                'ghost-api': 'v2'
            });
        });

        it('2.0.0', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '2.0.0'
                }
            });

            engines.should.eql({
                'ghost-api': 'v2'
            });
        });

        it('2.17.0', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '2.17.0'
                }
            });

            engines.should.eql({
                'ghost-api': 'v2'
            });
        });

        it('canary', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'canary'
                }
            });

            engines.should.eql({
                'ghost-api': 'canary'
            });
        });

        it('3', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '3'
                }
            });

            engines.should.eql({
                'ghost-api': 'v3'
            });
        });

        it('v3', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'v3'
                }
            });

            engines.should.eql({
                'ghost-api': 'v3'
            });
        });

        it('4', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': '4'
                }
            });

            engines.should.eql({
                'ghost-api': DEFAULT_ENGINE_VERSION
            });
        });

        it('v4', function () {
            const engines = themeEngines.create({
                engines: {
                    'ghost-api': 'v4'
                }
            });

            engines.should.eql({
                'ghost-api': DEFAULT_ENGINE_VERSION
            });
        });
    });
});
