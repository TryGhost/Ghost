import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = Math.round(l > 0.5 ? d / (2 - max - min) : d / (max + min) * 10) / 10;

        switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [h, s, l];
}

test.describe('Options', async () => {
    test('Shows the title and count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: true
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');
        await expect(frame.getByTestId('count')).toHaveText('2 comments');
    });

    test('Shows the title and singular count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(1);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: true
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');
        await expect(frame.getByTestId('count')).toHaveText('1 comment');
    });

    test('Shows the title but hides the count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: false
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');

        // Check count is hidden
        await expect(frame.getByTestId('count')).not.toBeVisible();
    });

    test('Hides title and count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('title')).not.toBeVisible();
        await expect(frame.getByTestId('count')).not.toBeVisible();
    });

    test.describe('Avatar saturation', () => {
        test('Defaults to avatarSaturation of 50', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const avatars = await frame.getByTestId('avatar-background').first();

            // Get computed background color
            const color = await avatars.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            // Convert rgb to hsl
            const [r, g, b] = color.match(/\d+/g);
            const [,saturation] = rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
            expect(saturation).toBe(0.5);
        });

        test('Defaults to avatarSaturation of 50 when invalid number', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                avatarSaturation: 'invalid'
            });

            const avatars = await frame.getByTestId('avatar-background').first();

            // Get computed background color
            const color = await avatars.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            // Convert rgb to hsl
            const [r, g, b] = color.match(/\d+/g);
            const [,saturation] = rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
            expect(saturation).toBe(0.5);
        });

        test('Saturation of 70%', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                avatarSaturation: '70'
            });

            const avatars = await frame.getByTestId('avatar-background').first();

            // Get computed background color
            const color = await avatars.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            // Convert rgb to hsl
            const [r, g, b] = color.match(/\d+/g);
            const [,saturation] = rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
            expect(saturation).toBe(0.7);
        });

        test('Uses zero avatarSaturation', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                avatarSaturation: '0'
            });

            const avatars = await frame.getByTestId('avatar-background').first();

            // Get computed background color
            const color = await avatars.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            // Convert rgb to hsl
            const [r, g, b] = color.match(/\d+/g);
            const [,saturation] = rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
            expect(saturation).toBe(0);
        });

        test('Uses 100 avatarSaturation', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                avatarSaturation: '100'
            });

            const avatars = await frame.getByTestId('avatar-background').first();

            // Get computed background color
            const color = await avatars.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            // Get saturation of color = rgb(x, y, z)
            const [r, g, b] = color.match(/\d+/g);
            const [,saturation] = rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
            expect(saturation).toBe(1);
        });
    });

    test.describe('Accent color', () => {
        test('Uses default accent color', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const signupButton = await frame.getByTestId('signup-button');

            // Get computed background color
            const color = await signupButton.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            expect(color).toBe('rgb(0, 0, 0)');

            const signinButton = await frame.getByTestId('signin-button');

            // Get computed text color
            const textColor = await signinButton.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(textColor).toBe('rgb(0, 0, 0)');
        });

        test('Uses accentColor option', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                accentColor: 'rgb(255, 211, 100)'
            });

            const signupButton = await frame.getByTestId('signup-button');

            // Get computed background color
            const color = await signupButton.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('background-color');
            });
            expect(color).toBe('rgb(255, 211, 100)');

            const signinButton = await frame.getByTestId('signin-button');

            // Get computed text color
            const textColor = await signinButton.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(textColor).toBe('rgb(255, 211, 100)');
        });
    });

    test.describe('colorScheme', () => {
        test('Uses white text in dark mode', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                colorScheme: 'dark'
            });

            const title = await frame.locator('[data-testid="cta-box"] h1');
            const titleColor = await title.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(titleColor).toBe('rgba(255, 255, 255, 0.85)');
        });

        test('Uses light mode by default', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const title = await frame.locator('[data-testid="cta-box"] h1');
            const titleColor = await title.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(titleColor).toBe('rgb(0, 0, 0)');
        });

        test('Switches to dark mode when text color of parent is light', async ({page}) => {
            // When the text color of the page is light, it should switch to dark mode automatically

            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                bodyStyle: 'color: #fff;'
            });

            const title = await frame.locator('[data-testid="cta-box"] h1');
            const titleColor = await title.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(titleColor).toBe('rgba(255, 255, 255, 0.85)');
        });

        test('Uses dark text in light mode', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment();

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                colorScheme: 'light',
                bodyStyle: 'color: #fff;'
            });

            const title = await frame.locator('[data-testid="cta-box"] h1');
            const titleColor = await title.evaluate((node) => {
                const style = window.getComputedStyle(node);
                return style.getPropertyValue('color');
            });
            expect(titleColor).toBe('rgb(0, 0, 0)');
        });
    });
});

