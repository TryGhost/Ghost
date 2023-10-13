import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, toggleLabsFlag} from '../../utils/acceptance';

test.describe('Recommendations', async () => {
    test.beforeEach(async () => {
        toggleLabsFlag('recommendations', true);
    });
    test('can add a recommendation', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            // mock the GET url with params
            browseRecommendations: {method: 'GET', path: '/recommendations/?filter=url%3A%7E%27example.com%2Fa-cool-website%27&limit=1', response: responseFixtures.recommendations},
            addRecommendation: {method: 'POST', path: '/recommendations/', response: {recommendations: [
                {excerpt: null,
                    favicon: null,
                    featured_image: null,
                    one_click_subscribe: false,
                    description: 'This is a cool website',
                    title: 'example.com',
                    url: 'https://example.com/a-cool-website'}
            ]}}
        }});
        await page.goto('/');

        const section = await page.getByTestId('recommendations');

        // console.log(section);
        await section.getByRole('button', {name: 'Add recommendation'}).click();

        const modal = page.getByTestId('add-recommendation-modal');
        modal.getByRole('textbox').fill('https://example.com/a-cool-website');
        await modal.getByRole('button', {name: 'Next'}).click();
        modal.getByLabel('SHORT DESCRIPTION').fill('This is a cool website');
        await modal.getByRole('button', {name: 'Add'}).click();
        expect(lastApiRequests.addRecommendation?.body).toEqual({
            recommendations: [
                {excerpt: null,
                    favicon: null,
                    featured_image: null,
                    one_click_subscribe: false,
                    description: 'This is a cool website',
                    title: 'example.com',
                    url: 'https://example.com/a-cool-website'}
            ]
        });
    });

    test('errors when passing an invalid URL', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseRecommendations: {method: 'GET', path: '/recommendations/?filter=url%3A%7E%27example.com%2Fa-cool-website%27&limit=1', response: responseFixtures.recommendations}
        }});
        await page.goto('/');
        const section = await page.getByTestId('recommendations');
        await section.getByRole('button', {name: 'Add recommendation'}).click();
        const modal = page.getByTestId('add-recommendation-modal');
        modal.getByRole('textbox').fill('not a real url');
        await modal.getByRole('button', {name: 'Next'}).click();
        await expect(modal).toContainText('Please enter a valid URL.');
    });
});
