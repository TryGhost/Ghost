import JSZip from 'jszip';
import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {activeThemeResponse, currentRoute, fakeAdminEndpoint, fakeEndpoint, fakeSettingsScreens, fakeSitePreview, renderAdminApp, siteResponse} from '@test-utils/acceptance';
import {settingsScreen} from '@/settings/settings.screen';

const liveHtml = '<html><head><link rel="stylesheet" href="/assets/built/screen.css?v=abc123"><script defer src="/ghost/assets/portal.js" data-i18n="true" data-key="0123456789abcdef"></script><script defer src="/ghost/assets/search.js" data-key="0123456789abcdef" data-styles="/ghost/assets/search.css" data-sodo-search="true"></script></head><body>Live site</body></html>';

async function fakeBuilderWorld(): Promise<void> {
    const theme = activeThemeResponse().themes[0];
    if (!theme) {
        throw new Error('The active theme fixture is missing.');
    }
    const archive = await new JSZip()
        .file('casper/package.json', JSON.stringify({name: 'casper', version: '1.0.0'}))
        .file('casper/index.hbs', '<!doctype html><html><head><title>{{@site.title}}</title></head><body><main data-edit="casper/index.hbs:1:1"><h1>{{@site.title}}</h1></main></body></html>')
        .generateAsync({type: 'arraybuffer'});
    fakeAdminEndpoint('GET', '/custom_theme_settings/', {custom_theme_settings: []});
    fakeAdminEndpoint('GET', `/themes/${theme.name}/download/`, archive, {contentType: 'application/zip'});
    const siteUrl = siteResponse().site.url;
    if (typeof siteUrl !== 'string') {
        throw new Error('The site fixture URL is missing.');
    }
    fakeSitePreview(siteUrl, liveHtml);
    fakeEndpoint('GET', `${new URL('/ghost/api/content/settings/', siteUrl).href}*`, {
        settings: {
            title: 'Rendered site',
            description: 'Builder acceptance fixture',
            navigation: [{label: 'Home', url: '/'}],
            secondary_navigation: [],
            labs: {},
            url: siteUrl,
            version: '6.0'
        }
    });
    fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/', siteUrl).href}*`, {
        posts: [],
        meta: {pagination: {page: 1, limit: 15, pages: 1, total: 0, next: null, prev: null}}
    });
}

describe('Design Builder route', () => {
    it('renders the standalone builder when enabled', async () => {
        await fakeBuilderWorld();
        await renderAdminApp('/builder/theme', {labs: {designBuilder: true}});

        await expect.poll(currentRoute).toBe('/builder/theme');
        await expect.element(page.getByRole('heading', {name: 'Design Builder'})).toBeVisible();
        await expect.element(page.getByRole('heading', {name: 'What would you like to change?'})).toBeVisible();
        await expect.element(page.getByRole('textbox', {name: 'Describe a change'})).toBeDisabled();
        await expect.element(page.getByTitle('Theme preview')).toHaveAttribute('srcdoc');
    });

    it('switches between chat and preview on a narrow screen', async () => {
        await fakeBuilderWorld();
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 600});
        window.dispatchEvent(new Event('resize'));
        await renderAdminApp('/builder/theme', {labs: {designBuilder: true}});

        const chatTab = page.getByRole('tab', {name: 'Chat'});
        const previewTab = page.getByRole('tab', {name: 'Preview'});
        await expect.element(chatTab).toHaveAttribute('aria-selected', 'true');
        await previewTab.click();
        await expect.element(previewTab).toHaveAttribute('aria-selected', 'true');
        await expect.element(page.getByTitle('Theme preview')).toBeVisible();
        await chatTab.click();
        await expect.element(page.getByRole('heading', {name: 'What would you like to change?'})).toBeVisible();

        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1200});
        window.dispatchEvent(new Event('resize'));
    });

    it('returns to Design settings with an explanation when unavailable', async () => {
        fakeSettingsScreens();
        await renderAdminApp('/builder/theme', {labs: {}});

        await expect.poll(currentRoute).toBe('/settings/design');
        await expect.element(settingsScreen.design()).toBeVisible();
        await new Promise((resolve) => {
            window.setTimeout(resolve, 1000);
        });

        const notification = settingsScreen.infoToast();
        await expect.element(notification).toHaveAttribute('data-visible', 'true');
        await expect.element(notification).toHaveTextContent('Design Builder is not available on this site.');
    });

    it('offers a route back to Design settings when Builder data fails to load', async () => {
        fakeAdminEndpoint('GET', '/custom_theme_settings/', {errors: [{message: 'Unavailable'}]}, {status: 500});
        await renderAdminApp('/builder/theme', {labs: {designBuilder: true}});

        await expect.element(page.getByText('Builder could not load the active theme. Return to Design settings and try again.')).toBeVisible();
        await expect.element(page.getByRole('link', {name: 'Back to Design settings'})).toHaveAttribute('href', '#/settings/design');
    });

    it('runs the development Pi tool-loop proof in a real browser', async () => {
        await renderAdminApp('/builder/theme?proof=pi', {labs: {designBuilder: true}});

        await page.getByRole('button', {name: 'Run OpenAI proof'}).click();
        await expect.element(page.getByTestId('pi-proof-result')).toHaveTextContent('OpenAI Pi provider proof passed');

        await page.getByRole('button', {name: 'Run Anthropic proof'}).click();
        await expect.element(page.getByTestId('pi-proof-result')).toHaveTextContent('Anthropic Pi provider proof passed');
    });

    it('keeps the last valid iframe document and virtual URL through render repair', async () => {
        await renderAdminApp('/builder/theme?proof=preview', {labs: {designBuilder: true}});

        const result = page.getByTestId('preview-proof-result');
        const frameElement = page.getByTestId('preview-proof-frame');
        await expect.element(frameElement).toBeVisible();
        await expect.element(result).toHaveTextContent('ready:https://example.com/');
        const initialImage = await frameElement.screenshot({base64: true});

        await page.getByRole('button', {name: 'Navigate preview'}).click();
        await expect.element(result).toHaveTextContent('virtual:https://example.com/about/');
        const lastValidImage = await frameElement.screenshot({base64: true});
        expect(lastValidImage.base64).not.toBe(initialImage.base64);

        await page.getByRole('button', {name: 'Break candidate'}).click();
        await expect.element(result).toHaveTextContent('invalid:https://example.com/about/');
        const retainedImage = await frameElement.screenshot({base64: true});
        expect(retainedImage.base64).toBe(lastValidImage.base64);

        await page.getByRole('button', {name: 'Bypass bridge'}).click();
        await expect.element(result).toHaveTextContent('bypass-blocked:https://example.com/about/');
        const recoveredImage = await frameElement.screenshot({base64: true});
        expect(recoveredImage.base64).toBe(lastValidImage.base64);

        await page.getByRole('button', {name: 'Bypass after ready'}).click();
        await expect.element(result).toHaveTextContent('late-bypass-blocked:https://example.com/about/');
        const lateRecoveredImage = await frameElement.screenshot({base64: true});
        expect(lateRecoveredImage.base64).toBe(lastValidImage.base64);

        await page.getByRole('button', {name: 'Repair candidate'}).click();
        await expect.element(result).toHaveTextContent('repaired:https://example.com/about/');
        const repairedImage = await frameElement.screenshot({base64: true});
        expect(repairedImage.base64).not.toBe(lastValidImage.base64);
    });
});
