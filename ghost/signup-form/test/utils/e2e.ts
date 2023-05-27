import {E2E_PORT} from '../../playwright.config';

export async function initialize({page, ...options}: {page: any; title?: string, description?: string, logo?: string, color?: string, site?: string, labels?: string}) {
    const url = `http://localhost:${E2E_PORT}/signup-form.min.js`;

    await page.goto('about:blank');
    await page.setViewportSize({width: 1000, height: 1000});

    await page.evaluate((data) => {
        const scriptTag = document.createElement('script');
        scriptTag.src = data.url;

        for (const option of Object.keys(data.options)) {
            scriptTag.dataset[option] = data.options[option];
        }
        document.body.appendChild(scriptTag);
    }, {url, options});
    await page.waitForSelector('iframe');
    return page.frameLocator('iframe');
}
