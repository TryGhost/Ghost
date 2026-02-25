import {AdminStaffDetailsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Staff settings', () => {
    test('redirects my-profile to the current user profile', async ({page}) => {
        const staffDetailsPage = new AdminStaffDetailsPage(page);

        await staffDetailsPage.gotoMyProfile();

        await expect(staffDetailsPage.userDetailModal).toBeVisible();
        await expect(staffDetailsPage.slugInput).toBeVisible();
        await expect(staffDetailsPage.slugInput).toHaveValue(/^(?!me$).+/);
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/staff\/(?!me$)[^/]+$/);
    });
});
