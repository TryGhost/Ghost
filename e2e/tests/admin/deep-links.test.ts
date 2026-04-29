import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Deep-link redirects', () => {
    test('redirects /ghost/<path> to /ghost/#/<path> with no trailing slash', async ({ghostInstance, playwright}) => {
        const request = await playwright.request.newContext({baseURL: ghostInstance.baseUrl});

        try {
            const response = await request.fetch('/ghost/members/import', {maxRedirects: 0});

            expect(response.status()).toBe(302);
            expect(response.headers().location).toBe('/ghost/#/members/import');
        } finally {
            await request.dispose();
        }
    });
});
