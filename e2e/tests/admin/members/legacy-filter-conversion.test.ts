import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

const MEMBERS_BROWSE_PATH = '/ghost/api/admin/members/';

function buildLegacyMembersUrl(param: 'filter' | 'filterParam', value: string): string {
    return `/ghost/#/members-forward?${param}=${encodeURIComponent(value)}`;
}

async function waitForMembersBrowseFilter(page: Page): Promise<string | null> {
    const request = await page.waitForRequest((candidate) => {
        if (candidate.method() !== 'GET') {
            return false;
        }

        const candidateUrl = new URL(candidate.url());
        return candidateUrl.pathname === MEMBERS_BROWSE_PATH && candidateUrl.searchParams.has('filter');
    });

    const requestUrl = new URL(request.url());
    return requestUrl.searchParams.get('filter');
}

test.describe('Ghost Admin - Members Legacy Filter Conversion', () => {
    let memberFactory: MemberFactory;

    test.use({labs: {membersForward: true}});

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('legacy filter query converts label filter for members-forward route', async ({page}) => {
        await memberFactory.createMany([
            {
                name: 'Blue Consultant',
                email: 'blue-consultant@example.com',
                labels: ['blue-consultant']
            },
            {
                name: 'Orange Member',
                email: 'orange-member@example.com',
                labels: ['orange-member']
            }
        ]);

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', 'label:[blue-consultant]'));

        expect(await membersFilterRequest).toBe('label:[blue-consultant]');
        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberByName('Blue Consultant')).toBeVisible();
    });

    test('legacy filterParam query converts text filters for members-forward route', async ({page}) => {
        await memberFactory.createMany([
            {
                name: 'alpha team',
                email: 'alpha-team@example.com'
            },
            {
                name: 'beta team',
                email: 'beta-team@example.com'
            }
        ]);

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filterParam', 'name:~\'alpha\''));

        expect(await membersFilterRequest).toBe('name:~\'alpha\'');
        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberByName('alpha team')).toBeVisible();
    });

    test('legacy filter query falls back to raw nql for unsupported conversions', async ({page}) => {
        await memberFactory.createMany([
            {
                name: 'Dog Member',
                email: 'dog-member@example.com',
                labels: ['dog']
            },
            {
                name: 'Cat Member',
                email: 'cat-member@example.com',
                labels: ['cat']
            },
            {
                name: 'Bird Member',
                email: 'bird-member@example.com',
                labels: ['bird']
            }
        ]);

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', '(label:[dog],label:[cat])'));

        expect(await membersFilterRequest).toBe('label:[dog],label:[cat]');
        await expect(membersPage.memberListItems).toHaveCount(2);
        await expect(membersPage.getMemberByName('Dog Member')).toBeVisible();
        await expect(membersPage.getMemberByName('Cat Member')).toBeVisible();
        await expect(membersPage.getMemberByName('Bird Member')).toHaveCount(0);
    });

    test('legacy subscribed expression from Ember converts to canonical subscribed filter', async ({page}) => {
        await memberFactory.create({
            name: 'Seed Member',
            email: 'seed-member@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', '(subscribed:false+email_disabled:0)'));

        expect(await membersFilterRequest).toBe('(subscribed:false+email_disabled:0)');
    });

    test('legacy email-disabled expression from Ember converts to canonical subscribed filter', async ({page}) => {
        await memberFactory.create({
            name: 'Email Disabled Seed',
            email: 'email-disabled-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', '(email_disabled:1)'));

        expect(await membersFilterRequest).toBe('(email_disabled:1)');
    });

    test('legacy newsletter unsubscribed expression from Ember converts to newsletter filter', async ({page}) => {
        await memberFactory.create({
            name: 'Newsletter Seed',
            email: 'newsletter-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', 'newsletters.slug:-weekly,email_disabled:1'));

        expect(await membersFilterRequest).toBe('(newsletters.slug:-weekly,email_disabled:1)');
    });

    test('legacy newsletter subscribed expression from Ember converts to newsletter filter', async ({page}) => {
        await memberFactory.create({
            name: 'Newsletter Subscribed Seed',
            email: 'newsletter-subscribed-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', 'newsletters.slug:weekly+email_disabled:0'));

        expect(await membersFilterRequest).toBe('(newsletters.slug:weekly+email_disabled:0)');
    });

    test('mixed subscribed expression with extra clauses preserves all clauses', async ({page}) => {
        await memberFactory.create({
            name: 'Mixed Subscribed Seed',
            email: 'mixed-subscribed-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', '(subscribed:false+email_disabled:0+label:[dog])'));

        const requestFilter = await membersFilterRequest;
        expect(requestFilter).toContain('subscribed:false+email_disabled:0');
        expect(requestFilter).toContain('label:[dog]');
    });

    test('newsletter expression without email_disabled falls back to raw nql', async ({page}) => {
        await memberFactory.create({
            name: 'Newsletter Raw Fallback Seed',
            email: 'newsletter-raw-fallback-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', 'newsletters.slug:weekly'));

        expect(await membersFilterRequest).toBe('newsletters.slug:weekly');
    });

    test('legacy date expression keeps raw nql fallback and removes single wrapper group', async ({page}) => {
        await memberFactory.create({
            name: 'Date Fallback Seed',
            email: 'date-fallback-seed@example.com'
        });

        const membersPage = new MembersPage(page);
        const membersFilterRequest = waitForMembersBrowseFilter(page);
        await membersPage.goto(buildLegacyMembersUrl('filter', '(subscriptions.start_date:>\'1999-01-01 05:59:59\')'));

        expect(await membersFilterRequest).toBe('subscriptions.start_date:>\'1999-01-01 05:59:59\'');
    });
});
