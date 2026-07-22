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

    test('uploading profile images - persists the profile and cover images', async ({page}) => {
        const staffDetailsPage = new AdminStaffDetailsPage(page);
        const image = {
            name: 'profile.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
        };

        await staffDetailsPage.gotoMyProfile();
        await staffDetailsPage.uploadProfileImage(image);
        await expect(staffDetailsPage.profileImagePreview).toBeVisible();
        await staffDetailsPage.uploadCoverImage(image);
        await expect(staffDetailsPage.coverImagePreview).toBeAttached();
        await staffDetailsPage.save();

        await expect(staffDetailsPage.savedButton).toBeVisible();
        const response = await page.request.get('/ghost/api/admin/users/me/?include=roles');
        const {users} = await response.json() as {users: Array<{profile_image: string | null; cover_image: string | null}>};
        expect(users[0].profile_image).toContain('/content/images/');
        expect(users[0].cover_image).toContain('/content/images/');
    });
});
