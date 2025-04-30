import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Navigation settings', async () => {
    test('Editing primary and secondary navigation', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');

        const primaryNavigationTab = modal.getByRole('tabpanel').first();

        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();
        await primaryItem.getByLabel('Label').fill('existing item label');
        await primaryItem.getByLabel('URL').fill('/existing');

        await primaryNavigationTab.getByTestId('new-navigation-item').getByLabel('Label').fill('new item label');
        await primaryNavigationTab.getByTestId('new-navigation-item').getByLabel('URL').fill('/new');
        await primaryNavigationTab.getByTestId('new-navigation-item').getByLabel('URL').blur();

        await modal.getByRole('tab').last().click();

        const secondaryNavigationTab = modal.getByRole('tabpanel').last();

        const secondaryItem = secondaryNavigationTab.getByTestId('navigation-item-editor').first();
        await secondaryItem.getByLabel('Label').fill('existing item 2');
        await secondaryItem.getByLabel('URL').fill('/existing2');

        await secondaryNavigationTab.getByTestId('new-navigation-item').getByLabel('Label').fill('new item 2');
        await secondaryNavigationTab.getByTestId('new-navigation-item').getByLabel('URL').press('Backspace');
        await secondaryNavigationTab.getByTestId('new-navigation-item').getByLabel('URL').fill('https://google.com');
        await secondaryNavigationTab.getByTestId('new-navigation-item').getByLabel('URL').blur();

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'navigation', value: '[{"url":"/existing/","label":"existing item label"},{"url":"/about/","label":"About"},{"url":"/new/","label":"new item label"}]'},
                {key: 'secondary_navigation', value: '[{"url":"/existing2/","label":"existing item 2"},{"url":"https://google.com","label":"new item 2"}]'}
            ]
        });
    });

    test('Existing item validations', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');

        const primaryNavigationTab = modal.getByRole('tabpanel').first();

        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();
        await primaryItem.getByLabel('Label').fill('');
        await primaryItem.getByLabel('URL').press('Backspace');
        await primaryItem.getByLabel('URL').fill('google.com');

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(primaryItem.getByText('You must specify a label')).toHaveCount(1);
        await expect(primaryItem.getByText('You must specify a valid URL or relative path')).toHaveCount(1);

        await primaryItem.getByLabel('Label').press('A');
        await expect(primaryItem.getByText('You must specify a label')).toHaveCount(0);

        // The error should hide whenever the user types even if the URL is still not valid
        await primaryItem.getByLabel('URL').press('A');
        await expect(primaryItem.getByText('You must specify a valid URL or relative path')).toHaveCount(0);
    });

    test('Adding a new item', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');

        const primaryNavigationTab = modal.getByRole('tabpanel').first();

        await expect(primaryNavigationTab.getByTestId('navigation-item-editor')).toHaveCount(2);

        const newItem = primaryNavigationTab.getByTestId('new-navigation-item');
        await newItem.getByLabel('Label').fill('');
        await newItem.getByLabel('URL').press('Backspace');
        await newItem.getByLabel('URL').fill('google.com');

        await newItem.getByTestId('add-button').click();

        await expect(newItem.getByText('You must specify a label')).toHaveCount(1);
        await expect(newItem.getByText('You must specify a valid URL or relative path')).toHaveCount(1);

        await newItem.getByLabel('Label').press('A');
        await expect(newItem.getByText('You must specify a label')).toHaveCount(0);

        // The error should hide whenever the user types even if the URL is still not valid
        await newItem.getByLabel('URL').press('A');
        await expect(newItem.getByText('You must specify a valid URL or relative path')).toHaveCount(0);

        await newItem.getByLabel('Label').fill('Label');
        await newItem.getByLabel('URL').fill('https://google.com');

        await newItem.getByTestId('add-button').click();

        await expect(primaryNavigationTab.getByTestId('navigation-item-editor')).toHaveCount(3);

        await expect(primaryNavigationTab.getByTestId('navigation-item-editor').last().getByLabel('Label')).toHaveValue('Label');
        await expect(primaryNavigationTab.getByTestId('navigation-item-editor').last().getByLabel('URL')).toHaveValue('https://google.com/');
        await expect(newItem.getByLabel('Label')).toHaveValue('');
        await expect(newItem.getByLabel('URL')).toHaveValue('http://test.com/');
    });

    test('Warns when leaving without saving', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');

        const primaryNavigationTab = modal.getByRole('tabpanel').first();

        await expect(primaryNavigationTab.getByTestId('navigation-item-editor')).toHaveCount(2);

        const newItem = primaryNavigationTab.getByTestId('new-navigation-item');

        await newItem.getByLabel('Label').fill('Label');
        await newItem.getByLabel('URL').fill('https://google.com');

        await newItem.getByTestId('add-button').click();

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();
        expect(lastApiRequests.editSettings).toBeUndefined();
    });
});
