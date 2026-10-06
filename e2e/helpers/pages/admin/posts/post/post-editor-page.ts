import { AdminPage } from '@/admin-pages';
import { BasePage } from '@/helpers/pages';
import { DesktopPreviewFrame, PostPreviewModal } from '@/helpers/pages';
import { EditorHeader } from './post-editor-header';
import { FeatureImage } from './post-feature-image';
import { Locator, Page } from '@playwright/test';
import { PostSettingsSidebar } from './post-settings-sidebar';
import {
  editorBody,
  editorConflictBanner,
  editorReauthDialog,
  editorTitleInput,
  publishAtScheduleOption,
  publishConfirm,
  publishContinue,
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
  settingsMenuToggle,
} from '@tryghost/test-data/selectors/editor';

type PublishType = 'publish' | 'publish+send' | 'send';

// Both editors also mount a hidden Koenig instance; only the visible one takes input.
const VISIBLE_LEXICAL_EDITOR = '[data-secondary-instance="false"] [data-lexical-editor="true"]';

const PUBLISH_TYPE_OPTIONS: Record<PublishType, string> = {
  publish: publishTypePublishOnlyOption,
  'publish+send': publishTypePublishAndEmailOption,
  send: publishTypeEmailOnlyOption,
};

/** The session-expired sign-in prompt. */
class ReAuthenticateModal extends BasePage {
  readonly modal: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);

    this.modal = page.getByTestId(editorReauthDialog);
    this.passwordInput = this.modal.getByLabel('Password', { exact: true });
    this.signInButton = this.modal.getByRole('button', { name: /Sign in/ });
  }

  async signIn(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}

class PublishFlow extends BasePage {
  readonly modal: Locator;
  readonly publishButton: Locator;
  readonly optionsStep: Locator;
  readonly confirmStep: Locator;
  readonly publishTypeSetting: Locator;
  readonly publishTypeButton: Locator;
  readonly publishAtButton: Locator;
  readonly scheduleDateInput: Locator;
  readonly scheduleTimeInput: Locator;
  readonly emailRecipientsSetting: Locator;
  readonly continueButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    super(page);

    this.modal = page.getByTestId(publishFlowModal);
    this.publishButton = new EditorHeader(page).publishButton;
    this.optionsStep = page.getByTestId(publishFlowOptions);
    this.confirmStep = page.getByTestId(publishFlowConfirm);
    this.publishTypeSetting = page.getByTestId(publishSettingPublishType);
    this.publishTypeButton = this.publishTypeSetting.getByRole('button');
    this.publishAtButton = page.getByTestId(publishSettingPublishAt).getByRole('button');
    this.scheduleDateInput = page.getByTestId(publishScheduleDate);
    this.scheduleTimeInput = page.getByTestId(publishScheduleTime);
    this.emailRecipientsSetting = page.getByTestId(publishSettingEmailRecipients);
    this.continueButton = page.getByTestId(publishContinue);
    this.confirmButton = page.getByTestId(publishConfirm);
  }

  async open(): Promise<void> {
    await this.publishButton.click();
  }

  async selectPublishType(type: PublishType): Promise<void> {
    await this.publishTypeButton.click();
    await this.optionsStep
      .getByRole('radio', { name: PUBLISH_TYPE_OPTIONS[type], exact: true })
      .click();
  }

  async schedule({ date, time }: { date?: string; time?: string }): Promise<void> {
    await this.publishAtButton.click();
    await this.optionsStep
      .getByRole('radio', { name: publishAtScheduleOption, exact: true })
      .click();
    await this.scheduleDateInput.waitFor({ state: 'visible' });

    if (date) {
      await this.scheduleDateInput.fill(date);
      await this.scheduleDateInput.blur();
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
}

export class PostEditorPage extends AdminPage {
  readonly titleInput: Locator;
  readonly postStatus: Locator;
  readonly previewButton: Locator;
  readonly previewModal: PostPreviewModal;
  readonly settingsToggleButton: Locator;
  readonly publishFlow: PublishFlow;
  /** The primary instance's content editable. */
  readonly lexicalEditor: Locator;
  /** The body's container: readable while an open dialog hides the page from role queries. */
  readonly bodyBehindDialog: Locator;
  readonly publishSaveButton: Locator;
  readonly updateFlowButton: Locator;
  readonly revertToDraftButton: Locator;
  /** The header's link back to the list. */
  readonly backButton: Locator;
  /** The update-collision banner. */
  readonly conflictBanner: Locator;
  readonly reauthenticateModal: ReAuthenticateModal;
  readonly header: EditorHeader;
  readonly settings: PostSettingsSidebar;
  readonly featureImage: FeatureImage;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/editor/post/';

    this.header = new EditorHeader(page);

    this.titleInput = page.getByTestId(editorTitleInput);
    this.postStatus = this.header.status;
    this.previewButton = this.header.previewButton;
    this.previewModal = new PostPreviewModal(page);
    this.settingsToggleButton = page.getByTestId(settingsMenuToggle);
    this.publishFlow = new PublishFlow(page);
    this.lexicalEditor = page.getByTestId(editorBody).getByRole('textbox').first();
    this.bodyBehindDialog = page.getByTestId(editorBody);
    // Save or Update, whichever the post's status calls for.
    this.publishSaveButton = this.header.saveButton.or(this.header.updateButton);
    this.updateFlowButton = this.header.unpublishButton.or(this.header.unscheduleButton);
    this.revertToDraftButton = page.getByTestId(publishRevertToDraft);
    this.backButton = this.header.backLink;
    this.conflictBanner = page.getByTestId(editorConflictBanner);
    this.reauthenticateModal = new ReAuthenticateModal(page);

    this.settings = new PostSettingsSidebar(page, this.settingsToggleButton);
    this.featureImage = new FeatureImage(page);
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
    const editor = this.page.locator(VISIBLE_LEXICAL_EDITOR).first();

    await this.titleInput.click();
    await this.titleInput.fill(title);
    await editor.waitFor({ state: 'visible' });
    await this.page.keyboard.press('Enter');

    await this.page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return false;
      }

      const activeElement = document.activeElement;

      return Boolean(
        activeElement && (activeElement === element || element.contains(activeElement)),
      );
    }, VISIBLE_LEXICAL_EDITOR);

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

  /** Selects the whole body and types over it. */
  async replaceBody(text: string): Promise<void> {
    await this.lexicalEditor.click();
    await this.page.keyboard.press('ControlOrMeta+a');
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
