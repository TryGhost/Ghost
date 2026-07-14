import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const configWithCustomFields = {
    ...responseFixtures.config,
    config: {
        ...responseFixtures.config.config,
        labs: {
            ...responseFixtures.config.config.labs,
            membersCustomFields: true
        }
    }
};

const companyField = {
    key: 'company',
    name: 'Company',
    type: 'short_text',
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: null
};

const customFieldsRequests = {
    ...globalDataRequests,
    browseConfig: {...globalDataRequests.browseConfig, response: configWithCustomFields},
    browseMemberCustomFields: {method: 'GET', path: '/members/custom_fields/', response: {members_custom_fields: [companyField]}}
};

test.describe('Custom fields', async () => {
    test('is hidden when the flag is off', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});

        await page.goto('/');

        await expect(page.getByTestId('gift-subscriptions')).toBeVisible();
        await expect(page.getByTestId('custom-fields')).toHaveCount(0);
    });

    test('lists fields when the flag is on', async ({page}) => {
        await mockApi({page, requests: customFieldsRequests});

        await page.goto('/');

        const section = page.getByTestId('custom-fields');
        await expect(section).toBeVisible();

        const row = section.getByTestId('custom-field-list-item');
        await expect(row).toHaveCount(1);
        await expect(row).toContainText('Company');
        await expect(row).toContainText('Short text');
        await expect(row).toContainText('Aa');
    });

    test('creates a field with just a name and type', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {members_custom_fields: [{...companyField, key: 'job-title', name: 'Job Title'}]}}
        }});

        await page.goto('/');

        const section = page.getByTestId('custom-fields');
        await section.getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        await expect(modal).toContainText('New custom field');

        // Validation: empty name
        await modal.getByRole('button', {name: 'Save'}).click();
        await expect(modal).toContainText('Enter a name for the field');

        await modal.getByLabel('Name').fill('Job Title');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveCount(0);
        // No key: the backend derives it from the name.
        expect(lastApiRequests.addMemberCustomField?.body).toEqual({
            members_custom_fields: [{name: 'Job Title', type: 'short_text'}]
        });
    });

    test('creates a field of a chosen type', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {members_custom_fields: [{...companyField, key: 'bio', name: 'Bio', type: 'long_text'}]}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-fields').getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByLabel('Name').fill('Bio');
        await modal.getByTestId('custom-field-type').click();
        await page.getByRole('option', {name: 'Long text'}).click();
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveCount(0);
        expect(lastApiRequests.addMemberCustomField?.body).toEqual({
            members_custom_fields: [{name: 'Bio', type: 'long_text'}]
        });
    });

    test('surfaces the API duplicate-name error on the name field', async ({page}) => {
        // Uniqueness is enforced by the API, not the FE, so the request is sent
        // and its 422 highlights the name field.
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {
                method: 'POST',
                path: '/members/custom_fields/',
                responseStatus: 422,
                responseHeaders: {'content-type': 'application/json'},
                response: {
                    errors: [{
                        type: 'ValidationError',
                        // Ghost's error handler rewrites `message` to a generic
                        // summary and moves the real text into `context`.
                        message: 'Validation error, cannot save members_custom_field.',
                        context: 'A custom field with this name already exists.',
                        property: 'name'
                    }]
                }
            }
        }});

        await page.goto('/');

        await page.getByTestId('custom-fields').getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByLabel('Name').fill('Company');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toContainText('A custom field with this name already exists.');
        // The generic envelope summary must not leak onto the field.
        await expect(modal).not.toContainText('cannot save');
        expect(lastApiRequests.addMemberCustomField).toBeDefined();
    });

    test('renames a field', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            editMemberCustomField: {method: 'PUT', path: '/members/custom_fields/company/', response: {members_custom_fields: [{...companyField, name: 'Employer'}]}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-field-list-item').click();

        const modal = page.getByTestId('custom-field-modal');
        await expect(modal).toContainText('Edit custom field');
        await expect(modal).toContainText('Type can’t be changed after creation');

        await modal.getByLabel('Name').fill('Employer');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveCount(0);
        expect(lastApiRequests.editMemberCustomField?.body).toEqual({
            members_custom_fields: [{name: 'Employer'}]
        });
    });

    test('archives a field after confirmation', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            deleteMemberCustomField: {method: 'DELETE', path: '/members/custom_fields/company/', response: {}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-field-list-item').click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByRole('button', {name: 'Archive'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await expect(confirmation).toContainText('Its key stays reserved so it can’t be reused');
        await confirmation.getByRole('button', {name: 'Archive'}).click();

        expect(lastApiRequests.deleteMemberCustomField).toBeTruthy();
    });
});
