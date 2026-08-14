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

const getMyAccount = {
    method: 'GET',
    path: '/v1/account/me',
    response: account
} as const;

const getMyIndexAccount = {
    method: 'GET',
    path: '/v1/account/me',
    response: {
        ...account,
        handle: '@index@blog.site.com',
        name: 'Test User'
    }
} as const;

const getMyIndexAccountWithCustomDomain = {
    method: 'GET',
    path: '/v1/account/me',
    response: {
        ...account,
        handle: '@index@site.com',
        name: 'Test User'
    }
} as const;

test.describe('Preferences', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('I can open the Social Web domain screen from preferences', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount: getMyIndexAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences');

        await expect(page.getByRole('link', {name: /Social web handle/})).toBeVisible();
        await expect(page.getByLabel('Handle domain')).toHaveCount(0);

        await page.getByRole('link', {name: /Social web handle/}).click();

        const handleBreakdown = page.getByRole('group', {name: 'Social Web handle breakdown'});

        await expect(page.getByRole('heading', {exact: true, name: 'Your social web handle'})).toBeVisible();
        await expect(handleBreakdown.locator(':scope > div > span').nth(0)).toHaveText('index');
        await expect(handleBreakdown.locator(':scope > div > span').nth(1)).toHaveText('blog.site.com');
        await expect(handleBreakdown.getByText('Username')).toBeVisible();
        await expect(handleBreakdown.getByText('Domain', {exact: true})).toBeVisible();
        await expect(page.getByLabel('Social web username', {exact: true})).toHaveValue('index');
        await expect(page.getByText('Default Social Web domain')).toHaveCount(0);
        await expect(page.getByLabel('Social web domain', {exact: true})).toHaveValue('blog.site.com');
        await expect(page.getByLabel('Social web domain', {exact: true})).toBeDisabled();
        await expect(page.getByRole('button', {name: 'Edit Social web domain'})).toBeVisible();
        await expect(page.getByText('Use a bare domain without https:// or paths.')).toHaveCount(0);
        await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);
        await expect(page.getByText('Actor URL:', {exact: false})).toHaveCount(0);
    });

    test('I can see a configured Social Web domain', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount: getMyIndexAccountWithCustomDomain,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: 'site.com',
                    handle: '@index@site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (text: string) => window.localStorage.setItem('copiedHandle', text)
                }
            });
        });

        const handleBreakdown = page.getByRole('group', {name: 'Social Web handle breakdown'});
        const copyHandleButton = page.getByRole('button', {name: 'Copy Social Web handle'});

        await expect(page.getByText('Your social web handle', {exact: true})).toBeVisible();
        await expect(handleBreakdown.locator(':scope > div > span').nth(0)).toHaveText('index');
        await expect(handleBreakdown.locator(':scope > div > span').nth(1)).toHaveText('site.com');
        await expect(handleBreakdown.getByText('Username')).toBeVisible();
        await expect(handleBreakdown.getByText('Domain', {exact: true})).toBeVisible();
        await expect(page.getByLabel('Social web username', {exact: true})).toHaveValue('index');
        await expect(page.getByLabel('Active social web domain')).toHaveValue('site.com');
        await expect(page.getByRole('button', {name: 'Remove'})).toBeVisible();
        await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);
        await expect(page.getByText('Your handle: @index@site.com', {exact: true})).toHaveCount(0);

        await copyHandleButton.hover();
        await expect(page.getByText('Copy', {exact: true})).toBeVisible();
        await copyHandleButton.click();
        await expect(page.getByText('Copied!', {exact: true})).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.localStorage.getItem('copiedHandle'))).toBe('@index@site.com');
    });

    test('I can update my Social Web username from the domain screen', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getMyAccount: getMyIndexAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            updateAccount: {
                method: 'PUT',
                path: '/v1/account',
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');
        const handleBreakdown = page.getByRole('group', {name: 'Social Web handle breakdown'});

        await expect(page.getByLabel('Social web username', {exact: true})).toBeDisabled();
        await page.getByRole('button', {name: 'Edit Social web username'}).click();
        await expect(page.getByLabel('Social web username', {exact: true})).toBeEnabled();
        await page.getByLabel('Social web username', {exact: true}).fill('john');
        await expect(handleBreakdown.locator(':scope > div > span').nth(0)).toHaveText('john');
        await expect(handleBreakdown.locator(':scope > div > span').nth(1)).toHaveText('blog.site.com');
        await page.getByRole('button', {name: 'Save'}).click();

        await expect.poll(() => lastApiRequests.updateAccount).toBeTruthy();
        expect(lastApiRequests.updateAccount?.body).toEqual({
            name: 'Test User',
            username: 'john',
            bio: '',
            avatarUrl: 'https://fake.host/avatars/alice.jpg',
            bannerImageUrl: ''
        });
    });

    test('I can validate and save a Social Web domain', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getMyAccount: getMyIndexAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            updateDomain: {
                method: 'PUT',
                path: '/v1/domain',
                response: {
                    domain: 'site.com',
                    handle: '@index@site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            validateDomain: {
                method: 'POST',
                path: '/v1/domain/validate',
                response: {
                    domain: 'site.com',
                    handle: '@index@site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');
        const handleBreakdown = page.getByRole('group', {name: 'Social Web handle breakdown'});

        await page.getByRole('button', {name: 'Edit Social web domain'}).click();
        await expect(page.getByLabel('Social web domain')).toBeEnabled();
        await page.getByLabel('Social web domain').fill(' https://site.com/some/path?query=true#hash ');
        await expect(handleBreakdown.locator(':scope > div > span').nth(0)).toHaveText('index');
        await expect(handleBreakdown.locator(':scope > div > span').nth(1)).toHaveText('site.com');

        await expect(page.getByRole('button', {name: 'Activate'})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Validate'})).toHaveCount(0);
        await expect(page.getByText('Set up your redirect')).toHaveCount(0);

        await page.getByLabel('Social web domain').press('Enter');

        await expect(page.getByText('Set up your redirect')).toBeVisible();
        await expect(page.getByText('https://site.com/.well-known/webfinger')).toBeVisible();
        await expect(page.getByText('https://blog.site.com/.well-known/webfinger')).toBeVisible();
        await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);

        await page.getByRole('button', {name: 'Validate'}).click();

        await expect.poll(() => lastApiRequests.validateDomain).toBeTruthy();
        expect(lastApiRequests.validateDomain?.body).toEqual({domain: 'site.com'});
        expect(lastApiRequests.updateDomain).toBeUndefined();
        await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeVisible();

        await page.getByRole('button', {name: 'Save', exact: true}).click();

        await expect.poll(() => lastApiRequests.updateDomain).toBeTruthy();
        expect(lastApiRequests.updateDomain?.body).toEqual({domain: 'site.com'});
        await expect(page.getByLabel('Active social web domain')).toHaveValue('site.com');
        await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);
        await expect(page.getByText('Your handle: @index@site.com', {exact: true})).toHaveCount(0);
    });

    test('I can remove a Social Web domain', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getMyAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: 'site.com',
                    handle: '@index@site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            updateDomain: {
                method: 'PUT',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');
        const handleBreakdown = page.getByRole('group', {name: 'Social Web handle breakdown'});
        await page.getByRole('button', {name: 'Remove'}).click();

        await expect.poll(() => lastApiRequests.updateDomain).toBeTruthy();
        expect(lastApiRequests.updateDomain?.body).toEqual({domain: null});
        await expect(page.getByLabel('Social web domain', {exact: true})).toHaveValue('blog.site.com');
        await expect(page.getByLabel('Social web domain', {exact: true})).toBeDisabled();
        await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);
        await expect(handleBreakdown.locator(':scope > div > span').nth(0)).toHaveText('index');
        await expect(handleBreakdown.locator(':scope > div > span').nth(1)).toHaveText('blog.site.com');
    });

    test('I do not validate an empty Social Web domain', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getMyAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            validateDomain: {
                method: 'POST',
                path: '/v1/domain/validate',
                response: {
                    domain: 'site.com',
                    handle: '@index@site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');

        await page.getByRole('button', {name: 'Edit Social web domain'}).click();
        await expect(page.getByRole('button', {name: 'Activate'})).toBeDisabled();
        await expect(page.getByRole('button', {name: 'Validate'})).toHaveCount(0);
        expect(lastApiRequests.validateDomain).toBeUndefined();
    });

    test('I see Social Web domain validation errors without losing the instructions', async ({page}) => {
        const errorCases = [
            {
                code: 'invalid-domain',
                status: 400
            },
            {
                code: 'conflict',
                status: 409
            },
            {
                code: 'not-reachable',
                status: 422
            },
            {
                code: 'invalid-webfinger',
                status: 400
            },
            {
                code: 'wrong-actor',
                status: 422
            }
        ];

        for (const errorCase of errorCases) {
            await mockApi({page, requests: {
                getMyAccount,
                getDomain: {
                    method: 'GET',
                    path: '/v1/domain',
                    response: {
                        domain: null,
                        handle: '@index@blog.site.com',
                        actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                    }
                },
                validateDomain: {
                    method: 'POST',
                    path: '/v1/domain/validate',
                    response: {
                        code: errorCase.code
                    },
                    responseStatus: errorCase.status
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/preferences/handle');
            await page.getByRole('button', {name: 'Edit Social web domain'}).click();
            await page.getByLabel('Social web domain').fill('bad.example');
            await page.getByRole('button', {name: 'Activate'}).click();
            await page.getByRole('button', {name: 'Validate'}).click();

            await expect(page.getByText('Set up your redirect')).toBeVisible();
            await expect(page.getByText('https://bad.example/.well-known/webfinger')).toBeVisible();
            await expect(page.getByText('https://blog.site.com/.well-known/webfinger')).toBeVisible();
            await expect(page.getByText('Your new handle will be', {exact: true})).toHaveCount(0);
            await expect(page.getByText('Redirect could not be validated')).toBeVisible();
            await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
            await expect(page.getByRole('button', {name: 'Validate'})).toHaveCount(0);

            await page.getByRole('button', {name: 'Cancel'}).click();
        }
    });

    test('I see a Social Web unavailable error', async ({page}) => {
        await mockApi({page, requests: {
            getMyAccount,
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@blog.site.com',
                    actorUrl: 'https://blog.site.com/.ghost/activitypub/users/index'
                }
            },
            validateDomain: {
                method: 'POST',
                path: '/v1/domain/validate',
                response: {},
                responseStatus: 404
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/preferences/handle');
        await page.getByRole('button', {name: 'Edit Social web domain'}).click();
        await page.getByLabel('Social web domain').fill('bad.example');
        await page.getByRole('button', {name: 'Activate'}).click();
        await page.getByRole('button', {name: 'Validate'}).click();

        await expect(page.getByText('Set up your redirect')).toBeVisible();
        await expect(page.getByText('Redirect could not be validated')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
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
            getDomain: {
                method: 'GET',
                path: '/v1/domain',
                response: {
                    domain: null,
                    handle: '@index@fake.host',
                    actorUrl: 'https://fake.host/.ghost/activitypub/users/index'
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
