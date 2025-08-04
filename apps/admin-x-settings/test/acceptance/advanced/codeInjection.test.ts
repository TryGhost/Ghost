import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

// CodeMirror takes some time to load in Playwright meaning the first few characters typed don't always
// show up in the input. Since that lag is not consistent, this workaround ensures we type enough
// characters to consistently include the full string we want
const PADDING = 'xxxxx ';

test.describe('Code injection settings', async () => {
    test('Supports adding injected code', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'codeinjection_head', value: 'testhead'},
                {key: 'codeinjection_foot', value: 'testfoot'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('code-injection');

        await section.getByRole('button', {name: 'Open'}).click();

        const modal = page.getByTestId('modal-code-injection');
        // Click on the CodeMirror content to make sure it's loaded
        await modal.getByTestId('header-code').locator('.cm-content').click();

        for (const character of (PADDING + 'testhead').split('')) {
            await page.keyboard.press(character);
        }

        await modal.getByRole('tab', {name: 'Site footer'}).click();
        await modal.getByTestId('footer-code').locator('.cm-content').click();

        for (const character of (PADDING + 'testfoot').split('')) {
            await page.keyboard.press(character);
        }

        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toMatchObject({
            settings: [
                {key: 'codeinjection_head', value: /testhead$/},
                {key: 'codeinjection_foot', value: /testfoot$/}
            ]
        });
    });
});
