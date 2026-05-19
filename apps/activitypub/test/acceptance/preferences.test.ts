import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

const account = {
    id: 'alice',
    handle: '@alice@fake.host',
    name: 'Alice',
    url: 'https://fake.host/@alice',
    avatarUrl: 'https://fake.host/avatars/alice.jpg',
    followingCount: 5,
    followerCount: 10,
    likedCount: 3
};

test.describe('Preferences', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('I can add an old Mastodon handle for follower migration', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getMyAccount: {
                method: 'GET',
                path: '/v1/account/me',
                response: account
            },
            getAliases: {
                method: 'GET',
                path: '/v1/aliases',
                response: {
                    destination: {
                        handle: '@alice@fake.host',
                        apId: 'https://fake.host/.ghost/activitypub/users/index'
                    },
                    aliases: []
                }
            },
            addAlias: {
                method: 'POST',
                path: '/v1/aliases',
                response: {
                    destination: {
                        handle: '@alice@fake.host',
                        apId: 'https://fake.host/.ghost/activitypub/users/index'
                    },
                    aliases: [{
                        apId: 'https://mastodon.social/users/old'
                    }]
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences');

        await expect(page.getByRole('link', {name: /Account migration/})).toBeVisible();
        await page.getByRole('link', {name: /Account migration/}).click();

        await expect(page.getByRole('heading', {name: 'Account migration'})).toBeVisible();
        await expect.poll(() => lastApiRequests.getAliases).toBeTruthy();
        await expect(page.getByTestId('account-migration-aliases')).toHaveCount(0);
        await page.getByLabel('Old account handle').fill('old@mastodon.social');
        await page.getByRole('button', {name: 'Create alias'}).click();

        await expect.poll(() => lastApiRequests.addAlias).toBeTruthy();
        expect(lastApiRequests.addAlias?.body).toMatchObject({
            sourceHandle: '@old@mastodon.social'
        });
        await expect(page.getByTestId('account-migration-aliases')).toContainText('old@mastodon.social');
    });

    test('I can see existing aliases newest first', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount: {
                method: 'GET',
                path: '/v1/account/me',
                response: account
            },
            getAliases: {
                method: 'GET',
                path: '/v1/aliases',
                response: {
                    destination: {
                        handle: '@alice@fake.host',
                        apId: 'https://fake.host/.ghost/activitypub/users/index'
                    },
                    aliases: [
                        {apId: 'https://mastodon.social/users/old'},
                        {apId: 'https://mastodon.social/users/new'}
                    ]
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/move');

        const aliases = page.getByTestId('account-migration-aliases');
        await expect(aliases).toContainText('new@mastodon.social');
        await expect(aliases).toContainText('old@mastodon.social');

        const aliasText = await aliases.textContent();
        const newAliasIndex = aliasText?.indexOf('new@mastodon.social') ?? -1;
        const oldAliasIndex = aliasText?.indexOf('old@mastodon.social') ?? -1;

        expect(newAliasIndex).toBeGreaterThanOrEqual(0);
        expect(oldAliasIndex).toBeGreaterThanOrEqual(0);
        expect(newAliasIndex).toBeLessThan(oldAliasIndex);
    });

    test('I see an alias action error when unlinking fails', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount: {
                method: 'GET',
                path: '/v1/account/me',
                response: account
            },
            getAliases: {
                method: 'GET',
                path: '/v1/aliases',
                response: {
                    destination: {
                        handle: '@alice@fake.host',
                        apId: 'https://fake.host/.ghost/activitypub/users/index'
                    },
                    aliases: [{apId: 'https://mastodon.social/users/old'}]
                }
            },
            removeAlias: {
                method: 'DELETE',
                path: '/v1/aliases',
                response: {},
                responseStatus: 500
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/move');
        await page.getByRole('button', {name: 'Unlink'}).click();

        await expect(page.getByText('Could not remove migration profile.')).toBeVisible();
        await expect(page.getByLabel('Old account handle')).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('I see an error when account aliases cannot be loaded', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount: {
                method: 'GET',
                path: '/v1/account/me',
                response: account
            },
            getAliases: {
                method: 'GET',
                path: '/v1/aliases',
                response: {},
                responseStatus: 500
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/move');

        await expect(page.getByTestId('account-migration-aliases')).toContainText('Could not load account aliases.');
        await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
    });
});
