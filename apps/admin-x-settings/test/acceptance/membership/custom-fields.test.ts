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
    id: 'field-1',
    key: 'company',
    name: 'Company',
    type: 'text',
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: null
};

const customFieldsRequests = {
    ...globalDataRequests,
    browseConfig: {...globalDataRequests.browseConfig, response: configWithCustomFields},
    browseMemberCustomFields: {method: 'GET', path: '/members/custom_fields/', response: {member_custom_fields: [companyField]}}
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

    test('creates a field, deriving the key from the name', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {member_custom_fields: [{...companyField, id: 'field-2', key: 'job_title', name: 'Job Title'}]}}
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
        expect(lastApiRequests.addMemberCustomField?.body).toEqual({
            member_custom_fields: [{key: 'job_title', name: 'Job Title', type: 'text'}]
        });
    });

    test('rejects a duplicate name without calling the API', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {member_custom_fields: [companyField]}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-fields').getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByLabel('Name').fill('company');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toContainText('A field with this name already exists');
        expect(lastApiRequests.addMemberCustomField).toBeUndefined();
    });

    test('suffixes the derived key when it collides with an existing one', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {member_custom_fields: [{...companyField, id: 'field-2', key: 'company_2', name: 'Company!'}]}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-fields').getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        // Different name to the existing "Company" field, but derives the same key
        await modal.getByLabel('Name').fill('Company!');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveCount(0);
        expect(lastApiRequests.addMemberCustomField?.body).toEqual({
            member_custom_fields: [{key: 'company_2', name: 'Company!', type: 'text'}]
        });
    });

    test('surfaces a key race rejected by the API on the name field', async ({page}) => {
        await mockApi({page, requests: {
            ...customFieldsRequests,
            addMemberCustomField: {method: 'POST', path: '/members/custom_fields/', response: {
                errors: [{
                    message: 'Validation error, cannot save member_custom_field.',
                    context: 'A custom field with this key already exists.',
                    type: 'ValidationError',
                    property: 'key'
                }]
            }, responseStatus: 422, responseHeaders: {'content-type': 'application/json'}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-fields').getByRole('button', {name: 'Add custom field'}).click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByLabel('Name').fill('Fresh Name');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toContainText('A field with a conflicting key already exists');
        await expect(modal).toBeVisible();
    });

    test('renames a field', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            editMemberCustomField: {method: 'PUT', path: '/members/custom_fields/field-1/', response: {member_custom_fields: [{...companyField, name: 'Employer'}]}}
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
            member_custom_fields: [{name: 'Employer'}]
        });
    });

    test('deletes a field after confirmation', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...customFieldsRequests,
            deleteMemberCustomField: {method: 'DELETE', path: '/members/custom_fields/field-1/', response: {}}
        }});

        await page.goto('/');

        await page.getByTestId('custom-field-list-item').click();

        const modal = page.getByTestId('custom-field-modal');
        await modal.getByRole('button', {name: 'Delete'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await expect(confirmation).toContainText('permanently removes the field and every value stored for it across all members');
        await confirmation.getByRole('button', {name: 'Delete'}).click();

        expect(lastApiRequests.deleteMemberCustomField).toBeTruthy();
    });
});
