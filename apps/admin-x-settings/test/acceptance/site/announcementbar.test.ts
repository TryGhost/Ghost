import {ElementHandle, expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, mockSitePreview, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Announcement Bar', async () => {
    test('Working with the announcement bar preview', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });
        await mockSitePreview({
            page,
            url: responseFixtures.latestPost.posts[0].url,
            response: '<html><head><style></style></head><body><div>post preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('announcement-bar');

        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="announcement-bar-preview-iframe"]');

        const checkTextInIframes = async (iframesHandles: ElementHandle[], textToSearch: string) => {
            let textExists = false;
            for (const iframeHandle of iframesHandles) {
                const frame = await iframeHandle.contentFrame();
                const textFound = await frame?.$eval('body', (body, text) => {
                    return body.innerText.includes(text);
                }, textToSearch);
                if (textFound) {
                    textExists = true;
                    break;
                }
            }
            return textExists;
        };

        const iframesHandleHome = await page.$$('[data-testid="announcement-bar-preview-iframe"] > iframe');
        const textExistsInHomeIframes = await checkTextInIframes(iframesHandleHome, 'homepage preview');
        expect(textExistsInHomeIframes).toBeTruthy();

        const modal = page.getByTestId('announcement-bar-modal');
        await modal.getByTestId('design-toolbar').getByRole('tab', {name: 'Post'}).click();

        await page.waitForSelector('[data-testid="announcement-bar-preview-iframe"]');

        const iframesHandlePost = await page.$$('[data-testid="announcement-bar-preview-iframe"] > iframe');
        const textExistsInPostIframes = await checkTextInIframes(iframesHandlePost, 'post preview');
        expect(textExistsInPostIframes).toBeTruthy();
    });

    // TODO - lexical isn't loading in the preview
    // test('Editing announcement bar text content', async ({page}) => {
    //     await mockApi({page, requests: {
    //         ...globalDataRequests,
    //         editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
    //     }});

    //     await mockSitePreview({
    //         page,
    //         url: responseFixtures.site.site.url,
    //         response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
    //     });

    //     await page.goto('/');

    //     const section = page.getByTestId('announcement-bar');

    //     await section.getByRole('button', {name: 'Customize'}).click();

    //     const modal = page.getByTestId('announcement-bar-modal');

    //     await expect(modal.frameLocator('[data-testid="announcement-bar-preview"]').getByText('homepage preview')).toHaveCount(1);
    // });

    test('Can toggle colours', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        // find label background color

        await page.goto('/');

        const section = page.getByTestId('announcement-bar');

        await section.getByRole('button', {name: 'Customize'}).click();

        const labelElement = page.locator('label:text("Background color")');

        await expect(labelElement).toHaveCount(1);

        const modal = page.getByTestId('announcement-bar-modal');

        // Check the titles of the buttons.
        // Get the parent div of the label
        const parentDiv = labelElement.locator('..');

        // Then get the div that follows the label within the parent div
        const buttonContainer = parentDiv.locator('div');

        const darkButton = buttonContainer.locator('button[title="Dark"]');
        const lightButton = buttonContainer.locator('button[title="Light"]');
        const accentButton = buttonContainer.locator('button[title="Accent"]');

        await expect(darkButton).toHaveCount(1);
        await expect(lightButton).toHaveCount(1);
        await expect(accentButton).toHaveCount(1);

        await lightButton?.click();

        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'announcement_background', value: 'light'}
            ]
        });
    });

    test('Can toggle visibility', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        // find label background color

        await page.goto('/');

        const section = page.getByTestId('announcement-bar');

        await section.getByRole('button', {name: 'Customize'}).click();

        const labelElement = page.locator('h6:text("Visibility")');

        await expect(labelElement).toHaveCount(1);

        const modal = page.getByTestId('announcement-bar-modal');

        // get checkbox input with value of free_members

        const checkbox = await page.$('button[value="free_members"]');

        expect(checkbox).not.toBeNull();

        await checkbox?.check();

        await modal.getByRole('button', {name: 'Save'}).click();

        // Note - the value is a stringified array
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'announcement_visibility', value: '["free_members"]'}
            ]
        });
    });
});
