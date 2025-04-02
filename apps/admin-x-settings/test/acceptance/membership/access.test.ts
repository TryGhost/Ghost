import {chooseOptionInSelect, getOptionsFromSelect, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';

test.describe('Access settings', async () => {
    test('Supports editing access', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'default_content_visibility', value: 'members'},
                {key: 'members_signup_access', value: 'invite'},
                {key: 'comments_enabled', value: 'all'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        // Check current selected values
        await expect(section.getByText('Anyone can sign up')).toHaveCount(1);
        await expect(section.getByText('Public')).toHaveCount(1);
        await expect(section.getByText('Nobody')).toHaveCount(1);

        const subscriptionAccessSelect = section.getByTestId('subscription-access-select');
        const defaultPostAccessSelect = section.getByTestId('default-post-access-select');
        const commentingSelect = section.getByTestId('commenting-select');

        // Check available options
        await expect(getOptionsFromSelect(subscriptionAccessSelect)).resolves.toEqual(['Anyone can sign up', 'Paid-members only', 'Invite-only', 'Nobody']);
        await expect(getOptionsFromSelect(defaultPostAccessSelect)).resolves.toEqual(['Public', 'Members only', 'Paid-members only', 'Specific tiers']);
        await expect(getOptionsFromSelect(commentingSelect)).resolves.toEqual(['All members', 'Paid-members only', 'Nobody']);

        // Edit access settings to new values
        await chooseOptionInSelect(subscriptionAccessSelect, 'Invite-only');
        await chooseOptionInSelect(defaultPostAccessSelect, /^Members only$/);
        await chooseOptionInSelect(commentingSelect, 'All members');

        await section.getByRole('button', {name: 'Save'}).click();

        // Check that the new values are now displayed
        await expect(section.getByText('Invite-only')).toHaveCount(1);
        await expect(section.getByText('Members only')).toHaveCount(1);
        await expect(section.getByText('All members')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'default_content_visibility', value: 'members'},
                {key: 'members_signup_access', value: 'invite'},
                {key: 'comments_enabled', value: 'all'}
            ]
        });
    });

    test('Disables other sections when signup is disabled', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'members_signup_access', value: 'none'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        await chooseOptionInSelect(section.getByTestId('subscription-access-select'), 'Nobody');

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'members_signup_access', value: 'none'}
            ]
        });

        await expect(section.getByTestId('subscription-access-select')).toContainText('Nobody');

        await expect(page.getByTestId('portal').getByRole('button', {name: 'Customize'})).toBeDisabled();
        await expect(page.getByTestId('enable-newsletters')).toContainText('only existing members will receive newsletters');
    });

    test('Supports selecting specific tiers', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'default_content_visibility', value: 'tiers'},
                {key: 'default_content_visibility_tiers', value: JSON.stringify(responseFixtures.tiers.tiers.map(tier => tier.id))}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        await chooseOptionInSelect(section.getByTestId('default-post-access-select'), 'Specific tiers');
        await section.getByTestId('tiers-select').click();

        await section.locator('[data-testid="select-option"]', {hasText: 'Basic Supporter'}).click();
        await section.locator('[data-testid="select-option"]', {hasText: 'Ultimate Starlight Diamond Tier'}).click();

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByTestId('default-post-access-select')).toContainText('Specific tiers');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'default_content_visibility', value: 'tiers'},
                {key: 'default_content_visibility_tiers', value: JSON.stringify(responseFixtures.tiers.tiers.slice(1).map(tier => tier.id))}
            ]
        });
    });
});
