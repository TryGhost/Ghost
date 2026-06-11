// Vendored from /e2e/tests/admin/deep-links.test.ts
import {expect, test} from '../../helpers/fixture';

test.describe('Ghost Admin - Deep-link redirects', () => {
    test('redirects /ghost/<path> to /ghost/#/<path> with no trailing slash', async ({request}) => {
        const response = await request.fetch('/ghost/members/import', {maxRedirects: 0});

        expect(response.status()).toBe(302);
        expect(response.headers().location).toBe('/ghost/#/members/import');
    });
});
