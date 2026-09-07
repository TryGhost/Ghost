import { page } from 'vitest/browser';
import {
  addFeatureImageLabel,
  conflictCancelReloadButton,
  conflictCopyContentButton,
  conflictDiscardAndReloadButton,
  conflictReloadButton,
  editorBody,
  editorConflictBanner,
  editorConflictReloadConfirm,
  editorExcerptInput,
  editorFeatureImage,
  editorFeatureImageCaption,
  editorHeaderActions,
  editorLeaveDialog,
  editorLoadError,
  editorPreviewButton,
  editorPublishButton,
  editorPublishInputsError,
  editorSaveButton,
  editorUnpublishButton,
  editorUnscheduleButton,
  editorUpdateButton,
  editorReauthBanner,
  editorScheduleCountdown,
  editorSaveErrorBanner,
  editorSecondaryInstance,
  editorStatus,
  editorTitleInput,
  editorWordCount,
  featureImageAltLabel,
  featureImageTkIndicator,
  featureImageUnsplashButton,
  leaveEditorButton,
  pagesBackLink,
  postEditor,
  postSettingsSidebar,
  postsBackLink,
  removeFeatureImageButton,
  settingsExcerptInput,
  settingsFeaturedToggle,
  settingsMenuToggle,
  stayInEditorButton,
  tkIndicator,
  toggleFeatureImageAltButton,
} from '@tryghost/test-data/selectors/editor';

/** Editor screen locators and gestures for acceptance specs; no assertions. */
export const editorScreen = {
  root: () => page.getByTestId(postEditor),
  titleInput: () => page.getByTestId(editorTitleInput),
  excerptInput: () => page.getByTestId(editorExcerptInput),
  /** The primary Koenig content editable. */
  body: () => page.getByTestId(editorBody).getByRole('textbox'),
  secondaryInstance: () => page.getByTestId(editorSecondaryInstance),
  wordCount: () => page.getByTestId(editorWordCount),
  loadError: () => page.getByTestId(editorLoadError),
  reauthBanner: () => page.getByTestId(editorReauthBanner),
  retryReauth: () => page.getByTestId(editorReauthBanner).getByRole('button', { name: 'Retry' }),
  conflictBanner: () => page.getByTestId(editorConflictBanner),
  reloadAfterConflict: () =>
    page.getByTestId(editorConflictBanner).getByRole('button', { name: conflictReloadButton }),
  copyConflictedContent: () =>
    page.getByTestId(editorConflictBanner).getByRole('button', { name: conflictCopyContentButton }),
  conflictReloadConfirm: () => page.getByTestId(editorConflictReloadConfirm),
  confirmConflictReload: () =>
    page
      .getByTestId(editorConflictReloadConfirm)
      .getByRole('button', { name: conflictDiscardAndReloadButton }),
  cancelConflictReload: () =>
    page
      .getByTestId(editorConflictReloadConfirm)
      .getByRole('button', { name: conflictCancelReloadButton }),
  status: () => page.getByTestId(editorStatus),

  headerActions: () => page.getByTestId(editorHeaderActions),
  previewButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorPreviewButton }),
  publishButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorPublishButton }),
  updateButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUpdateButton }),
  saveButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorSaveButton }),
  unpublishButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUnpublishButton }),
  unscheduleButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUnscheduleButton }),
  publishInputsError: () => page.getByTestId(editorPublishInputsError),
  retryPublishInputs: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: 'Retry' }),
  scheduleCountdown: () => page.getByTestId(editorScheduleCountdown),
  saveErrorBanner: () => page.getByTestId(editorSaveErrorBanner),
  leaveDialog: () => page.getByTestId(editorLeaveDialog),
  /** The leave dialog as a raw selector, for DOM-level sampling a locator cannot do. */
  leaveDialogSelector: `[data-testid="${editorLeaveDialog}"]`,
  stayInEditor: () =>
    page.getByTestId(editorLeaveDialog).getByRole('button', { name: stayInEditorButton }),
  leaveEditor: () =>
    page.getByTestId(editorLeaveDialog).getByRole('button', { name: leaveEditorButton }),
  dismissReauth: () =>
    page.getByTestId(editorReauthBanner).getByRole('button', { name: 'Dismiss' }),
  notFound: () => page.getByRole('heading', { name: 'Page not found' }),
  titleTkIndicator: () => page.getByTestId(tkIndicator),

  settingsToggle: () => page.getByTestId(settingsMenuToggle),
  settingsSidebar: () => page.getByTestId(postSettingsSidebar),
  settingsExcerpt: () => page.getByTestId(settingsExcerptInput),
  settingsFeatured: () => page.getByTestId(settingsFeaturedToggle),

  featureImage: () => page.getByTestId(editorFeatureImage),
  featureImageInput: () => page.getByLabelText(addFeatureImageLabel),
  featureImageUnsplashButton: () => page.getByRole('button', { name: featureImageUnsplashButton }),
  removeFeatureImage: () => page.getByRole('button', { name: removeFeatureImageButton }),
  featureImageAltToggle: () => page.getByRole('button', { name: toggleFeatureImageAltButton }),
  featureImageAltInput: () => page.getByLabelText(featureImageAltLabel),
  /** The caption's Koenig content editable. */
  featureImageCaption: () => page.getByTestId(editorFeatureImageCaption).getByRole('textbox'),
  featureImageTkIndicator: () => page.getByTestId(featureImageTkIndicator),
  backLink: (postType: 'post' | 'page') =>
    page.getByRole('link', {
      name: postType === 'page' ? pagesBackLink : postsBackLink,
      exact: true,
    }),
  /** Whether keyboard focus is inside the primary Koenig body. */
  bodyHasFocus: (): boolean =>
    document.querySelector(`[data-testid="${editorBody}"]`)?.contains(document.activeElement) ??
    false,
};
