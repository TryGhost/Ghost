const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const fs = require('fs');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test.describe.configure({retries: 1, mode: 'serial'});
        
        // saves time by going directly to the members page with the label filter applied
        let labelFilterUrl;

        test('A filtered list of members can have a label added to them', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();
            await sharedPage.waitForSelector('button[data-test-button="members-actions"]');
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            await sharedPage.waitForSelector('div[data-test-button="members-filter-actions"]');
            await sharedPage.locator('div[data-test-button="members-filter-actions"]').click();
            await sharedPage.locator('select[data-test-select="members-filter"]').click();
            await sharedPage.locator('select[data-test-select="members-filter"]').selectOption('label');
            await sharedPage.locator('div[data-test-members-filter="0"] > div > div').click();
            await sharedPage.locator('span[data-test-label-filter="old"]').click(); // this label should only be on 3 members
            await sharedPage.keyboard.press('Tab');
            await sharedPage.locator('button[data-test-button="members-apply-filter"]').click();
            await sharedPage.waitForSelector('button[data-test-button="members-actions"]');
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            await sharedPage.locator('button[data-test-button="add-label-selected"]').click();
            await sharedPage.locator('div[data-test-state="add-label-unconfirmed"] > span > select').selectOption({label: 'dog'});
            const members = await sharedPage.locator('div[data-test-state="add-label-unconfirmed"] > p > span[data-test-text="member-count"]').innerText();
            expect(members).toEqual('3 members');
            await sharedPage.locator('button[data-test-button="confirm"]').click();
            await sharedPage.waitForSelector('div[data-test-state="add-complete"]');
            const success = await sharedPage.locator('div[data-test-state="add-complete"] > div > p').innerText();
            expect(success).toEqual('Label added to 3 members successfully');
            labelFilterUrl = await sharedPage.url();
            await sharedPage.locator('button[data-test-button="close-modal"]').click();
        });

        test('A filtered list of members can have a label removed from them', async ({sharedPage}) => {
            await sharedPage.goto(labelFilterUrl);
            await sharedPage.waitForSelector('button[data-test-button="members-actions"]');
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            await sharedPage.waitForSelector('button[data-test-button="remove-label-selected"]');
            await sharedPage.locator('button[data-test-button="remove-label-selected"]').click();
            await sharedPage.locator('div[data-test-state="remove-label-unconfirmed"] > span > select').selectOption({label: 'old'});
            await sharedPage.locator('button[data-test-button="confirm"]').click();
            const success = await sharedPage.locator('div[data-test-state="remove-complete"] > div > p').innerText();
            expect(success).toEqual('Label removed from 3 members successfully');
        });
    });
});
