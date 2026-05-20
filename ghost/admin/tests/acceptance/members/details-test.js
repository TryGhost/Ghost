import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {enableNewsletters} from '../../helpers/newsletters';
import {enableStripe} from '../../helpers/stripe';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Member details', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    let clock;
    let tier;

    function subscriptionSummaryText(tierId) {
        const priceLabel = find(`[data-test-tier="${tierId}"] .gh-cp-membertier-pricelabel`)?.textContent?.trim() || '';
        const renewal = find(`[data-test-tier="${tierId}"] .gh-cp-membertier-renewal`)?.textContent?.trim() || '';

        return [priceLabel, renewal]
            .filter(Boolean)
            .join(' ')
            .replace(/–/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
        enableLabsFlag(this.server, 'membersLastSeenFilter');
        enableLabsFlag(this.server, 'membersTimeFilters');

        enableStripe(this.server);
        enableNewsletters(this.server, true);

        // add a default tier that complimentary plans can be assigned to
        tier = this.server.create('tier', {
            id: '6213b3f6cb39ebdb03ebd810',
            name: 'Supporter',
            slug: 'supporter',
            created_at: '2022-02-21T16:47:02.000Z',
            updated_at: '2022-03-03T15:37:02.000Z',
            description: null,
            monthly_price_id: '6220df272fee0571b5dd0a0a',
            yearly_price_id: '6220df272fee0571b5dd0a0b',
            type: 'paid',
            active: true,
            welcome_page_url: '/'
        });

        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
    });

    afterEach(function () {
        clock?.restore();
    });

    it('has a known base-state', async function () {
        const member = this.server.create('member', {
            id: 1,
            subscriptions: [
                this.server.create('subscription', {
                    id: 'sub_1KZGcmEGb07FFvyN9jwrwbKu',
                    customer: {
                        id: 'cus_LFmBWoSkB84lnr',
                        name: 'test',
                        email: 'test@ghost.org'
                    },
                    plan: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    status: 'canceled',
                    start_date: '2022-03-03T15:31:27.000Z',
                    default_payment_card_last4: '4242',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:31:27.000Z',
                    price: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_LFmAAmCnnbzrvL',
                            name: 'Supporter',
                            tier_id: tier.id
                        }
                    },
                    offer: null
                }),
                this.server.create('subscription', {
                    id: 'sub_1KZGi6EGb07FFvyNDjZq98g8',
                    tier,
                    customer: {
                        id: 'cus_LFmGicpX4BkQKH',
                        name: '123',
                        email: 'test@ghost.org'
                    },
                    plan: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    status: 'active',
                    start_date: '2022-03-03T15:36:58.000Z',
                    default_payment_card_last4: '4242',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:36:58.000Z',
                    price: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_LFmAAmCnnbzrvL',
                            name: 'Supporter',
                            tier_id: tier.id
                        }
                    },
                    offer: null
                })
            ],
            tiers: [
                tier
            ]
        });

        await visit(`/members/${member.id}`);

        expect(currentURL()).to.equal(`/members/${member.id}`);

        expect(findAll('[data-test-subscription]').length, 'displays all member subscriptions')
            .to.equal(2);
        await click('[data-test-button="save"]');
        expect(find('[data-test-button="save"]')).to.not.contain.text('Retry');
    });

    it('displays correctly one canceled subscription', async function () {
        const member = this.server.create('member', {
            id: 1,
            subscriptions: [
                this.server.create('subscription', {
                    id: 'sub_1KZGcmEGb07FFvyN9jwrwbKu',
                    tier,
                    customer: {
                        id: 'cus_LFmBWoSkB84lnr',
                        name: 'test',
                        email: 'test@ghost.org'
                    },
                    plan: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    status: 'canceled',
                    start_date: '2022-03-03T15:31:27.000Z',
                    default_payment_card_last4: '4242',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:31:27.000Z',
                    price: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_LFmAAmCnnbzrvL',
                            name: 'Supporter',
                            tier_id: '6213b3f6cb39ebdb03ebd810'
                        }
                    },
                    offer: null
                })
            ],
            tiers: []
        });

        await visit(`/members/${member.id}`);

        expect(currentURL()).to.equal(`/members/${member.id}`);

        expect(findAll('[data-test-subscription]').length, 'displays all member subscriptions')
            .to.equal(1);
    });

    it('renders non-discounted subscription prices with trailing zeros', async function () {
        const member = this.server.create('member', {
            id: 1,
            subscriptions: [
                this.server.create('subscription', {
                    id: 'sub_1KZGi6EGb07FFvyNDjZq98g8',
                    tier,
                    customer: {
                        id: 'cus_LFmGicpX4BkQKH',
                        name: '123',
                        email: 'test@ghost.org'
                    },
                    plan: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        nickname: 'Monthly',
                        amount: 590,
                        interval: 'month',
                        currency: 'USD'
                    },
                    status: 'active',
                    start_date: '2022-03-03T15:36:58.000Z',
                    default_payment_card_last4: '4242',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:36:58.000Z',
                    price: {
                        id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 590,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_LFmAAmCnnbzrvL',
                            name: 'Supporter',
                            tier_id: tier.id
                        }
                    },
                    offer: null
                })
            ],
            tiers: [
                tier
            ]
        });

        await visit(`/members/${member.id}`);

        const amountElement = find(`[data-test-tier="${tier.id}"] .gh-tier-card-price .amount`);
        expect(amountElement.textContent.trim()).to.equal('5.90');
    });

    it('can add and remove complimentary subscription', async function () {
        const member = this.server.create('member', {name: 'Comp Member Test'});

        await visit(`/members/${member.id}`);

        expect(findAll('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons')
            .to.equal(1);

        await click('[data-test-button="add-complimentary"]');
        expect(find('[data-test-modal="member-tier"]'), 'select tier modal').to.exist;
        expect(find('[data-test-text="select-tier-desc"]')).to.contain.text('Comp Member Test');
        expect(find('[data-test-tier-option="6213b3f6cb39ebdb03ebd810"]')).to.have.exist;
        expect(find('[data-test-tier-option="6213b3f6cb39ebdb03ebd810"]')).to.have.class('active');
        await click('[data-test-button="save-comp-tier"]');

        expect(findAll('[data-test-subscription]').length, '# of subscription blocks - after add comped')
            .to.equal(1);

        await click('[data-test-tier="6213b3f6cb39ebdb03ebd810"] [data-test-button="subscription-actions"]');
        await click('[data-test-tier="6213b3f6cb39ebdb03ebd810"] [data-test-button="remove-complimentary"]');

        expect(findAll('[data-test-subscription]').length, '# of subscription blocks - after remove comped')
            .to.equal(0);
    });

    it('can add complimentary subscription when member has canceled subscriptions', async function () {
        const member = this.server.create('member', {
            name: 'Comped for canceled sub test',
            subscriptions: [
                this.server.create('subscription', {
                    // tier, // _Not_ included as `tier` when subscription is canceled
                    status: 'canceled',
                    price: {
                        id: 'price_1',
                        tier: {
                            id: 'prod_1',
                            tier_id: tier.id
                        }
                    }
                })
            ]
        });

        await visit(`/members/${member.id}`);

        expect(findAll('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons')
            .to.equal(1);

        await click('[data-test-button="add-complimentary"]');
        await click('[data-test-button="save-comp-tier"]');

        expect(findAll('[data-test-subscription]').length, '# of subscription blocks - after add comped')
            .to.equal(2);
        expect(findAll('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons - after add comped')
            .to.equal(0);
    });

    it('displays gift subscriptions with expiry text and without an action menu', async function () {
        const giftTier = this.server.create('tier', {
            id: 'gift-tier-1',
            name: 'Gift tier',
            slug: 'gift-tier',
            created_at: '2022-02-21T16:47:02.000Z',
            updated_at: '2022-03-03T15:37:02.000Z',
            description: null,
            monthly_price_id: 'gift-monthly-price',
            yearly_price_id: 'gift-yearly-price',
            type: 'paid',
            active: true,
            welcome_page_url: '/',
            expiry_at: '2022-04-03T00:00:00.000Z'
        });

        const member = this.server.create('member', {
            id: 1,
            status: 'gift',
            tiers: [giftTier],
            subscriptions: [
                this.server.create('subscription', {
                    id: '',
                    tier: giftTier,
                    customer: {
                        id: '',
                        name: 'Gift Receiver',
                        email: 'gift@example.com'
                    },
                    plan: {
                        id: '',
                        nickname: 'Gift subscription',
                        amount: 0,
                        interval: 'year',
                        currency: 'USD'
                    },
                    status: 'active',
                    start_date: '2022-03-03T15:36:58.000Z',
                    default_payment_card_last4: '****',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:36:58.000Z',
                    price: {
                        id: '',
                        price_id: '',
                        nickname: 'Gift subscription',
                        amount: 0,
                        interval: 'year',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: '',
                            tier_id: giftTier.id
                        }
                    },
                    offer: null
                })
            ]
        });

        await visit(`/members/${member.id}`);

        expect(currentURL()).to.equal(`/members/${member.id}`);

        const tierCard = find(`[data-test-tier="${giftTier.id}"]`);

        expect(subscriptionSummaryText(giftTier.id)).to.equal('Gift subscription - Expires 3 Apr 2022');
        expect(tierCard).to.contain.text('Gift subscription');
        expect(find(`[data-test-tier="${giftTier.id}"] [data-test-button="subscription-actions"]`)).to.not.exist;
    });

    it('displays comped subscriptions with expiry text and a complimentary action menu', async function () {
        const compedTier = this.server.create('tier', {
            id: 'comped-tier-1',
            name: 'Comped tier',
            slug: 'comped-tier',
            created_at: '2022-02-21T16:47:02.000Z',
            updated_at: '2022-03-03T15:37:02.000Z',
            description: null,
            monthly_price_id: 'comped-monthly-price',
            yearly_price_id: 'comped-yearly-price',
            type: 'paid',
            active: true,
            welcome_page_url: '/',
            expiry_at: '2022-04-03T00:00:00.000Z'
        });

        const member = this.server.create('member', {
            id: 1,
            status: 'comped',
            tiers: [compedTier],
            subscriptions: [
                this.server.create('subscription', {
                    id: '',
                    tier: compedTier,
                    customer: {
                        id: '',
                        name: 'Comped Receiver',
                        email: 'comped@example.com'
                    },
                    plan: {
                        id: '',
                        nickname: 'Complimentary',
                        amount: 0,
                        interval: 'year',
                        currency: 'USD'
                    },
                    status: 'active',
                    start_date: '2022-03-03T15:36:58.000Z',
                    default_payment_card_last4: '****',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:36:58.000Z',
                    price: {
                        id: '',
                        price_id: '',
                        nickname: 'Complimentary',
                        amount: 0,
                        interval: 'year',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: '',
                            tier_id: compedTier.id
                        }
                    },
                    offer: null
                })
            ]
        });

        await visit(`/members/${member.id}`);

        expect(currentURL()).to.equal(`/members/${member.id}`);
        expect(subscriptionSummaryText(compedTier.id)).to.equal('Complimentary - Expires 3 Apr 2022');
        expect(find(`[data-test-tier="${compedTier.id}"] [data-test-button="subscription-actions"]`)).to.exist;

        await click(`[data-test-tier="${compedTier.id}"] [data-test-button="subscription-actions"]`);
        expect(find('.tier-actions-menu')).to.contain.text('Remove complimentary subscription');
    });

    it('displays paid subscriptions with Stripe actions', async function () {
        const member = this.server.create('member', {
            id: 1,
            subscriptions: [
                this.server.create('subscription', {
                    id: 'sub_paid_1',
                    tier,
                    customer: {
                        id: 'cus_paid_1',
                        name: 'Paid Member',
                        email: 'paid@example.com'
                    },
                    plan: {
                        id: 'price_paid_1',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    status: 'active',
                    start_date: '2022-03-03T15:36:58.000Z',
                    default_payment_card_last4: '4242',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: '2022-04-03T15:36:58.000Z',
                    price: {
                        id: 'price_paid_1',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_paid_1',
                            tier_id: tier.id
                        }
                    },
                    offer: null
                })
            ],
            tiers: [tier]
        });

        await visit(`/members/${member.id}`);

        expect(currentURL()).to.equal(`/members/${member.id}`);
        expect(subscriptionSummaryText(tier.id)).to.equal('Renews 3 Apr 2022');
        expect(find(`[data-test-tier="${tier.id}"] [data-test-button="subscription-actions"]`)).to.exist;

        await click(`[data-test-tier="${tier.id}"] [data-test-button="subscription-actions"]`);
        expect(find('.tier-actions-menu')).to.contain.text('View Stripe customer');
        expect(find('.tier-actions-menu')).to.contain.text('View Stripe subscription');
    });

    it('handles multiple tiers', async function () {
        const tier2 = this.server.create('tier', {
            name: 'Superfan',
            slug: 'superfan',
            created_at: '2022-02-21T16:47:02.000Z',
            updated_at: '2022-03-03T15:37:02.000Z',
            description: null,
            monthly_price_id: '6220df272fee0571b5dd0a0a',
            yearly_price_id: '6220df272fee0571b5dd0a0b',
            type: 'paid',
            active: true,
            welcome_page_url: '/'
        });

        const member = this.server.create('member', {name: 'Multiple tier test'});

        this.server.create('subscription', {member, tier, status: 'canceled', price: {id: '1', tier: {tier_id: tier.id}}});
        this.server.create('subscription', {member, tier, status: 'canceled', price: {id: '1', tier: {tier_id: tier.id}}});
        this.server.create('subscription', {member, tier: tier2, status: 'canceled', price: {id: '1', tier: {tier_id: tier2.id}}});

        await visit(`/members/${member.id}`);

        // all subscriptions are shown
        expect(findAll('[data-test-subscription]').length, '# of subscriptions shown').to.equal(3);

        // verify correct number of occurrences for each tier name
        const supporterCount = findAll('[data-test-text="tier-name"]').filter(el => el.textContent.includes('Supporter')).length;
        const superfanCount = findAll('[data-test-text="tier-name"]').filter(el => el.textContent.includes('Superfan')).length;

        expect(supporterCount, '# of Supporter tiers').to.equal(2);
        expect(superfanCount, '# of Superfan tiers').to.equal(1);

        // can add complimentary
        expect(findAll('[data-test-button="add-complimentary"]').length, '# of add-complimentary buttons').to.equal(1);
        await click('[data-test-button="add-complimentary"]');
        await click(`[data-test-tier-option="${tier2.id}"]`);
        await click('[data-test-button="save-comp-tier"]');

        expect(findAll('[data-test-subscription]').length, '# of tiers after comp added').to.equal(4);
        expect(findAll('[data-test-text="tier-name"]').filter(el => el.textContent.includes('Supporter')).length, '# of Supporter tiers after comp added').to.equal(2);
        expect(findAll('[data-test-text="tier-name"]').filter(el => el.textContent.includes('Superfan')).length, '# of Superfan tiers after comp added').to.equal(2);
    });

    it('does not set comped status when saving member with stale tier data', async function () {
        // Regression test: When a member's subscription was cancelled while the admin
        // had the member page open, saving the member would incorrectly set status to
        // 'comped' because stale tier data was sent in the request.

        // 1. Create a paid member with an active subscription
        const member = this.server.create('member', {
            name: 'Stale Tier Test',
            status: 'paid',
            tiers: [tier],
            subscriptions: [
                this.server.create('subscription', {
                    tier,
                    status: 'active',
                    plan: {
                        id: 'price_1',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    price: {
                        id: 'price_1',
                        price_id: '6220df272fee0571b5dd0a0a',
                        nickname: 'Monthly',
                        amount: 500,
                        interval: 'month',
                        type: 'recurring',
                        currency: 'USD',
                        tier: {
                            id: 'prod_1',
                            tier_id: tier.id
                        }
                    }
                })
            ]
        });

        // 2. Visit member page (loads tier data into client memory)
        await visit(`/members/${member.id}`);
        expect(currentURL()).to.equal(`/members/${member.id}`);

        // 3. Simulate backend cancellation - remove tier directly in mirage
        // This mimics what happens when a subscription is cancelled via Stripe
        // while the admin still has the member page open
        member.update({
            tiers: [],
            status: 'free'
        });

        // 4. Edit the member (change note) and save
        // The client still has stale tier data in memory
        await fillIn('[data-test-input="member-note"]', 'Testing stale tier data');
        await click('[data-test-button="save"]');

        // 5. Verify save succeeded and member is still free, not comped
        expect(find('[data-test-button="save"]')).to.not.contain.text('Retry');

        const updatedMember = this.server.schema.members.find(member.id);
        expect(updatedMember.status).to.equal('free');
        expect(updatedMember.tiers.length).to.equal(0);
    });
});
