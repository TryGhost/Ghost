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
});
