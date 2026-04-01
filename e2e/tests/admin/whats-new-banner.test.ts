import {WhatsNewBanner, WhatsNewMenu} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';
import {createEntry, daysAgo, daysFromNow, mockChangelog} from './whats-new.helpers';

test.describe("Ghost Admin - What's New - Banner", () => {
    test('shows banner for new entries the user has not seen', async ({page}) => {
        await mockChangelog(page, [
            createEntry(daysFromNow(1), {
                title: 'New Update',
                excerpt: 'This is an exciting new feature'
            })
        ]);

        const banner = new WhatsNewBanner(page);
        await banner.goto();
        await banner.waitForBanner();

        await expect(banner.container).toBeVisible();
        await expect(banner.title).toHaveText('New Update');
        await expect(banner.excerpt).toHaveText('This is an exciting new feature');
    });

    test('does not show banner for entries from before user joined', async ({page}) => {
        await mockChangelog(page, [createEntry(daysAgo(30))]);

        const banner = new WhatsNewBanner(page);
        await banner.goto();

        await expect(banner.container).toBeHidden();
    });

    test('does not show banner when there are no entries', async ({page}) => {
        await mockChangelog(page, []);

        const banner = new WhatsNewBanner(page);
        await banner.goto();

        await expect(banner.container).toBeHidden();
    });

    test.describe('dismissal behavior', () => {
        test('hides banner immediately when close button is clicked', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();

            await banner.dismiss();

            await expect(banner.container).toBeHidden();
        });

        test('hides banner immediately when link is clicked', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();

            await banner.clickLinkAndClosePopup();

            await expect(banner.container).toBeHidden();
        });

        test('hides banner immediately when modal is opened', async ({page}) => {
            await mockChangelog(page, [
                createEntry(daysFromNow(1), {feature_image: 'https://ghost.org/image1.jpg'}),
                createEntry(daysAgo(5))
            ]);

            const banner = new WhatsNewBanner(page);
            const menu = new WhatsNewMenu(page);

            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await expect(banner.container).toBeHidden();
        });

        test('banner remains hidden after reload when dismissed', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();
            await banner.waitForBanner();

            await banner.dismiss();

            await banner.goto();
            await expect(banner.container).toBeHidden();
        });

        test('banner reappears when a new entry is published after dismissal', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const banner = new WhatsNewBanner(page);

            await banner.goto();
            await banner.waitForBanner();
            await banner.dismiss();

            await banner.goto();
            await expect(banner.container).toBeHidden();

            await mockChangelog(page, [
                createEntry(daysFromNow(2), {
                    title: 'Second Update'
                })
            ]);

            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();
            await expect(banner.title).toHaveText('Second Update');
        });
    });
});
