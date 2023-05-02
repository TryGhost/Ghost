// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const ReferrerTranslator = require('../lib/ReferrerTranslator');

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
                    referrerSource: 'ghost-explore',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: 'https://t.co'
                }
            ])).eql({
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: null
            });
        });

        it('returns ghost explore from url for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://ghost.org/explore'
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: 'https://t.co'
                }
            ])).eql({
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'ghost.org'
            });
        });

        it('returns ghost explore from admin url for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://admin.example.com/ghost/#/dashboard'
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: 'https://t.co'
                }
            ])).eql({
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'admin.example.com'
            });
        });

        it('returns ghost newsletter ref for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: 'publisher-weekly-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-explore',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-newsletter',
                    referrerMedium: null,
                    referrerUrl: 'https://t.co'
                }
            ])).eql({
                referrerSource: 'publisher weekly newsletter',
                referrerMedium: 'Email',
                referrerUrl: null
            });
        });

        it('returns ghost.org ref for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://ghost.org/creators/'
                },
                {
                    referrerSource: 'publisher-weekly-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-explore',
                    referrerMedium: null,
                    referrerUrl: null
                }
            ])).eql({
                referrerSource: 'Ghost.org',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'ghost.org'
            });
        });

        it('returns ref source for valid history', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: 'twitter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'publisher-weekly-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                },
                {
                    referrerSource: 'ghost-explore',
                    referrerMedium: null,
                    referrerUrl: null
                }
            ])).eql({
                referrerSource: 'twitter',
                referrerMedium: null,
                referrerUrl: null
            });
        });

        describe('returns source and medium for', function () {
            it('known external url with path', async function () {
                should(translator.getReferrerDetails([
                    {
                        referrerSource: null,
                        referrerMedium: null,
                        referrerUrl: 'https://google.ac/products'
                    },
                    {
                        referrerSource: null,
                        referrerMedium: null,
                        referrerUrl: 'https://t.co/'
                    },
                    {
                        referrerSource: 'publisher-weekly-newsletter',
                        referrerMedium: null,
                        referrerUrl: null
                    },
                    {
                        referrerSource: 'ghost-explore',
                        referrerMedium: null,
                        referrerUrl: null
                    }
                ])).eql({
                    referrerSource: 'Google Product Search',
                    referrerMedium: 'search',
                    referrerUrl: 'google.ac'
                });
            });

            it('known external url without path', async function () {
                should(translator.getReferrerDetails([
                    {
                        referrerSource: null,
                        referrerMedium: null,
                        referrerUrl: 'https://t.co/'
                    },
                    {
                        referrerSource: 'publisher-weekly-newsletter',
                        referrerMedium: null,
                        referrerUrl: null
                    },
                    {
                        referrerSource: 'ghost-explore',
                        referrerMedium: null,
                        referrerUrl: null
                    }
                ])).eql({
                    referrerSource: 'Twitter',
                    referrerMedium: 'social',
                    referrerUrl: 't.co'
                });
            });
        });

        it('returns external ref url as source', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://example.com'
                },
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://sample.com'
                },
                {
                    referrerSource: 'publisher-weekly-newsletter',
                    referrerMedium: null,
                    referrerUrl: null
                }
            ])).eql({
                referrerSource: 'sample.com',
                referrerMedium: null,
                referrerUrl: 'sample.com'
            });
        });

        it('returns null for empty history', async function () {
            should(translator.getReferrerDetails([])).eql({
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            });
        });

        it('returns null for history with only site url', async function () {
            should(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://example.com'
                }
            ])).eql({
                referrerSource: 'Direct',
                referrerMedium: null,
                referrerUrl: null
            });
        });
    });
});
