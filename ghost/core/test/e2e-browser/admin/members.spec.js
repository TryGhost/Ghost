const {expect, test} = require('@playwright/test');
const e = require('express');

test.describe('Admin', () => {
    test.describe('Members', () => {
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
            const count = await page.locator('tbody > tr').count();
            expect(count).toBe(1);
            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
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
            const count = await page.locator('tbody > tr').count();
            expect(count).toBe(1);
            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
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
    });
});
