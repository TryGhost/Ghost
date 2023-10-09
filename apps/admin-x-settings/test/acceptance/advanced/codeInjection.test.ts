import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../utils/acceptance';

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

        await section.getByRole('button', {name: 'Edit'}).click();
        // Click on the CodeMirror content to make sure it's loaded
        await section.getByTestId('header-code').locator('.cm-content').click();

        for (const character of (PADDING + 'testhead').split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('tab', {name: 'Site footer'}).click();
        await section.getByTestId('footer-code').locator('.cm-content').click();

        for (const character of (PADDING + 'testfoot').split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Save'}).click();
        await expect(section.getByRole('button', {name: 'Save'})).toBeHidden();

        expect(lastApiRequests.editSettings?.body).toMatchObject({
            settings: [
                {key: 'codeinjection_head', value: /testhead$/},
                {key: 'codeinjection_foot', value: /testfoot$/}
            ]
        });
    });

    test('Supports continuing editing in fullscreen', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'codeinjection_head', value: '<1 /><2 /><3 />'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('code-injection');

        await section.getByRole('button', {name: 'Edit'}).click();

        for (const character of PADDING.split('')) {
            await page.keyboard.press(character);
        }

        for (const character of '<1>'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Fullscreen'}).click();

        await page.keyboard.press('End');
        for (const character of '<2>'.split('')) {
            await page.keyboard.press(character);
        }

        await page.getByTestId('modal-code').getByRole('button', {name: 'Done'}).click();

        await page.keyboard.press('End');
        for (const character of '<3>'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Save'}).click();
        await expect(section.getByRole('button', {name: 'Save'})).toBeHidden();

        expect(lastApiRequests.editSettings?.body).toMatchObject({
            settings: [
                {key: 'codeinjection_head', value: /<1><2><3>$/}
            ]
        });
    });
});
