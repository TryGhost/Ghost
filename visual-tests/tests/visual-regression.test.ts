import {test, expect} from '@playwright/test';

test.describe('Visual regression', () => {
    [
        {
            name: 'Home / Analytics',
            path: '/'
        },
        {
            name: 'Posts',
            path: '/posts'
        }
    ].forEach(({name, path}) => {
        test(name, async ({page}) => {
            await page.goto('/ghost/#' + path, {waitUntil: 'networkidle'});
            await expect(page).toHaveScreenshot({fullPage: true});
        });
    });
});
