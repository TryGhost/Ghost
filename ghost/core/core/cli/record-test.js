const {chromium} = require('@playwright/test');
const Command = require('./command');
const playwrightConfig = require('../../playwright.config');
const {globalSetup} = require('../../test/e2e-browser/utils');

module.exports = class RecordTest extends Command {
    setup() {
        this.help('Use PlayWright to record a browser-based test');
    }

    permittedEnvironments() {
        return ['testing-browser'];
    }

    async handle() {
        await globalSetup({
            projects: [playwrightConfig]
        });

        const browser = await chromium.launch({headless: false});

        const context = await browser.newContext(playwrightConfig.use);

        // Pause the page, and start recording manually.
        const page = await context.newPage();
        await page.goto('/ghost');

        await page.pause();
    }
};
