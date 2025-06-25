import {test} from '@playwright/test';
import {HomePage} from '../../src/pages/HomePage';

test.describe('Ghost Homepage', () => {
    test('homepage loads correctly', async ({page}) => {
        const homePage = new HomePage(page);
        
        await homePage.goto();
        await homePage.expectToBeLoaded();
    });
});
