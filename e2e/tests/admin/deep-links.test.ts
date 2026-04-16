import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Deep-link redirects', () => {
    // Use a raw request context so this assertion doesn't need a booted admin —
    // the bug lives entirely in the server redirect chain, so we inspect the
    // Location header directly without loading any HTML or JS.
    test('redirects /ghost/<path> to /ghost/#/<path> with no trailing slash', async ({ghostInstance, playwright}) => {
        const request = await playwright.request.newContext({baseURL: ghostInstance.baseUrl});

        try {
            const response = await request.fetch('/ghost/members/import', {maxRedirects: 0});

            expect(response.status()).toBe(302);

            // Location headers never contain the URL fragment — browsers preserve
            // `#<hash>` from the original request and apply it client-side. So we
            // assert the server-side redirect target here: it must not carry a
            // trailing slash that React Router's hash routes won't match.
            expect(response.headers().location).toBe('/ghost/#/members/import');
        } finally {
            await request.dispose();
        }
    });
});
