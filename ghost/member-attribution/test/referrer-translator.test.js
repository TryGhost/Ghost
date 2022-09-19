// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const ReferrerTranslator = require('../lib/referrer-translator');

describe('ReferrerTranslator', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new ReferrerTranslator({});
        });
    });

    describe('getReferrerDetails', function () {
        let translator;
        before(function () {
            translator = new ReferrerTranslator({
                siteUrl: 'https://example.com',
                adminUrl: 'https://admin.example.com/ghost'
            });
        });

        it('returns ghost explore from source ref for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: 'ghost-explore',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: 'https://t.co'
                }
            ])).eql({
                refSource: 'Ghost Explore',
                refMedium: 'Ghost Network',
                refUrl: null
            });
        });

        it('returns ghost explore from url for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: null,
                    refMedium: null,
                    refUrl: 'https://ghost.org/explore'
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: 'https://t.co'
                }
            ])).eql({
                refSource: 'Ghost Explore',
                refMedium: 'Ghost Network',
                refUrl: new URL('https://ghost.org/explore')
            });
        });

        it('returns ghost explore from admin url for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: null,
                    refMedium: null,
                    refUrl: 'https://admin.example.com/ghost/#/dashboard'
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: 'https://t.co'
                }
            ])).eql({
                refSource: 'Ghost Explore',
                refMedium: 'Ghost Network',
                refUrl: new URL('https://admin.example.com/ghost/#/dashboard')
            });
        });

        it('returns ghost newsletter ref for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: 'publisher-weekly-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-explore',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-newsletter',
                    refMedium: null,
                    refUrl: 'https://t.co'
                }
            ])).eql({
                refSource: 'publisher weekly newsletter',
                refMedium: 'Email',
                refUrl: null
            });
        });

        it('returns ghost.org ref for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: null,
                    refMedium: null,
                    refUrl: 'https://ghost.org/creators/'
                },
                {
                    refSource: 'publisher-weekly-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-explore',
                    refMedium: null,
                    refUrl: null
                }
            ])).eql({
                refSource: 'Ghost.org',
                refMedium: 'Ghost Network',
                refUrl: new URL('https://ghost.org/creators/')
            });
        });

        it('returns ref source for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: 'twitter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'publisher-weekly-newsletter',
                    refMedium: null,
                    refUrl: null
                },
                {
                    refSource: 'ghost-explore',
                    refMedium: null,
                    refUrl: null
                }
            ])).eql({
                refSource: 'twitter',
                refMedium: null,
                refUrl: null
            });
        });

        it('returns null for empty history', async function () {
            should(translator.getReferrerDetails([])).eql(null);
        });

        it('returns null for history with only site url', async function () {
            should(translator.getReferrerDetails([
                {
                    refSource: null,
                    refMedium: null,
                    refUrl: 'https://example.com'
                }
            ])).eql(null);
        });
    });
});
