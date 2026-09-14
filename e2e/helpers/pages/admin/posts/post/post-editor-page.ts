import { AdminPage } from '@/admin-pages';
import { BasePage } from '@/helpers/pages';
import { DesktopPreviewFrame, PostPreviewModal } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  editorBody,
  editorConflictBanner,
  editorHeaderActions,
  editorPreviewButton,
  editorPublishButton,
  editorReauthBanner,
  editorSaveButton,
  editorSecondaryInstance,
  editorStatus,
  editorTitleInput,
  editorUnpublishButton,
  editorUnscheduleButton,
  editorUpdateButton,
  postsBackLink,
  publishAtScheduleOption,
  publishCompleteBookmark,
  publishConfirmButton,
  publishContinueButton,
  publishFlowComplete,
  publishFlowConfirm,
  publishFlowModal,
  publishFlowOptions,
  publishRevertToDraft,
  publishScheduleDate,
  publishScheduleTime,
  publishSettingEmailRecipients,
  publishSettingPublishAt,
  publishSettingPublishType,
  publishTypeEmailOnlyOption,
  publishTypePublishAndEmailOption,
  publishTypePublishOnlyOption,
} from '@tryghost/test-data/selectors/editor';

type PublishType = 'publish' | 'publish+send' | 'send';

/** React labels its publish-type radios; Ember marks them with a test attribute. */
const REACT_PUBLISH_TYPE_OPTIONS: Record<PublishType, string> = {
  publish: publishTypePublishOnlyOption,
  'publish+send': publishTypePublishAndEmailOption,
  send: publishTypeEmailOnlyOption,
};

class SettingsMenu extends BasePage {
  readonly postUrlInput: Locator;
  readonly publishDateInput: Locator;
  readonly publishTimeInput: Locator;
  readonly customExcerptInput: Locator;
  readonly deletePostButton: Locator;
  readonly deletePostConfirmButton: Locator;

  constructor(page: Page) {
    super(page);

    this.postUrlInput = page.getByRole('textbox', { name: 'Post URL' });
    this.publishDateInput = page.getByLabel('Date Picker');
    this.publishTimeInput = page.getByLabel('Time Picker');
    this.customExcerptInput = page.locator('[data-test-field="custom-excerpt"]');
    this.deletePostButton = page.locator('[data-test-button="delete-post"]');
    this.deletePostConfirmButton = page.locator('[data-test-button="delete-post-confirm"]');
  }

  async deletePost(): Promise<void> {
    await this.deletePostButton.click();
    await this.deletePostConfirmButton.click();
  }
}

class ReAuthenticateModal extends BasePage {
  readonly modal: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);

    this.modal = page.locator('[data-test-modal="re-authenticate"]');
    this.passwordInput = this.modal.getByLabel('Your password');
    this.signInButton = this.modal.getByRole('button', { name: /Sign in/ });
  }

  async signIn(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}

class PublishFlow extends BasePage {
  private readonly implementation: PostEditorImplementation;

  readonly modal: Locator;
  readonly publishButton: Locator;
  readonly optionsStep: Locator;
  readonly confirmStep: Locator;
  readonly completeStep: Locator;
  readonly publishTypeSetting: Locator;
  readonly publishTypeButton: Locator;
  readonly publishAtButton: Locator;
  readonly scheduleSummary: Locator;
  readonly scheduleDateInput: Locator;
  readonly scheduleTimeInput: Locator;
  readonly emailRecipientsSetting: Locator;
  readonly continueButton: Locator;
  readonly confirmButton: Locator;
  readonly closeButton: Locator;
  readonly completeBookmark: Locator;

  constructor(
    page: Page,
    { implementation = 'ember' }: { implementation?: PostEditorImplementation } = {},
  ) {
    super(page);
    this.implementation = implementation;

    const react = implementation === 'react';
    const publishAtSetting = page.getByTestId(publishSettingPublishAt);

    this.modal = react
      ? page.getByTestId(publishFlowModal)
      : page.locator('[data-test-modal="publish-flow"]');
    this.publishButton = react
      ? page
          .getByTestId(editorHeaderActions)
          .getByRole('button', { name: editorPublishButton, exact: true })
      : page.locator('[data-test-button="publish-flow"]').first();
    this.optionsStep = react
      ? page.getByTestId(publishFlowOptions)
      : page.locator('[data-test-publish-flow="options"]');
    this.confirmStep = react
      ? page.getByTestId(publishFlowConfirm)
      : page.locator('[data-test-publish-flow="confirm"]');
    this.completeStep = react
      ? page.getByTestId(publishFlowComplete)
      : page.locator('[data-test-publish-flow="complete"]');
    this.publishTypeSetting = react
      ? page.getByTestId(publishSettingPublishType)
      : page.locator('[data-test-setting="publish-type"]');
    this.publishTypeButton = react
      ? this.publishTypeSetting.getByRole('button')
      : this.publishTypeSetting.locator('> button');
    this.publishAtButton = react
      ? publishAtSetting.getByRole('button')
      : page.locator('[data-test-setting="publish-at"] > button');
    // React folds the summary into the row's toggle button rather than
    // titling a separate element.
    this.scheduleSummary = react
      ? publishAtSetting.getByRole('button')
      : page.locator('[data-test-setting="publish-at"] [data-test-setting-title]');
    this.scheduleDateInput = react
      ? page.getByTestId(publishScheduleDate)
      : page.locator('[data-test-date-time-picker-date-input]');
    this.scheduleTimeInput = react
      ? page.getByTestId(publishScheduleTime)
      : page.locator('[data-test-date-time-picker-time-input]');
    this.emailRecipientsSetting = react
      ? page.getByTestId(publishSettingEmailRecipients)
      : page.locator('[data-test-setting="email-recipients"]');
    this.continueButton = react
      ? page.getByTestId(publishContinueButton)
      : page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]');
    this.confirmButton = react
      ? page.getByTestId(publishConfirmButton)
      : page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]');
    this.closeButton = react
      ? this.modal.getByRole('button', { name: 'Close', exact: true })
      : page.locator('[data-test-button="close-publish-flow"]');
    this.completeBookmark = react
      ? page.getByTestId(publishCompleteBookmark)
      : page.locator('[data-test-complete-bookmark]');
  }

  async open(): Promise<void> {
    await this.publishButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }

  async selectPublishType(type: PublishType): Promise<void> {
    await this.publishTypeButton.click();

    if (this.implementation === 'react') {
      await this.optionsStep
        .getByRole('radio', { name: REACT_PUBLISH_TYPE_OPTIONS[type], exact: true })
        .click();
      return;
    }

    await this.page.locator(`[data-test-publish-type="${type}"] + label`).click();
  }

  async schedule({ date, time }: { date?: string; time?: string }): Promise<void> {
    if (this.implementation === 'react') {
      await this.scheduleReact({ date, time });
      return;
    }

    await this.publishAtButton.click();

    const textBeforeScheduleToggle = await this.scheduleSummary.textContent();
    await this.page.locator('[data-test-radio="schedule"] + label').click();
    await this.waitForScheduleSummaryChange(textBeforeScheduleToggle);

    if (date) {
      const textBeforeDateChange = await this.scheduleSummary.textContent();
      await this.scheduleDateInput.fill(date);
      await this.scheduleDateInput.blur();
      await this.waitForScheduleSummaryChange(textBeforeDateChange);
    }

    if (time) {
      await this.scheduleTimeInput.fill(time);
      await this.scheduleTimeInput.blur();
    }
  }

  /**
   * React's date field is read-only behind a calendar popover, so the only
   * reachable day is the default the schedule toggle picks.
   */
  private async scheduleReact({ date, time }: { date?: string; time?: string }): Promise<void> {
    if (date) {
      throw new Error('the React publish flow picks its date from a calendar, not a text field');
    }

    await this.publishAtButton.click();
    await this.optionsStep
      .getByRole('radio', { name: publishAtScheduleOption, exact: true })
      .click();
    await this.scheduleDateInput.waitFor({ state: 'visible' });

    if (time) {
      await this.scheduleTimeInput.fill(time);
      await this.scheduleTimeInput.blur();
    }
  }

  async confirm(): Promise<void> {
    await this.continueButton.click();
    await this.confirmButton.click({ force: true });
    await this.confirmButton.waitFor({ state: 'hidden' });
  }

  async openPublishedPost(): Promise<Page> {
    const [frontendPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.completeBookmark.click(),
    ]);
    return frontendPage;
  }

  private async waitForScheduleSummaryChange(previousText: string | null): Promise<void> {
    await this.page.waitForFunction((text) => {
      const element = document.querySelector(
        '[data-test-setting="publish-at"] [data-test-setting-title]',
      );
      const currentText = element?.textContent?.trim();
      return Boolean(currentText && currentText !== text?.trim());
    }, previousText);
  }
}

/** Which implementation serves the editor — decided by the `editorReact` flag. */
export type PostEditorImplementation = 'ember' | 'react';

export class PostEditorPage extends AdminPage {
  readonly titleInput: Locator;
  readonly postStatus: Locator;
  readonly previewButton: Locator;
  readonly previewModal: PostPreviewModal;
  readonly settingsToggleButton: Locator;
  readonly publishFlow: PublishFlow;
  readonly screenTitle: Locator;
  readonly lexicalEditor: Locator;
  readonly secondaryEditor: Locator;
  readonly publishSaveButton: Locator;
  readonly updateFlowButton: Locator;
  readonly revertToDraftButton: Locator;
  /**
   * The back link. Located by its test attribute rather than by role: its
   * accessible name carries the inlined arrow icon's title, so "Posts" is
   * really "arrow-left Posts".
   */
  readonly backButton: Locator;
  /** The session-expired prompt: Ember's modal, React's banner. */
  readonly reauthPrompt: Locator;
  /** React's update-collision banner. */
  readonly conflictBanner: Locator;

  readonly settingsMenu: SettingsMenu;
  readonly reauthenticateModal: ReAuthenticateModal;

  constructor(
    page: Page,
    { implementation = 'ember' }: { implementation?: PostEditorImplementation } = {},
  ) {
    super(page);
    this.pageUrl = '/ghost/#/editor/post/';

    const react = implementation === 'react';

    const headerActions = page.getByTestId(editorHeaderActions);

    this.titleInput = react
      ? page.getByTestId(editorTitleInput)
      : page.locator('[data-test-editor-title-input]');
    // Both chips settle on a "Saved" reading; only the attribute differs.
    this.postStatus = react
      ? page.getByTestId(editorStatus)
      : page.locator('[data-test-editor-post-status]');
    // The publish flow carries a Preview button of its own, so React's is
    // scoped to the header.
    this.previewButton = react
      ? headerActions.getByRole('button', { name: editorPreviewButton, exact: true })
      : page.getByRole('button', { name: 'Preview' });
    this.previewModal = new PostPreviewModal(page, { implementation });
    this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
    this.publishFlow = new PublishFlow(page, { implementation });
    this.screenTitle = page.locator('[data-test-screen-title]');
    // Ember marks the Koenig container; React wraps each instance in its own
    // testid, and the contenteditable is the textbox inside the primary one.
    this.lexicalEditor = react
      ? page.getByTestId(editorBody).getByRole('textbox').first()
      : page.locator('[data-kg="editor"]').first();
    this.secondaryEditor = react
      ? page.getByTestId(editorSecondaryInstance)
      : page.locator('[data-secondary-instance="true"]');
    // Ember labels one primary button Save or Update; React renders whichever
    // of the two the post's status calls for.
    this.publishSaveButton = react
      ? headerActions.getByRole('button', {
          name: new RegExp(`^(${editorSaveButton}|${editorUpdateButton})$`),
        })
      : page.locator('[data-test-button="publish-save"]').first();
    this.updateFlowButton = react
      ? headerActions.getByRole('button', {
          name: new RegExp(`^(${editorUnpublishButton}|${editorUnscheduleButton})$`),
        })
      : page.locator('[data-test-button="update-flow"]').first();
    this.revertToDraftButton = react
      ? page.getByTestId(publishRevertToDraft)
      : page.locator('[data-test-button="revert-to-draft"]');
    // Ember's back link carries the inlined arrow icon's title in its
    // accessible name; React's is a plain link named for the list.
    this.backButton = react
      ? page.getByRole('link', { name: postsBackLink, exact: true })
      : page.locator('[data-test-breadcrumb]');

    this.settingsMenu = new SettingsMenu(page);
    this.reauthenticateModal = new ReAuthenticateModal(page);

    this.reauthPrompt = react
      ? page.getByTestId(editorReauthBanner)
      : this.reauthenticateModal.modal;
    this.conflictBanner = page.getByTestId(editorConflictBanner);
  }

  /**
   * The id of the post currently open in the editor. Waits for the URL to
   * carry an id first: a new draft only gets one after its first save.
   */
  async getPostId(): Promise<string> {
    await this.page.waitForURL(/#\/editor\/post\/[0-9a-f]{24}/);
    const match = this.page.url().match(/#\/editor\/post\/([0-9a-f]{24})/);
    if (!match) {
      throw new Error(`No post id in editor URL: ${this.page.url()}`);
    }
    return match[1];
  }

  async gotoPost(postId: string): Promise<void> {
    await this.page.goto(`/ghost/#/editor/post/${postId}`);
    await this.titleInput.waitFor({ state: 'visible' });
  }

  async createDraft({ title = 'Hello world', body = 'This is my post body.' } = {}): Promise<void> {
    const editor = this.page.locator('[data-lexical-editor="true"]').first();

    await this.titleInput.click();
    await this.titleInput.fill(title);
    await editor.waitFor({ state: 'visible' });
    await this.page.keyboard.press('Enter');

    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-lexical-editor="true"]');
      if (!element) {
        return false;
      }

      const activeElement = document.activeElement;

      return Boolean(
        activeElement && (activeElement === element || element.contains(activeElement)),
      );
    });

    await this.page.keyboard.type(body);
  }

  /** React holds "Saving…" for a minimum display window, so this outlasts it. */
  async waitForSaved(): Promise<void> {
    await this.postStatus.filter({ hasText: /Saved/ }).waitFor({ timeout: 30000 });
  }

  async appendToBody(text: string): Promise<void> {
    await this.lexicalEditor.click();
    // The click can land the caret mid-content; select all and collapse the
    // selection so the text is genuinely appended at the end
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('ArrowRight');
    await this.page.keyboard.type(text);
  }

  async revertToDraft(): Promise<void> {
    await this.updateFlowButton.click();
    await this.revertToDraftButton.click();
  }

  get previewModalDesktopFrame(): DesktopPreviewFrame {
    return this.previewModal.desktopPreview;
  }
}

export class PageEditorPage extends PostEditorPage {
  readonly newPageButton: Locator;

  // Ember only: the React page editor names its back link "Pages", which this
  // class would inherit as "Posts". Give it the option once a spec needs it.
  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/pages';
    this.newPageButton = page.locator('[data-test-new-page-button]');
  }

  async gotoNew(): Promise<void> {
    await this.page.goto(this.pageUrl);
    await this.newPageButton.click();
    await this.titleInput.waitFor({ state: 'visible' });
  }
}
