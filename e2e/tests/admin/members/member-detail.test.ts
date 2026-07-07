import {MemberDetailsPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

// After the Phase 8 cutover, `/members/:member_id` is the React route. The
// same helper covers the create sentinel `new` since the route is a single
// dynamic segment (`:member_id`) that the component branches on.
const memberPath = (memberId: string) => `/ghost/#/members/${memberId}`;

test.describe('Ghost Admin - Member Detail (React)', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('renders the member name for an existing member', async ({page}) => {
        const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada@ghost.org'});

        await page.goto(memberPath(member.id));

        await expect(page.getByTestId('member-detail-title')).toHaveText('Ada Lovelace');
    });

    test('back control returns to the members list', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(memberPath(member.id));
        await memberDetailsPage.membersBackLink.click();

        await expect(page).toHaveURL(/#\/members$/);
    });

    test('shows the member sidebar with location and signup date', async ({page}) => {
        const member = await memberFactory.create({name: 'Katherine Johnson', email: 'katherine@ghost.org'});

        await page.goto(memberPath(member.id));

        const sidebar = page.getByTestId('member-detail-sidebar');
        await expect(sidebar).toBeVisible();
        // API-created members have no geolocation, so the location falls back deterministically.
        await expect(page.getByTestId('member-detail-location')).toHaveText('Unknown location');
        await expect(sidebar).toContainText('Created —');
    });

    test('edits a member name and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(memberPath(member.id));
        await memberDetailsPage.nameInput.fill('Ada L. Byron');
        await memberDetailsPage.save();

        // Reload straight from the server to prove the edit was persisted, not just local.
        await page.reload();
        await expect(page.getByTestId('member-detail-title')).toHaveText('Ada L. Byron');
        await expect(memberDetailsPage.nameInput).toHaveValue('Ada L. Byron');
    });

    test('warns before leaving with unsaved changes', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(memberPath(member.id));
        await memberDetailsPage.nameInput.fill('Grace B. Hopper');
        await memberDetailsPage.membersBackLink.click();

        await expect(memberDetailsPage.confirmLeaveButton).toBeVisible();
        await memberDetailsPage.confirmLeaveButton.click();
        await expect(page).toHaveURL(/#\/members$/);
    });

    test('disables save when the email is invalid', async ({page}) => {
        const member = await memberFactory.create({name: 'Katherine Johnson', email: 'katherine-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(memberPath(member.id));
        await memberDetailsPage.emailInput.fill('not-an-email');

        await expect(memberDetailsPage.saveButton).toBeDisabled();
    });

    test('removes an existing label and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Labeled Member', email: 'labeled@ghost.org', labels: ['VIP']});
        const memberDetailsPage = new MemberDetailsPage(page);
        const labelsField = page.getByTestId('member-labels-field');

        await page.goto(memberPath(member.id));
        await expect(labelsField.getByText('VIP')).toBeVisible();

        await labelsField.getByText('VIP').click();
        await memberDetailsPage.save();

        await page.reload();
        await expect(labelsField.getByText('VIP')).toHaveCount(0);
    });

    test('adds a new label via the picker and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Unlabeled Member', email: 'unlabeled@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);
        const labelsField = page.getByTestId('member-labels-field');

        await page.goto(memberPath(member.id));
        await labelsField.getByRole('combobox').click();
        await page.getByPlaceholder('Search labels...').fill('Beta');
        await page.getByText('Create "Beta"').click();
        await memberDetailsPage.save();

        await page.reload();
        await expect(labelsField.getByText('Beta')).toBeVisible();
    });

    test.describe('subscription display (stripe enabled)', () => {
        test.use({stripeEnabled: true});

        test('renders a paid subscription row with price, interval and renewal date', async ({page}) => {
            const member = await memberFactory.create({name: 'Paid Member', email: 'paid-member@ghost.org'});

            // Real Stripe subscriptions aren't reachable from the e2e factory, so
            // inject a synthetic one into the members read the same way the suppression
            // test does. Narrow regex + `body.members?.[0]` guard so unrelated
            // endpoints aren't rewritten.
            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].subscriptions = [{
                        id: 'sub_paid_123',
                        customer: {id: 'cus_paid_123', name: 'Paid Member', email: member.email},
                        plan: {id: 'plan_paid', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 1050},
                        status: 'active',
                        start_date: '2026-01-15T12:00:00.000Z',
                        current_period_end: '2026-02-15T12:00:00.000Z',
                        cancel_at_period_end: false,
                        price: {id: 'price_paid', price_id: 'price_paid', nickname: 'Monthly', amount: 1050, currency: 'usd', type: 'recurring', interval: 'month'},
                        tier: {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'},
                        offer: null
                    }];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            const subscriptions = page.getByTestId('member-subscriptions');
            await expect(subscriptions).toBeVisible();
            await expect(page.getByTestId('member-subscription-tier')).toHaveText('Bronze');
            await expect(page.getByTestId('member-subscription-status')).toHaveText('Active');
            // The price block splits "$", "10.50" and "monthly" across separate
            // elements, so assert the pieces rather than a single joined string.
            await expect(subscriptions).toContainText('$');
            await expect(subscriptions).toContainText('10.50');
            await expect(subscriptions).toContainText('monthly');
            // "Renews <date>" — no "on", matching Ember validityDetails copy exactly.
            await expect(subscriptions).toContainText('Renews 15 Feb 2026');
        });

        test('renders a complimentary subscription with the correct copy and expiry', async ({page}) => {
            const member = await memberFactory.create({name: 'Comp Member', email: 'comp-member@ghost.org'});

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].status = 'comped';
                    body.members[0].subscriptions = [{
                        // Comp subscriptions arrive with empty-string id (the members
                        // BREAD service synthesises them without a Stripe id). Ember's
                        // `!sub.id` classification treats '' the same as null.
                        id: '',
                        customer: {id: 'cus_comp', name: null, email: member.email},
                        plan: {id: 'plan_comp', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
                        status: 'active',
                        start_date: '2026-01-15T12:00:00.000Z',
                        current_period_end: '2027-01-15T12:00:00.000Z',
                        cancel_at_period_end: false,
                        price: {id: 'price_comp', price_id: 'price_comp', nickname: 'Complimentary', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                        tier: {id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2027-01-15T12:00:00.000Z'},
                        offer: null
                    }];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            const subscriptions = page.getByTestId('member-subscriptions');
            await expect(subscriptions).toBeVisible();
            await expect(page.getByTestId('member-subscription-tier')).toHaveText('Gold');
            await expect(page.getByTestId('member-subscription-status')).toHaveText('Active');
            // Comp reads "Complimentary" — never "$0 yearly" (bug from the earlier attempt)
            // — and shows the expiry, not a renewal date. Explicitly assert that neither
            // the currency nor the interval label leaks through.
            await expect(subscriptions).toContainText('Complimentary');
            await expect(subscriptions).not.toContainText('$0');
            await expect(subscriptions).not.toContainText('yearly');
            await expect(subscriptions).not.toContainText('monthly');
            await expect(subscriptions).toContainText('Expires 15 Jan 2027');
        });

        test('renders the subscriptions empty state (with Add complimentary) for a member with no subs', async ({page}) => {
            const member = await memberFactory.create({name: 'Empty Sub Member', email: 'empty-sub-member@ghost.org'});

            await page.goto(memberPath(member.id));

            await expect(page.getByTestId('member-detail-sidebar')).toBeVisible();
            // The section renders with an empty state now (Ember parity) — the row
            // itself is absent but the "Add complimentary" affordance is present
            // because the dev test env has at least one active paid tier.
            await expect(page.getByTestId('member-subscription')).toHaveCount(0);
            await expect(page.getByTestId('add-complimentary')).toBeVisible();
        });

        test('cancel and continue toggle the subscription state via the actions menu', async ({page}) => {
            const member = await memberFactory.create({name: 'Cancel Continue Member', email: 'cancel-continue@ghost.org'});
            // Track the local state the mocks pretend Stripe owns so subsequent reads
            // reflect the last cancel/continue action.
            let cancelAtPeriodEnd = false;

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].subscriptions = [{
                        id: 'sub_toggle_123',
                        customer: {id: 'cus_toggle_123', name: 'Cancel Continue Member', email: member.email},
                        plan: {id: 'plan_paid', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 500},
                        status: 'active',
                        start_date: '2026-01-15T12:00:00.000Z',
                        current_period_end: '2026-02-15T12:00:00.000Z',
                        cancel_at_period_end: cancelAtPeriodEnd,
                        price: {id: 'price_paid', price_id: 'price_paid', nickname: 'Monthly', amount: 500, currency: 'usd', type: 'recurring', interval: 'month'},
                        tier: {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'},
                        offer: null
                    }];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            // Stub the PUT subscription endpoint and flip the tracked flag so the
            // invalidated members refetch returns the new state. We also record each
            // PUT body so the test can assert the client sent the correct payload —
            // catching a regression where e.g. the wrong field name would be shipped
            // but the UI still looked right thanks to some other mock behaviour.
            const putBodies: Array<Record<string, unknown>> = [];
            await page.route(`**/members/${member.id}/subscriptions/sub_toggle_123/**`, async (route) => {
                if (route.request().method() !== 'PUT') {
                    return route.continue();
                }
                const body = route.request().postDataJSON();
                if (typeof body?.cancel_at_period_end === 'boolean') {
                    putBodies.push(body);
                    cancelAtPeriodEnd = body.cancel_at_period_end;
                }
                return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({members: [{id: member.id}]})});
            });

            await page.goto(memberPath(member.id));

            const status = page.getByTestId('member-subscription-status');
            await expect(status).toHaveText('Active');

            // Cancel: menu → Cancel subscription → status flips to Canceled + validity switches.
            await page.getByTestId('subscription-actions').click();
            await page.getByTestId('cancel-subscription').click();
            await expect(status).toHaveText('Canceled');
            await expect(page.getByTestId('member-subscriptions')).toContainText('Has access until 15 Feb 2026');

            // Continue: menu → Continue subscription → status returns to Active.
            await page.getByTestId('subscription-actions').click();
            await page.getByTestId('continue-subscription').click();
            await expect(status).toHaveText('Active');
            await expect(page.getByTestId('member-subscriptions')).toContainText('Renews 15 Feb 2026');

            // Pin the exact payload contract so a client-side rename can't silently
            // slip through while the UI still looks right for other reasons.
            expect(putBodies).toEqual([
                {cancel_at_period_end: true},
                {cancel_at_period_end: false}
            ]);
        });

        test('removes a complimentary subscription via the actions menu', async ({page}) => {
            const member = await memberFactory.create({name: 'Comp Remove Member', email: 'comp-remove@ghost.org'});
            // Track the removal so the members refetch after mutation reflects a clean member.
            let removed = false;

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            // Single route handler dispatches by method so GET/PUT semantics don't
            // interfere with each other in Playwright's LIFO route resolution.
            const putBodies: Array<Record<string, unknown>> = [];
            await page.route(memberReadRegex, async (route) => {
                const method = route.request().method();
                if (method === 'PUT') {
                    const body = route.request().postDataJSON();
                    putBodies.push(body);
                    removed = true;
                    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({members: [{id: member.id, tiers: [], subscriptions: []}]})});
                }
                if (method !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    if (!removed) {
                        body.members[0].status = 'comped';
                        body.members[0].tiers = [{id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2027-01-15T12:00:00.000Z'}];
                        body.members[0].subscriptions = [{
                            id: '',
                            customer: {id: 'cus_comp_rm', name: null, email: member.email},
                            plan: {id: 'plan_comp', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
                            status: 'active',
                            start_date: '2026-01-15T12:00:00.000Z',
                            current_period_end: '2027-01-15T12:00:00.000Z',
                            cancel_at_period_end: false,
                            price: {id: 'price_comp', price_id: 'price_comp', nickname: 'Complimentary', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                            tier: {id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2027-01-15T12:00:00.000Z'},
                            offer: null
                        }];
                    } else {
                        body.members[0].status = 'free';
                        body.members[0].tiers = [];
                        body.members[0].subscriptions = [];
                    }
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByTestId('member-subscription-tier')).toHaveText('Gold');
            await page.getByTestId('subscription-actions').click();
            await page.getByTestId('remove-complimentary').click();
            await page.getByTestId('confirm-remove-complimentary').click();

            // Row disappears once the members refetch returns an empty subscriptions list.
            await expect(page.getByTestId('member-subscription')).toHaveCount(0);
            // Pin the payload contract: filter the tier out and PUT the remaining set.
            // Empty tiers array — the member had a single comp tier being removed.
            // `email` is included to match Ember (`gh-member-settings-form.js:194-198`).
            expect(putBodies).toHaveLength(1);
            expect(putBodies[0]).toEqual({members: [{id: member.id, email: member.email, tiers: []}]});
        });

        test('preserves expiry_at on surviving tiers when removing a comp', async ({page}) => {
            // Multiple comp tiers is a rare state the server usually blocks on add, but a
            // member can end up with more than one via imports or legacy data. In that
            // case removing one must NOT wipe the survivors' expiry_at (the server pivot
            // update turns missing expiry_at into null).
            const member = await memberFactory.create({name: 'Multi Comp Member', email: 'multi-comp@ghost.org'});

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            const putBodies: Array<Record<string, unknown>> = [];
            await page.route(memberReadRegex, async (route) => {
                const method = route.request().method();
                if (method === 'PUT') {
                    putBodies.push(route.request().postDataJSON());
                    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({members: [{id: member.id}]})});
                }
                if (method !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].status = 'comped';
                    // Two tiers so we can check that the survivor keeps its expiry.
                    body.members[0].tiers = [
                        {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid', expiry_at: '2027-06-01T12:00:00.000Z'},
                        {id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2028-01-15T12:00:00.000Z'}
                    ];
                    body.members[0].subscriptions = [
                        {
                            id: '', customer: {id: 'cus_bronze', name: null, email: member.email},
                            plan: {id: 'plan_comp_a', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
                            status: 'active', start_date: '2026-06-01T12:00:00.000Z', current_period_end: '2027-06-01T12:00:00.000Z', cancel_at_period_end: false,
                            price: {id: 'price_comp_a', price_id: 'price_comp_a', nickname: 'Complimentary', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                            tier: {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid', expiry_at: '2027-06-01T12:00:00.000Z'},
                            offer: null
                        },
                        {
                            id: '', customer: {id: 'cus_gold', name: null, email: member.email},
                            plan: {id: 'plan_comp_b', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
                            status: 'active', start_date: '2026-01-15T12:00:00.000Z', current_period_end: '2028-01-15T12:00:00.000Z', cancel_at_period_end: false,
                            price: {id: 'price_comp_b', price_id: 'price_comp_b', nickname: 'Complimentary', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                            tier: {id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2028-01-15T12:00:00.000Z'},
                            offer: null
                        }
                    ];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            // Remove the Bronze tier — Gold's expiry_at must ride along.
            await page.getByTestId('subscription-actions').first().click();
            await page.getByTestId('remove-complimentary').click();
            await page.getByTestId('confirm-remove-complimentary').click();

            // Payload must include Gold with its expiry_at preserved.
            expect(putBodies).toHaveLength(1);
            expect(putBodies[0]).toEqual({
                members: [{id: member.id, email: member.email, tiers: [{id: 'tier_gold', expiry_at: '2028-01-15T12:00:00.000Z'}]}]
            });
        });

        test('adds a complimentary subscription (forever) via the modal', async ({page}) => {
            const member = await memberFactory.create({name: 'Add Comp Member', email: 'add-comp@ghost.org'});
            let compAdded = false;

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            const memberPutBodies: Array<Record<string, unknown>> = [];
            await page.route(memberReadRegex, async (route) => {
                const method = route.request().method();
                if (method === 'PUT') {
                    memberPutBodies.push(route.request().postDataJSON());
                    compAdded = true;
                    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({members: [{id: member.id}]})});
                }
                if (method !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    if (compAdded) {
                        // After the add, return a member on the picked comp tier so the
                        // modal closes and the row renders.
                        body.members[0].status = 'comped';
                        body.members[0].tiers = [{id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'}];
                        body.members[0].subscriptions = [{
                            id: '',
                            customer: {id: 'cus_comp_new', name: null, email: member.email},
                            plan: {id: 'plan_comp_new', nickname: 'Complimentary', interval: 'year', currency: 'usd', amount: 0},
                            status: 'active', start_date: '2026-07-07T12:00:00.000Z', current_period_end: '2027-07-07T12:00:00.000Z', cancel_at_period_end: false,
                            price: {id: 'price_comp_new', price_id: 'price_comp_new', nickname: 'Complimentary', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                            tier: {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'},
                            offer: null
                        }];
                    } else {
                        // Fresh member — no tiers, no subs — so the empty state shows.
                        body.members[0].tiers = [];
                        body.members[0].subscriptions = [];
                    }
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            // Serve a paid tier so the "Add complimentary" affordance appears.
            await page.route(/\/ghost\/api\/admin\/tiers\/\??[^/]*$/, async (route) => {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({tiers: [{id: 'tier_bronze', name: 'Bronze', slug: 'bronze', type: 'paid', active: true}], meta: {pagination: {page: 1, limit: 'all', pages: 1, total: 1, next: null, prev: null}}})
                });
            });

            await page.goto(memberPath(member.id));

            await page.getByTestId('add-complimentary').click();
            await expect(page.getByTestId('add-comp-modal')).toBeVisible();

            // Radix Select — click the trigger, then pick the tier.
            await page.getByTestId('comp-tier-select').click();
            await page.getByRole('option', {name: 'Bronze'}).click();

            await page.getByTestId('comp-add-confirm').click();

            // Modal closes after success.
            await expect(page.getByTestId('add-comp-modal')).toHaveCount(0);
            // The row now shows for Bronze.
            await expect(page.getByTestId('member-subscription-tier')).toHaveText('Bronze');

            // The forever comp sends `tiers: [{id}]` with NO expiry_at (Ember parity).
            // Only one PUT because the member had no active paid subs to cancel first.
            expect(memberPutBodies).toHaveLength(1);
            expect(memberPutBodies[0]).toEqual({
                members: [{id: member.id, email: member.email, tiers: [{id: 'tier_bronze'}]}]
            });
        });

        test('gift subscription has no action menu (Ember parity)', async ({page}) => {
            const member = await memberFactory.create({name: 'Gift Member', email: 'gift-member@ghost.org'});

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].status = 'gift';
                    body.members[0].subscriptions = [{
                        id: '',
                        customer: {id: 'cus_gift', name: null, email: member.email},
                        plan: {id: 'plan_gift', nickname: 'Gift Subscription', interval: 'year', currency: 'usd', amount: 0},
                        status: 'active',
                        start_date: '2026-01-15T12:00:00.000Z',
                        current_period_end: '2027-01-15T12:00:00.000Z',
                        cancel_at_period_end: false,
                        price: {id: 'price_gift', price_id: 'price_gift', nickname: 'Gift Subscription', amount: 0, currency: 'usd', type: 'recurring', interval: 'year'},
                        tier: {id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2027-01-15T12:00:00.000Z'},
                        offer: null
                    }];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            const subscriptions = page.getByTestId('member-subscriptions');
            // Ember uses the plan/price nickname verbatim as the priceLabel;
            // the seeded server value is capital-S "Gift Subscription".
            await expect(subscriptions).toContainText('Gift Subscription');
            await expect(subscriptions).toContainText('Expires 15 Jan 2027');
            // No action menu — gifts are managed via the gift flow, not the member screen.
            await expect(page.getByTestId('subscription-actions')).toHaveCount(0);
        });
    });

    test('shows a suppression banner and clears it after re-enabling email', async ({page}) => {
        const member = await memberFactory.create({name: 'Bounced Member', email: 'bounced-member@ghost.org'});

        // The email suppression list is populated by external delivery events, so we
        // intercept the specific members read endpoint to simulate a bounced state.
        // Narrow match: only the GET on `.../members/<id>/` — this is deliberately
        // stricter than a **/members/${id}/** wildcard so we don't rewrite unrelated
        // responses (subscriptions, signin_urls, etc.) whose bodies aren't shaped
        // like `{members: [...]}` and would throw on the mutation below.
        const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
        // Flip suppression state OFF after the admin hits Re-enable — the refetch
        // that fires on mutation success must see a non-suppressed member.
        let suppressed = true;
        await page.route(memberReadRegex, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            const response = await route.fetch();
            const body = await response.json();
            if (body?.members?.[0]) {
                body.members[0].email_suppression = suppressed
                    ? {suppressed: true, info: {reason: 'fail', timestamp: '2026-01-15T12:00:00.000Z'}}
                    : {suppressed: false};
            }
            return route.fulfill({response, body: JSON.stringify(body)});
        });

        // Stub the DELETE /suppression/ endpoint (204) and flip the read flag so the
        // invalidation-driven refetch returns an un-suppressed member.
        await page.route(`**/members/${member.id}/suppression/**`, async (route) => {
            if (route.request().method() !== 'DELETE') {
                return route.continue();
            }
            suppressed = false;
            return route.fulfill({status: 204, body: ''});
        });

        await page.goto(memberPath(member.id));

        // Suppression banner replaces the newsletter toggles.
        const banner = page.getByTestId('member-suppression-banner');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Email disabled');
        await expect(banner).toContainText('Bounced on 15 Jan 2026');
        await expect(page.getByTestId('member-subscription-toggle')).toHaveCount(0);

        // Re-enabling should call DELETE, invalidate the members query, and clear
        // the banner once the refetch resolves.
        await page.getByRole('button', {name: 'Re-enable email'}).click();
        await expect(banner).toHaveCount(0);
        await expect(page.getByText('Email re-enabled successfully')).toBeVisible();
    });

    test('toggles a newsletter subscription and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Newsletter Test', email: 'newsletter-test@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);
        const newsletters = page.getByTestId('member-newsletters-field');
        const firstToggle = memberDetailsPage.newsletterSubscriptionToggles.first();

        await page.goto(memberPath(member.id));
        await expect(newsletters).toBeVisible();

        const initiallyChecked = (await firstToggle.getAttribute('data-state')) === 'checked';
        await firstToggle.click();
        await memberDetailsPage.save();

        await page.reload();
        const nowChecked = (await memberDetailsPage.newsletterSubscriptionToggles.first().getAttribute('data-state')) === 'checked';
        expect(nowChecked).toBe(!initiallyChecked);
    });

    test('opens the impersonate modal from the actions menu and shows a signin URL', async ({page}) => {
        const member = await memberFactory.create({name: 'Impersonate Target', email: 'impersonate@ghost.org'});

        await page.goto(memberPath(member.id));

        // Actions menu trigger is gated on canManageMembers (owner is authed here).
        await page.getByTestId('member-actions').click();
        await page.getByTestId('member-actions-impersonate').click();

        const modal = page.getByTestId('impersonate-modal');
        await expect(modal).toBeVisible();

        // The framework hook fetches the signin URL only when the modal opens.
        // Pin that the field is populated with a real single-use URL (not empty
        // and not the loading placeholder).
        const signinUrl = modal.getByTestId('member-signin-url');
        await expect(signinUrl).not.toHaveValue('');
        await expect(signinUrl).not.toHaveValue('Generating link…');
        await expect(signinUrl).toHaveValue(/^https?:\/\//);

        await modal.getByRole('button', {name: 'Close'}).click();
        await expect(modal).toBeHidden();
    });

    test('signs a member out of all devices from the actions menu', async ({page}) => {
        const member = await memberFactory.create({name: 'Logout Target', email: 'logout@ghost.org'});
        const sessionsUrl = `**/ghost/api/admin/members/${member.id}/sessions/`;

        // Intercept the DELETE so we don't depend on the server having a live
        // session to invalidate — this test is about the UI contract (menu →
        // confirm → success toast), not the sessions store.
        let deleteCalled = false;
        await page.route(sessionsUrl, async (route) => {
            if (route.request().method() === 'DELETE') {
                deleteCalled = true;
                return route.fulfill({status: 204, body: ''});
            }
            return route.continue();
        });

        await page.goto(memberPath(member.id));

        await page.getByTestId('member-actions').click();
        await page.getByTestId('member-actions-logout').click();

        const modal = page.getByTestId('logout-member-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Logout Target');

        await page.getByTestId('confirm-logout-member').click();

        // Modal auto-closes after the mutation resolves and success toast fires.
        await expect(modal).toBeHidden();
        expect(deleteCalled).toBe(true);
    });

    test('deletes a member from the actions menu and navigates back to the list', async ({page}) => {
        const member = await memberFactory.create({name: 'Delete Target', email: 'delete@ghost.org'});

        await page.goto(memberPath(member.id));

        await page.getByTestId('member-actions').click();
        await page.getByTestId('member-actions-delete').click();

        const modal = page.getByTestId('delete-member-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('delete@ghost.org');

        // No Stripe subs on this member — the "Also cancel in Stripe" toggle
        // must not render (Ember parity, `delete-member.hbs:12`).
        await expect(page.getByTestId('delete-member-cancel-stripe')).toHaveCount(0);
        // Confirm button label is plain "Delete member" when the toggle is
        // hidden/off.
        await expect(page.getByTestId('confirm-delete-member')).toHaveText('Delete member');

        await page.getByTestId('confirm-delete-member').click();

        // Redirects to the members list after the DELETE resolves.
        await expect(page).toHaveURL(/#\/members$/);

        // Member is gone from the server-side store, not just the UI.
        const search = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
        expect(search.status()).toBe(404);
    });

    test('disables commenting via the actions menu (hide-comments off)', async ({page}) => {
        const member = await memberFactory.create({name: 'Comment Off', email: 'comment-off@ghost.org'});
        let disablePayload: Record<string, unknown> | null = null;

        // Intercept the POST so we don't depend on the comments service being
        // wired in the test environment — this test is about the UI wiring
        // (menu → confirm → payload → toast → label flip).
        await page.route(
            `**/ghost/api/admin/members/${member.id}/commenting/disable`,
            async (route) => {
                if (route.request().method() === 'POST') {
                    disablePayload = route.request().postDataJSON();
                    return route.fulfill({status: 204, body: ''});
                }
                return route.continue();
            }
        );

        // On the follow-up GET (invalidateQueries → refetch) return the member
        // with commenting.disabled=true so we can assert the menu label flips.
        let disableSubmitted = false;
        const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
        await page.route(memberReadRegex, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            const response = await route.fetch();
            const body = await response.json();
            if (disableSubmitted && body?.members?.[0]) {
                // Flip the property the UI actually gates on (Ember-parity —
                // `can_comment`, not `commenting.disabled`, since the latter
                // stays truthy after a temporary disable expires).
                body.members[0].can_comment = false;
                body.members[0].commenting = {disabled: true, disabled_reason: 'Disabled from member settings'};
            }
            return route.fulfill({response, body: JSON.stringify(body)});
        });

        await page.goto(memberPath(member.id));

        await page.getByTestId('member-actions').click();
        // Fresh members have commenting enabled, so the menu offers to disable.
        await page.getByTestId('member-actions-commenting').click();

        const modal = page.getByTestId('disable-commenting-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Comment Off');
        // Hide-comments toggle defaults off; leave it that way.
        await expect(page.getByTestId('disable-commenting-hide-comments')).toHaveAttribute('data-state', 'unchecked');

        disableSubmitted = true;
        await page.getByTestId('confirm-disable-commenting').click();

        await expect(modal).toBeHidden();
        // Payload matches Ember exactly: fixed reason, hide_comments=false.
        expect(disablePayload).toEqual({reason: 'Disabled from member settings', hide_comments: false});

        // Menu label flips to "Enable commenting" after invalidate/refetch.
        await page.getByTestId('member-actions').click();
        await expect(page.getByTestId('member-actions-commenting')).toHaveText('Enable commenting');
    });

    test('disables commenting with hide-comments enabled', async ({page}) => {
        const member = await memberFactory.create({name: 'Comment Hide', email: 'comment-hide@ghost.org'});
        let disablePayload: Record<string, unknown> | null = null;

        await page.route(
            `**/ghost/api/admin/members/${member.id}/commenting/disable`,
            async (route) => {
                if (route.request().method() === 'POST') {
                    disablePayload = route.request().postDataJSON();
                    return route.fulfill({status: 204, body: ''});
                }
                return route.continue();
            }
        );

        await page.goto(memberPath(member.id));
        await page.getByTestId('member-actions').click();
        await page.getByTestId('member-actions-commenting').click();

        await page.getByTestId('disable-commenting-hide-comments').click();
        await page.getByTestId('confirm-disable-commenting').click();

        expect(disablePayload).toEqual({reason: 'Disabled from member settings', hide_comments: true});
    });

    test('enables commenting inline when the member is currently disabled', async ({page}) => {
        const member = await memberFactory.create({name: 'Comment Blocked', email: 'comment-blocked@ghost.org'});
        let enableCalled = false;

        await page.route(
            `**/ghost/api/admin/members/${member.id}/commenting/enable`,
            async (route) => {
                if (route.request().method() === 'POST') {
                    enableCalled = true;
                    return route.fulfill({status: 204, body: ''});
                }
                return route.continue();
            }
        );

        // Inject `commenting.disabled=true` on the initial GET, then flip it
        // back to `false` on the post-mutation refetch — otherwise the menu
        // label wouldn't confirm the label-flip contract.
        let enableSubmitted = false;
        const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
        await page.route(memberReadRegex, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            const response = await route.fetch();
            const body = await response.json();
            if (body?.members?.[0]) {
                // The UI gates on `can_comment` (Ember-parity). Before the
                // enable submits, the member is disabled (`can_comment:false`);
                // after submit + refetch, the server flips it back to true.
                body.members[0].can_comment = enableSubmitted;
                body.members[0].commenting = enableSubmitted
                    ? {disabled: false}
                    : {disabled: true, disabled_reason: 'Disabled from member settings'};
            }
            return route.fulfill({response, body: JSON.stringify(body)});
        });

        await page.goto(memberPath(member.id));
        await page.getByTestId('member-actions').click();
        // Member starts disabled → menu offers to enable, no confirm modal.
        await expect(page.getByTestId('member-actions-commenting')).toHaveText('Enable commenting');

        enableSubmitted = true;
        await page.getByTestId('member-actions-commenting').click();

        // No confirm modal is opened for enable (Ember parity: enable is inline).
        await expect(page.getByTestId('disable-commenting-modal')).toHaveCount(0);
        expect(enableCalled).toBe(true);

        // Reopen the menu — label has flipped back to "Disable commenting".
        await page.getByTestId('member-actions').click();
        await expect(page.getByTestId('member-actions-commenting')).toHaveText('Disable commenting');
    });

    test('deleting a member with unsaved edits does not trigger the discard-changes dialog', async ({page}) => {
        // Regression: the parent's `useBlocker` fires on ANY route change while
        // the draft is dirty. Deleting a member with pending field edits used
        // to pop "Discard unsaved changes?" over the already-deleted member —
        // the modal must bypass the guard before it calls `navigate('/members')`.
        const member = await memberFactory.create({name: 'Delete With Edits', email: 'delete-edits@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(memberPath(member.id));
        await memberDetailsPage.nameInput.fill('Delete With Edits Modified');

        await page.getByTestId('member-actions').click();
        await page.getByTestId('member-actions-delete').click();
        await page.getByTestId('confirm-delete-member').click();

        await expect(page).toHaveURL(/#\/members$/);
        // The discard-changes AlertDialog must NOT be visible on the list page.
        await expect(page.getByRole('button', {name: 'Leave'})).toHaveCount(0);
    });

    test.describe('delete member with active Stripe subscription', () => {
        // No `stripeEnabled` fixture — the toggle branch is a pure client-side
        // decision on `member.subscriptions`, so a route mock is enough. Adding
        // real Stripe here would just slow the test down without changing
        // what's exercised.

        test('shows the cancel-Stripe toggle and forwards its state to the DELETE call', async ({page}) => {
            const member = await memberFactory.create({name: 'Delete Paid', email: 'delete-paid@ghost.org'});

            const memberRouteRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            // Single handler dispatches by method — playwright's `page.route`
            // resolution is LIFO, so two separate handlers on overlapping URLs
            // would race, with the later handler swallowing the GET and
            // bypassing the subscription injection below.
            let deleteUrl: string | null = null;
            await page.route(memberRouteRegex, async (route) => {
                const method = route.request().method();
                if (method === 'DELETE') {
                    deleteUrl = route.request().url();
                    return route.fulfill({status: 204, body: ''});
                }
                if (method !== 'GET') {
                    return route.continue();
                }
                // Inject an active paid subscription into the GET so the delete
                // modal hits its `hasCancelableStripeSubscription: true`
                // branch. Faster than provisioning a real Stripe customer.
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].status = 'paid';
                    body.members[0].subscriptions = [{
                        id: 'sub_delete_1',
                        customer: {id: 'cus_delete_1', name: null, email: member.email},
                        plan: {id: 'plan_1', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 500},
                        status: 'active',
                        start_date: '2026-01-01T12:00:00.000Z',
                        current_period_end: '2026-02-01T12:00:00.000Z',
                        cancel_at_period_end: false,
                        price: {id: 'price_1', price_id: 'price_1', nickname: 'Monthly', amount: 500, currency: 'usd', type: 'recurring', interval: 'month'},
                        tier: {id: 'tier_1', name: 'Gold', slug: 'gold', active: true, type: 'paid'},
                        offer: null
                    }];
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            await page.getByTestId('member-actions').click();
            await page.getByTestId('member-actions-delete').click();

            const modal = page.getByTestId('delete-member-modal');
            const cancelStripeToggle = page.getByTestId('delete-member-cancel-stripe');
            await expect(cancelStripeToggle).toBeVisible();
            // Default off — reset on every open so a prior selection can't leak.
            await expect(cancelStripeToggle).toHaveAttribute('data-state', 'unchecked');
            await expect(page.getByTestId('confirm-delete-member')).toHaveText('Delete member');

            // Flipping it on updates the button label so the admin sees they're
            // triggering two ops, not one (Ember `delete-member.hbs:44`).
            await cancelStripeToggle.click();
            await expect(page.getByTestId('confirm-delete-member')).toHaveText('Delete member + Cancel subscription');

            await page.getByTestId('confirm-delete-member').click();

            await expect(modal).toBeHidden();
            await expect(page).toHaveURL(/#\/members$/);
            expect(deleteUrl).toMatch(/[?&]cancel=true(&|$)/);
        });
    });

    test('shows an activity feed with the recent event and a View all link', async ({page}) => {
        const member = await memberFactory.create({name: 'Activity Target', email: 'activity@ghost.org'});

        // Fresh members always have at least one server-generated event
        // (signup / newsletter subscribe on creation), so we can assert
        // against real data instead of mocking the feed.
        await page.goto(memberPath(member.id));

        const feed = page.getByTestId('member-activity-feed');
        await expect(feed).toBeVisible();
        // At least one event row rendered from GET /members/events.
        await expect(feed.getByTestId('member-activity-event').first()).toBeVisible();

        const viewAll = page.getByTestId('member-activity-view-all');
        await expect(viewAll).toHaveAttribute('href', `#/members-activity?member=${member.id}`);
    });

    test('activity feed shows empty state when the member has no events', async ({page}) => {
        const member = await memberFactory.create({name: 'No Activity', email: 'no-activity@ghost.org'});

        // Force the feed API to return an empty page so we exercise the
        // empty-state branch deterministically (fresh members otherwise have
        // at least a signup event).
        await page.route(/\/ghost\/api\/admin\/members\/events\/?\?/, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({events: [], meta: {pagination: {}}})
            });
        });

        await page.goto(memberPath(member.id));

        await expect(page.getByTestId('member-activity-empty')).toBeVisible();
        // View-all link still renders even with no inline events — matches
        // Ember which points at the full activity feed regardless.
        await expect(page.getByTestId('member-activity-view-all')).toBeVisible();
    });

    test('activity feed hides in create mode', async ({page}) => {
        await page.goto(memberPath('new'));

        // Ember `activity-feed.hbs:2` short-circuits when the member is new; the
        // React equivalent hides the section entirely, not just the rows.
        await expect(page.getByTestId('member-activity-feed')).toHaveCount(0);
    });

    test('creates a new member and redirects to their detail', async ({page}) => {
        const memberDetailsPage = new MemberDetailsPage(page);

        // The create screen reuses the preview route with the sentinel id "new".
        await page.goto(memberPath('new'));
        await expect(page.getByTestId('member-detail-title')).toHaveText('New member');
        await expect(memberDetailsPage.saveButton).toBeDisabled();
        // Newsletter toggles hide in create mode — showing them would silently
        // discard user choices because we don't send newsletters on create.
        await expect(page.getByTestId('member-newsletters-field')).toHaveCount(0);

        await memberDetailsPage.nameInput.fill('Grace Hopper');
        await memberDetailsPage.emailInput.fill('grace-new@ghost.org');
        await memberDetailsPage.saveButton.click();

        // Redirected to the newly-created member's detail (now in edit mode).
        await expect(page.getByTestId('member-detail-title')).toHaveText('Grace Hopper');
        await expect(memberDetailsPage.emailInput).toHaveValue('grace-new@ghost.org');
        await expect(page).not.toHaveURL(/preview\/new$/);

        // Ember parity: the new member is auto-subscribed to default newsletters.
        // Ember achieves this by the model defaulting subscribed:true; we rely on
        // the server default (subscribed !== false && !newsletters), so pin the
        // outcome so a future server change can't silently regress it.
        const search = await page.request.get('/ghost/api/admin/members/?filter=email%3Agrace-new%40ghost.org&include=newsletters');
        const {members} = await search.json();
        expect(members[0].subscribed).toBe(true);
        expect(members[0].newsletters.length).toBeGreaterThan(0);
    });
});
