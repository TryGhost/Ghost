import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';

const __dirname = import.meta.dirname;

// CodeMirror takes some time to load in Playwright meaning the first few characters typed don't always
// show up in the input. Since that lag is not consistent, this workaround ensures we type enough
// characters to consistently include the full string we want
const PADDING = 'xxxxx ';

test.describe('Labs', async () => {
    test.skip('Uploading/downloading redirects', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadRedirects: {method: 'POST', path: '/redirects/upload/', response: {}},
            downloadRedirects: {method: 'GET', path: '/redirects/download/', response: 'redirects'}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await labsSection.getByText('Upload redirects file').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/files/redirects.yml`);

        await expect(page.getByTestId('toast-success')).toContainText('Redirects uploaded');

        expect(lastApiRequests.uploadRedirects).toBeTruthy();

        await labsSection.getByRole('button', {name: 'Download current redirects'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/redirects\/download\//);

        expect(lastApiRequests.downloadRedirects).toBeTruthy();
    });

    test.skip('Uploading/downloading routes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadRoutes: {method: 'POST', path: '/settings/routes/yaml/', response: {}},
            downloadRoutes: {method: 'GET', path: '/settings/routes/yaml/', response: 'routes'}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await labsSection.getByText('Upload routes file').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/files/routes.yml`);

        await expect(page.getByTestId('toast-success')).toContainText('Routes uploaded');

        expect(lastApiRequests.uploadRoutes).toBeTruthy();

        await labsSection.getByRole('button', {name: 'Download current routes'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/settings\/routes\/yaml\//);

        expect(lastApiRequests.downloadRoutes).toBeTruthy();
    });

    test('Editing redirects inline', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            downloadRedirects: {method: 'GET', path: '/redirects/download/', response: '301:\n  /old/: /new/\n'},
            uploadRedirects: {method: 'POST', path: '/redirects/upload/', response: {}}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        await labsSection.getByTestId('redirects').getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('modal-redirects-editor');
        await expect(modal.getByRole('heading', {name: 'Redirects'})).toBeVisible();

        const editor = modal.getByTestId('yaml-editor').locator('.cm-content');
        await editor.click();
        await editor.press('End');

        for (const character of (PADDING + 'testredirect').split('')) {
            await page.keyboard.press(character);
        }

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect.poll(() => lastApiRequests.uploadRedirects).toBeTruthy();
        expect(lastApiRequests.uploadRedirects?.body).toContain('testredirect');

        await expect(page.getByTestId('toast-success')).toContainText('Redirects updated');
        await expect(modal).toBeHidden();
    });

    test('Editing routes inline', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            downloadRoutes: {method: 'GET', path: '/settings/routes/yaml/', response: 'routes:\n  /about/: about\n'},
            uploadRoutes: {method: 'POST', path: '/settings/routes/yaml/', response: {}}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        await labsSection.getByTestId('routes').getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('modal-routes-editor');
        await expect(modal.getByRole('heading', {name: 'Routes'})).toBeVisible();

        const editor = modal.getByTestId('yaml-editor').locator('.cm-content');
        await editor.click();
        await editor.press('End');

        for (const character of (PADDING + 'testroute').split('')) {
            await page.keyboard.press(character);
        }

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect.poll(() => lastApiRequests.uploadRoutes).toBeTruthy();
        expect(lastApiRequests.uploadRoutes?.body).toContain('testroute');

        await expect(page.getByTestId('toast-success')).toContainText('Routes updated');
        await expect(modal).toBeHidden();
    });

    test('Shows a validation error and keeps the editor open when saving invalid redirects', async ({page}) => {
        const errorMessage = 'Could not parse YAML: end of the stream or a document separator is expected.';

        await mockApi({page, requests: {
            ...globalDataRequests,
            downloadRedirects: {method: 'GET', path: '/redirects/download/', response: '301:\n  /old/: /new/\n'},
            uploadRedirects: {
                method: 'POST',
                path: '/redirects/upload/',
                responseStatus: 400,
                responseHeaders: {'content-type': 'application/json'},
                response: {errors: [{type: 'BadRequestError', message: errorMessage}]}
            }
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        await labsSection.getByTestId('redirects').getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('modal-redirects-editor');
        const editor = modal.getByTestId('yaml-editor').locator('.cm-content');
        await editor.click();

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal.getByTestId('yaml-editor-error')).toContainText(errorMessage);
        await expect(modal).toBeVisible();
        await expect(page.getByTestId('toast-success')).toBeHidden();
    });
});
