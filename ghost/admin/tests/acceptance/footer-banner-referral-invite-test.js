import loginAsRole from '../helpers/login-as-role';
import moment from 'moment-timezone';
import {beforeEach, describe, it} from 'mocha';
import {click, find} from '@ember/test-helpers';
import {disableStripe, enableStripe} from '../helpers/stripe';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Referral Invite Banner', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    const mrrResponseObject = (mrr) => {
        return {
            stats: [
                {
                    date: '2025-01-01',
                    mrr: mrr,
                    currency: 'usd'
                }
            ],
            meta: {
                totals: [
                    {
                        currency: 'usd',
                        mrr: mrr
                    }
                ]
            }
        };
    };

    describe('Login as an Administrator', function () {
        beforeEach(async function () {
            await loginAsRole('Administrator', this.server);
        });

        describe('With Stripe enabled and MRR > $100', function () {
            beforeEach(async function () {
                // Enable members and Stripe, and set MRR > $100
                enableStripe(this.server);

                // Simulate MRR > $100
                this.server.get('/stats/mrr/', () => mrrResponseObject(50000));
            });

            it('shows referral invite banner on direct navigation to /pages', async function () {
                await visit('/pages');

                // Referral banner should be visible
                expect(find('.gh-sidebar-banner.gh-referral-toast')).to.exist;
                // What's New banner should not be visible
                expect(find('.gh-sidebar-banner.gh-whatsnew-toast')).to.not.exist;
            });

            it('shows referral invite banner on direct navigation to /dashboard', async function () {
                await visit('/dashboard');

                // Banner should be visible
                expect(find('.gh-sidebar-banner.gh-referral-toast')).to.exist;
            });

            it('can dismiss the referral invite banner and it does not reappear', async function () {
                await visit('/pages');

                // Dismiss the banner
                await click('.gh-sidebar-banner.gh-referral-toast .gh-sidebar-banner-close');
                expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
                 
                // Check that referralInviteDismissed has a value set
                const featureService = this.owner.lookup('service:feature');
                expect(featureService.referralInviteDismissed).to.not.be.null;

                // Visit other routes and check banner does not reappear
                await visit('/dashboard');
                expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
                await visit('/posts');
                expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
            });
        });

        it('referral banner does not appear when Stripe is disabled', async function () {
            disableStripe(this.server);
            this.server.get('/stats/mrr/', () => mrrResponseObject(50000));

            await visit('/pages');
            expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
        });

        it('referral banner does not appear when MRR < $100', async function () {
            enableStripe(this.server);
            this.server.get('/stats/mrr/', () => mrrResponseObject(7500));

            await visit('/pages');
            expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
        });  
    });

    describe('Login as an Editor', function () {
        beforeEach(async function () {
            await loginAsRole('Editor', this.server);
            // Enable members and Stripe, and set MRR > $100
            enableStripe(this.server);

            // Simulate MRR > $100
            this.server.get('/stats/mrr/', () => mrrResponseObject(50000));
        });

        it('does not show referral invite banner', async function () {
            await visit('/pages');

            // Banner should not be visible
            expect(find('.gh-sidebar-banner.gh-referral-toast')).to.not.exist;
        });
    });
});