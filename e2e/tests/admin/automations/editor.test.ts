import {AutomationEditorPage} from '@/admin-pages';
import {type Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';

interface Automation {
    id: string;
    slug: string;
}

interface AutomationsResponse {
    automations: Automation[];
}

async function getFreeWelcomeAutomationId(page: Page): Promise<string> {
    const response = await page.request.get('/ghost/api/admin/automations/');
    expect(response.ok()).toBe(true);

    const {automations} = await response.json() as AutomationsResponse;
    const freeWelcomeAutomation = automations.find(automation => automation.slug === 'member-welcome-email-free');
    expect(freeWelcomeAutomation).toBeDefined();

    return freeWelcomeAutomation!.id;
}

test.describe('Ghost Admin - Automation Editor', () => {
    test.use({labs: {automations: true}});

    test('browser back from a dirty email editor - discards only email edits', async ({page}) => {
        const automationEditorPage = new AutomationEditorPage(page);
        const automationId = await getFreeWelcomeAutomationId(page);

        await automationEditorPage.gotoAutomation(automationId);
        await automationEditorPage.addWaitStepAtTail();
        await automationEditorPage.addEmailStepAtTail();
        await automationEditorPage.openEmailContentEditor();
        await automationEditorPage.replaceEmailBody('Temporary email body edit');

        await page.goBack();
        await expect(automationEditorPage.discardEmailChangesDialog).toBeVisible();
        await expect(automationEditorPage.discardAutomationChangesDialog).toBeHidden();
        await automationEditorPage.discardEmailChangesButton.click();

        await expect(automationEditorPage.emailContentModal).toBeHidden();
        await expect(automationEditorPage.editor).toBeVisible();
        await expect(automationEditorPage.waitStep).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/ghost/#/automations/${automationId}$`));
    });
});
