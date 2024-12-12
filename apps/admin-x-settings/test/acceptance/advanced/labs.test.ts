// import {expect, test} from '@playwright/test';
// import {globalDataRequests} from '../../utils/acceptance';
// import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

// test.describe('Labs', async () => {
//     test('Uploading/downloading redirects', async ({page}) => {
//         const {lastApiRequests} = await mockApi({page, requests: {
//             ...globalDataRequests,
//             uploadRedirects: {method: 'POST', path: '/redirects/upload/', response: {}},
//             downloadRedirects: {method: 'GET', path: '/redirects/download/', response: 'redirects'}
//         }});

//         await page.goto('/');

//         const labsSection = page.getByTestId('labs');

//         await labsSection.getByRole('button', {name: 'Open'}).click();
//         await labsSection.getByRole('tab', {name: 'Beta features'}).click();

//         const fileChooserPromise = page.waitForEvent('filechooser');

//         await labsSection.getByText('Upload redirects file').click();

//         const fileChooser = await fileChooserPromise;
//         await fileChooser.setFiles(`${__dirname}/../../utils/files/redirects.yml`);

//         await expect(page.getByTestId('toast-success')).toContainText('Redirects uploaded');

//         expect(lastApiRequests.uploadRedirects).toBeTruthy();

//         await labsSection.getByRole('button', {name: 'Download current redirects'}).click();

//         await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/redirects\/download\//);

//         expect(lastApiRequests.downloadRedirects).toBeTruthy();
//     });

//     test('Uploading/downloading routes', async ({page}) => {
//         const {lastApiRequests} = await mockApi({page, requests: {
//             ...globalDataRequests,
//             uploadRoutes: {method: 'POST', path: '/settings/routes/yaml/', response: {}},
//             downloadRoutes: {method: 'GET', path: '/settings/routes/yaml/', response: 'routes'}
//         }});

//         await page.goto('/');

//         const labsSection = page.getByTestId('labs');

//         await labsSection.getByRole('button', {name: 'Open'}).click();
//         await labsSection.getByRole('tab', {name: 'Beta features'}).click();

//         const fileChooserPromise = page.waitForEvent('filechooser');

//         await labsSection.getByText('Upload routes file').click();

//         const fileChooser = await fileChooserPromise;
//         await fileChooser.setFiles(`${__dirname}/../../utils/files/routes.yml`);

//         await expect(page.getByTestId('toast-success')).toContainText('Routes uploaded');

//         expect(lastApiRequests.uploadRoutes).toBeTruthy();

//         await labsSection.getByRole('button', {name: 'Download current routes'}).click();

//         await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/settings\/routes\/yaml\//);

//         expect(lastApiRequests.downloadRoutes).toBeTruthy();
//     });
// });
