import {MemberDetailsPage, SidebarPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * Behaviour contract for `/members/:id`.
 *
 * Ember and React implementations of this screen coexist behind the
 * `memberDetailsReact` Labs flag, and this file runs the same assertions
 * against both by generating one describe block per flag state. No test body
 * knows which implementation is rendering it, and none may branch on it.
 *
 * A test that passes under one block and fails under the other is a real
 * user-facing difference between the two screens. That is the point: it makes
 * a gap impossible to hide behind a conditional.
 *
 * Anything true of only one implementation does not belong here.
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

for (const {implementation, memberDetailsReact} of [
    {implementation: 'Ember', memberDetailsReact: false},
    {implementation: 'React', memberDetailsReact: true}
] as const) {
    test.describe(`Ghost Admin - Member Detail (${implementation})`, () => {
        test.use({labs: {memberDetailsReact}});

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

        test('leaving with unsaved changes via the sidebar - warns before navigating away', async ({page}) => {
            // The sidebar navigates with native hash anchors rather than
            // client-side router links, so it exercises a different guard path
            // than the back link above; both must warn.
            const sidebar = new SidebarPage(page);
            const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-unsaved-sidebar@ghost.org'});

            await page.goto(memberPath(member.id));
            await memberDetailsPage.nameInput.fill('Grace B. Hopper');
            await sidebar.getNavLink('Members').click();

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
}

/**
 * Known divergences between the two implementations.
 *
 * Everything above this point is generic and must stay that way. A test only
 * belongs here when the *behaviour* — not the markup — exists in one
 * implementation and not the other, and we have decided not to close the gap.
 * Each one records what the divergence is and why it stands, so the difference
 * is a deliberate, visible decision rather than a silently narrowed test.
 */
test.describe('Ghost Admin - Member Detail - known divergences', () => {
    let memberFactory: MemberFactory;
    let memberDetailsPage: MemberDetailsPage;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        memberDetailsPage = new MemberDetailsPage(page);
    });

    /**
     * Adding a complimentary subscription is the one flow split purely on
     * interaction rather than behaviour. Both screens compute the same
     * `expiry_at` from the same duration options and send the same request, but
     * one picks a tier with radio buttons and the other with a dropdown. Driving
     * both from one test would put a branch inside the page object, which buys
     * less than it costs — so the assertion is duplicated instead, and the two
     * tests must be kept in step.
     */
    test.describe('Ember', () => {
        test.use({labs: {memberDetailsReact: false}, stripeEnabled: true});

        test('adding a complimentary subscription - grants the chosen tier forever', async ({page}) => {
            const member = await memberFactory.create({name: 'Comp Grant', email: 'comp-grant-ember@ghost.org'});
            const sent = await captureWrite(page, new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`));

            await page.goto(memberPath(member.id));
            await page.getByRole('button', {name: /Add complimentary subscription/}).click();
            const option = memberDetailsPage.emberCompTierOptions.first();
            const chosenTierId = await option.getAttribute('data-test-tier-option');
            await option.click();
            await memberDetailsPage.emberSaveCompTierButton.click();

            await expect.poll(() => sentTiers(sent)?.length).toBe(1);
            // The tier the admin picked, not merely some tier.
            expect(sentTiers(sent)?.[0].id).toBe(chosenTierId);
            // Forever is the default, so no expiry is sent.
            expect(sentTiers(sent)?.[0].expiry_at ?? null).toBeNull();
        });

        test('invalid email - save stays enabled and the server rejects it', async ({page}) => {
            // Ember validates on submit: Save is always clickable, and the
            // failed attempt reports why. React disables Save instead — see the
            // React-side counterpart below.
            const member = await memberFactory.create({name: 'Invalid Email', email: 'valid-ember@ghost.org'});

            await page.goto(memberPath(member.id));
            await memberDetailsPage.emailInput.fill('not-an-email');
            await memberDetailsPage.saveButton.click();

            await expect(memberDetailsPage.retryButton).toBeVisible();
            await expect(memberDetailsPage.body).toContainText('Invalid Email');
        });

        test('commenting can be re-enabled from the sidebar indicator', async ({page}) => {
            // Ember offers a one-click Enable next to the "Comments disabled"
            // indicator. React only exposes this through the actions menu, which
            // the generic suite already covers for both.
            const member = await memberFactory.create({name: 'Sidebar Enable', email: 'sidebar-enable@ghost.org'});

            await page.goto(memberPath(member.id));
            await memberDetailsPage.settingsSection.memberActionsButton.click();
            await memberDetailsPage.settingsSection.disableCommentingButton.click();
            await memberDetailsPage.disableCommentingConfirmButton.click();
            await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

            await memberDetailsPage.enableCommentingLink.click();

            await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();
        });
    });

    test.describe('React', () => {
        test.use({labs: {memberDetailsReact: true}, stripeEnabled: true});

        // Ember counterpart above — keep the assertions identical.
        test('adding a complimentary subscription - grants the chosen tier forever', async ({page}) => {
            const member = await memberFactory.create({name: 'Comp Grant', email: 'comp-grant-react@ghost.org'});
            const sent = await captureWrite(page, new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`));

            await page.goto(memberPath(member.id));
            await page.getByRole('button', {name: /Add complimentary subscription/}).click();
            await page.getByTestId('comp-tier-select').click();
            const option = memberDetailsPage.reactCompTierOptions.first();
            const chosenTierId = await option.getAttribute('data-tier-id');
            await option.click();
            await page.getByTestId('comp-add-confirm').click();

            await expect.poll(() => sentTiers(sent)?.length).toBe(1);
            expect(sentTiers(sent)?.[0].id).toBe(chosenTierId);
            expect(sentTiers(sent)?.[0].expiry_at ?? null).toBeNull();
        });

        test('invalid email - save is disabled', async ({page}) => {
            // React blocks the submit rather than letting it fail, so there is
            // no server error to surface. Deliberate; the Ember counterpart
            // above pins the other behaviour.
            const member = await memberFactory.create({name: 'Invalid Email', email: 'valid-react@ghost.org'});

            await page.goto(memberPath(member.id));
            await memberDetailsPage.emailInput.fill('not-an-email');

            await expect(memberDetailsPage.saveButton).toBeDisabled();
        });

        test('failed member load - offers a retry rather than a not-found message', async ({page}) => {
            // Ember has no equivalent control: a failed load surfaces as an
            // alert and the route errors. React renders a recoverable panel, so
            // there is nothing generic to assert.
            const member = await memberFactory.create({name: 'Retry Target', email: 'retry-target@ghost.org'});
            let requests = 0;
            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                requests += 1;
                if (requests === 1) {
                    return route.fulfill({status: 500, contentType: 'application/json', body: JSON.stringify({errors: [{message: 'boom'}]})});
                }
                return route.continue();
            });

            await page.goto(memberPath(member.id));

            const errorPanel = page.getByTestId('member-detail-load-error');
            await expect(errorPanel).toBeVisible();
            // A server error must not be reported as a missing member, anywhere
            // on the screen. Asserting only the body copy previously let the
            // breadcrumb go on claiming "Member not found" beside a
            // "couldn't load" message.
            await expect(page.getByText(/not found/i)).toHaveCount(0);
            await expect(page.getByText(/couldn[’']t be found/)).toHaveCount(0);

            await errorPanel.getByRole('button', {name: 'Retry'}).click();

            await expect(memberDetailsPage.screenTitle).toHaveText('Retry Target');
            await expect(errorPanel).toHaveCount(0);
        });

        test.describe('Removing a complimentary subscription', () => {
            test.use({stripeEnabled: true});

            test('preserves the expiry date on surviving tiers', async ({page}) => {
                // The server treats a tier arriving without `expiry_at` as null and
                // wipes the pivot (`models/member.js` updateTierExpiry), so the
                // whole set has to be sent back with expiries intact. Ember sends
                // `{id}` only and destroys the expiry on every surviving comp tier.
                // React sends `expiry_at` explicitly. Not generic: a shared version
                // of this test would fail on Ember, and we are not backporting.
                const member = await memberFactory.create({name: 'Multi Comp', email: 'multi-comp-react@ghost.org'});
                await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {tiers: TWO_COMP_TIERS()});
                const sent = await captureWrite(page, new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`));

                await page.goto(memberPath(member.id));
                await memberDetailsPage.removeComplimentarySubscription();

                await expect.poll(() => sentTiers(sent)?.length).toBe(1);
                expect(sentTiers(sent)?.[0].expiry_at).toBe(SILVER_EXPIRY);
            });

            test('asks for confirmation first', async ({page}) => {
                // Ember removes the comp the moment the menu item is clicked.
                const member = await memberFactory.create({name: 'Confirm Comp', email: 'confirm-comp@ghost.org'});
                await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {tiers: TWO_COMP_TIERS()});
                const sent = await captureWrite(page, new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`));

                await page.goto(memberPath(member.id));
                await memberDetailsPage.subscriptionActionsButton.first().click();
                await memberDetailsPage.removeComplimentaryButton.click();

                await expect(page.getByRole('alertdialog', {name: /Remove complimentary subscription/})).toBeVisible();
                expect(sent.body).toBeUndefined();
            });
        });

        test('new member - seeded newsletter defaults do not count as unsaved changes', async ({page}) => {
            // React seeds the create form's newsletter defaults and treats that
            // seeded state as pristine. Ember's new record is dirty from the
            // start, so it traps on an untouched form — a generic version of
            // this test would fail there by design.
            await page.goto(memberPath('new'));
            await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();

            await memberDetailsPage.membersBackLink.click();

            await expect(page).toHaveURL(/#\/members(\?|$)/);
            await expect(memberDetailsPage.confirmLeaveButton).toHaveCount(0);
        });
    });
});
