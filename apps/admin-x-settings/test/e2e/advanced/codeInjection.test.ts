import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Code injection settings', async () => {
    test('Supports adding injected code', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'codeinjection_head', value: '<testhead />'},
                {key: 'codeinjection_foot', value: '<testfoot />'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('code-injection');

        await section.getByRole('button', {name: 'Edit'}).click();

        for (const character of '<testhead />'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('tab', {name: 'Site footer'}).click();
        await section.getByTestId('footer-code').click();

        for (const character of '<testfoot />'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'codeinjection_head', value: '<testhead />'},
                {key: 'codeinjection_foot', value: '<testfoot />'}
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

        for (const character of '<1 />'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Fullscreen'}).click();

        await page.keyboard.press('End');
        for (const character of '<2 />'.split('')) {
            await page.keyboard.press(character);
        }

        await page.getByTestId('modal-code').getByRole('button', {name: 'Done'}).click();

        await page.keyboard.press('End');
        for (const character of '<3 />'.split('')) {
            await page.keyboard.press(character);
        }

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'codeinjection_head', value: '<1 /><2 /><3 />'}
            ]
        });
    });
});
