const {chromium} = require('@playwright/test');
const Command = require('./command');
const testUtils = require('../../test/utils');

module.exports = class RecordTest extends Command {
    setup() {
        this.help('Use PlayWright to record a browser-based test');
        this.argument('--admin', {type: 'boolean', defaultValue: false, desc: 'Start browser-based test in Ghost admin'});
        this.argument('--no-setup', {type: 'boolean', defaultValue: false, desc: 'Disable the default setup, for testing Ghost admin setup'});
        this.argument('--fixtures', {type: 'array', defaultValue: [], delimiter: ',', desc: 'A list of comma-separated fixtures to include'});
    }

    permittedEnvironments() {
        return ['development', 'testing'];
    }

    async handle(argv) {
        const app = await testUtils.startGhost();

        if (argv.fixtures.length > 0) {
            await testUtils.initFixtures(...argv.fixtures);
        }

        const browser = await chromium.launch({headless: false});

        const baseURL = argv.admin ? `${app.url}ghost/` : app.url;
        const context = await browser.newContext({
            baseURL
        });

        // Pause the page, and start recording manually.
        const page = await context.newPage();
        await page.goto('');

        if (argv.admin && !argv['no-setup']) {
            await page.getByPlaceholder('The Daily Awesome').click();
            await page.getByPlaceholder('The Daily Awesome').fill('The Local Test');
            await page.getByPlaceholder('Jamie Larson').fill('Testy McTesterson');
            await page.getByPlaceholder('jamie@example.com').fill('testy@example.com');
            await page.getByPlaceholder('At least 10 characters').fill('Mc.T3ster$0n');
            await page.getByPlaceholder('At least 10 characters').press('Enter');
            await page.locator('.gh-done-pink').click();
        }

        await page.pause();
    }
};
