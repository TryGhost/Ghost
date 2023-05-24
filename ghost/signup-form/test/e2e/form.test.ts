import {expect} from '@playwright/test';
import {initialize} from '../utils/e2e';
import {test} from '@playwright/test';

test.describe('Form', async () => {
    test('Displays the title', async ({page}) => {
        const frame = await initialize({page, title: 'Sign up to get the latest news and updates.'});

        // Check the Frame
        const h1 = frame.getByRole('heading');
        expect(await h1.innerText()).toBe('Sign up to get the latest news and updates.');
    });

    test('Displays the description', async ({page}) => {
        const frame = await initialize({page, title: 'Title', description: 'Sign up to get the latest news and updates.'});

        // Check the Frame
        const p = frame.getByRole('paragraph');
        expect(await p.innerText()).toBe('Sign up to get the latest news and updates.');
    });

    test('Uses the accent color', async ({page}) => {
        // Need rgb notation here, because getComputedStyle returns rgb notation
        const color = 'rgb(255, 123, 0)';
        const frame = await initialize({page, color});
        const submitButton = frame.getByRole('button');

        // Check calculated background color of the button
        const backgroundColor = await submitButton.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
        });
        expect(backgroundColor).toBe(color);
    });

    test('Has a minimal style when title is missing', async ({page}) => {
        let frame = await initialize({page});

        // Check no title or description present
        await expect(frame.getByRole('heading')).toHaveCount(0);
        await expect(frame.getByRole('paragraph')).toHaveCount(0);

        frame = await initialize({page, description: 'Ignored'});

        // Check no title or description present
        await expect(frame.getByRole('heading')).toHaveCount(0);
        await expect(frame.getByRole('paragraph')).toHaveCount(0);
    });
});

