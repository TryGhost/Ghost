import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Access settings', async () => {
    test('Supports editing access', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'default_content_visibility', value: 'members'},
                    {key: 'members_signup_access', value: 'invite'},
                    {key: 'comments_enabled', value: 'all'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        await expect(section.getByText('Anyone can sign up')).toHaveCount(1);
        await expect(section.getByText('Public')).toHaveCount(1);
        await expect(section.getByText('Nobody')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Subscription access').selectOption({label: 'Only people I invite'});
        await section.getByLabel('Default post access').selectOption({label: 'Members only'});
        await section.getByLabel('Commenting').selectOption({label: 'All members'});

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Subscription access')).toHaveCount(0);

        await expect(section.getByText('Only people I invite')).toHaveCount(1);
        await expect(section.getByText('Members only')).toHaveCount(1);
        await expect(section.getByText('All members')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'default_content_visibility', value: 'members'},
                {key: 'members_signup_access', value: 'invite'},
                {key: 'comments_enabled', value: 'all'}
            ]
        });
    });

    test('Supports selecting specific tiers', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'default_content_visibility', value: 'tiers'},
                    {key: 'default_content_visibility_tiers', value: JSON.stringify(responseFixtures.tiers.tiers.map(tier => tier.id))}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Default post access').selectOption({label: 'Specific tiers'});
        await section.getByLabel('Select tiers').click();

        await section.locator('[data-testid="multiselect-option"]', {hasText: 'Basic Supporter'}).click();
        await section.locator('[data-testid="multiselect-option"]', {hasText: 'Ultimate Starlight Diamond Tier'}).click();

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByText('Specific tiers')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'default_content_visibility', value: 'tiers'},
                {key: 'default_content_visibility_tiers', value: JSON.stringify(responseFixtures.tiers.tiers.slice(1).map(tier => tier.id))}
            ]
        });
    });
});
