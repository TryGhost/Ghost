import {MemberDetailsPage, MembersPage} from '@/helpers/pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';
import type {Page} from '@playwright/test';

usePerTestIsolation();

async function mockLargeMembersList(page: Page, members: Array<{id: string}>) {
    await page.route('**/ghost/api/admin/members/**', async (route) => {
        const requestUrl = new URL(route.request().url());

        if (requestUrl.pathname.endsWith('/ghost/api/admin/members/')) {
            const limit = Number(requestUrl.searchParams.get('limit') || '100');
            const pageParam = Number(requestUrl.searchParams.get('page') || '1');
            const total = 1200;
            const pages = Math.ceil(total / limit);
            const start = (pageParam - 1) * limit;
            const end = Math.min(start + limit, total);

            const paginatedMembers = Array.from({length: Math.max(0, end - start)}, (_, index) => {
                return members[(start + index) % members.length];
            });

            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    members: paginatedMembers,
                    meta: {
                        pagination: {
                            page: pageParam,
                            limit,
                            pages,
                            total,
                            next: pageParam < pages ? pageParam + 1 : null,
                            prev: pageParam > 1 ? pageParam - 1 : null
                        }
                    }
                })
            });
            return;
        }

        await route.continue();
    });
}

test.describe('Ghost Admin - Members Virtual Window', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('restores unlocked rows and scroll position after navigating back from a member', async ({page}) => {
        test.slow();

        const members = await Promise.all(
            Array.from({length: 25}, (_, index) => {
                const suffix = String(index + 1).padStart(2, '0');

                return memberFactory.create({
                    name: `Window Member ${suffix}`,
                    email: `window-member-${suffix}@example.com`
                });
            })
        );

        await mockLargeMembersList(page, members);

        const membersPage = new MembersPage(page, {route: 'members-forward'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await membersPage.goto();
        await expect(membersPage.loadMoreButton).toBeVisible();
        await membersPage.loadMoreButton.click();
        await expect(membersPage.loadMoreButton).toBeHidden();

        await expect.poll(async () => {
            const historyState = await page.evaluate(() => window.history.state);
            return historyState?.ghostVirtualListWindow?.['/members-forward::'];
        }).toBe(2000);

        const maxRenderedIndex = await membersPage.scrollUntilMaxRenderedIndexAtLeast(1000);

        expect(maxRenderedIndex).toBeGreaterThan(1000);

        const renderedCount = await membersPage.memberListItems.count();
        const targetRowLocator = membersPage.memberListItems.nth(Math.max(0, renderedCount - 5));
        const targetRow = {
            index: Number(await targetRowLocator.getAttribute('data-index')),
            text: await targetRowLocator.textContent(),
            scrollTop: await membersPage.getScrollParentScrollTop()
        };

        expect(targetRow.index).toBeGreaterThan(1000);

        await targetRowLocator.click();

        await expect(memberDetailsPage.nameInput).toBeVisible();

        await page.goBack();
        await expect(page).toHaveURL(/\/ghost\/#\/members-forward$/);
        await expect(membersPage.getMemberListItemByIndex(targetRow.index)).toContainText(targetRow.text ?? '');

        await expect.poll(async () => {
            const scrollTop = await membersPage.getScrollParentScrollTop();
            return Math.abs(scrollTop - targetRow.scrollTop);
        }).toBeLessThan(250);

        expect(await membersPage.getMaxRenderedIndex()).toBeGreaterThan(1000);
    });
});
