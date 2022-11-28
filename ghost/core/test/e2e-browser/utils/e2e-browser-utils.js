const DataGenerator = require('../../utils/fixtures/data-generator');
const ObjectID = require('bson-objectid').default;

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

    // Add owner user data from usual fixture
    const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

    if (process.env.CI && process.env.TEST_URL) {
        ownerUser.email = process.env.TEST_OWNER_EMAIL;
        ownerUser.password = process.env.TEST_OWNER_PASSWORD;
    }

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

// Only ever setup Stripe once, for performance reasons
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

/**
 * Create an offer on a tier
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {string} options.name
 * @param {string} options.tierName
 * @param {number} options.percentOff
 * @returns {Promise<string>} Unique offer name
 */
const createOffer = async (page, {name, tierName, percentOff}) => {
    await page.goto('/ghost');
    await page.locator('[data-test-nav="offers"]').click();

    // Keep offer names unique & <= 40 characters
    let offerName = `${name} (${new ObjectID().toHexString().slice(0, 40 - name.length - 3)})`;

    // Archive other offers to keep the list tidy
    // We only need 1 offer to be active at a time
    // Either the list of active offers loads, or the CTA when no offers exist
    while (await Promise.race([
        page.locator('.gh-offers-list .gh-list-header').filter({hasText: 'active'}).waitFor({state: 'visible', timeout: 1000}).then(() => true).catch(() => false),
        page.locator('.gh-offers-list-cta').waitFor({state: 'visible', timeout: 1000}).then(() => false).catch(() => false)
    ])) {
        const listItem = page.locator('[data-test-list="offers-list-item"]').first();
        await listItem.getByRole('link', {name: 'arrow-right'}).click();
        await page.getByRole('button', {name: 'Archive offer'}).click();
        await page
            .locator('.modal-content')
            .filter({hasText: 'Archive offer'})
            .first()
            .getByRole('button', {name: 'Archive'})
            .click();

        // TODO: Use a more resilient selector
        const statusDropdown = await page.getByRole('button', {name: 'Archived offers arrow-down-small'});
        await statusDropdown.waitFor({
            state: 'visible',
            timeout: 1000
        });
        await statusDropdown.click();
        await page.getByRole('option', {name: 'Active offers'}).click();
    }

    await page.getByRole('link', {name: 'New offer'}).click();
    await page.locator('[data-test-input="offer-name"]').fill(offerName);
    await page.locator('input#amount').fill(`${percentOff}`);
    const priceId = await page.locator(`.gh-select-product-cadence>select>option`).getByText(`${tierName} - Monthly`).getAttribute('value');
    await page.locator('.gh-select-product-cadence>select').selectOption(priceId);
    await page.getByRole('button', {name: 'Save'}).click();
    // Wait for the "Saved" button, ensures that next clicks don't trigger the unsaved work modal
    await page.locator('[data-test-button="save"] [data-test-task-button-state="success"]').waitFor({
        state: 'visible',
        timeout: 1000
    });
    await page.locator('[data-test-nav="offers"]').click();

    return offerName;
};

const completeStripeSubscription = async (page) => {
    await page.locator('#cardNumber').fill('4242 4242 4242 4242');
    await page.locator('#cardExpiry').fill('04 / 24');
    await page.locator('#cardCvc').fill('424');
    await page.locator('#billingName').fill('Testy McTesterson');
    await page.getByRole('combobox', {name: 'Country or region'}).selectOption('US');
    await page.locator('#billingPostalCode').fill('42424');
    await page.getByTestId('hosted-payment-submit-button').click();
};

module.exports = {
    setupGhost,
    setupStripe,
    createTier,
    createOffer,
    completeStripeSubscription
};
