const assert = require('node:assert/strict');

const ReferrerTranslator = require('../../../../../core/server/services/member-attribution/referrer-translator');

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
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns ghost explore from url for valid history', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'ghost.org',
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns ghost explore from admin url for valid history', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'admin.example.com',
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns ghost newsletter ref for valid history', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'publisher weekly newsletter',
                referrerMedium: 'Email',
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns ghost.org ref for valid history', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'Ghost.org',
                referrerMedium: 'Ghost Network',
                referrerUrl: 'ghost.org',
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns ref source for valid history', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'Twitter',
                referrerMedium: 'social',
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns known source for ref source if exists', async function () {
            assert.deepEqual(translator.getReferrerDetails([
                {
                    referrerSource: 'facebook',
                    referrerMedium: null,
                    referrerUrl: null
                }
            ]), {
                referrerSource: 'Facebook',
                referrerMedium: 'social',
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        describe('returns source and medium for', function () {
            it('known external url with path', async function () {
                assert.deepEqual(translator.getReferrerDetails([
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
                ]), {
                    referrerSource: 'Google Product Search',
                    referrerMedium: 'search',
                    referrerUrl: 'google.ac',
                    utmSource: null,
                    utmMedium: null,
                    utmCampaign: null,
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('known external url without path', async function () {
                assert.deepEqual(translator.getReferrerDetails([
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
                ]), {
                    referrerSource: 'Twitter',
                    referrerMedium: 'social',
                    referrerUrl: 't.co',
                    utmSource: null,
                    utmMedium: null,
                    utmCampaign: null,
                    utmTerm: null,
                    utmContent: null
                });
            });
        });

        it('returns external ref url as source', async function () {
            assert.deepEqual(translator.getReferrerDetails([
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
            ]), {
                referrerSource: 'sample.com',
                referrerMedium: null,
                referrerUrl: 'sample.com',
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns null for empty history', async function () {
            assert.deepEqual(translator.getReferrerDetails([]), {
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        it('returns null for history with only site url', async function () {
            assert.deepEqual(translator.getReferrerDetails([
                {
                    referrerSource: null,
                    referrerMedium: null,
                    referrerUrl: 'https://example.com'
                }
            ]), {
                referrerSource: 'Direct',
                referrerMedium: null,
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        });

        describe('UTM parameter extraction', function () {
            it('extracts all UTM parameters', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'google',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'newsletter',
                        utmMedium: 'email',
                        utmCampaign: 'spring_sale',
                        utmTerm: 'running_shoes',
                        utmContent: 'header_link'
                    },
                    {
                        referrerSource: 'twitter',
                        referrerMedium: null,
                        referrerUrl: null
                    }
                ]), {
                    referrerSource: 'Google',
                    referrerMedium: 'unknown',
                    referrerUrl: null,
                    utmSource: 'newsletter',
                    utmMedium: 'email',
                    utmCampaign: 'spring_sale',
                    utmTerm: 'running_shoes',
                    utmContent: 'header_link'
                });
            });

            it('extracts partial UTM parameters (only utmSource)', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'facebook',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'twitter_campaign'
                    }
                ]), {
                    referrerSource: 'Facebook',
                    referrerMedium: 'social',
                    referrerUrl: null,
                    utmSource: 'twitter_campaign',
                    utmMedium: null,
                    utmCampaign: null,
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('extracts partial UTM parameters (source and campaign)', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: null,
                        referrerMedium: null,
                        referrerUrl: 'https://t.co/',
                        utmSource: 'instagram',
                        utmCampaign: 'summer_promo'
                    }
                ]), {
                    referrerSource: 'Twitter',
                    referrerMedium: 'social',
                    referrerUrl: 't.co',
                    utmSource: 'instagram',
                    utmMedium: null,
                    utmCampaign: 'summer_promo',
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('uses earliest entry with UTM data when multiple entries have UTM', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'google',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'recent_source',
                        utmCampaign: 'recent_campaign'
                    },
                    {
                        referrerSource: 'twitter',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'earliest_source',
                        utmCampaign: 'earliest_campaign'
                    }
                ]), {
                    referrerSource: 'Google',
                    referrerMedium: 'unknown',
                    referrerUrl: null,
                    utmSource: 'earliest_source',
                    utmMedium: null,
                    utmCampaign: 'earliest_campaign',
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('returns null UTM values when no history entries contain UTM data', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'twitter',
                        referrerMedium: null,
                        referrerUrl: null
                    },
                    {
                        referrerSource: 'facebook',
                        referrerMedium: null,
                        referrerUrl: null
                    }
                ]), {
                    referrerSource: 'Twitter',
                    referrerMedium: 'social',
                    referrerUrl: null,
                    utmSource: null,
                    utmMedium: null,
                    utmCampaign: null,
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('extracts UTM from earliest entry when more recent entries have no UTM', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'twitter',
                        referrerMedium: null,
                        referrerUrl: null
                    },
                    {
                        referrerSource: 'facebook',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'delayed_utm',
                        utmMedium: 'social_media'
                    }
                ]), {
                    referrerSource: 'Twitter',
                    referrerMedium: 'social',
                    referrerUrl: null,
                    utmSource: 'delayed_utm',
                    utmMedium: 'social_media',
                    utmCampaign: null,
                    utmTerm: null,
                    utmContent: null
                });
            });

            it('combines Ghost referrer with UTM parameters', async function () {
                assert.deepEqual(translator.getReferrerDetails([
                    {
                        referrerSource: 'ghost-explore',
                        referrerMedium: null,
                        referrerUrl: null,
                        utmSource: 'partner_site',
                        utmCampaign: 'q1_2024'
                    }
                ]), {
                    referrerSource: 'Ghost Explore',
                    referrerMedium: 'Ghost Network',
                    referrerUrl: null,
                    utmSource: 'partner_site',
                    utmMedium: null,
                    utmCampaign: 'q1_2024',
                    utmTerm: null,
                    utmContent: null
                });
            });
        });
    });
});
