import { AdminPage } from '@/admin-pages';
import { BasePage } from '@/helpers/pages';
import { DesktopPreviewFrame, PostPreviewModal } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  editorBody,
  editorConflictBanner,
  editorReauthBanner,
  editorSecondaryInstance,
  editorTitleInput,
  postsBackLink,
} from '@tryghost/test-data/selectors/editor';

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
  readonly publishButton: Locator;
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

  constructor(page: Page) {
    super(page);

    this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
    this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
    this.publishTypeButton = this.publishTypeSetting.locator('> button');
    this.publishAtButton = page.locator('[data-test-setting="publish-at"] > button');
    this.scheduleSummary = page.locator(
      '[data-test-setting="publish-at"] [data-test-setting-title]',
    );
    this.scheduleDateInput = page.locator('[data-test-date-time-picker-date-input]');
    this.scheduleTimeInput = page.locator('[data-test-date-time-picker-time-input]');
    this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
    this.continueButton = page.locator(
      '[data-test-modal="publish-flow"] [data-test-button="continue"]',
    );
    this.confirmButton = page.locator(
      '[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]',
    );
    this.closeButton = page.locator('[data-test-button="close-publish-flow"]');
    this.completeBookmark = page.locator('[data-test-complete-bookmark]');
  }

  async open(): Promise<void> {
    await this.publishButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }

  async selectPublishType(type: 'publish' | 'publish+send' | 'send'): Promise<void> {
    await this.publishTypeButton.click();
    await this.page.locator(`[data-test-publish-type="${type}"] + label`).click();
  }

  async schedule({ date, time }: { date?: string; time?: string }): Promise<void> {
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
  private readonly implementation: PostEditorImplementation;

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
    this.implementation = implementation;
    this.pageUrl = '/ghost/#/editor/post/';

    const react = implementation === 'react';

    this.titleInput = react
      ? page.getByTestId(editorTitleInput)
      : page.locator('[data-test-editor-title-input]');
    // React has no save-state chip yet; `waitForSaved` refuses rather than
    // resolving this against nothing.
    this.postStatus = page.locator('[data-test-editor-post-status]');
    this.previewButton = page.getByRole('button', { name: 'Preview' });
    this.previewModal = new PostPreviewModal(page);
    this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
    this.publishFlow = new PublishFlow(page);
    this.screenTitle = page.locator('[data-test-screen-title]');
    // Ember marks the Koenig container; React wraps each instance in its own
    // testid, and the contenteditable is the textbox inside the primary one.
    this.lexicalEditor = react
      ? page.getByTestId(editorBody).getByRole('textbox').first()
      : page.locator('[data-kg="editor"]').first();
    this.secondaryEditor = react
      ? page.getByTestId(editorSecondaryInstance)
      : page.locator('[data-secondary-instance="true"]');
    this.publishSaveButton = page.locator('[data-test-button="publish-save"]').first();
    this.updateFlowButton = page.locator('[data-test-button="update-flow"]').first();
    this.revertToDraftButton = page.locator('[data-test-button="revert-to-draft"]');
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

  async waitForSaved(): Promise<void> {
    if (this.implementation === 'react') {
      // The React editor renders no save-state chip, so there is nothing to
      // read; wait on the save request or the persisted record instead.
      throw new Error('waitForSaved reads the Ember status chip; the React editor has none');
    }

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
