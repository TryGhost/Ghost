const {expect, test} = require('@playwright/test');
const {createMember, deleteAllMembers, getUniqueName, getUniqueEmail, impersonateMember, openPortal} = require('../utils');
const {membersFixture} = require('../fixtures/members');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test('A member can be created', async ({page}) => {
            const name = getUniqueName('Test Member');
            const email = getUniqueEmail();
            await createMember(page, {name, email});

            await test.step('Member should be visible on Members page', async () => {
                await page.locator('[data-test-nav="members"]').click();
                const member = await page.locator(`[data-test-member-email="${email}"]`);
                await expect(member.getByText(name)).toBeVisible();
                await expect(member.getByText(email)).toBeVisible();
            });
        });

        test('A member cannot be created with invalid email', async ({page}) => {
            const name = getUniqueName('Test Member');
            const email = 'tester+invalid@testmember.com�';
            let note = 'This is a test member';
            let label = 'Test Label';
            await createMember(page, {name, email, note, label, invalid: true});

            await test.step('Invalid email error should be visible', async () => {
                await expect(page.locator('text=Invalid Email')).toBeVisible();
            });
        });

        test('A member can be edited', async ({page}) => {
            const name = getUniqueName('Test Member');
            const email = getUniqueEmail();
            const note = 'This is a test member';
            const label = 'Test label';
            await createMember(page, {name, email, note, label});

            const updatedName = getUniqueName('Test Member Updated');
            const updatedEmail = getUniqueEmail();
            const updatedNote = 'This is an edited test member';

            await test.step('Open Edit member page', async () => {
                await page.locator('[data-test-nav="members"]').click();
                await page.locator(`[data-test-member-email="${email}"]`).click();
            });

            await test.step('Update member info', async () => {
                await page.waitForSelector('input[name="name"]');
                await page.fill('[data-test-input="member-name"]', updatedName);
                await page.fill('[data-test-input="member-email"]', updatedEmail);
                await page.fill('[data-test-input="member-note"]', updatedNote);
                await page.locator('[data-test-input="member-settings-label"]').click();
                await page.keyboard.press('Backspace');
                await page.locator('[data-test-switch="member-subscribed"]').click();
                await page.locator('[data-test-button="save"]').click();
                await page.waitForSelector('[data-test-button="save"]:has-text("Saved")');
            });

            await test.step('Member should be updated on Members page', async () => {
                await page.locator('[data-test-nav="members"]').click();
                const member = await page.locator(`[data-test-member-email="${updatedEmail}"]`);
                await expect(member.getByText(updatedName)).toBeVisible();
                await expect(member.getByText(updatedEmail)).toBeVisible();
            });
        });

        test('A member can be impersonated', async ({page}) => {
            const name = getUniqueName('Test Member');
            const email = getUniqueEmail();

            await createMember(page, {name, email});
            await impersonateMember(page);
            const portalFrame = await openPortal(page);

            await test.step('Sign out button should be available in portal', async () => {
                await expect(portalFrame.locator('[data-test-button="footer-signout"]')).toBeVisible();
            });
        });

        test('A member can be deleted', async ({page}) => {
            const name = getUniqueName('Test Member');
            const email = getUniqueEmail();

            await createMember(page, {name, email});

            await test.step('Delete member', async () => {
                await page.waitForSelector('[data-test-button="member-actions"]');
                await page.locator('[data-test-button="member-actions"]').click();
                await page.locator('[data-test-button="delete-member"]').click();
                // confirm action in modal
                await page.locator('[data-test-modal="delete-member"] [data-test-button="confirm"]').click();
            });

            await test.step('Member should not be visible on Members page', async () => {
                await page.locator('[data-test-nav="members"]').click();
                await expect(page.locator(`[data-test-member-email="${name}"]`)).toBeHidden();
            });
        });

        // saves time by going directly to the members page with the label filter applied
        let labelFilterUrl;

        test.only('A filtered list of members can have a label added to them', async ({page}) => {
            await page.goto('/ghost');
            await deleteAllMembers(page);
            // adds 6 members, 3 with the same label
            for (let member of membersFixture) {
                await createMember(
                    page,
                    {name: member.name, email: member.email, label: member.labels, note: member.note}
                );
            }

            await test.step('Go to members page and open Filter dropdown', async () => {
                await page.locator('[data-test-nav="members"]').click();
                await page.waitForSelector('[data-test-button="members-filter-actions"]');
                await page.locator('[data-test-button="members-filter-actions"]').click();
            });
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
