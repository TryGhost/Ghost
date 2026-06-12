import {APIRequestContext} from '@playwright/test';
import {MembersActivityPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueName(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(6)}`;
}

function uniqueEmail(prefix: string) {
    return `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

// The activity feed only loads events strictly older than the page-load
// timestamp (second precision), so an event created in the same second as
// navigation is invisible. Poll with the same cursor-style filter the UI
// uses until the member's signup event is reliably in the past.
async function waitForSignupEventVisibleToFeed(request: APIRequestContext, memberId: string) {
    await expect.poll(async () => {
        const cursor = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const filter = encodeURIComponent(`data.created_at:<'${cursor}'+data.member_id:'${memberId}'+type:signup_event`);
        const response = await request.get(`/ghost/api/admin/members/events/?filter=${filter}&limit=1`);
        const data = await response.json();
        return data.events?.length > 0;
    }, {timeout: 10000}).toBe(true);
}

/**
 * Members activity screen tests, shared between the Ember implementation
 * (labs flag off, the default) and the React implementation (labs flag
 * `memberDetailsX` on).
 *
 * Members created via the Admin API produce a signup event, which is what
 * these tests rely on. Tests are order-independent: every test creates its
 * own member with a unique name and email.
 */
export function defineMembersActivityTests() {
    test('lists member events', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({
            name: uniqueName('Activity member'),
            email: uniqueEmail('activity')
        });
        await waitForSignupEventVisibleToFeed(page.request, member.id);

        const activityPage = new MembersActivityPage(page);
        await activityPage.goto();

        await expect(activityPage.title).toBeVisible();
        await expect(activityPage.eventsTable).toBeVisible();

        const memberRows = activityPage.getEventRowsByMemberName(member.name!);
        await expect(memberRows.first()).toBeVisible();
        await expect(memberRows.first()).toContainText('Signed up');
    });

    test('filters activity to a single member via url', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({
            name: uniqueName('Filtered member'),
            email: uniqueEmail('filtered')
        });
        await waitForSignupEventVisibleToFeed(page.request, member.id);

        const activityPage = new MembersActivityPage(page);
        await activityPage.gotoForMember(member.id);

        await expect(activityPage.breadcrumb).toBeVisible();
        await expect(activityPage.backToAllActivityLink).toHaveText(/Member activity/);
        await expect(activityPage.breadcrumb).toContainText(member.name!);
        await expect(activityPage.eventsTable).toBeVisible();
        await expect(activityPage.eventsTable).toContainText('Signed up');
    });

    test('excluding an event type updates the url and hides matching events', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({
            name: uniqueName('Excluded member'),
            email: uniqueEmail('excluded')
        });
        await waitForSignupEventVisibleToFeed(page.request, member.id);

        const activityPage = new MembersActivityPage(page);
        await activityPage.goto();
        await expect(activityPage.getEventRowsByMemberName(member.name!).first()).toBeVisible();

        await activityPage.openEventTypeFilter();
        await activityPage.toggleEventType('signup_event');

        await expect(page).toHaveURL(/excludedEvents=signup_event/);
        await expect(activityPage.getEventRowsByMemberName(member.name!)).toHaveCount(0);
    });
}
