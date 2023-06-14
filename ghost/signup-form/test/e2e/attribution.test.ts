import {expect} from '@playwright/test';
import {initialize} from '../utils/e2e';
import {test} from '@playwright/test';

async function testHistory({page, embeddedOnUrl, path, urlHistory, localStorageHistory}: {page: any, embeddedOnUrl?: string, path: string, urlHistory: any[], localStorageHistory?: any[]}) {
    const {frame, lastApiRequest} = await initialize({page, title: 'Sign up', embeddedOnUrl, path});

    await page.evaluate((history) => {
        localStorage.setItem('ghost-history', JSON.stringify(history));
    }, localStorageHistory);

    // Fill out the form
    const emailInput = frame.getByTestId('input');
    await emailInput.fill('jamie@example.com');

    // Click the submit button
    const submitButton = frame.getByTestId('button');
    await submitButton.click();

    // Check input and button are gone
    await expect(frame.getByTestId('input')).toHaveCount(0);
    await expect(frame.getByTestId('button')).toHaveCount(0);

    // Showing the success page
    await expect(frame.getByTestId('success-page')).toHaveCount(1);

    // Check the request body
    expect(lastApiRequest.body).not.toBeNull();
    expect(lastApiRequest.body).toHaveProperty('email', 'jamie@example.com');
    expect(lastApiRequest.body).toHaveProperty('urlHistory', urlHistory);
}

test.describe('Attribution', async () => {
    test('Sends the current path', async ({page}) => {
        await testHistory({page,
            path: '/my-custom-path/123',
            urlHistory: [
                {
                    referrerMedium: 'Embed',
                    referrerSource: 'localhost:1234',
                    referrerUrl: 'https://localhost:1234/my-custom-path/123',
                    time: expect.any(Number)
                }
            ]}
        );
    });

    test('removes query string', async ({page}) => {
        await testHistory({page,
            path: '/my-custom-path/123?ref=ghost',
            urlHistory: [
                {
                    referrerMedium: 'Embed',
                    referrerSource: 'localhost:1234',
                    referrerUrl: 'https://localhost:1234/my-custom-path/123',
                    time: expect.any(Number)
                }
            ]}
        );
    });

    test('uses current localStorage history', async ({page}) => {
        // Save history as localstorage item 'ghost-history'
        const history = [
            {path: '/p/573d2c92-183a-435f-b0e7-34595e1ceae7/', time: 1686667443580, referrerSource: null, referrerMedium: null, referrerUrl: 'http://admin.ghost/'},
            {path: '/', time: 1686748392078, referrerSource: null, referrerMedium: null, referrerUrl: null}
        ];

        await testHistory({
            page,
            path: '/my-custom-path/123?ref=ghost',
            urlHistory: history,
            localStorageHistory: history
        });
    });

    test('does not use current localStorage history if on external site', async ({page}) => {
        // Save history as localstorage item 'ghost-history'
        const history = [
            {path: '/p/573d2c92-183a-435f-b0e7-34595e1ceae7/', time: 1686667443580, referrerSource: null, referrerMedium: null, referrerUrl: 'http://admin.ghost/'},
            {path: '/', time: 1686748392078, referrerSource: null, referrerMedium: null, referrerUrl: null}
        ];

        await testHistory({
            page,
            embeddedOnUrl: 'https://example.com',
            path: '/my-custom-path/123?ref=ghost',
            urlHistory: [
                {
                    referrerMedium: 'Embed',
                    referrerSource: 'example.com',
                    referrerUrl: 'https://example.com/my-custom-path/123',
                    time: expect.any(Number)
                }
            ],
            localStorageHistory: history
        });
    });
});

