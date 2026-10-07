import { Locator, Page } from '@playwright/test';
import {
  editorHeaderActions,
  editorPreviewButton,
  editorPublishButton,
  editorPublishInputsError,
  editorSaveButton,
  editorSaveErrorBanner,
  editorScheduleCountdown,
  editorStatus,
  editorUnpublishButton,
  editorUnscheduleButton,
  editorUpdateButton,
  postsBackLink,
} from '@tryghost/test-data/selectors/editor';

/** The React editor's header: the back link, the status line and the actions. */
export class EditorHeader {
  readonly actions: Locator;
  readonly backLink: Locator;
  readonly status: Locator;
  readonly scheduleCountdown: Locator;
  readonly saveErrorBanner: Locator;
  readonly publishInputsError: Locator;
  readonly previewButton: Locator;
  readonly publishButton: Locator;
  readonly updateButton: Locator;
  readonly saveButton: Locator;
  readonly unpublishButton: Locator;
  readonly unscheduleButton: Locator;

  constructor(page: Page) {
    this.actions = page.getByTestId(editorHeaderActions);
    this.backLink = page.getByRole('link', { name: postsBackLink, exact: true });
    this.status = page.getByTestId(editorStatus);
    this.scheduleCountdown = page.getByTestId(editorScheduleCountdown);
    this.saveErrorBanner = page.getByTestId(editorSaveErrorBanner);
    this.publishInputsError = page.getByTestId(editorPublishInputsError);
    // The publish flow carries a Preview button of its own, so every action is
    // scoped to the header.
    this.previewButton = this.actionButton(editorPreviewButton);
    this.publishButton = this.actionButton(editorPublishButton);
    this.updateButton = this.actionButton(editorUpdateButton);
    this.saveButton = this.actionButton(editorSaveButton);
    this.unpublishButton = this.actionButton(editorUnpublishButton);
    this.unscheduleButton = this.actionButton(editorUnscheduleButton);
  }

  async preview(): Promise<void> {
    await this.previewButton.click();
  }

  /** Opens the publish flow. */
  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  async update(): Promise<void> {
    await this.updateButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  private actionButton(name: string): Locator {
    return this.actions.getByRole('button', { name, exact: true });
  }
}
