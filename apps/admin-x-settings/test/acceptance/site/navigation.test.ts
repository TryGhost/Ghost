import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, settingsWithStripe, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

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

        await expect(primaryItem.getByText('You must specify a label or icon')).toHaveCount(1);
        await expect(primaryItem.getByText('You must specify a valid URL or relative path')).toHaveCount(1);

        await primaryItem.getByLabel('Label').press('A');
        await expect(primaryItem.getByText('You must specify a label or icon')).toHaveCount(0);

        // The error should hide whenever the user types even if the URL is still not valid
        await primaryItem.getByLabel('URL').press('A');
        await expect(primaryItem.getByText('You must specify a valid URL or relative path')).toHaveCount(0);
    });

    test('Editing navigation item icon and visibility', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/nav-icon.svg', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');
        const primaryNavigationTab = modal.getByRole('tabpanel').first();
        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();

        await primaryItem.locator('input[type="file"]').setInputFiles(`${__dirname}/../../utils/images/image.png`);
        await expect(primaryItem.locator('img[src="http://example.com/nav-icon.svg"]')).toBeVisible();
        await primaryItem.getByLabel('Label').fill('');
        await primaryItem.getByTestId('navigation-item-visibility').click();
        await expect(page.getByRole('switch', {name: /^Paid members$/})).toHaveCount(0);
        await page.getByRole('switch', {name: /^Public visitors$/}).click();
        await expect(primaryItem.getByTestId('navigation-item-visibility')).toHaveText(/Members only/);

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'navigation', value: '[{"url":"/","label":"","icon":"http://example.com/nav-icon.svg","visibility":"members"},{"url":"/about/","label":"About"}]'}
            ]
        });
    });

    test('Shows paid-members navigation visibility when Stripe is connected', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');
        const primaryNavigationTab = modal.getByRole('tabpanel').first();
        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();

        await primaryItem.getByTestId('navigation-item-visibility').click();

        await expect(page.getByRole('switch', {name: /^Paid members$/})).toHaveCount(1);
    });

    test('Preserves existing paid visibility when Stripe is disconnected', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: updatedSettingsResponse([
                {key: 'navigation', value: '[{"url":"/paid/","label":"Paid","visibility":"paid"}]'}
            ])},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');
        const primaryNavigationTab = modal.getByRole('tabpanel').first();
        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();

        await expect(primaryItem.getByTestId('navigation-item-visibility')).toHaveText(/Paid-members only/);

        await primaryItem.getByLabel('Label').fill('Paid renamed');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'navigation', value: '[{"url":"/paid/","label":"Paid renamed","visibility":"paid"}]'}
            ]
        });
    });

    test('Can disable paid members in navigation visibility', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');
        const primaryNavigationTab = modal.getByRole('tabpanel').first();
        const primaryItem = primaryNavigationTab.getByTestId('navigation-item-editor').first();

        await primaryItem.getByTestId('navigation-item-visibility').click();
        await page.getByRole('switch', {name: /^Paid members$/}).click();

        await expect(primaryItem.getByTestId('navigation-item-visibility')).toHaveText(/Public \+ free/);

        await page.getByRole('switch', {name: /^Public visitors$/}).click();
        await page.getByRole('switch', {name: /^Free members$/}).click();

        await expect(primaryItem.getByTestId('navigation-item-visibility')).toHaveText(/Hidden/);
    });

    test('Hides navigation item visibility when members are disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: updatedSettingsResponse([
                {key: 'members_signup_access', value: 'none'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('navigation');
        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('navigation-modal');
        const primaryNavigationTab = modal.getByRole('tabpanel').first();

        await expect(primaryNavigationTab.getByText('Visibility')).toHaveCount(0);
        await expect(primaryNavigationTab.getByTestId('navigation-item-visibility')).toHaveCount(0);
    });

    test('Adding a new item', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/nav-icon.svg', ref: null}]}}
        }});

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

        await expect(newItem.getByText('You must specify a label or icon')).toHaveCount(1);
        await expect(newItem.getByText('You must specify a valid URL or relative path')).toHaveCount(1);

        await newItem.getByLabel('Label').press('A');
        await expect(newItem.getByText('You must specify a label or icon')).toHaveCount(0);

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

        await newItem.locator('input[type="file"]').setInputFiles(`${__dirname}/../../utils/images/image.png`);
        await expect(newItem.locator('img[src="http://example.com/nav-icon.svg"]')).toBeVisible();
        await newItem.getByLabel('URL').fill('https://example.com/icon-only');

        await newItem.getByTestId('add-button').click();

        await expect(primaryNavigationTab.getByTestId('navigation-item-editor')).toHaveCount(4);
        await expect(primaryNavigationTab.getByTestId('navigation-item-editor').last().locator('img[src="http://example.com/nav-icon.svg"]')).toBeVisible();
        await expect(primaryNavigationTab.getByTestId('navigation-item-editor').last().getByLabel('Label')).toHaveValue('');
        await expect(primaryNavigationTab.getByTestId('navigation-item-editor').last().getByLabel('URL')).toHaveValue('https://example.com/icon-only/');
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
