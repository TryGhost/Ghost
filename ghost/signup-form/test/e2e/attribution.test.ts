import {expect} from '@playwright/test';
import {initialize} from '../utils/e2e';
import {test} from '@playwright/test';

async function testHistory({page, path, referrer, urlHistory}: {page: any, path: string, urlHistory: any[]}) {
    const {frame, lastApiRequest} = await initialize({page, title: 'Sign up', path});

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
});

