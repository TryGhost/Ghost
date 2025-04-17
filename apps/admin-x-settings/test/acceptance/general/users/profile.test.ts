import {StaffTokenResponseType} from '@tryghost/admin-x-framework/api/staffToken';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, responseFixtures, settingsWithStripe, testUrlValidation, toggleLabsFlag} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User profile', async () => {
    test('Validates basic profile fields', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

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

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        // Test name validation
        await modal.getByLabel('Full name').fill('');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Name is required');

        // Test email validation
        await modal.getByLabel('Email').fill('test');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Enter a valid email address');

        // Test location validation
        await modal.getByLabel('Location').fill(new Array(195).join('a'));
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Location is too long');

        // Test bio validation
        await modal.getByLabel('Bio').fill(new Array(210).join('a'));
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Bio is too long');
    });

    test('Validates social links', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

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

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByTitle('Social Links').click();
        await modal.getByTestId('website-input').fill('not-a-website');
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Enter a valid URL');

        // Test Facebook URL validation
        const facebookInput = modal.getByTestId('facebook-input');

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
            'http://github.com/username',
            'http://github.com/username',
            'The URL must be in a format like https://www.facebook.com/yourPage'
        );

        // Test Twitter URL validation
        const twitterInput = modal.getByTestId('x-input');

        await testUrlValidation(
            twitterInput,
            'x.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            'thisusernamehasmorethan15characters',
            'thisusernamehasmorethan15characters',
            'Your Username is not a valid Twitter Username'
        );
    });

    test('Updates user profile successfully', async ({page}) => {
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

        // Update basic profile
        await modal.getByLabel('Full name').fill('New Admin');
        await modal.getByLabel('Email').fill('newadmin@test.com');
        await modal.getByLabel('Slug').fill('newadmin');
        await expect(modal.getByText('https://example.com/author/newadmin')).toBeVisible();
        await modal.getByLabel('Location').fill('some location');
        await modal.getByLabel('Bio').fill('some bio');

        await modal.getByTitle('Social Links').click();
        await modal.getByTestId('website-input').fill('https://example.com');
        await modal.getByTestId('facebook-input').fill('fb');
        await modal.getByTestId('x-input').fill('tw');

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
                bio: 'some bio'
            }]
        });
    });

    test('Updates email notification settings', async ({page}) => {
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

        // Update notification settings
        await modal.getByTitle('Email Notifications').click();
        await modal.getByLabel(/Comments/).uncheck();
        await modal.getByLabel(/New signups/).uncheck();
        await modal.getByLabel(/New paid members/).uncheck();
        await modal.getByLabel(/Paid member cancellations/).check();
        await modal.getByLabel(/Milestones/).uncheck();

        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
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
        await modal.getByTitle('Email Notifications').click();
        await expect(modal.getByLabel(/Comments/)).toBeVisible();
        await expect(modal.getByLabel(/New signups/)).toBeHidden();
        await expect(modal.getByLabel(/New paid members/)).toBeHidden();
        await expect(modal.getByLabel(/Paid member cancellations/)).toBeHidden();
        await expect(modal.getByLabel(/Milestones/)).toBeHidden();
    });

    test('Shows donation notification option when Stripe enabled', async ({page}) => {
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
        await modal.getByTitle('Email Notifications').click();

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

        await modal.getByTitle('Email Notifications').click();

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

    test.describe('Social links', () => {
        test('Validates Threads URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const threadsInput = modal.getByTestId('threads-input');

            await testUrlValidation(threadsInput, 'https://www.notthreads.com', 'https://www.notthreads.com', 'The URL must be in a format like https://www.threads.net/@yourUsername');

            await testUrlValidation(threadsInput, 'https://www.threads.net/@username', 'https://www.threads.net/@username');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    threads: '@username'
                }]
            });
        });

        test('Validates Bluesky URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);
            
            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const blueskyInput = modal.getByTestId('bluesky-input');

            await testUrlValidation(blueskyInput, 'https://notbluesky.com', 'https://notbluesky.com', 'The URL must be in a format like https://bsky.app/profile/yourUsername');

            await testUrlValidation(blueskyInput, 'https://bsky.app/profile/username', 'https://bsky.app/profile/username');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    bluesky: 'username'
                }]
            });
        });

        test('Validates Linkedin URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const linkedinInput = modal.getByTestId('linkedin-input');

            await testUrlValidation(linkedinInput, 'https://notlinkedin.com', 'https://notlinkedin.com', 'The URL must be in a format like https://www.linkedin.com/in/yourUsername');

            await testUrlValidation(linkedinInput, 'https://www.linkedin.com/in/yourUsername', 'https://www.linkedin.com/in/yourUsername');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    linkedin: 'yourUsername'
                }]
            });
        });

        test('Validates Instagram URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);
            
            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const instagramInput = modal.getByTestId('instagram-input');

            await testUrlValidation(instagramInput, 'https://twitter.com/johnsmith', 'https://twitter.com/johnsmith', 'The URL must be in a format like https://www.instagram.com/yourUsername');

            await testUrlValidation(instagramInput, 'https://www.instagram.com/yourUsername', 'https://www.instagram.com/yourUsername');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    instagram: 'yourUsername'
                }]
            });
        });

        test('Validates YouTube URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const youtubeInput = modal.getByTestId('youtube-input');

            await testUrlValidation(youtubeInput, 'https://www.youutbe/gsg', 'https://www.youutbe/gsg', 'The URL must be in a format like https://www.youtube.com/@yourUsername, https://www.youtube.com/user/yourUsername, or https://www.youtube.com/channel/yourChannelId');

            await testUrlValidation(youtubeInput, 'https://www.youtube.com/@yourUsername', 'https://www.youtube.com/@yourUsername');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    youtube: '@yourUsername'
                }]
            });
        });

        test('Validates TikTok URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const tiktokInput = modal.getByTestId('tiktok-input');

            await testUrlValidation(tiktokInput, 'https://www.tik.com/nottiktok', 'https://www.tik.com/nottiktok', 'The URL must be in a format like https://www.tiktok.com/@yourUsername');

            await testUrlValidation(tiktokInput, 'https://www.tiktok.com/@yourUsername', 'https://www.tiktok.com/@yourUsername');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    tiktok: '@yourUsername'
                }]
            });
        });

        test('Validates Mastodon URL', async ({page}) => {
            const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;
            // activate social links feature flag
            toggleLabsFlag('socialLinks', true);
            
            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
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

            await modal.getByTitle('Social Links').click();
            const mastodonInput = modal.getByTestId('mastodon-input');

            await testUrlValidation(mastodonInput, 'https://mastodon.social/johnsmith', 'https://mastodon.social/johnsmith', 'The URL must be in a format like instance/@yourUsername or instance/@yourUsername@instance');

            await testUrlValidation(mastodonInput, 'https://mastodon.social/@johnsmith@decentra.io', 'https://mastodon.social/@johnsmith@decentra.io');

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

            expect(lastApiRequests.editUser?.body).toMatchObject({
                users: [{
                    mastodon: 'mastodon.social/@johnsmith@decentra.io'
                }]
            });
        });
    });
});
