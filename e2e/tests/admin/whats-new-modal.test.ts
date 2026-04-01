import {WhatsNewMenu} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';
import {createEntry, daysAgo, daysFromNow, mockChangelog} from './whats-new.helpers';

test.describe("Ghost Admin - What's New - Modal", () => {
    test('shows modal with all entries when opened from user menu', async ({page}) => {
        await mockChangelog(page, [
            createEntry(daysFromNow(1), {
                title: 'Latest Update',
                excerpt: 'Latest feature',
                feature_image: 'https://ghost.org/image1.jpg'
            }),
            createEntry(daysAgo(5), {
                title: 'Previous Update',
                excerpt: 'Previous feature'
            })
        ]);

        const menu = new WhatsNewMenu(page);
        await menu.goto();

        const modal = await menu.openWhatsNewModal();

        await expect(modal.modal).toBeVisible();
        await expect(modal.title).toBeVisible();

        const entries = await modal.getEntries();
        expect(entries.length).toBe(2);

        expect(entries[0].title).toBe('Latest Update');
        expect(entries[0].excerpt).toBe('Latest feature');
        expect(entries[0].hasImage).toBe(true);

        expect(entries[1].title).toBe('Previous Update');
        expect(entries[1].excerpt).toBe('Previous feature');
    });
});
