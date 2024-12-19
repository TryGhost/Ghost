import {hasAvailablePrices, getAllProductsForSite, getAvailableProducts, getCurrencySymbol, getFreeProduct, getMemberName, getMemberSubscription, getPriceFromSubscription, getPriceIdFromPageQuery, getSupportAddress, getDefaultNewsletterSender, getUrlHistory, hasMultipleProducts, isActiveOffer, isInviteOnly, isPaidMember, isPaidMembersOnly, isSameCurrency, transformApiTiersData, isSigninAllowed, isSignupAllowed, getCompExpiry, isInThePast} from './helpers';
import * as Fixtures from './fixtures-generator';
import {site as FixturesSite, member as FixtureMember, offer as FixtureOffer, transformTierFixture as TransformFixtureTiers} from '../utils/test-fixtures';
import {isComplimentaryMember} from '../utils/helpers';

describe('Helpers - ', () => {
    describe('isComplimentaryMember -', () => {
        test('returns true for complimentary member', () => {
            const value = isComplimentaryMember({member: FixtureMember.complimentary});
            expect(value).toBe(true);
        });

        test('returns true for complimentary member with subscription', () => {
            const value = isComplimentaryMember({member: FixtureMember.complimentaryWithSubscription});
            expect(value).toBe(true);
        });

        test('returns false for free member', () => {
            const value = isComplimentaryMember({member: FixtureMember.free});
            expect(value).toBe(false);
        });

        test('returns false for paid member', () => {
            const value = isComplimentaryMember({member: FixtureMember.paid});
            expect(value).toBe(false);
        });
    });

    describe('isPaidMember -', () => {
        test('returns true for paid member', () => {
            const value = isPaidMember({member: FixtureMember.paid});
            expect(value).toBe(true);
        });

        test('returns true for complimentary member', () => {
            const value = isPaidMember({member: FixtureMember.complimentary});
            expect(value).toBe(true);
        });

        test('returns true for complimentary member with subscription', () => {
            const value = isPaidMember({member: FixtureMember.complimentaryWithSubscription});
            expect(value).toBe(true);
        });

        test('returns false for free member', () => {
            const value = isPaidMember({member: FixtureMember.free});
            expect(value).toBe(false);
        });
    });

    describe('getAllProductsForSite -', () => {
        test('returns empty array for undefined site', () => {
            const value = getAllProductsForSite({});
            expect(value).toEqual([]);
        });

        test('filters invalid products and adds symbol', () => {
            const value = getAllProductsForSite({
                site: {
                    portal_plans: ['monthly', 'yearly'],
                    products: [
                        {
                            monthlyPrice: {
                                amount: 0,
                                currency: 'usd'
                            },
                            yearlyPrice: {
                                amount: 100,
                                currency: 'usd'
                            }
                        },
                        undefined,
                        {
                            // This one is missing a yearly price
                            monthlyPrice: {
                                amount: 100,
                                currency: 'usd'
                            }
                        }
                    ]
                }
            });
            expect(value).toEqual([
                {
                    monthlyPrice: {
                        amount: 0,
                        currency: 'usd',
                        currency_symbol: '$'
                    },
                    yearlyPrice: {
                        amount: 100,
                        currency: 'usd',
                        currency_symbol: '$'
                    }
                }
            ]);
        });
    });

    describe('isActiveOffer -', () => {
        test('returns true for active offer', () => {
            const value = isActiveOffer({offer: FixtureOffer, site: FixturesSite.singleTier.basic});
            expect(value).toBe(true);
        });

        test('returns false for archived offer', () => {
            const archivedOffer = {
                ...FixtureOffer,
                status: 'archived'
            };
            const value = isActiveOffer({offer: archivedOffer, site: FixturesSite.singleTier.basic});
            expect(value).toBe(false);
        });

        test('returns false for active offer with archived or disabled tier', () => {
            const value = isActiveOffer({offer: FixtureOffer, site: FixturesSite.singleTier.onlyFreePlan});
            expect(value).toBe(false);
        });
    });

    describe('isSameCurrency - ', () => {
        test('can match two currencies correctly ', () => {
            let currency1 = 'USD';
            let currency2 = 'USD';
            expect(isSameCurrency(currency1, currency2)).toBe(true);
        });
        test('can match currencies with case mismatch', () => {
            let currency1 = 'USD';
            let currency2 = 'usd';
            expect(isSameCurrency(currency1, currency2)).toBe(true);
        });
        test('can match currencies with case mismatch', () => {
            let currency1 = 'eur';
            let currency2 = 'usd';
            expect(isSameCurrency(currency1, currency2)).toBe(false);
        });
    });

    describe('isInviteOnly - ', () => {
        test('returns true for an invite-only site', () => {
            const isInviteOnlySite = isInviteOnly({site: FixturesSite.singleTier.membersInviteOnly});
            expect(isInviteOnlySite).toBe(true);
        });

        test('returns false for a full-access site', () => {
            const isInviteOnlySite = isInviteOnly({site: FixturesSite.singleTier.basic});
            expect(isInviteOnlySite).toBe(false);
        });
    });

    describe('isPaidMembersOnly - ', () => {
        test('returns true for paid-members-only site', () => {
            const isPaidMembersOnlySite = isPaidMembersOnly({site: FixturesSite.singleTier.paidMembersOnly});
            expect(isPaidMembersOnlySite).toBe(true);
        });

        test('returns false for a full-access site', () => {
            const isPaidMembersOnlySite = isPaidMembersOnly({site: FixturesSite.singleTier.basic});
            expect(isPaidMembersOnlySite).toBe(false);
        });
    });

    describe('hasAvailablePrices - ', () => {
        test('returns true for a site with a single tier', () => {
            const hasAvailablePricesCheck = hasAvailablePrices({site: FixturesSite.singleTier.basic});
            expect(hasAvailablePricesCheck).toBe(true);
        });

        test('returns true for a site with multiple tiers', () => {
            const hasAvailablePricesCheck = hasAvailablePrices({site: FixturesSite.multipleTiers.basic});
            expect(hasAvailablePricesCheck).toBe(true);
        });

        test('returns false for a site with no plans', () => {
            const hasAvailablePricesCheck = hasAvailablePrices({site: FixturesSite.singleTier.withoutPlans});
            expect(hasAvailablePricesCheck).toBe(false);
        });
    });

    describe('isSigninAllowed - ', () => {
        test('returns true for a site with members enabled', () => {
            const value = isSigninAllowed({site: FixturesSite.singleTier.basic});
            expect(value).toBe(true);
        });

        test('returns true for a site with invite-only members', () => {
            const value = isSigninAllowed({site: FixturesSite.singleTier.membersInviteOnly});
            expect(value).toBe(true);
        });

        test('returns false for a site with members disabled', () => {
            const value = isSigninAllowed({site: FixturesSite.singleTier.membersDisabled});
            expect(value).toBe(false);
        });
    });

    describe('isSignupAllowed - ', () => {
        test('returns true for a site with members enabled, and with Stripe configured', () => {
            const value = isSignupAllowed({site: FixturesSite.singleTier.basic});
            expect(value).toBe(true);
        });

        test('returns true for a site with members enabled, without Stripe configured, but with only free tiers', () => {
            const value = isSignupAllowed({site: FixturesSite.singleTier.onlyFreePlanWithoutStripe});
            expect(value).toBe(true);
        });

        test('returns false for a site with invite-only members', () => {
            const value = isSignupAllowed({site: FixturesSite.singleTier.membersInviteOnly});
            expect(value).toBe(false);
        });

        test('returns false for a site with members disabled', () => {
            const value = isSignupAllowed({site: FixturesSite.singleTier.membersDisabled});
            expect(value).toBe(false);
        });
    });

    describe('hasMultipleProducts - ', () => {
        test('returns true for multiple tier site', () => {
            const value = hasMultipleProducts({site: FixturesSite.multipleTiers.basic});
            expect(value).toBe(true);
        });
        test('returns false for single tier site', () => {
            const value = hasMultipleProducts({site: FixturesSite.singleTier.basic});
            expect(value).toBe(false);
        });
    });

    describe('getFreeProduct - ', () => {
        test('returns free tier for site', () => {
            const product = getFreeProduct({site: FixturesSite.singleTier.basic});
            expect(product.type).toBe('free');
        });
    });

    describe('getMemberName - ', () => {
        test('returns name for logged in member', () => {
            const member = FixtureMember.free;
            const memberName = getMemberName({member});
            expect(memberName).toBe(member.name);
        });

        test('returns empty string for logged-out member', () => {
            const member = null;
            const memberName = getMemberName({member});
            expect(memberName).toBe('');
        });
    });

    describe('getMemberSubscription -', () => {
        describe('returns active sub for paid member', () => {
            test('with only active sub in list', () => {
                const member = FixtureMember.paid;
                const value = getMemberSubscription({member});
                const subscription = member.subscriptions[0];
                expect(value).toBe(subscription);
            });

            test('with inactive subs in list', () => {
                const member = FixtureMember.paidWithCanceledSubscription;
                const value = getMemberSubscription({member});
                const subscription = member.subscriptions.find(d => d.status === 'active');
                expect(value).toBe(subscription);
            });
        });

        test('returns null for free member', () => {
            const member = FixtureMember.free;
            const value = getMemberSubscription({member});
            expect(value).toBe(null);
        });

        test('returns undefined for complimentary member without subscription', () => {
            const member = FixtureMember.complimentary;
            const value = getMemberSubscription({member});
            expect(value).toBe(undefined);
        });

        test('returns sub for complimentary member with subscription', () => {
            const member = FixtureMember.complimentaryWithSubscription;
            const value = getMemberSubscription({member});
            const subscription = member.subscriptions.find(d => d.status === 'active');
            expect(value).toBe(subscription);
        });
    });

    describe('getPriceFromSubscription -', () => {
        test('returns expected price object for paid member', () => {
            const member = FixtureMember.paid;
            const subscription = getMemberSubscription({member});
            const value = getPriceFromSubscription({subscription});
            expect(value).toStrictEqual({
                ...subscription.price,
                tierId: undefined,
                cadence: 'year',
                stripe_price_id: subscription.price.id,
                id: subscription.price.price_id,
                price: subscription.price.amount / 100,
                name: subscription.price.nickname,
                currency: subscription.price.currency.toLowerCase(),
                currency_symbol: getCurrencySymbol(subscription.price.currency)
            });
        });

        test('returns null for invalid subscription', () => {
            const value = getPriceFromSubscription({subscription: {}});
            expect(value).toBe(null);
        });
    });

    describe('getSupportAddress -', () => {
        describe('when the calculated support address is available', () => {
            test('returns the calculated support email address, if available', () => {
                let site = {
                    support_email_address: 'support@example.com',
                    members_support_address: 'noreply@example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('support@example.com');
            });
        });

        describe('[Deprecated] when the calculated support address is not available', () => {
            test('returns expected support address for non sub domain', () => {
                let site = {
                    members_support_address: 'jamie@example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('jamie@example.com');
            });

            test('returns expected support address for non www sub domain', () => {
                let site = {
                    members_support_address: 'jamie@blog.example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('jamie@blog.example.com');
            });

            test('returns expected support address for www domain', () => {
                let site = {
                    members_support_address: 'jamie@www.example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('jamie@example.com');
            });

            test('returns expected support address for default noreply value', () => {
                let site = {
                    members_support_address: 'noreply',
                    url: 'https://www.example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('noreply@example.com');
            });

            test('returns empty string for missing support address', () => {
                let site = {
                    members_support_address: null,
                    url: 'https://www.example.com'
                };
                const supportAddress = getSupportAddress({site});

                expect(supportAddress).toBe('');
            });
        });
    });

    describe('getDefaultNewsletterSender - ', () => {
        test('returns the sender_email from the first newsletter when available', () => {
            let site = {
                default_email_address: 'default@example.com',
                url: 'https://example.com',
                newsletters: [
                    {
                        sender_email: 'sender_email@example.com'
                    }
                ]
            };
            const defaultAddress = getDefaultNewsletterSender({site});

            expect(defaultAddress).toBe('sender_email@example.com');
        });

        test('otherwise, fallbacks to the calculated default_email_address when available', () => {
            let site = {
                default_email_address: 'default@example.com',
                url: 'https://example.com'
            };
            const defaultAddress = getDefaultNewsletterSender({site});

            expect(defaultAddress).toBe('default@example.com');
        });

        test('otherwise, fallbacks to noreply@sitedomain.com', () => {
            let site = {
                url: 'https://example.com'
            };
            const defaultAddress = getDefaultNewsletterSender({site});

            expect(defaultAddress).toBe('noreply@example.com');
        });
    });

    describe('getPriceIdFromPageQuery - ', () => {
        test('can correctly fetch price id from page query ', () => {
            const mockPriceIdFn = getPriceIdFromPageQuery;
            const siteData = Fixtures.getSiteData();
            const testProduct = siteData.products?.[0];
            const pageQuery = `${testProduct?.id}/yearly`;
            const expectedPriceId = testProduct.yearlyPrice.id;
            const value = mockPriceIdFn({site: siteData, pageQuery});
            expect(value).toBe(expectedPriceId);
        });
    });

    describe('transformApiTiersData - ', () => {
        test('can correctly transform tiers data ', () => {
            const transformedTiers = transformApiTiersData({tiers: TransformFixtureTiers});

            expect(transformedTiers[0].benefits).toHaveLength(2);
            expect(transformedTiers[1].benefits).toHaveLength(3);
        });
    });

    describe('getUrlHistory', () => {
        beforeEach(() => {
            jest.spyOn(console, 'warn').mockImplementation(() => {
                // don't log for these tests
            });
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns valid history ', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify([
                {
                    path: '/',
                    time: 0
                }
            ]));
            const urlHistory = getUrlHistory();
            expect(localStorage.getItem).toHaveBeenCalled();
            expect(urlHistory).toHaveLength(1);
        });

        test('ignores invalid history ', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid');
            const urlHistory = getUrlHistory();
            expect(localStorage.getItem).toHaveBeenCalled();
            expect(urlHistory).toBeUndefined();
        });

        test('doesn\'t throw if localStorage is disabled', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('LocalStorage disabled');
            });
            const urlHistory = getUrlHistory();
            expect(localStorage.getItem).toHaveBeenCalled();
            expect(urlHistory).toBeUndefined();
        });
    });

    describe('getAvailableProducts', () => {
        it('Does not include paid Tiers when stripe is not configured', () => {
            const actual = getAvailableProducts({
                site: {
                    ...FixturesSite.multipleTiers.basic,
                    is_stripe_configured: false
                }
            });

            expect(actual.length).toBe(0);
        });
    });

    describe('getCompExpiry', () => {
        let member = {};

        beforeEach(() => {
            member = {
                paid: true,
                subscriptions: [
                    {
                        status: 'active',
                        price: {
                            amount: 0
                        },
                        tier: {
                            expiry_at: '2023-10-13T00:00:00.000Z'
                        }
                    }
                ]
            };
        });

        it('returns the expiry date of a comped subscription', () => {
            const date = new Date('2023-10-13T00:00:00.000Z');
            expect(getCompExpiry({member})).toEqual(date.toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: 'numeric'}));
        });

        it('returns the expiry date of a comped subscription if the member has multiple subscriptions', () => {
            const date = new Date('2023-10-13T00:00:00.000Z');
            member.subscriptions.push({
                status: 'cancelled',
                price: {
                    amount: 1234
                },
                tier: {
                    expiry_at: '2023-10-14T00:00:00.000Z'
                }
            });
            expect(getCompExpiry({member})).toEqual(date.toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: 'numeric'}));
        });

        it('returns an empty string if the subscription has no expiry date', () => {
            delete member.subscriptions[0].tier.expiry_at;

            expect(getCompExpiry({member})).toEqual('');
        });
    });

    describe('isInThePast', () => {
        it('returns a boolean indicating if the provided date is in the past', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            expect(isInThePast(pastDate)).toEqual(true);
            expect(isInThePast(futureDate)).toEqual(false);
        });
    });
});
