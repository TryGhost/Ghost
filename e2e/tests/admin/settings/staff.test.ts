import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Staff settings', () => {
    test('redirects my-profile to the current user profile', async ({page}) => {
        await page.goto('/ghost/#/my-profile');

        const userDetailModal = page.getByTestId('user-detail-modal');
        await expect(userDetailModal).toBeVisible();

        const slugInput = userDetailModal.getByRole('textbox', {name: 'Slug'});
        await expect(slugInput).toBeVisible();
        await expect(slugInput).toHaveValue(/^(?!me$).+/);
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/staff\/(?!me$)[^/]+$/);
    });
});
