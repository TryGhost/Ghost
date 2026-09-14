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
  postHistoryModal,
  postHistoryPreview,
  postHistoryPreviewBody,
  postHistoryPreviewExcerpt,
  postHistoryPreviewFeatureImage,
  postHistoryPreviewTitle,
  postHistoryRestoreConfirm,
  postHistoryRevisionList,
  postSettingsSidebar,
  postsBackLink,
  removeFeatureImageButton,
  settingsAuthorChip,
  settingsAuthorsError,
  settingsAuthorsList,
  settingsAuthorsPicker,
  settingsDeleteButton,
  settingsDeleteCancelButton,
  settingsDeleteConfirmButton,
  settingsDeleteDialog,
  settingsDeleteError,
  settingsExcerptInput,
  settingsFeaturedToggle,
  settingsMenuToggle,
  settingsPublishDate,
  settingsPublishDateError,
  settingsPublishDateNote,
  settingsPublishTime,
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsSerpPreview,
  restoreRevisionButton,
  settingsPostHistoryButton,
  settingsShowTitleToggle,
  settingsShowTitleWarning,
  settingsSlugError,
  settingsSlugInput,
  settingsSubviewPane,
  settingsTagsField,
  settingsTagsInput,
  settingsTagsList,
  settingsTagsToken,
  settingsTemplateSelect,
  settingsTemplateSlugMatch,
  settingsTiersError,
  settingsTiersPicker,
  settingsUrlPreview,
  settingsVisibilitySelect,
  showTitleLearnMoreLink,
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
  settingsShowTitle: () => page.getByTestId(settingsShowTitleToggle),
  settingsShowTitleWarning: () => page.getByTestId(settingsShowTitleWarning),
  settingsShowTitleLearnMore: () =>
    page.getByTestId(settingsShowTitleWarning).getByRole('link', { name: showTitleLearnMoreLink }),
  settingsSlug: () => page.getByTestId(settingsSlugInput),
  settingsSlugError: () => page.getByTestId(settingsSlugError),
  settingsUrlPreview: () => page.getByTestId(settingsUrlPreview),
  settingsVisibility: () => page.getByTestId(settingsVisibilitySelect),
  settingsVisibilityOption: (label: string) =>
    page.getByRole('listbox').getByRole('option', { name: label, exact: true }),
  settingsTiers: () => page.getByTestId(settingsTiersPicker),
  settingsTier: (name: string) =>
    page.getByTestId(settingsTiersPicker).getByRole('checkbox', { name }),
  settingsTiersError: () => page.getByTestId(settingsTiersError),
  settingsTagsField: () => page.getByTestId(settingsTagsField),
  settingsTagsInput: () => page.getByTestId(settingsTagsInput),
  settingsTagsTokens: () => page.getByTestId(settingsTagsToken),
  settingsTagOption: (name: string | RegExp) =>
    page.getByTestId(settingsTagsList).getByRole('option', { name }),
  removeSettingsTag: (name: string) =>
    page
      .getByTestId(settingsTagsField)
      .getByRole('button', { name: `Remove ${name}`, exact: true }),
  settingsTemplate: () => page.getByTestId(settingsTemplateSelect),
  settingsTemplateOption: (label: string) =>
    page.getByRole('listbox').getByRole('option', { name: label, exact: true }),
  settingsTemplateSlugMatch: () => page.getByTestId(settingsTemplateSlugMatch),
  settingsPublishDate: () => page.getByTestId(settingsPublishDate),
  settingsPublishTime: () => page.getByTestId(settingsPublishTime),
  settingsPublishDateError: () => page.getByTestId(settingsPublishDateError),
  settingsPublishDateNote: () => page.getByTestId(settingsPublishDateNote),
  settingsPublishDateLabel: () =>
    page.getByTestId(postSettingsSidebar).getByText(/^(Publish|Scheduled) date$/),
  settingsAuthors: () => page.getByTestId(settingsAuthorsPicker),
  settingsAuthorsInput: () => page.getByTestId(settingsAuthorsPicker).getByRole('combobox'),
  settingsAuthorsList: () => page.getByTestId(settingsAuthorsList),
  settingsAuthorOption: (name: string) =>
    page.getByTestId(settingsAuthorsList).getByRole('option', { name }),
  removeAuthor: (name: string) =>
    page.getByTestId(settingsAuthorsPicker).getByRole('button', { name: `Remove ${name}` }),
  settingsAuthorsError: () => page.getByTestId(settingsAuthorsError),
  /** The author chips in the order the field lists them. */
  settingsAuthorNames: (): string[] =>
    page
      .getByTestId(settingsAuthorChip)
      .elements()
      .map((chip) => chip.textContent?.trim() ?? ''),
  settingsDelete: () => page.getByTestId(settingsDeleteButton),
  settingsDeleteDialog: () => page.getByTestId(settingsDeleteDialog),
  confirmSettingsDelete: () =>
    page
      .getByTestId(settingsDeleteDialog)
      .getByRole('button', { name: settingsDeleteConfirmButton, exact: true }),
  cancelSettingsDelete: () =>
    page
      .getByTestId(settingsDeleteDialog)
      .getByRole('button', { name: settingsDeleteCancelButton, exact: true }),
  settingsDeleteError: () => page.getByTestId(settingsDeleteError),
  /** The row in the section list that opens a subview pane. */
  settingsSubviewRow: (label: string) =>
    page.getByTestId(postSettingsSidebar).getByRole('button', { name: label, exact: true }),
  settingsSubviewPane: () => page.getByTestId(settingsSubviewPane),
  settingsSubviewBack: (label: string) => page.getByRole('button', { name: label, exact: true }),
  settingsMetaTitle: () => page.getByTestId(settingsMetaTitleInput),
  settingsMetaDescription: () => page.getByTestId(settingsMetaDescriptionInput),
  settingsSerpPreview: () => page.getByTestId(settingsSerpPreview),

  settingsPostHistory: () => page.getByTestId(settingsPostHistoryButton),
  postHistoryModal: () => page.getByTestId(postHistoryModal),
  postHistoryRevisions: () => page.getByTestId(postHistoryRevisionList).getByRole('listitem'),
  /** One revision row, with the controls it carries. */
  postHistoryRevision: (index: number) => {
    const row = page.getByTestId(postHistoryRevisionList).getByRole('listitem').nth(index);
    return Object.assign(row, {
      select: () => row.getByRole('button').first(),
      restore: () => row.getByRole('button', { name: restoreRevisionButton }),
    });
  },
  postHistoryPreview: () => page.getByTestId(postHistoryPreview),
  postHistoryPreviewTitle: () => page.getByTestId(postHistoryPreviewTitle),
  postHistoryPreviewExcerpt: () => page.getByTestId(postHistoryPreviewExcerpt),
  postHistoryPreviewFeatureImage: () => page.getByTestId(postHistoryPreviewFeatureImage),
  /** The read-only Koenig rendering of the selected version. */
  postHistoryPreviewBody: () => page.getByTestId(postHistoryPreviewBody),
  restoreConfirm: () => page.getByTestId(postHistoryRestoreConfirm),
  confirmRestore: () =>
    page
      .getByTestId(postHistoryRestoreConfirm)
      .getByRole('button', { name: restoreRevisionButton }),

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
