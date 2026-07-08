/**
 * Visual verification for the React member-detail screen. This spec renders the
 * detail page with a synthetic paid subscription injected via the same page.route
 * mocking pattern the other tests use, then writes screenshots to
 * `apps/posts/tmp/screenshots/` so I can compare them against the Ember reference.
 *
 * These screenshots are NOT assertions — they only capture the current visual
 * state so a human can inspect them (or a follow-up can add pixel-diff snapshots).
 */
import fs from 'fs';
import path from 'path';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

// Screenshots land in the posts app's tmp/ so I can open them from that project
// without cluttering the e2e workspace. `process.cwd()` is the e2e/ dir in dev runs.
const OUT_DIR = path.resolve(process.cwd(), '../apps/posts/tmp/screenshots');

// Post-Phase 8 cutover: `/members/:member_id` is the React route. The
// temporary preview route was retired in slice 8.3.
const memberPath = (memberId: string) => `/ghost/#/members/${memberId}`;

function ensureOutDir() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, {recursive: true});
    }
}

test.describe('Ghost Admin - Member Detail (React) - visual', () => {
    test.use({stripeEnabled: true, viewport: {width: 1440, height: 900}, labs: {memberDetailsReact: true}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        ensureOutDir();
    });

    test('paid subscription screen', async ({page}) => {
        const member = await memberFactory.create({name: 'Izabella Kuhn', email: 'izabellakuhn798003@example.com'});
        const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
        await page.route(memberReadRegex, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            const response = await route.fetch();
            const body = await response.json();
            if (body?.members?.[0]) {
                body.members[0].subscriptions = [{
                    id: 'sub_paid_screenshot',
                    customer: {id: 'cus_paid_screenshot', name: 'Izabella Kuhn', email: member.email},
                    plan: {id: 'plan_bronze', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 500},
                    status: 'trialing',
                    start_date: '2026-07-02T12:00:00.000Z',
                    current_period_end: '2026-08-02T12:00:00.000Z',
                    cancel_at_period_end: false,
                    trial_end_at: '2026-08-02T12:00:00.000Z',
                    price: {id: 'price_bronze', price_id: 'price_bronze', nickname: 'Monthly', amount: 500, currency: 'usd', type: 'recurring', interval: 'month'},
                    tier: {id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'},
                    offer: null,
                    attribution: {referrer_source: 'kooky-yarmulke.info', title: null, url: null, type: null, id: null, referrer_medium: null, referrer_url: null}
                }];
            }
            return route.fulfill({response, body: JSON.stringify(body)});
        });

        await page.goto(memberPath(member.id));
        await expect(page.getByTestId('member-subscription-tier')).toHaveText('Bronze');

        await page.screenshot({path: path.join(OUT_DIR, 'react-paid-subscription.png'), fullPage: true});

        // Expanded details capture.
        await page.getByTestId('member-subscription-details-toggle').click();
        await page.screenshot({path: path.join(OUT_DIR, 'react-paid-subscription-details.png'), fullPage: true});
    });
});
