const DataGenerator = require('../../utils/fixtures/data-generator');

/**
 * Setup Ghost Admin, or login if there's a login prompt
 * @param {import('@playwright/test').Page} page
 */
const setupGhost = async (page) => {
    await page.goto('/ghost');

    const actions = {
        signin: Symbol(),
        setup: Symbol(),
        noAction: Symbol()
    };
    /**
     * Using this to fix ESLint
     * @type {object}
     * @field {string} state
     * @field {number} timeout
     */
    const options = {
        state: 'visible',
        timeout: 10000
    };
    const action = await Promise.race([
        page.locator('.gh-signin').waitFor(options).then(() => actions.signin).catch(() => {}),
        page.locator('.gh-setup').waitFor(options).then(() => actions.setup).catch(() => {}),
        page.locator('.gh-nav').waitFor(options).then(() => actions.noAction).catch(() => {})
    ]);

    // TODO: Use env variables in CI
    // Add owner user data from usual fixture
    const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

    if (action === actions.signin) {
        // Fill email + password
        await page.locator('#identification').fill(ownerUser.email);
        await page.locator('#password').fill(ownerUser.password);
        await page.locator('[data-test-button="sign-in"]').click();
        // Confirm we have reached Ghost Admin
        await page.locator('.gh-nav').waitFor(options);
    } else if (action === actions.setup) {
        // Complete setup process
        await page.getByPlaceholder('The Daily Awesome').click();
        await page.getByPlaceholder('The Daily Awesome').fill('The Local Test');

        // Add owner user data from usual fixture
        await page.getByPlaceholder('Jamie Larson').fill(ownerUser.name);
        await page.getByPlaceholder('jamie@example.com').fill(ownerUser.email);
        await page.getByPlaceholder('At least 10 characters').fill(ownerUser.password);

        await page.getByPlaceholder('At least 10 characters').press('Enter');
        await page.locator('.gh-done-pink').click();
        await page.locator('.gh-nav').waitFor(options);
    }
};

let isStripeSetup = false;

/**
 * Connect from Stripe using the UI, disconnecting if necessary
 * @param {import('@playwright/test').Page} page
 */
const setupStripe = async (page) => {
    if (isStripeSetup) {
        return;
    }

    await page.goto('/ghost');
    await page.locator('[data-test-nav="settings"]').click();
    await page.locator('[data-test-nav="members-membership"]').click();
    if (await page.isVisible('.gh-btn-stripe-status.connected')) {
        // Disconnect if already connected
        await page.locator('.gh-btn-stripe-status.connected').click();
        await page.locator('.modal-content .gh-btn-stripe-disconnect').first().click();
        // TODO: Use a better selector to achieve this
        await page
            .locator('.modal-content')
            .filter({hasText: 'Are you sure you want to disconnect?'})
            .first()
            .getByRole('button', {name: 'Disconnect'})
            .click();
    } else {
        await page.locator('.gh-setting-members-tierscontainer .stripe-connect').click();
    }
    await page.locator('input[data-test-checkbox="stripe-connect-test-mode"]').first().check();
    const [stripePage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('link', {name: 'Connect with Stripe'}).click()
    ]);
    await stripePage.locator('#skip-account-app').click();
    const stripeKey = await stripePage.locator('code').innerText();
    await stripePage.close();
    await page.getByPlaceholder('Paste your secure key here').fill(stripeKey);
    await page.getByRole('button', {name: 'Save Stripe settings'}).click();
    await page.locator('[data-test-button="stripe-connect-ok"]').click();

    isStripeSetup = true;
};

/**
 * Connect from Stripe using the UI, disconnecting if necessary
 * @param {import('@playwright/test').Page} page
 * @param {object} tier
 * @param {string} tier.name
 * @param {number} tier.monthlyPrice
 * @param {number} tier.yearlyPrice
 */
const createTier = async (page, {name, monthlyPrice, yearlyPrice}) => {
    await page.locator('[data-test-nav="settings"]').click();
    await page.locator('[data-test-nav="members-membership"]').click();
    // Expand the premium tier list
    await page.getByRole('button', {name: 'Expand'}).nth(1).click({
        delay: 10 // Wait 10 milliseconds to ensure tier information appears correctly
    });

    // Archive if already exists
    if (await page.locator('.gh-tier-card-name').getByText(name).isVisible()) {
        const tierCard = page.locator('.gh-tier-card').filter({hasText: name}).first();
        await tierCard.locator('.gh-tier-card-actions-button').click();
        await tierCard.getByRole('button', {name: 'Archive'}).click();
        await page.locator('.modal-content').getByRole('button', {name: 'Archive'}).click();
    }

    await page.locator('.gh-btn-add-tier').click();
    await page.locator('input[data-test-input="tier-name"]').first().fill(name);
    await page.locator('#monthlyPrice').fill(`${monthlyPrice}`);
    await page.locator('#yearlyPrice').fill(`${yearlyPrice}`);
    await page.locator('[data-test-button="save-tier"]').click();
    await page.waitForSelector('input[data-test-input="tier-name"]', {state: 'detached'});
};

module.exports = {
    setupGhost,
    setupStripe,
    createTier
};
