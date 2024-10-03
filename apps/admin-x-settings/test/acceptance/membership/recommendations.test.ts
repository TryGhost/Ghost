import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Recommendations', async () => {
    test('can view recommendations', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseRecommendations: {method: 'GET', path: '/recommendations/?include=count.clicks%2Ccount.subscribers&order=created_at+desc&limit=5', response: responseFixtures.recommendations}
        }});

        await page.goto('/');

        const section = page.getByTestId('recommendations');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Your Recommendations'}).click();

        const recommendation1 = activeTab.getByTestId('recommendation-list-item').first();
        const recommendation2 = activeTab.getByTestId('recommendation-list-item').last();

        await expect(recommendation1).toContainText('Recommendation 1 title');
        await expect(recommendation2).toContainText('Recommendation 2 title');
    });

    test('can add a recommendation', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            checkRecommendation: {method: 'POST', path: '/recommendations/check/', response: {recommendations: [{url: '', one_click_subscribe: true}], meta: {}}},
            addRecommendation: {method: 'POST', path: '/recommendations/', response: {}}
        }});

        await page.goto('/');

        // Open add recommendation modal
        const section = await page.getByTestId('recommendations');
        await section.getByRole('button', {name: 'Add recommendation'}).click();
        const modal = page.getByTestId('add-recommendation-modal');

        // Screen 1 - URL
        const url = modal.getByLabel('url');

        // Validate errors
        url.fill('not a real url');
        await modal.getByRole('button', {name: 'Next'}).click();
        await expect(modal).toContainText('Enter a valid URL');

        // Validate success
        modal.getByRole('textbox').fill('https://example.com/a-cool-website');
        await modal.getByRole('button', {name: 'Next'}).click();

        // Screen 2 — Title & description
        const title = modal.getByLabel('Title');
        const description = modal.getByLabel('Short description');

        // Validate errors
        await title.fill('');

        await description.fill('This is a long description with more than 200 characters: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl.');
        await expect(modal).toContainText('Max: 200 characters. You’ve used 510');

        // Validate success
        await title.fill('This is a title');
        await description.fill('This is a description');
        await modal.getByRole('button', {name: 'Add'}).click();

        expect(lastApiRequests.addRecommendation?.body).toEqual({
            recommendations: [
                {excerpt: null,
                    favicon: null,
                    featured_image: null,
                    one_click_subscribe: true,
                    description: 'This is a description',
                    title: 'This is a title',
                    url: 'https://example.com/a-cool-website'}
            ]
        });
    });

    test('errors when adding an existing URL', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            checkRecommendation: {method: 'POST', path: '/recommendations/check/', response: {recommendations: [{url: 'https://recommendation1.com', one_click_subscribe: true, id: 'exists'}], meta: {}}}
        }});

        await page.goto('/');
        const section = page.getByTestId('recommendations');

        // Open add recommendation modal
        await section.getByRole('button', {name: 'Add recommendation'}).click();
        const modal = page.getByTestId('add-recommendation-modal');

        // Add existing URL
        modal.getByLabel('url').fill('https://recommendation1.com');
        await modal.getByRole('button', {name: 'Next'}).click();

        await expect(page.getByTestId('toast-error')).toHaveText(/A recommendation with this URL already exists/);
    });

    test('can edit a recommendation', async ({page}) => {
        const recommendationToEdit = responseFixtures.recommendations.recommendations[0];

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseRecommendations: {method: 'GET', path: '/recommendations/?include=count.clicks%2Ccount.subscribers&order=created_at+desc&limit=5', response: responseFixtures.recommendations},
            editRecommendation: {method: 'PUT', path: `/recommendations/${recommendationToEdit.id}/`, response: {}}
        }});

        await page.goto('/');
        const section = await page.getByTestId('recommendations');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');
        await section.getByRole('tab', {name: 'Your Recommendations'}).click();

        // Open edit recommendation on the first recommendation
        const recommendation1 = activeTab.getByTestId('recommendation-list-item').first();
        await recommendation1.click();

        const modal = page.getByTestId('edit-recommendation-modal');
        const title = modal.getByLabel('Title');
        const description = modal.getByLabel('Short description');

        // Validate errors
        await title.fill('');

        await description.fill('This is a long description with more than 200 characters: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl. Donec auctor, nisl eget aliquam aliquet, nisl nunc aliquam nunc, quis aliquam nisl nunc eget nisl.');
        await expect(modal).toContainText('Max: 200 characters. You’ve used 510');

        // Validate success
        await modal.getByLabel('Title').fill('Updated title');
        await modal.getByLabel('Short description').fill('Updated description');
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editRecommendation?.body).toEqual({
            recommendations: [
                {...recommendationToEdit,
                    description: 'Updated description',
                    title: 'Updated title'}
            ]
        });
    });

    test('can delete a recommendation', async ({page}) => {
        const recommendationToDelete = responseFixtures.recommendations.recommendations[0];

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseRecommendations: {method: 'GET', path: '/recommendations/?include=count.clicks%2Ccount.subscribers&order=created_at+desc&limit=5', response: responseFixtures.recommendations},
            deleteRecommendation: {method: 'DELETE', path: `/recommendations/${recommendationToDelete.id}/`, response: {}}
        }});

        await page.goto('/');
        const section = page.getByTestId('recommendations');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');
        await section.getByRole('tab', {name: 'Your Recommendations'}).click();

        // Open edit recommendation on the first recommendation
        const recommendation1 = activeTab.getByTestId('recommendation-list-item').first();
        await recommendation1.click();

        // Click on delete
        const modal = page.getByTestId('edit-recommendation-modal');
        await modal.getByRole('button', {name: 'Delete'}).click();

        // Confirm delete
        const confirmation = page.getByTestId('confirmation-modal');
        expect(confirmation).toContainText('Delete recommendation');
        expect(confirmation).toContainText('Your recommendation Recommendation 1 title will no longer be visible to your audience.');

        await confirmation.getByRole('button', {name: 'Delete'}).click();

        expect(lastApiRequests.deleteRecommendation).toBeTruthy();
    });

    test('can view incoming recommendations', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseIncomingRecommendations: {method: 'GET', path: '/incoming_recommendations/?limit=5&order=created_at+desc', response: responseFixtures.incomingRecommendations}
        }});

        await page.goto('/');

        const section = page.getByTestId('recommendations');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Recommending you'}).click();

        const recommendation1 = activeTab.getByTestId('incoming-recommendation-list-item').first();
        const recommendation2 = activeTab.getByTestId('incoming-recommendation-list-item').last();

        // Can recommend back
        await expect(recommendation1).toContainText('Incoming recommendation 1 title');
        await expect(recommendation1).toContainText('Recommend back');

        // Already recommending back
        await expect(recommendation2).toContainText('Incoming recommendation 2 title');
        await expect(recommendation2).toContainText('Recommending');
    });
});
