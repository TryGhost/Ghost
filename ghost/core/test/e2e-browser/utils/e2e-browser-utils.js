const DataGenerator = require('../../utils/fixtures/data-generator');
const {expect, test} = require('@playwright/test');
const ObjectID = require('bson-objectid').default;
const Stripe = require('stripe').Stripe;

/**
 * Tier
 * @typedef {object} Tier
 * @property {string} tier.name
 * @property {number} tier.monthlyPrice
 * @property {number} tier.yearlyPrice
 */

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

    if (action === actions.signin) {
        // Fill email + password
        await page.locator('#identification').fill(ownerUser.email);
        await page.locator('#password').fill(ownerUser.password);
        await page.getByRole('button', {name: 'Sign in'}).click();
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

const disconnectStripe = async (page) => {
    await deleteAllMembers(page);
    await page.locator('.gh-nav a[href="#/settings/"]').click();
    await page.getByTestId('tiers').waitFor();
    if (await page.isVisible('[data-testid="stripe-connected"]')) {
        await page.getByTestId('stripe-connected').first().click();
        await page.getByTestId('stripe-modal').getByRole('button', {name: 'Disconnect'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Disconnect'}).click();
    }
};

const setupStripe = async (page, stripConnectIntegrationToken) => {
    await deleteAllMembers(page);
    await page.locator('.gh-nav a[href="#/settings/"]').click();
    await page.getByTestId('tiers').waitFor();
    if (await page.isVisible('[data-testid="stripe-connected"]')) {
        // Disconnect if already connected
        await page.getByTestId('stripe-connected').first().click();
        await page.getByTestId('stripe-modal').getByRole('button', {name: 'Disconnect'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Disconnect'}).click();
    } else {
        await page.getByRole('button', {name: 'Connect with Stripe'}).click();
    }
    const modal = page.getByTestId('stripe-modal');
    await modal.getByRole('button', {name: /I have a Stripe account/}).click();
    await modal.getByPlaceholder('Paste your secure key here').first().fill(stripConnectIntegrationToken);
    await modal.getByRole('button', {name: 'Save Stripe settings'}).click();
    // We need to wait for the saving to succeed
    await expect(modal.getByRole('button', {name: 'Disconnect'})).toBeVisible();
    await modal.getByRole('button', {name: 'Close'}).click();

    await page.getByRole('button', {name: '← Done'}).click();
};

// Setup Mailgun with fake data, for Ghost Admin to allow bulk sending
const setupMailgun = async (page) => {
    await page.locator('.gh-nav a[href="#/settings/"]').click();
    const section = page.getByTestId('mailgun');

    await section.getByRole('button', {name: 'Edit'}).click();
    await section.getByLabel('Mailgun domain').fill('api.testgun.com');
    await section.getByLabel('Mailgun private API key').fill('Not an API key');
    await section.getByRole('button', {name: 'Save'}).click();
    await section.getByText('Mailgun is set up').waitFor();

    await page.getByRole('button', {name: '← Done'}).click();
};

/**
 * Enable experimental labs features
 * @param {import('@playwright/test').Page} page
 */
const enableLabs = async (page) => {
    await page.locator('.gh-nav a[href="#/settings/"]').click();

    const section = page.getByTestId('labs');
    await section.getByRole('button', {name: 'Open'}).click();

    await section.getByRole('tab', {name: 'Alpha features'}).click();
    await section.getByLabel('Webmentions').click();
    await section.getByLabel('Tips & donations').click();

    await page.getByRole('button', {name: '← Done'}).click();
};

/**
 * Delete all members, 1 by 1, using the UI
 * @param {import('@playwright/test').Page} page
 */
const deleteAllMembers = async (page) => {
    await page.locator('a[href="#/members/"]').first().click();

    const firstMember = page.locator('.gh-list tbody tr').first();
    while (await Promise.race([
        firstMember.waitFor({state: 'visible', timeout: 1000}).then(() => true),
        page.locator('.gh-members-empty').waitFor({state: 'visible', timeout: 1000}).then(() => false)
    ]).catch(() => false)) {
        await firstMember.click();
        await page.locator('.view-actions .dropdown > button').click();
        await page.getByRole('button', {name: 'Delete member'}).click();
        await page
            .locator('.modal-content')
            .filter({hasText: 'Delete member'})
            .first()
            .getByRole('button', {name: 'Delete member'})
            .click();
    }
};

/**
 * Archive all tiers, 1 by 1, using the UI
 * @param {import('@playwright/test').Page} page
 */
const archiveAllTiers = async (page) => {
    // Navigate to the member settings
    await page.locator('[data-test-nav="settings"]').click();
    await page.locator('[data-test-nav="members-membership"]').click();

    // Tiers request can take time, so waiting until there is no connections before interacting with them
    await page.waitForLoadState('networkidle');

    // Expand the premium tier list
    await page.locator('[data-test-toggle-pub-info]').click();

    // Archive if already exists
    while (await page.locator('.gh-tier-card').first().isVisible()) {
        const tierCard = page.locator('.gh-tier-card').first();
        await tierCard.locator('.gh-tier-card-actions-button').click();
        await tierCard.getByRole('button', {name: 'Archive'}).click();
        await page.locator('.modal-content').getByRole('button', {name: 'Archive'}).click();
        await page.locator('.modal-content').waitFor({state: 'detached', timeout: 1000});
    }
};

/**
 * Allows impersonating a member by copying the impersonate link
 * opens site with member logged in via the link
 * Expects starting at member detail page
 * @param {import('@playwright/test').Page} page
 */
const impersonateMember = async (page) => {
    // open member impersonation modal and copy link
    await page.locator('[data-test-button="member-actions"]').click();
    await page.locator('[data-test-button="impersonate"]').click();
    await page.locator('[data-test-button="copy-impersonate-link"]').click();
    await page.waitForSelector('[data-test-button="copy-impersonate-link"] span:has-text("Link copied")');

    // get impersonation link from input and redirect to it
    const link = await page.locator('[data-test-input="member-signin-url"]').inputValue();
    await page.goto(link);
};

/**
 * Connect from Stripe using the UI, disconnecting if necessary
 * @param {import('@playwright/test').Page} page
 * @param {object} tier
 * @param {string} tier.name
 * @param {number} tier.monthlyPrice
 * @param {number} tier.yearlyPrice
 * @param {number} [tier.trialDays]
 */
const createTier = async (page, {name, monthlyPrice, yearlyPrice, trialDays}, enableInPortal = true) => {
    await test.step('Create a tier', async () => {
        // Navigate to the member settings
        await page.locator('[data-test-nav="settings"]').click();

        // Tiers request can take time, so waiting until there is no connections before interacting with them
        await page.waitForLoadState('networkidle');

        // Archive if already exists
        while (await page.getByTestId('tier-card').filter({hasText: name}).first().isVisible()) {
            await page.getByTestId('tier-card').filter({hasText: name}).first().click();
            await page.getByTestId('tier-detail-modal').getByRole('button', {name: 'Archive tier'}).click();
            await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Archive'}).click();
            await page.getByTestId('tier-detail-modal').getByRole('button', {name: 'Reactivate tier'}).waitFor();
            await page.getByTestId('tier-detail-modal').getByRole('button', {name: 'Save & close'}).click();
        }

        // Add the tier
        await page.getByTestId('tiers').getByRole('button', {name: 'Add tier'}).click();

        const modal = page.getByTestId('tier-detail-modal');
        await modal.getByLabel('Name').fill(name);
        await modal.getByLabel('Monthly price').fill(`${monthlyPrice}`);
        await modal.getByLabel('Yearly price').fill(`${yearlyPrice}`);
        if (trialDays) {
            await modal.getByLabel('Add a free trial').check();
            await modal.getByLabel('Trial days').fill(`${trialDays}`);
        }
        await modal.getByRole('button', {name: 'Save & close'}).click();
        await page.locator('[data-testid="tier-card"]:visible').filter({hasText: name}).waitFor();

        // Enable the tier in portal
        if (enableInPortal) {
            await page.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const portalSettings = page.getByTestId('portal-modal');

            if (!await portalSettings.getByLabel(name).first().isChecked()) {
                await portalSettings.getByLabel(name).first().check();
            }
            if (!await portalSettings.getByLabel('Monthly').first().isChecked()) {
                await portalSettings.getByLabel('Monthly').first().check();
            }
            if (!await portalSettings.getByLabel('Yearly').first().isChecked()) {
                await portalSettings.getByLabel('Yearly').first().check();
            }
            await portalSettings.getByRole('button', {name: 'Save'}).click();
            await page.waitForLoadState('networkidle');
            await portalSettings.getByRole('button', {name: 'Close'}).click();
        }

        // Navigate back to the dashboard
        await page.goto('/ghost');
    });
};

/**
 * Create an offer on a tier
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {string} options.name
 * @param {string} options.tierName
 * @param {string} options.offerType
 * @param {string} [options.discountType]
 * @param {number} [options.discountDuration]
 * @param {number} options.amount
 * @returns {Promise<string>} Unique offer name
 */
const createOffer = async (page, {name, tierName, offerType, amount, discountType = null, discountDuration = 3}) => {
    await page.goto('/ghost');
    await page.locator('.gh-nav a[href="#/offers/"]').click();

    // Keep offer names unique & <= 40 characters
    let offerName = `${name} (${new ObjectID().toHexString().slice(0, 40 - name.length - 3)})`;

    // Archive other offers to keep the list tidy
    // We only need 1 offer to be active at a time
    // Either the list of active offers loads, or the CTA when no offers exist
    while (await Promise.race([
        page.locator('.gh-offers-list .gh-list-header').filter({hasText: 'active'}).waitFor({state: 'visible', timeout: 1000}).then(() => true),
        page.locator('.gh-offers-list-cta').waitFor({state: 'visible', timeout: 1000}).then(() => false)
    ]).catch(() => false)) {
        const listItem = page.locator('.gh-offers-list .gh-list-row:not(.header)').first();
        await listItem.locator('a[href^="#/offers/"]').last().click();
        await page.getByRole('button', {name: 'Archive offer'}).click();
        await page
            .locator('.modal-content')
            .filter({hasText: 'Archive offer'})
            .first()
            .getByRole('button', {name: 'Archive'})
            .click();

        // TODO: Use a more resilient selector
        const statusDropdown = await page.getByRole('button', {name: 'Archived offers'});
        await statusDropdown.waitFor({
            state: 'visible',
            timeout: 1000
        });
        await statusDropdown.click();
        await page.getByRole('option', {name: 'Active offers'}).click();
    }

    await page.getByRole('link', {name: 'New offer'}).click();
    await page.locator('input#name').fill(offerName);

    if (offerType === 'freeTrial') {
        await page.getByRole('button', {name: 'Free trial Give free access for a limited time.'}).click();
        await page.locator('input#trial-duration').fill(`${amount}`);
    } else if (offerType === 'discount') {
        await page.locator('input#amount').fill(`${amount}`);
        if (discountType === 'multiple-months') {
            await page.locator('[data-test-select="offer-duration"]').selectOption('repeating');
            await page.locator('input#duration-months').fill(discountDuration.toString());
        }

        if (discountType === 'forever') {
            await page.locator('[data-test-select="offer-duration"]').selectOption('forever');
        }
    }

    const priceId = await page.locator(`.gh-select-product-cadence>select>option`).getByText(`${tierName} - Monthly`).getAttribute('value');
    await page.locator('.gh-select-product-cadence>select').selectOption(priceId);

    await page.getByRole('button', {name: 'Save'}).click();
    // Wait for the "Saved" button, ensures that next clicks don't trigger the unsaved work modal
    await page.getByRole('button', {name: 'Saved'}).waitFor({
        state: 'visible',
        timeout: 10000
    });
    await page.locator('.gh-nav a[href="#/offers/"]').click();

    return offerName;
};

const fillInputIfExists = async (page, selector, value) => {
    if (await page.isVisible(selector)) {
        await page.locator(selector).fill(value);
    }
};

const completeStripeSubscription = async (page) => {
    await page.locator('#cardNumber').fill('4242 4242 4242 4242');
    await page.locator('#cardExpiry').fill('04 / 24');
    await page.locator('#cardCvc').fill('424');
    await page.locator('#billingName').fill('Testy McTesterson');
    await page.getByRole('combobox', {name: 'Country or region'}).selectOption('US');
    await page.locator('#billingPostalCode').fill('42424');

    await fillInputIfExists(page, '#billingAddressLine1', '123 Test St');
    await fillInputIfExists(page, '#billingAddressLine2', 'Apt 1');
    await fillInputIfExists(page, '#billingLocality', 'Testville');

    // Wait for submit button complete
    await page.waitForSelector('[data-testid="hosted-payment-submit-button"].SubmitButton--complete', {state: 'attached'});

    await page.getByTestId('hosted-payment-submit-button').click();

    await page.waitForLoadState('networkidle');
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} options.email
 * @param {String} [options.name]
 * @param {String} [options.note]
 * @param {String} [options.label]
 * @param {String} [options.compedPlan]
 */
const createMember = async (page, {email, name, note, label = '', compedPlan}) => {
    await page.goto('/ghost');
    await page.locator('.gh-nav a[href="#/members/"]').click();
    await page.waitForSelector('a[href="#/members/new/"] span');
    await page.locator('a[href="#/members/new/"] span:has-text("New member")').click();
    await page.waitForSelector('input[name="name"]');

    await page.fill('input[name="email"]', email);

    if (name) {
        await page.fill('input[name="name"]', name);
    }

    if (note) {
        await page.fill('textarea[name="note"]', note);
    }

    if (label) {
        await page.locator('label:has-text("Labels") + div').click();
        await page.keyboard.type(label);
        await page.keyboard.press('Tab');
    }

    await page.locator('button span:has-text("Save")').click();
    await page.waitForSelector('button span:has-text("Saved")');

    if (compedPlan) {
        await page.locator('[data-test-button="add-complimentary"]').click();
        // TODO: switch [data-test-modal="add-complimentary"] and better plan selector once modal is refactored
        await page.locator('.fullscreen-modal h4').getByText(compedPlan).click();
        await page.locator('[data-test-button="save-comp-tier"]').click();
    }
};

/**
 * Start a post draft with a filled in title and body.
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.title]
 * @param {String} [options.body]
 */
const createPostDraft = async (page, {title = 'Hello world', body = 'This is my post body.'} = {}) => {
    await page.locator('.gh-nav a[href="#/posts/"]').click();

    // Create a new post
    await page.locator('[data-test-new-post-button]').click();

    // Fill in the post title
    await page.locator('[data-test-editor-title-input]').click();
    await page.locator('[data-test-editor-title-input]').fill(title);

    // wait for editor to be ready
    await expect(page.locator('[data-lexical-editor="true"]')).toBeVisible();

    // Continue to the body by pressing enter
    await page.keyboard.press('Enter');

    await page.waitForTimeout(100); // allow new->draft switch to occur fully, without this some initial typing events can be missed
    await page.keyboard.type(body);
};

/**
 * Go to Membership setting page
 * @param {import('@playwright/test').Page} page
 */
const goToMembershipPage = async (page) => {
    return await test.step('Open Membership settings', async () => {
        await page.goto('/ghost');
        await page.locator('[data-test-nav="settings"]').click();
        // Tiers request can take time, so waiting until there is no connections before interacting with UI
        await page.waitForLoadState('networkidle');
    });
};

/**
 * Get tier card from membership page
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.slug]
 */
const openTierModal = async (page, {slug}) => {
    return await test.step('Open the tier modal', async () => {
        await page.getByTestId('tiers').locator(`[data-testid="tier-card"][data-tier="${slug}"]`).click();

        return page.getByTestId('tier-detail-modal');
    });
};

// Memoized function to get the Stripe account ID
let stripeAccountId;
const getStripeAccountId = async () => {
    if (stripeAccountId) {
        return stripeAccountId;
    }

    if (!('STRIPE_PUBLISHABLE_KEY' in process.env) || !('STRIPE_SECRET_KEY' in process.env)) {
        throw new Error('Missing STRIPE_PUBLISHABLE_KEY or STRIPE_SECRET_KEY environment variables');
    }

    const parallelIndex = process.env.TEST_PARALLEL_INDEX;
    const accountEmail = `test${parallelIndex}@example.com`;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(secretKey, {
        apiVersion: '2020-08-27'
    });
    const accounts = await stripe.accounts.list();
    if (accounts.data.length > 0) {
        const account = accounts.data.find(acc => acc.email === accountEmail);
        if (account) {
            await stripe.accounts.del(account.id);
        }
    }

    const account = await stripe.accounts.create({
        type: 'standard',
        email: accountEmail,
        business_type: 'company',
        company: {
            name: `Test Company ${parallelIndex}`
        }
    });
    stripeAccountId = account.id;

    return stripeAccountId;
};

const generateStripeIntegrationToken = async (accountId) => {
    if (!('STRIPE_PUBLISHABLE_KEY' in process.env) || !('STRIPE_SECRET_KEY' in process.env)) {
        throw new Error('Missing STRIPE_PUBLISHABLE_KEY or STRIPE_SECRET_KEY environment variables');
    }

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    return Buffer.from(JSON.stringify({
        a: secretKey,
        p: publishableKey,
        l: false,
        i: accountId
    })).toString('base64');
};

module.exports = {
    setupGhost,
    setupStripe,
    disconnectStripe,
    enableLabs,
    getStripeAccountId,
    generateStripeIntegrationToken,
    setupMailgun,
    deleteAllMembers,
    createTier,
    archiveAllTiers,
    createOffer,
    createMember,
    createPostDraft,
    completeStripeSubscription,
    impersonateMember,
    goToMembershipPage,
    openTierModal
};
