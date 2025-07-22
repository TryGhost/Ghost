import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Ghost Explore', () => {
    test('can join Ghost Explore', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'explore_ping', value: false},
                        {key: 'explore_ping_growth', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'explore_ping', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('explore');
        await expect(section).toBeVisible();

        // Main toggle should be off
        const mainToggle = section.getByTestId('explore-toggle');
        await expect(mainToggle).not.toBeChecked();

        // Enable Ghost Explore
        await mainToggle.click();

        // Verify the API call to enable explore_ping
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{key: 'explore_ping', value: true}]
        });
    });

    test('can choose to share growth data', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'explore_ping', value: true},
                        {key: 'explore_ping_growth', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'explore_ping_growth', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('explore');
        await expect(section).toBeVisible();

        // Main toggle should be on
        const mainToggle = section.getByTestId('explore-toggle');
        await expect(mainToggle).toBeChecked();

        // Preview should be visible
        const preview = section.getByTestId('explore-preview');
        await expect(preview).toBeVisible();
        await expect(preview.getByText('Preview')).toBeVisible();
        await expect(preview.getByText('Test Site')).toBeVisible();
        await expect(preview.getByText('Thoughts, stories and ideas')).toBeVisible();
        await expect(preview.getByText('test.com')).toBeVisible();

        // Growth data toggle should be visible and off
        const growthDataToggle = section.getByTestId('explore-growth-toggle');
        await expect(growthDataToggle).toBeVisible();
        await expect(growthDataToggle).not.toBeChecked();

        // Turn on growth data sharing
        await growthDataToggle.click();

        // Verify the API call to disable explore_ping_growth
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{key: 'explore_ping_growth', value: true}]
        });
    });

    test('can send a testimonial', async ({page}) => {
        const testimonialApiUrl = 'https://mocked.com/api/testimonials';

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    ...responseFixtures.config,
                    config: {
                        ...responseFixtures.config.config,
                        exploreTestimonialsUrl: testimonialApiUrl
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'explore_ping', value: true},
                        {key: 'explore_ping_growth', value: true}
                    ]
                }
            },
            browseSite: {
                ...globalDataRequests.browseSite,
                response: {
                    ...responseFixtures.site,
                    site: {
                        ...responseFixtures.site.site,
                        site_uuid: '9a604cf9-4c27-4a05-9991-be9974a764c5'
                    }
                }
            }
        }});

        // Mock the external testimonials API endpoint
        let testimonialRequestBody = null;
        await page.route(testimonialApiUrl, async (route) => {
            if (route.request().method() === 'POST') {
                testimonialRequestBody = JSON.parse(route.request().postData() || '{}');
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({status: 'success'})
                });
            }
        });

        await page.goto('/');

        const section = page.getByTestId('explore');
        await expect(section).toBeVisible();

        // Click on the testimonials link/button to open the modal
        await section.getByText('Send a testimonial').click();

        // Wait for modal to open
        const modal = page.getByTestId('explore-testimonials-modal');
        await expect(modal).toBeVisible();
        await expect(modal.getByText('Send a testimonial')).toBeVisible();

        // Try to submit with empty content
        const submitButton = modal.getByRole('button', {name: 'Send testimonial'});
        await submitButton.click();

        // Verify validation error appears
        await expect(modal.getByText('This field is required')).toBeVisible();

        // Fill in the testimonial content
        const contentTextarea = modal.getByPlaceholder('Share your love for Ghost');
        await contentTextarea.fill('I love Ghost!');

        // Select a platform from the dropdown
        const platformSelect = modal.getByTestId('migrated-from');
        await platformSelect.click();
        await page.getByRole('option', {name: 'Wordpress'}).click();

        // Submit the form
        await submitButton.click();

        // Wait for success toast
        await expect(page.getByText('Thank you for your testimonial!')).toBeVisible();

        // Verify the API request was made with correct payload
        expect(testimonialRequestBody).toEqual({
            ghost_uuid: '9a604cf9-4c27-4a05-9991-be9974a764c5',
            staff_user_email: 'owner@test.com',
            content: 'I love Ghost!',
            prev_platform: 'wordpress'
        });
    });
});
