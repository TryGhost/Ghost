import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Staff settings', () => {
    test('redirects staff/me to the current user profile', async ({page}) => {
        await page.goto('/ghost/#/settings/staff/me');

        const userDetailModal = page.getByTestId('user-detail-modal');
        await expect(userDetailModal).toBeVisible();

        const slugInput = userDetailModal.getByRole('textbox', {name: 'Slug'});
        await expect(slugInput).toBeVisible();

        const slug = await slugInput.inputValue();

        expect(slug).not.toBe('');
        expect(slug).not.toBe('me');
        await expect(page).toHaveURL(new RegExp(`/ghost/#/settings/staff/${slug}$`));
    });
});
