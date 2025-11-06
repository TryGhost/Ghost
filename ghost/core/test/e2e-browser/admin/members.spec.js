const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember} = require('../utils/e2e-browser-utils');
const fs = require('fs');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test.describe.configure({retries: 1, mode: 'serial'});

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

        test('All members can be exported', async ({sharedPage}) => {
            // adds 6 members, 3 with the same label
            for (let member of membersFixture) {
                await createMember(sharedPage, member);
            }
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();
            await sharedPage.waitForSelector('button[data-test-button="members-actions"]');
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            await sharedPage.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                sharedPage.waitForEvent('download'),
                sharedPage.locator('button[data-test-button="export-members"]').click()
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

        test('A filtered list of members can be exported', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();
            await sharedPage.waitForSelector('button[data-test-button="members-actions"]');
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            await sharedPage.waitForSelector('div[data-test-button="members-filter-actions"]');
            await sharedPage.locator('div[data-test-button="members-filter-actions"]').click();
            await sharedPage.locator('select[data-test-select="members-filter"]').click();
            await sharedPage.locator('select[data-test-select="members-filter"]').selectOption('label');
            await sharedPage.locator('div[data-test-members-filter="0"] > div > div').click();
            await sharedPage.locator('span[data-test-label-filter="dog"]').click();
            await sharedPage.keyboard.press('Tab');
            await sharedPage.locator('button[data-test-button="members-apply-filter"]').click();
            await sharedPage.locator('button[data-test-button="members-actions"]').click();
            const exportButton = await sharedPage.locator('button[data-test-button="export-members"] > span').innerText();
            expect(exportButton).toEqual('Export selected members (3)');
            await sharedPage.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                sharedPage.waitForEvent('download'),
                sharedPage.locator('button[data-test-button="export-members"]').click()
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
