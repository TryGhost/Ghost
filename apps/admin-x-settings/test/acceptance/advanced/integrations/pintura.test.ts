import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Pintura integration', async () => {
    test('Can toggle Pintura', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'pintura', value: false}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const pinturaElement = section.getByText('Pintura').last();
        await pinturaElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const pinturaModal = page.getByTestId('pintura-modal');
        const pinturaToggle = pinturaModal.getByRole('switch');
        await pinturaToggle.click();
        // Upload Pintura script text should be visible
        await expect(pinturaModal.getByText('Upload Pintura script')).toBeVisible();
        await expect(pinturaModal.getByText('Upload Pintura styles')).toBeVisible();
        await pinturaToggle.click();
        await expect(pinturaModal.getByText('Upload Pintura script')).not.toBeVisible();
        await expect(pinturaModal.getByText('Upload Pintura styles')).not.toBeVisible();

        // we want it true, so click again
        await pinturaToggle.click();

        await page.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'pintura', value: true}
            ]
        });
    });

    test('Can upload Pintura script', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadFile: {method: 'POST', path: '/files/upload/', response: {files: [{url: 'http://example.com/pintura-umd.js', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'pintura_js_url', value: 'http://example.com/pintura-umd.js'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('integrations');
        const pinturaElement = section.getByText('Pintura').last();
        await pinturaElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const pinturaModal = page.getByTestId('pintura-modal');
        const pinturaToggle = pinturaModal.getByRole('switch');
        await pinturaToggle.click();
        const jsFileChooserPromise = page.waitForEvent('filechooser');

        const jsUploadButton = pinturaModal.getByRole('button', {name: 'Upload'}).first();
        await jsUploadButton.click();
        const jsFileChooser = await jsFileChooserPromise;
        await jsFileChooser.setFiles(`${__dirname}/../../../utils/files/pintura-umd.js`);

        await expect(jsUploadButton).toBeEnabled();
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'pintura_js_url', value: 'http://example.com/pintura-umd.js'}
            ]
        });
    });

    test('Can upload Pintura styles', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadFile: {method: 'POST', path: '/files/upload/', response: {files: [{url: 'http://example.com/pintura.css', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'pintura_css_url', value: 'http://example.com/pintura.css'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('integrations');
        const pinturaElement = section.getByText('Pintura').last();
        await pinturaElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const pinturaModal = page.getByTestId('pintura-modal');
        const pinturaToggle = pinturaModal.getByRole('switch');
        await pinturaToggle.click();
        const cssFileChooserPromise = page.waitForEvent('filechooser');

        const cssUploadButton = pinturaModal.getByRole('button', {name: 'Upload'}).last();
        await cssUploadButton.click();
        const cssFileChooser = await cssFileChooserPromise;
        await cssFileChooser.setFiles(`${__dirname}/../../../utils/files/pintura.css`);
        await expect(cssUploadButton).toBeEnabled();
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'pintura_css_url', value: 'http://example.com/pintura.css'}
            ]
        });
    });
});
