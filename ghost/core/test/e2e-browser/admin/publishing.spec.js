const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

test.describe('Publishing', () => {
    test.describe('Lexical Rendering', () => {
        test.describe.configure({retries: 1});

        test('Renders Lexical editor', async ({sharedPage: adminPage}) => {
            await adminPage.goto('/ghost');

            await createPostDraft(adminPage, {title: 'Lexical editor test', body: 'This is my post body.'});

            // Check if the lexical editor is present
            expect(await adminPage.locator('[data-kg="editor"]').first()).toBeVisible();
        });

        test('Renders secondary hidden lexical editor', async ({sharedPage: adminPage}) => {
            await adminPage.goto('/ghost');
            await createPostDraft(adminPage, {title: 'Secondary lexical editor test', body: 'This is my post body.'});
            const secondaryLexicalEditor = adminPage.locator('[data-secondary-instance="true"]');
            // Check if the secondary lexical editor exists
            await expect(secondaryLexicalEditor).toHaveCount(1);
            // Check if it is hidden
            await expect(secondaryLexicalEditor).toBeHidden();
        });
    });
});
