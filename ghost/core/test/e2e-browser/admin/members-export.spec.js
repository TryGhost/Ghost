const {expect, test} = require('@playwright/test');
const {createMember, deleteAllMembers} = require('../utils');
const {membersFixture} = require('../fixtures/members');
const fs = require('fs');
const papaparse = require('papaparse');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test('Can be exported', async ({page}) => {
            await page.goto('/ghost');
            await deleteAllMembers(page);
            // adds 6 members, 3 with the same label
            for (let member of membersFixture) {
                await createMember(
                    page,
                    {name: member.name, email: member.email, label: member.labels, note: member.note}
                );
            }

            await test.step('Go to members page and find Export button', async () => {
                await page.locator('[data-test-nav="members"]').click();
                await page.waitForSelector('[data-test-button="members-actions"]');
                await page.locator('[data-test-button="members-actions"]').click();
                await page.waitForSelector('[data-test-button="export-members"]');
            });

            await checkCSVContent(page, {
                fixture: membersFixture,
                stepDescription: 'Download csv and check that it contains all members data'
            });

            await test.step('Open member filter', async () => {
                await page.waitForSelector('div[data-test-button="members-filter-actions"]');
                await page.locator('div[data-test-button="members-filter-actions"]').click();
                await page.locator('select[data-test-select="members-filter"]').click();
            });

            await test.step('Filter members by "Dog" label', async () => {
                await page.locator('[data-test-select="members-filter"]').selectOption('label');
                await page.locator('div[data-test-members-filter="0"] > div > div').click();
                await page.locator('[data-test-label-filter="dog"]').click();
                await page.keyboard.press('Tab');
                await page.locator('[data-test-button="members-apply-filter"]').click();
            });

            await test.step('Click Export filtered members button', async () => {
                await page.waitForSelector('[data-test-button="members-actions"]');
                await page.locator('[data-test-button="members-actions"]').click();
                await page.waitForSelector('[data-test-button="export-members"]');
            });

            // filter memberFixtures to only include members with the label 'dog'
            const filteredMembersFixture = membersFixture.filter((member) => {
                return member.labels === 'dog';
            });
            await checkCSVContent(page, {
                fixture: filteredMembersFixture,
                stepDescription: 'Download csv and check that it contains filtered members data'
            });
        });
    });
});

/**
 * Check csv content
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {Array} [options.fixture]
 * @param {String} stepDescription
 */
async function checkCSVContent(page, {fixture, stepDescription}) {
    return await test.step(stepDescription, async () => {
        const CSV_COLUMNS = ['id','email','name','note','subscribed_to_emails','complimentary_plan','stripe_customer_id','created_at','deleted_at','labels','tiers'];
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.locator('button[data-test-button="export-members"]').click()
        ]);
        const filename = await download.suggestedFilename();
        expect(filename).toContain('.csv');
        const csv = await download.path();
        const csvContents = fs.readFileSync(csv).toString();
        const parsedData = papaparse.parse(csvContents, {header: true});
        // check columns
        expect(parsedData.meta.fields).toEqual(CSV_COLUMNS);
        // check amount of rows
        expect(parsedData.data.length).toEqual(fixture.length);
        // check that all data from fixtures in csv
        expect(parsedData.data).toMatchObject(fixture);
    });
}
