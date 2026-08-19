import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {currentRoute, fakeSettingsScreens, renderAdminApp} from '@test-utils/acceptance';
import {settingsScreen} from '@/settings/settings.screen';

describe('Design Builder route', () => {
    it('renders the standalone builder when enabled', async () => {
        await renderAdminApp('/builder/theme', {labs: {designBuilder: true}});

        await expect.poll(currentRoute).toBe('/builder/theme');
        await expect.element(page.getByRole('heading', {name: 'Design Builder'})).toBeVisible();
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
