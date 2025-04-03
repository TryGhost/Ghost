import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Title and description settings', async () => {
    test('Supports editing the title and description', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: /^\/settings\/$/, response: updatedSettingsResponse([
                {key: 'title', value: 'New Site Title'},
                {key: 'description', value: 'New Site Description'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('title-and-description');

        await expect(section.getByText('Test Site')).toHaveCount(1);
        await expect(section.getByText('Thoughts, stories and ideas.')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Site title').fill('New Site Title');
        await section.getByLabel('Site description').fill('New Site Description');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Site title')).toHaveCount(0);

        await expect(section.getByText('New Site Title')).toHaveCount(1);
        await expect(section.getByText('New Site Description')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'title', value: 'New Site Title'},
                {key: 'description', value: 'New Site Description'}
            ]
        });
    });

    test('Shows an error if the title is invalid and does not save', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: /^\/settings\/$/, response: updatedSettingsResponse([
                {key: 'title', value: 'New Site Title'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('title-and-description');
        await expect(section.getByText('Test Site')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        // Empty title
        await section.getByLabel('Site title').fill('');
        await section.getByRole('button', {name: 'Save'}).click();
        await expect(section.getByText('Please enter a site title.')).toHaveCount(1);

        // Title is too short
        await section.getByLabel('Site title').fill('ab');
        await section.getByRole('button', {name: 'Save'}).click();
        await expect(section.getByText('Please use a site title longer than 3 characters.')).toHaveCount(1);

        // Title has invalid characters
        await section.getByLabel('Site title').fill('Title with emoji: 🕵️‍♂️');
        await section.getByRole('button', {name: 'Save'}).click();
        await expect(section.getByText('Please use a site title without special characters.')).toHaveCount(1);

        expect(lastApiRequests.editSettings).toBeUndefined();
    });
});
