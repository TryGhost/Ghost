import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-nav-menu/footer-banner', function () {
    setupRenderingTest();

    // Composable fixture fragments
    const hasNewFeature = {
        hasNewFeature: true,
        shouldShowFeaturedBanner: true,
        featuredEntry: {
            title: 'Test Feature',
            url: 'https://ghost.org/changelog/test',
            custom_excerpt: 'Test description',
            published_at: '2024-12-01T00:00:00.000Z',
            featured: true
        }
    };

    const noNewFeature = {
        hasNewFeature: false
    };

    const shouldNotShowFeaturedBanner = {
        shouldShowFeaturedBanner: false
    };

    const eligibleForReferral = {
        isAdmin: true,
        currentMRR: 10100,
        isStripeEnabled: true,
        stripeConnectLivemode: true,
        referralInviteDismissed: false
    };

    const notEligibleForReferral = {
        currentMRR: 0,
        isStripeEnabled: false,
        stripeConnectLivemode: false
    };

    const defaultFixture = {
        ...noNewFeature,
        ...shouldNotShowFeaturedBanner,
        ...notEligibleForReferral
    };

    const setup = function (fixtures = {}) {
        const config = {
            ...defaultFixture,
            ...fixtures
        };

        // Build whatsNew.entries based on configuration
        let entries = [];
        if (config.hasNewFeature && config.featuredEntry) {
            entries = [config.featuredEntry];
        }

        this.owner.register('service:whatsNew', Service.extend({
            seen() {},
            init() {
                this._super(...arguments);
                this.entries = entries;
            },
            hasNew: config.hasNewFeature,
            hasNewFeatured: config.hasNewFeature,
            shouldShowFeaturedBanner: config.shouldShowFeaturedBanner
        }));

        this.owner.register('service:session', Service.extend({
            init() {
                this._super(...arguments);
                this.user = {
                    isAdmin: config.isAdmin
                };
            }
        }));

        this.owner.register('service:dashboardStats', Service.extend({
            loadMrrStats() {
                return Promise.resolve();
            },
            currentMRR: config.currentMRR
        }));

        this.owner.register('service:feature', Service.extend({
            init() {
                this._super(...arguments);
                this.accessibility = {
                    referralInviteDismissed: config.referralInviteDismissed
                };
            }
        }));

        this.owner.register('service:membersUtils', Service.extend({
            isStripeEnabled: config.isStripeEnabled
        }));

        this.owner.register('service:modals', Service.extend({}));

        this.owner.register('service:settings', Service.extend({
            stripeConnectLivemode: config.stripeConnectLivemode
        }));

        this.set('hasThemeErrors', config.hasThemeErrors);
    };

    it('shows what\'s new banner when hasNewFeatured is true and referral invite is not showing', async function () {
        setup.call(this, {...hasNewFeature, ...notEligibleForReferral});

        await render(hbs`<GhNavMenu::FooterBanner />`);

        expect(find('[data-test-toast="whats-new"]'), 'what\'s new banner is visible').to.exist;
        expect(find('[data-test-whats-new="subhead"]'), 'subhead element exists').to.exist;
        expect(find('[data-test-whats-new="subhead"]').textContent).to.match(/What.s new\?/);
        expect(find('[data-test-whats-new="title"]')).to.contain.text(hasNewFeature.featuredEntry.title);
        expect(find('[data-test-whats-new="description"]')).to.contain.text(hasNewFeature.featuredEntry.custom_excerpt);
    });

    it('hides what\'s new banner when hasNewFeatured is false', async function () {
        setup.call(this, {...noNewFeature, ...notEligibleForReferral});

        await render(hbs`<GhNavMenu::FooterBanner />`);

        expect(find('[data-test-toast="whats-new"]'), 'what\'s new banner is hidden').to.not.exist;
    });

    it('hides what\'s new banner when referral invite is showing (priority)', async function () {
        setup.call(this, {...hasNewFeature, ...eligibleForReferral});

        await render(hbs`<GhNavMenu::FooterBanner />`);

        expect(find('[data-test-toast="referral"]'), 'referral banner is visible').to.exist;
        expect(find('[data-test-toast="whats-new"]'), 'what\'s new banner is hidden').to.not.exist;
    });

    it('hides what\'s new banner when hasNew is false', async function () {
        setup.call(this, {...noNewFeature, ...notEligibleForReferral});

        await render(hbs`<GhNavMenu::FooterBanner />`);

        expect(find('[data-test-toast="whats-new"]'), 'what\'s new banner is hidden').to.not.exist;
    });

    it('uses shouldShowFeaturedBanner from whatsNew service', async function () {
        setup.call(this, {...hasNewFeature, ...shouldNotShowFeaturedBanner, ...notEligibleForReferral});

        await render(hbs`<GhNavMenu::FooterBanner />`);

        expect(find('[data-test-toast="whats-new"]'), 'what\'s new banner respects shouldShowFeaturedBanner').to.not.exist;
    });
});
