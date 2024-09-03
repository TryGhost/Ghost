import {StaffTokenResponseType} from '@tryghost/admin-x-framework/api/staffToken';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, responseFixtures, settingsWithStripe, testUrlValidation, toggleLabsFlag} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User profile', async () => {
    test('Supports editing user profiles', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    email: 'newadmin@test.com',
                    name: 'New Admin'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        // Validation failures

        await modal.getByLabel('Full name').fill('');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Name is required');

        await modal.getByLabel('Email').fill('test');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Enter a valid email address');

        await modal.getByLabel('Location').fill(new Array(195).join('a'));
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Location is too long');

        await modal.getByLabel('Bio').fill(new Array(210).join('a'));
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Bio is too long');

        await modal.getByLabel('Website').fill('not-a-website');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Enter a valid URL');

        const facebookInput = modal.getByLabel('Facebook profile');

        await testUrlValidation(
            facebookInput,
            'facebook.com/username',
            'https://www.facebook.com/username'
        );

        await testUrlValidation(
            facebookInput,
            'testuser',
            'https://www.facebook.com/testuser'
        );

        await testUrlValidation(
            facebookInput,
            'ab99',
            'https://www.facebook.com/ab99'
        );

        await testUrlValidation(
            facebookInput,
            'page/ab99',
            'https://www.facebook.com/page/ab99'
        );

        await testUrlValidation(
            facebookInput,
            'page/*(&*(%%))',
            'https://www.facebook.com/page/*(&*(%%))'
        );

        await testUrlValidation(
            facebookInput,
            'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
            'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts'
        );

        await testUrlValidation(
            facebookInput,
            'https://www.facebook.com/groups/savethecrowninn',
            'https://www.facebook.com/groups/savethecrowninn'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/username',
            'http://github.com/username',
            'The URL must be in a format like https://www.facebook.com/yourPage'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/pages/username',
            'http://github.com/pages/username',
            'The URL must be in a format like https://www.facebook.com/yourPage'
        );

        const twitterInput = modal.getByLabel('X (formerly Twitter) profile');

        await testUrlValidation(
            twitterInput,
            'x.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            'testuser',
            'https://x.com/testuser'
        );

        await testUrlValidation(
            twitterInput,
            'http://github.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            '*(&*(%%))',
            '*(&*(%%))',
            'The URL must be in a format like https://x.com/yourUsername'
        );

        await testUrlValidation(
            twitterInput,
            'thisusernamehasmorethan15characters',
            'thisusernamehasmorethan15characters',
            'Your Username is not a valid Twitter Username'
        );

        // Successful update

        await modal.getByLabel('Full name').fill('New Admin');
        await modal.getByLabel('Email').fill('newadmin@test.com');
        await modal.getByLabel('Slug').fill('newadmin');
        await expect(modal.getByText('https://example.com/author/newadmin')).toBeVisible();
        await modal.getByLabel('Location').fill('some location');
        await modal.getByLabel('Website').fill('https://example.com');
        await modal.getByLabel('Facebook profile').fill('fb');
        await modal.getByLabel('X (formerly Twitter) profile').fill('tw');
        await modal.getByLabel('Bio').fill('some bio');

        // Email notification settings

        await modal.getByLabel(/Comments/).uncheck();
        await modal.getByLabel(/New signups/).uncheck();
        await modal.getByLabel(/New paid members/).uncheck();
        await modal.getByLabel(/Paid member cancellations/).check();
        await modal.getByLabel(/Milestones/).uncheck();

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(listItem.getByText('New Admin')).toBeVisible();
        await expect(listItem.getByText('newadmin@test.com')).toBeVisible();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'newadmin@test.com',
                name: 'New Admin',
                slug: 'newadmin',
                location: 'some location',
                website: 'https://example.com',
                facebook: 'fb',
                twitter: '@tw',
                bio: 'some bio',
                comment_notifications: false,
                free_member_signup_notification: false,
                paid_subscription_started_notification: false,
                paid_subscription_canceled_notification: true,
                milestone_notifications: false
            }]
        });
    });

    test('Supports uploading profile picture', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'owner@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    profile_image: 'http://example.com/image.png',
                    cover_image: 'http://example.com/image.png'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        const wrapper = section.getByTestId('owner-user');
        await wrapper.hover();
        await wrapper.getByRole('button', {name: 'View profile'}).click();

        // Upload profile picture

        const modal = page.getByTestId('user-detail-modal');

        const profileFileChooserPromise = page.waitForEvent('filechooser');

        await modal.locator('label[for=avatar]').click();

        const profileFileChooser = await profileFileChooserPromise;
        await profileFileChooser.setFiles(`${__dirname}/../../../utils/images/image.png`);

        await expect(modal.locator('#avatar')).toHaveAttribute('src', 'http://example.com/image.png');

        // Upload cover image

        const coverFileChooserPromise = page.waitForEvent('filechooser');

        await modal.locator('label[for=cover-image]').click();

        const coverFileChooser = await coverFileChooserPromise;
        await coverFileChooser.setFiles(`${__dirname}/../../../utils/images/image.png`);

        await expect(modal.locator('#cover-image')).toHaveAttribute('src', 'http://example.com/image.png');

        // Save the user

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'owner@test.com',
                profile_image: 'http://example.com/image.png',
                cover_image: 'http://example.com/image.png'
            }]
        });
    });

    test('Does not show email notification options for non-admin users', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'editor@test.com')!;

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    email: 'newadmin@test.com',
                    name: 'New Admin'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Editors'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await expect(modal.getByLabel(/Comments/)).toBeVisible();
        await expect(modal.getByLabel(/New signups/)).toBeHidden();
        await expect(modal.getByLabel(/New paid members/)).toBeHidden();
        await expect(modal.getByLabel(/Paid member cancellations/)).toBeHidden();
        await expect(modal.getByLabel(/Milestones/)).toBeHidden();
    });

    test('Shows donation notification option when Stripe enabled', async ({page}) => {
        toggleLabsFlag('tipsAndDonations', true);

        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await expect(modal.getByLabel(/Tips & donations/)).toBeVisible();
        await expect(modal.getByLabel(/Tips & donations/)).toHaveAttribute('aria-checked', 'true');

        await modal.getByLabel(/Tips & donations/).uncheck();

        await expect(modal.getByLabel(/Tips & donations/)).toHaveAttribute('aria-checked', 'false');

        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                donation_notifications: false
            }]
        });
    });

    test('Hides donation notification option when Stripe disabled', async ({page}) => {
        toggleLabsFlag('tipsAndDonations', true);

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await expect(modal.getByLabel(/Tips & donations/)).not.toBeVisible();
    });

    test('Warns when leaving without saving', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: responseFixtures.users}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByLabel('Full name').fill('Updated');

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();
        expect(lastApiRequests.editUser).toBeUndefined();
    });

    test('Supports managing staff token', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'owner@test.com')!;

        const apiKey = {
            id: 'token-id',
            created_at: '2023-01-01',
            integration_id: 'integration-id',
            last_seen_at: null,
            last_seen_version: null,
            role_id: 'role-id',
            secret: 'secret',
            type: '',
            updated_at: '2023-01-01',
            user_id: userToEdit.id
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},

            getStaffToken: {method: 'GET', path: '/users/me/token/', response: {apiKey} satisfies StaffTokenResponseType},

            genStaffToken: {
                method: 'PUT',
                path: '/users/me/token/',
                response: {
                    apiKey: {
                        ...apiKey,
                        secret: 'new-secret'
                    }
                } satisfies StaffTokenResponseType
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const modal = page.getByTestId('user-detail-modal');

        // Can't see the staff token for other users

        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        await expect(modal.getByTestId('api-keys')).toBeHidden();
        await modal.getByRole('button', {name: 'Close'}).click();

        // Can see and regenerate your own staff token

        const ownerItem = section.getByTestId('owner-user').last();
        await ownerItem.hover();
        await ownerItem.getByRole('button', {name: 'View profile'}).click();

        await expect(modal.getByTestId('api-keys')).toContainText('token-id:secret');

        await modal.getByTestId('api-keys').hover();
        await modal.getByTestId('api-keys').getByRole('button', {name: 'Regenerate'}).click();

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Regenerate your Staff Access Token'}).click();

        await expect(modal.getByTestId('api-keys')).toContainText('token-id:new-secret');

        expect(lastApiRequests.genStaffToken).toBeTruthy();
    });
});
