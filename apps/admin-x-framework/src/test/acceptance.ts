import {Locator, Page, expect} from '@playwright/test';
import {ExternalLink} from '../routing';

// Export everything from msw.ts for easy accessibility
export * from './msw';

/**
 * Playwright test helpers
 */

export async function mockSitePreview({page, url, response}: {page: Page, url: string, response: string}) {
    const lastRequest: {previewHeader?: string} = {};
    const previewRequests: string[] = [];

    await page.route(url, async (route) => {
        if (route.request().method() !== 'POST') {
            return route.continue();
        }

        if (!route.request().headers()['x-ghost-preview']) {
            return route.continue();
        }

        lastRequest.previewHeader = route.request().headers()['x-ghost-preview'];
        previewRequests.push(lastRequest.previewHeader!);

        await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: response
        });
    });

    return {lastRequest, previewRequests};
}

export async function chooseOptionInSelect(select: Locator, optionText: string | RegExp) {
    await select.click();
    await select.page().getByRole('option', {name: optionText}).click();
}

export async function getOptionsFromSelect(select: Locator): Promise<string[]> {
    await select.click();
    const optionTexts = await select.page().getByRole('option').allTextContents();
    
    // Close the select dropdown
    await select.click();
    return optionTexts;
}

export async function testUrlValidation(input: Locator, textToEnter: string, expectedResult: string, expectedError?: string) {
    await input.fill(textToEnter);
    await input.blur();
    await expect(input).toHaveValue(expectedResult);

    if (expectedError) {
        await expect(input.locator('..').locator('..').getByText(expectedError)).toBeVisible();
    }
}

export async function expectExternalNavigate(page: Page, link: Partial<ExternalLink & {title?: string, href?: string}>) {
    // Create a mock for window.open
    await page.addInitScript(() => {
        window.open = function (url?: string | URL, target?: string, features?: string) {
            const urlStr = url?.toString() || '';
            document.body.setAttribute('data-external-navigate', JSON.stringify({
                url: urlStr,
                target: target || '',
                features: features || ''
            }));
            return null;
        };
    });

    // Ensure the override is also applied to the already-loaded page
    await page.evaluate(() => {
        window.open = function (url?: string | URL, target?: string, features?: string) {
            const urlStr = url?.toString() || '';
            document.body.setAttribute('data-external-navigate', JSON.stringify({
                url: urlStr,
                target: target || '',
                features: features || ''
            }));
            return null;
        };
    });

    await page.locator(`[data-testid="external-navigate-${link.title}"]`).click();

    // Ensure the navigate event was triggered
    const dataAttr = await page.locator('body').getAttribute('data-external-navigate');
    expect(dataAttr).toBeTruthy();

    const navigateData = JSON.parse(dataAttr || '{}');
    if (link.href) {
        expect(navigateData.url).toContain(link.href);
    }
}
