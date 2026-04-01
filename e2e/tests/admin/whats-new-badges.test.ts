import {WhatsNewMenu} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';
import {createEntry, daysAgo, daysFromNow, mockChangelog} from './whats-new.helpers';

test.describe("Ghost Admin - What's New - Badge Indicators", () => {
    test('shows badge for new non-featured entries the user has not seen', async ({page}) => {
        await mockChangelog(page, [createEntry(daysFromNow(1))]);

        const menu = new WhatsNewMenu(page);
        await menu.goto();

        await expect(menu.avatarBadge).toBeVisible();
    });

    test('shows badge in user menu when there are new entries', async ({page}) => {
        await mockChangelog(page, [createEntry(daysFromNow(1))]);

        const menu = new WhatsNewMenu(page);
        await menu.goto();
        await menu.openUserMenu();

        await expect(menu.menuBadge).toBeVisible();
    });

    test('does not show badges for entries from before user joined', async ({page}) => {
        await mockChangelog(page, [createEntry(daysAgo(30))]);

        const menu = new WhatsNewMenu(page);
        await menu.goto();

        await expect(menu.avatarBadge).toBeHidden();

        await menu.openUserMenu();
        await expect(menu.menuBadge).toBeHidden();
    });

    test.describe('dismissal behavior', () => {
        test("hides badges immediately when What's new modal is opened", async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();

            await expect(menu.avatarBadge).toBeVisible();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await expect(menu.avatarBadge).toBeHidden();
        });

        test("badges remain hidden after reload when What's new has been viewed", async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await menu.goto();
            await expect(menu.avatarBadge).toBeHidden();
        });

        test('badges reappear when a new entry is published after viewing', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await menu.goto();
            await expect(menu.avatarBadge).toBeHidden();

            await mockChangelog(page, [createEntry(daysFromNow(2))]);

            await menu.goto();

            await expect(menu.avatarBadge).toBeVisible();
        });
    });
});
