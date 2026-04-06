import {AdminStaffDetailsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Staff settings', () => {
    test('redirects my-profile to the current user profile', async ({page, ghostAccountOwner}) => {
        const staffDetailsPage = new AdminStaffDetailsPage(page);

        await staffDetailsPage.gotoMyProfile();

        await expect(staffDetailsPage.userDetailModal).toBeVisible();
        await expect(staffDetailsPage.emailInput).toHaveValue(ghostAccountOwner.email);
        await expect(staffDetailsPage.slugInput).toBeVisible();

        const currentUserSlug = await staffDetailsPage.slugInput.inputValue();
        await expect(page).toHaveURL(new RegExp(`/ghost/#/settings/staff/${currentUserSlug}$`));
    });
});
