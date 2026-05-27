import {FIXTURE_ROLES, FixtureRole} from '@/helpers/utils/fixture-cache';
import {expect, test} from '@/helpers/playwright';

const expectedEmailByRole: Record<FixtureRole, string> = {
    owner: 'owner@ghost.org',
    administrator: 'administrator@ghost.org',
    editor: 'editor@ghost.org',
    author: 'author@ghost.org',
    contributor: 'contributor@ghost.org'
};

async function getCurrentUserEmail(page: import('@playwright/test').Page): Promise<string> {
    const response = await page.request.get('/ghost/api/admin/users/me/?include=roles');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    return body.users[0].email;
}

for (const role of FIXTURE_ROLES) {
    test.describe(`${role} auth state`, () => {
        test.use({role});

        test(`loads cached ${role} session`, async ({page}) => {
            expect(await getCurrentUserEmail(page)).toBe(expectedEmailByRole[role]);
        });
    });
}
