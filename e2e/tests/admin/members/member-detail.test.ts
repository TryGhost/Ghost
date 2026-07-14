import {MemberDetailsPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * Behaviour contract for `/members/:id`.
 *
 * Every assertion here describes what the member detail screen does, not how it
 * is built — semantic roles, page-object locators, and API reads. Nothing in
 * this file knows which implementation is rendering it.
 *
 * That is deliberate. A second implementation of this screen is coming, and
 * this suite is what it has to satisfy. Keeping the assertions
 * implementation-neutral means the same tests can run against both without
 * branching, so a behaviour that only works on one side surfaces as a failure
 * rather than as a quietly narrowed test.
 */

usePerTestIsolation();

const memberPath = (memberId: string) => `/ghost/#/members/${memberId}`;

const BRONZE = {id: 'tier_bronze', tier_id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'};

// A member comped on two tiers, where the surviving one carries an expiry the
// admin set. Removing the other must not disturb it.
const SILVER_EXPIRY = '2027-03-01T00:00:00.000Z';
const TWO_COMP_TIERS = () => [
    {...BRONZE, expiry_at: null},
    {id: 'tier_silver', tier_id: 'tier_silver', name: 'Silver', slug: 'silver', active: true, type: 'paid', expiry_at: SILVER_EXPIRY}
];

type SentTier = {id: string; expiry_at?: string | null};
const sentTiers = (sent: {body?: Record<string, unknown>}): SentTier[] | undefined => (sent.body?.members as {tiers?: SentTier[]}[] | undefined)?.[0]?.tiers;

/**
 * Subscriptions as the members API actually serializes them: the tier is
 * carried on `price.tier` with a `tier_id`, and mirrored on the subscription
 * itself. Both are load-bearing — the two implementations read different ones
 * to group subscriptions under a tier, so a fixture that omits either renders
 * on one screen and not the other for reasons no user would ever hit.
 * See `serializers/output/members.js` ("Rename subscriptions.price.product to
 * subscriptions.price.tier").
 */
const paidSubscription = (overrides: Record<string, unknown> = {}) => ({
    id: 'sub_paid_123',
    customer: {id: 'cus_paid_123', name: 'Paid Member', email: 'paid-sub@ghost.org'},
    plan: {id: 'plan_paid', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 1050},
    status: 'active',
    start_date: '2026-01-15T12:00:00.000Z',
    current_period_end: '2026-02-15T12:00:00.000Z',
    cancel_at_period_end: false,
    price: {
        id: 'price_paid',
        price_id: 'price_paid',
        nickname: 'Monthly',
        amount: 1050,
        currency: 'usd',
        type: 'recurring',
        interval: 'month',
        tier: {...BRONZE}
    },
    tier: {...BRONZE},
    offer: null,
    attribution: null,
    ...overrides
});

// Gift and complimentary subscriptions are told apart by the plan nickname —
// both arrive with an empty id because neither has a Stripe subscription.
const giftSubscription = (overrides: Record<string, unknown> = {}) => ({
    ...paidSubscription(),
    id: '',
    plan: {id: 'plan_gift', nickname: 'Gift Subscription', interval: 'year', currency: 'usd', amount: 0},
    price: {
        id: 'price_gift',
        price_id: 'price_gift',
        nickname: 'Gift Subscription',
        amount: 0,
        currency: 'usd',
        type: 'recurring',
        interval: 'year',
        tier: {...BRONZE}
    },
    ...overrides
});

// Complimentary subscriptions arrive with an empty id and no Stripe plan.
const compSubscription = (overrides: Record<string, unknown> = {}) => ({
    ...paidSubscription(),
    id: '',
    plan: {id: 'plan_comp', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
    price: {
        id: 'price_comp',
        price_id: 'price_comp',
        nickname: 'Complimentary',
        amount: 0,
        currency: 'usd',
        type: 'recurring',
        interval: 'year',
        tier: {...BRONZE}
    },
    ...overrides
});

type MemberStatus = 'paid' | 'comped' | 'gift';

/**
 * Rewrites this member on every read, letting a test serve a shape the fixture
 * database can't produce (Stripe subscriptions, engagement counters).
 */
const interceptMemberRead = async (page: Page, memberId: string, patch: (member: Record<string, unknown>) => void) => {
    const memberReadRegex = new RegExp(`/ghost/api/admin/members/${memberId}/\\??[^/]*$`);
    await page.route(memberReadRegex, async (route) => {
        // `fallback`, not `continue` — continue would go straight to the network
        // and skip any handler registered after this one.
        if (route.request().method() !== 'GET') {
            return route.fallback();
        }
        try {
            const response = await route.fetch();
            const body = await response.json();
            if (body?.members?.[0]) {
                patch(body.members[0] as Record<string, unknown>);
            }
            return route.fulfill({response, body: JSON.stringify(body)});
        } catch (err) {
            // A post-mutation refetch can land after the test has finished, once
            // the context is gone; there's nothing left to serve. Anything else
            // is a real failure, and swallowing it would leave the request
            // hanging until the test times out with no clue why.
            if (!page.isClosed()) {
                throw err;
            }
        }
    });
};

/**
 * Serves `subscriptions` on every read of this member. The array is held by
 * reference, so a test can mutate it to reflect a write the UI just made.
 */
const seedSubscriptions = async (page: Page, memberId: string, memberStatus: MemberStatus, subscriptions: unknown[], extra: Record<string, unknown> = {}) => {
    await interceptMemberRead(page, memberId, (member) => {
        member.subscriptions = subscriptions;
        // The member's status has to agree with the subscription it's being
        // given — a paid sub on a member marked `comp` is a combination the
        // server never produces, and it sends the status-dependent UI down the
        // wrong branch.
        member.status = memberStatus;
        Object.assign(member, extra);
    });
};

/**
 * Captures the write an action makes, without needing a real Stripe
 * subscription behind it. Asserting the request rather than the rendered result
 * keeps the test neutral: both screens must ask the server for the same thing.
 */
const captureWrite = async (page: Page, urlPattern: string | RegExp, onCapture?: (body: Record<string, unknown>) => void) => {
    const sent: {body?: Record<string, unknown>} = {};
    await page.route(urlPattern, async (route) => {
        if (route.request().method() !== 'PUT') {
            return route.fallback();
        }
        sent.body = route.request().postDataJSON() as Record<string, unknown>;
        onCapture?.(sent.body);
        return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({members: [{id: 'ok'}]})});
    });
    return sent;
};

test.describe('Ghost Admin - Member Detail', () => {
    let memberFactory: MemberFactory;
    let memberDetailsPage: MemberDetailsPage;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        memberDetailsPage = new MemberDetailsPage(page);
    });

    test('member name renders in the screen title', async ({page}) => {
        const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada-detail@ghost.org'});

        await page.goto(memberPath(member.id));

        await expect(memberDetailsPage.screenTitle).toContainText('Ada Lovelace');
    });

    test('editing the member name - persists to the server', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace', email: 'grace-detail@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.nameInput.fill('Grace Hopper');
        await memberDetailsPage.saveButton.click();

        await expect.poll(async () => {
            const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
            const body = await res.json();
            return body?.members?.[0]?.name;
        }, {timeout: 10000}).toBe('Grace Hopper');
    });

    test('clicking the back link - returns to the members list', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-back-detail@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.membersBackLink.click();

        await expect(page).toHaveURL(/#\/members$/);
    });

    test('impersonation modal - exposes a real signin url', async ({page}) => {
        const member = await memberFactory.create({name: 'Alan Turing', email: 'alan-detail@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.impersonateButton.click();

        // The url is fetched after the modal opens, so assert on the value to
        // let Playwright wait rather than reading the empty initial state.
        await expect(memberDetailsPage.magicLinkInput).toHaveValue(/^https?:\/\/.+/);
    });

    test('signing out of all devices - closes the confirmation and stays on the member', async ({page}) => {
        const member = await memberFactory.create({name: 'Rear Admiral', email: 'rear-detail@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.signOutOfAllDevices.click();
        // Scoped to the modal so the click can't hit the account-owner
        // "Sign out" button in the admin sidebar dropdown.
        await memberDetailsPage.logoutConfirmModal.getByRole('button', {name: 'Sign out', exact: true}).click();

        await expect(memberDetailsPage.logoutConfirmModal).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`#/members/${member.id}`));
    });

    test('deleting a member - returns to the list and removes the record', async ({page}) => {
        const member = await memberFactory.create({name: 'Deletable', email: 'delete-detail@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.deleteButton.click();
        await memberDetailsPage.settingsSection.confirmDeleteButton.click();

        await expect(page).toHaveURL(/#\/members$/);
        const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
        expect(res.status()).toBe(404);
    });

    test('creating a member - persists to the server and redirects to the detail', async ({page}) => {
        const email = 'new-member-detail@ghost.org';

        await page.goto(memberPath('new'));
        await memberDetailsPage.nameInput.fill('New Member');
        await memberDetailsPage.emailInput.fill(email);
        await memberDetailsPage.saveButton.click();

        let createdId: string | undefined;
        await expect.poll(async () => {
            const res = await page.request.get(`/ghost/api/admin/members/?filter=${encodeURIComponent(`email:'${email}'`)}`);
            const body = await res.json();
            createdId = body?.members?.[0]?.id;
            return body?.members?.[0]?.name;
        }, {timeout: 10000}).toBe('New Member');
        await expect(page).toHaveURL(new RegExp(`#/members/${createdId}(\\?|$)`));
    });

    test('disabling then re-enabling commenting - clears the disabled indicator', async ({page}) => {
        const member = await memberFactory.create({name: 'Commenter', email: 'commenter-toggle@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();

        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.enableCommentingButton.click();

        await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();
    });

    test('sidebar - shows the signup location and created date', async ({page}) => {
        // Members created through the API carry no geolocation, so the
        // location falls back deterministically.
        const member = await memberFactory.create({name: 'Katherine Johnson', email: 'katherine-sidebar@ghost.org'});

        await page.goto(memberPath(member.id));

        await expect(page.getByText('Unknown location')).toBeVisible();
        await expect(page.getByText(/Created/)).toBeVisible();
    });

    test('leaving with unsaved changes - warns before navigating away', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-unsaved@ghost.org'});

        await page.goto(memberPath(member.id));
        await memberDetailsPage.nameInput.fill('Grace B. Hopper');
        await memberDetailsPage.membersBackLink.click();

        await expect(memberDetailsPage.confirmLeaveButton).toBeVisible();
        await memberDetailsPage.confirmLeaveButton.click();
        await expect(page).toHaveURL(/#\/members$/);
    });

    test('toggling a newsletter - persists the new state', async ({page}) => {
        const member = await memberFactory.create({name: 'Newsletter Test', email: 'newsletter-toggle@ghost.org'});

        await page.goto(memberPath(member.id));
        // Wait on the toggle, not the checkbox — Ember hides the real input
        // behind a styled span, so the control is never visible itself.
        await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();
        const initiallyChecked = await memberDetailsPage.newsletterSubscriptionCheckboxes.first().isChecked();

        await memberDetailsPage.newsletterSubscriptionToggles.first().click();
        await memberDetailsPage.save();
        await page.reload();

        await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.first()).toBeChecked({checked: !initiallyChecked});
    });

    test('activity feed - view-all link points at this members full activity', async ({page}) => {
        const member = await memberFactory.create({name: 'Activity Target', email: 'activity-viewall@ghost.org'});
        // A fresh member's signup event is written asynchronously, so serve a
        // known event rather than racing it — the link only renders on the
        // populated branch.
        await page.route(/\/ghost\/api\/admin\/members\/events\/?\?/, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    events: [{
                        type: 'signup_event',
                        data: {
                            id: 'evt-1',
                            created_at: new Date(0).toISOString(),
                            member_id: member.id,
                            member: {id: member.id, name: member.name, email: member.email}
                        }
                    }],
                    meta: {pagination: {}}
                })
            });
        });

        await page.goto(memberPath(member.id));

        const viewAll = page.getByRole('link', {name: /View all member activity/});
        await expect(viewAll).toBeVisible();
        await expect(viewAll).toHaveAttribute('href', new RegExp(`#/members-activity/?\\?member=${member.id}`));
    });

    test.describe('Subscriptions', () => {
        // The Subscriptions section is gated on paid members being enabled.
        test.use({stripeEnabled: true});

        test('paid subscription - shows the tier, price, interval and renewal date', async ({page}) => {
            const member = await memberFactory.create({name: 'Paid Member', email: 'paid-sub@ghost.org'});
            await seedSubscriptions(page, member.id, 'paid', [paidSubscription()]);

            await page.goto(memberPath(member.id));

            await expect(page.getByText('Bronze').first()).toBeVisible();
            await expect(page.getByText('10.50').first()).toBeVisible();
            await expect(page.getByText(/month/i).first()).toBeVisible();
            await expect(page.getByText(/Renews 15 Feb 2026/).first()).toBeVisible();
        });

        test('subscription set to cancel - shows remaining access rather than a renewal', async ({page}) => {
            const member = await memberFactory.create({name: 'Cancelling Member', email: 'cancelling-sub@ghost.org'});
            await seedSubscriptions(page, member.id, 'paid', [paidSubscription({cancel_at_period_end: true})]);

            await page.goto(memberPath(member.id));

            await expect(page.getByText(/Has access until\s+15 Feb 2026/).first()).toBeVisible();
            await expect(page.getByText(/Renews/)).toHaveCount(0);
        });

        test('complimentary subscription - shows the tier without a price', async ({page}) => {
            const member = await memberFactory.create({name: 'Comp Member', email: 'comp-sub@ghost.org'});
            await seedSubscriptions(page, member.id, 'comped', [compSubscription()]);

            await page.goto(memberPath(member.id));

            await expect(page.getByText('Bronze').first()).toBeVisible();
            await expect(page.getByText(/Complimentary/i).first()).toBeVisible();
        });

        test('gift subscription - offers no actions menu', async ({page}) => {
            // A gift is bought by someone else and can't be cancelled or
            // revoked from here, so the row deliberately has no menu.
            const member = await memberFactory.create({name: 'Gift Member', email: 'gift-sub@ghost.org'});
            await seedSubscriptions(page, member.id, 'gift', [giftSubscription()]);

            await page.goto(memberPath(member.id));

            await expect(page.getByText('Bronze').first()).toBeVisible();
            await expect(memberDetailsPage.subscriptionActionsButton).toHaveCount(0);
        });

        test('cancelling a subscription - asks the server to cancel at period end', async ({page}) => {
            const member = await memberFactory.create({name: 'Cancel Member', email: 'cancel-action@ghost.org'});
            const subs = [paidSubscription()];
            await seedSubscriptions(page, member.id, 'paid', subs);
            // Reflect the write back into the seeded read so the screen can
            // re-render from it, the way a real refetch would.
            const sent = await captureWrite(page, `**/members/${member.id}/subscriptions/sub_paid_123/**`, (body) => {
                subs[0].cancel_at_period_end = body.cancel_at_period_end as boolean;
            });

            await page.goto(memberPath(member.id));
            await memberDetailsPage.subscriptionActionsButton.click();
            await memberDetailsPage.cancelSubscriptionButton.click();

            // The request is the contract — the server doesn't care which UI sent it.
            await expect.poll(() => sent.body?.cancel_at_period_end).toBe(true);
        });

        test('continuing a cancelled subscription - asks the server to resume it', async ({page}) => {
            const member = await memberFactory.create({name: 'Continue Member', email: 'continue-action@ghost.org'});
            const subs = [paidSubscription({cancel_at_period_end: true})];
            await seedSubscriptions(page, member.id, 'paid', subs);
            const sent = await captureWrite(page, `**/members/${member.id}/subscriptions/sub_paid_123/**`, (body) => {
                subs[0].cancel_at_period_end = body.cancel_at_period_end as boolean;
            });

            await page.goto(memberPath(member.id));
            await memberDetailsPage.subscriptionActionsButton.click();
            await memberDetailsPage.continueSubscriptionButton.click();

            await expect.poll(() => sent.body?.cancel_at_period_end).toBe(false);
        });

        test('removing a complimentary subscription - puts back only the surviving tiers', async ({page}) => {
            const member = await memberFactory.create({name: 'Multi Comp', email: 'multi-comp@ghost.org'});
            await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {tiers: TWO_COMP_TIERS()});
            const sent = await captureWrite(page, new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`));

            await page.goto(memberPath(member.id));
            await memberDetailsPage.removeComplimentarySubscription();

            await expect.poll(() => sentTiers(sent)?.length).toBe(1);
            expect(sentTiers(sent)?.[0].id).toBe('tier_silver');
        });
    });

    test.describe('New member screen', () => {
        // The Subscriptions section is gated on paid members being enabled, so
        // stripe has to be on for it to render at all.
        test.use({stripeEnabled: true});

        test('newsletters section - renders a toggle list', async ({page}) => {
            await page.goto(memberPath('new'));

            await expect(page.getByRole('heading', {name: 'Newsletters', exact: true})).toBeVisible();
            await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();
        });

        test('newsletters section - toggles are checked by default', async ({page}) => {
            // Newsletters with subscribe_on_signup and members visibility are
            // pre-selected on create, so the admin can see what the new member
            // will land subscribed to. Assert every toggle rather than the
            // first, which would pass even if a later default were missed.
            await page.goto(memberPath('new'));
            await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();

            const count = await memberDetailsPage.newsletterSubscriptionCheckboxes.count();
            expect(count).toBeGreaterThan(0);
            for (let i = 0; i < count; i++) {
                await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.nth(i)).toBeChecked();
            }
        });

        test('activity section - shows an empty state', async ({page}) => {
            await page.goto(memberPath('new'));

            await expect(page.getByText('All events related to this member will be shown here.')).toBeVisible();
        });

        test('subscriptions section - shows an empty state', async ({page}) => {
            await page.goto(memberPath('new'));

            await expect(page.getByRole('heading', {name: 'Subscriptions', exact: true})).toBeVisible();
            await expect(page.getByRole('heading', {name: 'No subscriptions', exact: true})).toBeVisible();
        });
    });

    test.describe('Engagement section', () => {
        const stubMemberRead = interceptMemberRead;

        test('member has received no emails - shows an empty state', async ({page}) => {
            const member = await memberFactory.create({name: 'Ada Lovelace', email: 'engagement-empty@ghost.org'});

            await page.goto(memberPath(member.id));

            await expect(page.getByRole('heading', {name: 'Engagement'})).toBeVisible();
            await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
        });

        test('member has received emails - shows counts and open rate', async ({page}) => {
            const member = await memberFactory.create({name: 'Stats Member', email: 'engagement-stats@ghost.org'});
            // Inject the stats so the branch renders deterministically rather
            // than depending on what the fixture database happens to hold.
            await stubMemberRead(page, member.id, (m) => {
                m.email_count = 12;
                m.email_opened_count = 9;
                m.email_open_rate = 75;
            });

            await page.goto(memberPath(member.id));

            const engagement = memberDetailsPage.engagementSection;
            await expect(engagement.getByText('Emails received')).toBeVisible();
            await expect(engagement.getByText('12', {exact: true})).toBeVisible();
            await expect(engagement.getByText('Emails opened')).toBeVisible();
            await expect(engagement.getByText('9', {exact: true})).toBeVisible();
            await expect(engagement.getByText('Average open rate')).toBeVisible();
            await expect(engagement.getByText(/75\s*%/)).toBeVisible();
        });

        test('email fields absent from the payload - shows the empty state', async ({page}) => {
            const member = await memberFactory.create({name: 'Ada Lovelace', email: 'engagement-undef@ghost.org'});
            await stubMemberRead(page, member.id, (m) => {
                delete m.email_count;
                delete m.email_opened_count;
                delete m.email_open_rate;
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByRole('heading', {name: 'Engagement'})).toBeVisible();
            await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
        });

        test('open rate not yet calculated - shows the placeholder', async ({page}) => {
            const member = await memberFactory.create({name: 'Early Stats', email: 'engagement-null@ghost.org'});
            // The server sends a null rate until the member has been sent 5
            // newsletters; both the count and a bare % would be misleading.
            await stubMemberRead(page, member.id, (m) => {
                m.email_count = 3;
                m.email_opened_count = 2;
                m.email_open_rate = null;
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByText('This metric is calculated once a member has received 5 newsletters.')).toBeVisible();
        });
    });
});
