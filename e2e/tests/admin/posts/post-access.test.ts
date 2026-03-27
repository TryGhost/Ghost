import {MemberDetailsPage, PostEditorPage, PostsPage, SettingsPage, SidebarPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {PostPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createMemberFactory, createTierFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

type Visibility = 'public' | 'members' | 'paid' | 'tiers';

async function publishPostWithVisibility(page: Page, options: {title: string; body: string; visibility: Visibility}) {
    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft({title: options.title, body: options.body});
    await expect(editor.postStatus).toContainText('Draft - Saved');

    await editor.openSettingsMenu();
    const visibilitySavePromise = page.waitForResponse(
        resp => resp.url().includes('/posts/') && resp.request().method() === 'PUT',
        {timeout: 5000}
    ).catch(() => {});
    await editor.settingsMenu.setVisibility(options.visibility);
    await visibilitySavePromise;

    await editor.publishFlow.open();
    await editor.publishFlow.confirm();

    const slug = options.title.toLowerCase().replace(/\s+/g, '-');
    const postPage = new PostPage(page);
    await postPage.goto(`/${slug}/`);
    return {editor, postPage};
}

test.describe('Ghost Admin - Post Access', () => {
    test('members-only post shows content gate for non-members', async ({page}) => {
        const {postPage} = await publishPostWithVisibility(page, {
            title: 'Members only post', body: 'This is my post body.', visibility: 'members'
        });

        await expect(postPage.contentGateHeading).toHaveText('This post is for subscribers only');
    });

    test('paid-only post shows content gate for non-paying visitors', async ({page}) => {
        const {postPage} = await publishPostWithVisibility(page, {
            title: 'Paid only post', body: 'This is my post body.', visibility: 'paid'
        });

        await expect(postPage.contentGateHeading).toHaveText('This post is for paying subscribers only');
    });

    test('public post is visible to everyone', async ({page}) => {
        const {postPage} = await publishPostWithVisibility(page, {
            title: 'Public post test', body: 'This is my post body.', visibility: 'public'
        });

        await expect(postPage.postBody).toHaveText('This is my post body.');
    });

    test('specific tier access restricts post to selected tier members', async ({page, browser, baseURL}) => {
        test.slow(); // This test creates tiers, members, publishes, and checks 3 visitor types
        const tierFactory = createTierFactory(page.request);
        const memberFactory = createMemberFactory(page.request);

        const silverTier = await tierFactory.create({name: 'Silver', monthly_price: 500, yearly_price: 5000});
        const goldTier = await tierFactory.create({name: 'Gold', monthly_price: 1000, yearly_price: 10000});

        const silverMember = await memberFactory.create({
            email: 'silver@example.com',
            name: 'Silver Member',
            tiers: [{id: silverTier.id, name: silverTier.name, slug: silverTier.slug, type: 'paid', active: true}]
        });
        const goldMember = await memberFactory.create({
            email: 'gold@example.com',
            name: 'Gold Member',
            tiers: [{id: goldTier.id, name: goldTier.name, slug: goldTier.slug, type: 'paid', active: true}]
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Tier restricted post', body: 'Only gold members can see this'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await editor.settingsMenu.setVisibility('tiers');
        await editor.settingsMenu.clearAllTiers();
        await editor.settingsMenu.selectTier('Gold');

        // Wait for all enqueued saves to complete — the post status shows
        // "Saving..." while any save task is running and returns to "Draft"
        // once all enqueued saves are done
        await expect(editor.postStatus).not.toContainText('Saving', {timeout: 10000});
        await expect(editor.postStatus).toContainText('Draft');

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();

        // Unauthenticated visitor sees content gate
        const anonContext = await browser.newContext({baseURL});
        const anonPage = await anonContext.newPage();
        const anonPostPage = new PostPage(anonPage);
        await anonPostPage.goto('/tier-restricted-post/');
        await expect(anonPostPage.contentGateHeading).toContainText('on the Gold tier only');
        await anonContext.close();

        const memberDetails = new MemberDetailsPage(page);

        // Silver member still sees content gate
        await memberDetails.gotoMember(silverMember.id);
        const silverLink = await memberDetails.impersonate();
        const silverContext = await browser.newContext({baseURL});
        const silverPage = await silverContext.newPage();
        await silverPage.goto(silverLink, {waitUntil: 'load'});
        const silverPostPage = new PostPage(silverPage);
        await silverPostPage.goto('/tier-restricted-post/');
        await expect(silverPostPage.contentGateHeading).toContainText('on the Gold tier only');
        await silverContext.close();

        // Gold member can see the post content
        await memberDetails.gotoMember(goldMember.id);
        const goldLink = await memberDetails.impersonate();
        const goldContext = await browser.newContext({baseURL});
        const goldPage = await goldContext.newPage();
        await goldPage.goto(goldLink, {waitUntil: 'load'});
        const goldPostPage = new PostPage(goldPage);
        await goldPostPage.goto('/tier-restricted-post/');
        await expect(goldPostPage.contentGate).toBeHidden();
        await expect(goldPostPage.postBody).toHaveText('Only gold members can see this');
        await goldContext.close();
    });

    // Requires per-test isolation: changes site timezone setting
    test('publish time displays correctly after timezone change', async ({page}) => {
        test.slow(); // This test publishes, changes timezone, and verifies time conversion
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Published in timezones', body: 'Published in timezones'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await expect(editor.settingsMenu.publishTimezone).toHaveText('UTC');

        const dateSavePromise = page.waitForResponse(
            resp => resp.url().includes('/posts/') && resp.request().method() === 'PUT',
            {timeout: 5000}
        ).catch(() => {});
        await editor.settingsMenu.datepickerButton.click();
        await editor.settingsMenu.calendarPreviousMonth.click();
        await editor.settingsMenu.getCalendarDay('15').click();
        await dateSavePromise;
        // Wait for any re-renders from the date save to settle
        await expect(editor.settingsMenu.publishDateInput).toHaveValue(/-15$/);

        await editor.settingsMenu.publishTimeInput.click();
        await page.keyboard.press('Meta+a');
        await page.keyboard.type('12:00', {delay: 50});
        // Tab away to trigger the blur handler which saves the time
        const timeSavePromise = page.waitForResponse(
            resp => resp.url().includes('/posts/') && resp.request().method() === 'PUT',
            {timeout: 5000}
        ).catch(() => {});
        await editor.pressKey('Tab');
        await timeSavePromise;
        await expect(editor.settingsMenu.publishTimeInput).toHaveValue('12:00');

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await expect(settingsPage.timezoneSection).toContainText('UTC');

        await settingsPage.timezoneSelect.click();
        await settingsPage.getSelectOption('Tokyo').click();
        await settingsPage.timezoneSaveButton.click();
        await expect(settingsPage.timezoneSection).toContainText('(GMT +9:00) Osaka, Sapporo, Tokyo');
        // Wait for the save button to disappear or show "Saved"
        await expect(settingsPage.timezoneSaveButton).toBeHidden({timeout: 5000});

        await settingsPage.exitSettingsButton.click();
        // Handle "unsaved changes" confirmation if it appears
        const leaveButton = page.getByRole('button', {name: 'Leave'});
        if (await leaveButton.isVisible({timeout: 1000}).catch(() => false)) {
            await leaveButton.click();
        }
        const sidebar = new SidebarPage(page);
        await sidebar.getNavLink('Posts').click();
        await postsPage.getPostById(/Published in timezones/).click();

        await editor.openSettingsMenu();
        await expect(editor.settingsMenu.publishTimezone).toHaveText('JST');
        await expect(editor.settingsMenu.publishTimeInput).toHaveValue('21:00');
        await expect(editor.settingsMenu.publishDateInput).toHaveValue(/-15$/);
    });

    // Requires per-test isolation: changes editor_default_email_recipients setting
    test('default recipient setting "usually nobody" hides newsletter by default', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.updateSettings([
            {key: 'editor_default_email_recipients', value: 'filter'},
            {key: 'editor_default_email_recipients_filter', value: null}
        ]);

        const memberFactory = createMemberFactory(page.request);
        await memberFactory.create({
            name: 'Test Member Recipient',
            email: 'test@recipient.com'
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Default recipients test', body: 'Testing default recipients'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.publishFlow.open();

        await expect(editor.publishFlow.publishTypeTitle).toContainText('Publish');
        await expect(editor.publishFlow.emailRecipientsTitle).toContainText('Not sent as newsletter');

        await editor.publishFlow.publishTypeTitle.click();

        await expect(editor.publishFlow.publishAndSendRadio).toBeEnabled();
        await expect(editor.publishFlow.sendOnlyRadio).toBeEnabled();

        await editor.publishFlow.clickPublishAndSendLabel();

        await expect(editor.publishFlow.emailRecipientsTitle).toContainText('subscriber');
    });
});
