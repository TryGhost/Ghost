const {expect, test} = require('@playwright/test');
const {createMember, deleteAllMembers} = require('../utils/e2e-browser-utils');
const fs = require('fs');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test.describe.configure({retries: 1});
        test('A member can be created', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('a[href="#/members/new/"] span');
            await page.locator('a[href="#/members/new/"] span:has-text("New member")').click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member';
            let email = 'tester@testmember.com';
            let note = 'This is a test member';
            let label = 'Test Label';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.type(label);
            await page.keyboard.press('Tab');
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Saved")');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // check number of members
            await expect(page.locator('[data-test-list="members-list-item"]')).toHaveCount(1);

            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
        });

        test('A member cannot be created with invalid email', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('a[href="#/members/new/"] span');
            await page.locator('a[href="#/members/new/"] span:has-text("New member")').click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member';
            let email = 'tester+invalid@testmember.com�';
            let note = 'This is a test member';
            let label = 'Test Label';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.type(label);
            await page.keyboard.press('Tab');
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Retry")');

            // check we are unable to save member with invalid email
            await expect(page.locator('button span:has-text("Retry")')).toBeVisible();
            await expect(page.locator('text=Invalid Email')).toBeVisible();
        });

        test('A member can be edited', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member Edited';
            let email = 'tester.edited@example.com';
            let note = 'This is an edited test member';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.press('Backspace');
            await page.locator('body').click(); // this is to close the dropdown & lose focus
            await page.locator('input[name="subscribed"] + span').click();
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Saved")');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // check number of members
            await expect(page.locator('[data-test-list="members-list-item"]')).toHaveCount(1);

            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
        });

        test('A member can be impersonated', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('[data-test-button="member-actions"]');
            await page.locator('[data-test-button="member-actions"]').click();
            await page.getByRole('button', {name: 'Impersonate'}).click();
            await page.getByRole('button', {name: 'Copy link'}).click();
            await page.waitForSelector('button span:has-text("Link copied")');
            // get value from input because we don't have access to the clipboard during headless testing
            const elem = await page.$('input[name="member-signin-url"]');
            const link = await elem.inputValue();
            await page.goto(link);
            await page.frameLocator('#ghost-portal-root iframe[title="portal-trigger"]').locator('div').nth(1).click();
            const title = await page.frameLocator('#ghost-portal-root div iframe[title="portal-popup"]').locator('h2').innerText();
            await expect(title).toEqual('Your account'); // this is the title of the popup when member is logged in
        });

        test('A member can be deleted', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('[data-test-button="member-actions"]');
            await page.locator('[data-test-button="member-actions"]').click();
            await page.getByRole('button', {name: 'Delete member'}).click();
            await page.locator('button[data-test-button="confirm"] span:has-text("Delete member")').click();
            // should have no members now, so we should see the empty state
            expect(await page.locator('div h4:has-text("Start building your audience")')).not.toBeNull();
        });

        const membersFixture = [
            {
                name: 'Test Member 1',
                email: 'test@member1.com',
                note: 'This is a test member',
                label: 'old'
            },
            {
                name: 'Test Member 2',
                email: 'test@member2.com',
                note: 'This is a test member',
                label: 'old'
            },
            {
                name: 'Test Member 3',
                email: 'test@member3.com',
                note: 'This is a test member',
                label: 'old'
            },
            {
                name: 'Sashi',
                email: 'test@member4.com',
                note: 'This is a test member',
                label: 'dog'
            },
            {
                name: 'Mia',
                email: 'test@member5.com',
                note: 'This is a test member',
                label: 'dog'
            },
            {
                name: 'Minki',
                email: 'test@member6.com',
                note: 'This is a test member',
                label: 'dog'
            }
        ];

        test('All members can be exported', async ({page}) => {
            // adds 6 members, 3 with the same label
            for (let member of membersFixture) {
                await createMember(page, member);
            }
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('button[data-test-button="export-members"]').click()
            ]);
            const filename = await download.suggestedFilename();
            expect(filename).toContain('.csv');
            const csv = await download.path();
            let csvContents = await fs.readFileSync(csv).toString();
            expect(csvContents).toMatch(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
            membersFixture.forEach((member) => {
                expect(csvContents).toMatch(member.name);
                expect(csvContents).toMatch(member.email);
                expect(csvContents).toMatch(member.note);
                expect(csvContents).toMatch(member.label);
            });
            // expect(csvContents).toMatch('Test Label'); we deleted the label in a previous test so it's not in this the export
            const countIds = csvContents.match(/[a-z0-9]{24}/gm).length;
            expect(countIds).toEqual(6);
            const countTimestamps = csvContents.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/gm).length;
            expect(countTimestamps).toEqual(6);
            const countRows = csvContents.match(/(?:"(?:[^"]|"")*"|[^,\n]*)(?:,(?:"(?:[^"]|"")*"|[^,\n]*))*\n/g).length;
            expect(countRows).toEqual(6);
            const csvRegex = /^[^",]+((?<=[,\n])|(?=[,\n]))|[^",]+/gm;
            expect(csvContents).toMatch(csvRegex);
        });

        test('A filtered list of members can be exported', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('div[data-test-button="members-filter-actions"]');
            await page.locator('div[data-test-button="members-filter-actions"]').click();
            await page.locator('select[data-test-select="members-filter"]').click();
            await page.locator('select[data-test-select="members-filter"]').selectOption('label');
            await page.locator('div[data-test-members-filter="0"] > div > div').click();
            await page.locator('span[data-test-label-filter="dog"]').click();
            await page.keyboard.press('Tab');
            await page.locator('button[data-test-button="members-apply-filter"]').click();
            await page.locator('button[data-test-button="members-actions"]').click();
            const exportButton = await page.locator('button[data-test-button="export-members"] > span').innerText();
            expect(exportButton).toEqual('Export selected members (3)');
            await page.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('button[data-test-button="export-members"]').click()
            ]);
            const filename = await download.suggestedFilename();
            expect(filename).toContain('.csv');
            const csv = await download.path();
            let csvContents = await fs.readFileSync(csv).toString();
            expect(csvContents).toMatch(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
            // filter memberFixtures to only include members with the label 'dog'
            const filteredMembersFixture = membersFixture.filter((member) => {
                return member.label === 'dog';
            });
            filteredMembersFixture.forEach((member) => {
                expect(csvContents).toMatch(member.name);
                expect(csvContents).toMatch(member.email);
                expect(csvContents).toMatch(member.note);
                expect(csvContents).toMatch('dog');
            });
            const countIds = csvContents.match(/[a-z0-9]{24}/gm).length;
            expect(countIds).toEqual(3);
            const countTimestamps = csvContents.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/gm).length;
            expect(countTimestamps).toEqual(3);
            const countRows = csvContents.match(/(?:"(?:[^"]|"")*"|[^,\n]*)(?:,(?:"(?:[^"]|"")*"|[^,\n]*))*\n/g).length;
            expect(countRows).toEqual(3);
            const csvRegex = /^[^",]+((?<=[,\n])|(?=[,\n]))|[^",]+/gm;
            expect(csvContents).toMatch(csvRegex);
        });

        // saves time by going directly to the members page with the label filter applied
        let labelFilterUrl;

        test('A filtered list of members can have a label added to them', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('div[data-test-button="members-filter-actions"]');
            await page.locator('div[data-test-button="members-filter-actions"]').click();
            await page.locator('select[data-test-select="members-filter"]').click();
            await page.locator('select[data-test-select="members-filter"]').selectOption('label');
            await page.locator('div[data-test-members-filter="0"] > div > div').click();
            await page.locator('span[data-test-label-filter="old"]').click(); // this label should only be on 3 members
            await page.keyboard.press('Tab');
            await page.locator('button[data-test-button="members-apply-filter"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.locator('button[data-test-button="add-label-selected"]').click();
            await page.locator('div[data-test-state="add-label-unconfirmed"] > span > select').selectOption({label: 'Test Label'});
            const members = await page.locator('div[data-test-state="add-label-unconfirmed"] > p > span[data-test-text="member-count"]').innerText();
            expect(members).toEqual('3 members');
            await page.locator('button[data-test-button="confirm"]').click();
            await page.waitForSelector('div[data-test-state="add-complete"]');
            const success = await page.locator('div[data-test-state="add-complete"] > div > p').innerText();
            expect(success).toEqual('Label added to 3 members successfully');
            labelFilterUrl = await page.url();
        });

        test('A filtered list of members can have a label removed from them', async ({page}) => {
            await page.goto(labelFilterUrl);
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('button[data-test-button="remove-label-selected"]');
            await page.locator('button[data-test-button="remove-label-selected"]').click();
            await page.locator('div[data-test-state="remove-label-unconfirmed"] > span > select').selectOption({label: 'old'});
            await page.locator('button[data-test-button="confirm"]').click();
            const success = await page.locator('div[data-test-state="remove-complete"] > div > p').innerText();
            expect(success).toEqual('Label removed from 3 members successfully');
        });

        test('A member can be granted a comp in admin', async ({page}) => {
            page.goto('/ghost');
            await deleteAllMembers(page);

            // create a new member with a comped plan
            await createMember(page, {
                name: 'Test Member 1',
                email: 'test@member1.com',
                note: 'This is a test member',
                label: 'Test Label',
                compedPlan: 'The Local Test'
            });

            // open the impersonate modal
            await page.locator('[data-test-button="member-actions"]').click();
            await page.getByRole('button', {name: 'Impersonate'}).click();
            await page.getByRole('button', {name: 'Copy link'}).click();
            await page.waitForSelector('button span:has-text("Link copied")');

            // get value from input because we don't have access to the clipboard during headless testing
            const elem = await page.$('input[name="member-signin-url"]');
            const link = await elem.inputValue();

            // go to the frontend with the impersonate link
            await page.goto(link);

            // click the paid-only post
            await page.locator('.post-card-image-link[href="/sell/"]').click();

            // check for content CTA and expect it to be zero
            await expect(page.locator('.gh-post-upgrade-cta')).toHaveCount(0);
        });

        test('An existing member cannot be saved with invalid email address', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('a[href="#/members/new/"] span');
            await page.locator('a[href="#/members/new/"] span:has-text("New member")').click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member';
            let email = 'tester+invalid@example.com';
            let note = 'This is a test member';
            let label = 'Test Label';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.type(label);
            await page.keyboard.press('Tab');
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Saved")');

            // Update email to invalid and try saving
            let updatedEmail = 'tester+invalid@example.com�';
            await page.fill('input[name="email"]', updatedEmail);
            await page.waitForSelector('button span:has-text("Save")');
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Retry")');

            // check we are unable to save member with invalid email
            await expect(page.locator('button span:has-text("Retry")')).toBeVisible();
            await expect(page.locator('text=Invalid Email')).toBeVisible();
        });
    });
});
