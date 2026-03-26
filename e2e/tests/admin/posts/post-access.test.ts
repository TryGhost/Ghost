import {MemberDetailsPage, PostEditorPage, PostsPage, SettingsPage, SidebarPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createMemberFactory, createTierFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Post Access', () => {
    test('members-only post shows content gate for non-members', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Members only post', body: 'This is my post body.'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await editor.settingsMenu.setVisibility('members');

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPostBookmark();
        const postPage = new PostPage(frontendPage);

        await expect(postPage.contentGateHeading).toHaveText('This post is for subscribers only');
    });

    test('paid-only post shows content gate for non-paying visitors', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Paid only post', body: 'This is my post body.'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await editor.settingsMenu.setVisibility('paid');

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPostBookmark();
        const postPage = new PostPage(frontendPage);

        await expect(postPage.contentGateHeading).toHaveText('This post is for paying subscribers only');
    });

    test('public post is visible to everyone', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Public post test', body: 'This is my post body.'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await editor.settingsMenu.setVisibility('public');

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPostBookmark();
        const postPage = new PostPage(frontendPage);

        await expect(postPage.postBody).toHaveText('This is my post body.');
    });

    test('specific tier access restricts post to selected tier members', async ({page}) => {
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

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPostBookmark();
        const postPage = new PostPage(frontendPage);
        await editor.publishFlow.close();

        await expect(postPage.contentGateHeading).toContainText('on the Gold tier only');

        const memberDetails = new MemberDetailsPage(page);

        await memberDetails.gotoMember(silverMember.id);
        const silverLink = await memberDetails.impersonate();
        await frontendPage.goto(silverLink);
        await postPage.goto('/tier-restricted-post/');
        await expect(postPage.contentGateHeading).toContainText('on the Gold tier only');

        await memberDetails.gotoMember(goldMember.id);
        const goldLink = await memberDetails.impersonate();
        await frontendPage.goto(goldLink);
        await postPage.goto('/tier-restricted-post/');
        await expect(postPage.contentGate).toBeHidden();
        await expect(postPage.postBody).toHaveText('Only gold members can see this');
    });

    // Requires per-test isolation: changes site timezone setting
    test('publish time displays correctly after timezone change', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Published in timezones', body: 'Published in timezones'});
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.openSettingsMenu();
        await expect(editor.settingsMenu.publishTimezone).toHaveText('UTC');

        await editor.settingsMenu.datepickerButton.click();
        await editor.settingsMenu.calendarPreviousMonth.click();
        await editor.settingsMenu.getCalendarDay('15').click();
        await editor.settingsMenu.publishTimeInput.fill('12:00');
        await editor.pressKey('Tab');
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

        await settingsPage.exitSettingsButton.click();
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
            {key: 'editor_default_email_recipients', value: 'disabled'}
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

        await expect(editor.publishFlow.emailRecipientsTitle).toContainText(/\d+\s*subscriber/);
    });
});
