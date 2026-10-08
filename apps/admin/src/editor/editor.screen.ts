import { page } from 'vitest/browser';
import { getScrollParent } from '@tryghost/shade/utils';
import {
  addFacebookImageLabel,
  addFeatureImageLabel,
  addXImageLabel,
  analyticsBackLink,
  chooseDateButton,
  conflictCancelReloadButton,
  conflictCopyContentButton,
  conflictDiscardAndReloadButton,
  conflictReloadButton,
  editFacebookImageButton,
  editFeatureImageButton,
  editXImageButton,
  editorBody,
  editorConflictBanner,
  editorConflictReloadConfirm,
  editorExcerptInput,
  editorFeatureImage,
  editorFeatureImageCaption,
  editorHeaderActions,
  editorHelpLink,
  editorLeaveDialog,
  editorLoadError,
  editorNewerVersionNotice,
  editorNewsletterDetailsButton,
  editorPreviewButton,
  editorPublishButton,
  editorPublishInputsError,
  editorRetryNewsletterButton,
  editorSaveButton,
  editorUnpublishButton,
  editorUnscheduleButton,
  editorUpdateButton,
  editorReauthDialog,
  editorScheduleCountdown,
  editorSaveError,
  editorSecondaryInstance,
  editorSentStatusButton,
  editorStatus,
  editorTitleInput,
  editorWordCount,
  editorEmailSizeDetails,
  editorEmailSizeWarning,
  facebookImageUnsplashButton,
  featureImageAltLabel,
  featureImageHiddenIndicator,
  featureImageTkIndicator,
  featureImageUnsplashButton,
  leaveEditorButton,
  newerVersionReloadButton,
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
  removeFacebookImageButton,
  removeFeatureImageButton,
  removeXImageButton,
  settingsAuthorChip,
  settingsAuthorsError,
  settingsAuthorsList,
  settingsAuthorsPicker,
  settingsCanonicalUrlInput,
  settingsDeleteButton,
  settingsDeleteCancelButton,
  settingsDeleteConfirmButton,
  settingsDeleteDialog,
  settingsDeleteError,
  settingsExcerptInput,
  settingsLoadError,
  settingsFacebookDescriptionInput,
  settingsFacebookPreview,
  settingsFacebookPreviewImage,
  settingsFacebookTitleInput,
  settingsFeaturedToggle,
  settingsMenuToggle,
  settingsPublishDate,
  settingsPublishDateError,
  settingsPublishDateNote,
  settingsPublishTime,
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsSerpPreview,
  settingsShortcutRow,
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
  xImageUnsplashButton,
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
  settingsTierChip,
  settingsTiersList,
  settingsTiersPicker,
  settingsUrlPreview,
  settingsVisibilitySelect,
  showTitleLearnMoreLink,
  stayInEditorButton,
  titleHiddenIndicator,
  tkIndicator,
  toggleFeatureImageAltButton,
  unsplashSearchHeading,
  unsplashSearchModal,
} from '@tryghost/test-data/selectors/editor';

/** Editor screen locators and gestures for acceptance specs; no assertions. */
export const editorScreen = {
  root: () => page.getByTestId(postEditor),
  titleInput: () => page.getByTestId(editorTitleInput),
  excerptInput: () => page.getByTestId(editorExcerptInput),
  /** The primary Koenig content editable. */
  body: () => page.getByTestId(editorBody).getByRole('textbox'),
  /** The placeholder Koenig shows in an empty body. */
  bodyPlaceholder: (postType: 'post' | 'page' = 'post') =>
    page.getByTestId(editorBody).getByText(`Begin writing your ${postType}...`, { exact: true }),
  /** The body's container: readable while an open dialog hides the page from role queries. */
  bodyBehindDialog: () => page.getByTestId(editorBody),
  /** Koenig's Signup card and its labels setting, by Koenig's own test ids. */
  signupCard: () => page.getByTestId(editorBody).getByTestId('signup-card-container'),
  signupLabelsInput: () => page.getByTestId('labels-dropdown').getByRole('textbox'),
  signupLabelOption: (name: string) =>
    page.getByTestId('labels-dropdown').getByRole('button', { name, exact: true }),
  secondaryInstance: () => page.getByTestId(editorSecondaryInstance),
  /** An item in Koenig's `/` card menu, by its label. */
  cardMenuItem: (label: string) => page.getByRole('menuitem', { name: label }),
  wordCount: () => page.getByTestId(editorWordCount),
  /** The footer's clipping flag, and the details hovering it reveals. */
  emailSizeWarning: () => page.getByTestId(editorEmailSizeWarning),
  emailSizeDetails: () => page.getByTestId(editorEmailSizeDetails),
  helpLink: () => page.getByRole('link', { name: editorHelpLink }),
  /** The document's own scroll surface, independent of the editor shell. */
  scrollPane: (): HTMLElement => {
    const root = page.getByTestId(postEditor).element();
    const pane = Array.from(root.querySelectorAll('div')).find((element) =>
      ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
    );
    if (!pane) {
      throw new Error('The editor document has no scroll surface');
    }
    return pane;
  },
  loadError: () => page.getByTestId(editorLoadError),
  retryLoad: () => page.getByTestId(editorLoadError).getByRole('button', { name: 'Retry' }),
  /** The sign-in dialog a save that finds no session opens, and its two steps. */
  reauthDialog: () => page.getByTestId(editorReauthDialog),
  reauthEmail: () => page.getByTestId(editorReauthDialog).getByLabelText('Email'),
  reauthPassword: () => page.getByTestId(editorReauthDialog).getByLabelText('Password'),
  reauthSignIn: () => page.getByTestId(editorReauthDialog).getByRole('button', { name: 'Sign in' }),
  reauthCode: () => page.getByTestId(editorReauthDialog).getByLabelText('Verification code'),
  reauthVerify: () => page.getByTestId(editorReauthDialog).getByRole('button', { name: 'Verify' }),
  /** The code step's Resend by the label it reads, which is Sent while it holds. */
  reauthResend: (label: 'Resend' | 'Sent' = 'Resend') =>
    page.getByTestId(editorReauthDialog).getByRole('button', { name: label, exact: true }),
  codeSentToast: () =>
    page
      .getByRole('listitem')
      .filter({ hasText: 'A new verification code has been sent to your email.' }),
  reauthError: () => page.getByTestId(editorReauthDialog).getByRole('alert'),
  cancelReauth: () => page.getByTestId(editorReauthDialog).getByRole('button', { name: 'Cancel' }),
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
  newerVersionNotice: () => page.getByTestId(editorNewerVersionNotice),
  reloadNewerVersion: () =>
    page
      .getByTestId(editorNewerVersionNotice)
      .getByRole('button', { name: newerVersionReloadButton }),
  status: () => page.getByTestId(editorStatus),
  /** The status line's ways back into the publish flow once a newsletter failed. */
  retryNewsletter: () =>
    page.getByTestId(editorStatus).getByRole('button', { name: editorRetryNewsletterButton }),
  viewNewsletterDetails: () =>
    page.getByTestId(editorStatus).getByRole('button', { name: editorNewsletterDetailsButton }),
  /** The status line's way into the update flow once a post was sent. */
  sentStatusButton: () =>
    page
      .getByTestId(editorStatus)
      .getByRole('button', { name: editorSentStatusButton, exact: true }),

  /** In the header row, or below the small breakpoint in the bottom bar. */
  headerActions: () => page.getByTestId(editorHeaderActions),
  previewButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorPreviewButton }),
  publishButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorPublishButton }),
  /** Publish while an open dialog hides the header from role queries. */
  publishButtonBehindDialog: () =>
    page
      .getByTestId(editorHeaderActions)
      .getByRole('button', { name: editorPublishButton, includeHidden: true }),
  updateButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUpdateButton }),
  saveButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorSaveButton }),
  unpublishButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUnpublishButton }),
  unscheduleButton: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: editorUnscheduleButton }),
  /** A header button by its whole label, for a save button whose label tracks its save. */
  headerButton: (label: string) =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: label, exact: true }),
  saveToast: (title: string) => page.getByRole('listitem').filter({ hasText: title }),
  publishInputsError: () => page.getByTestId(editorPublishInputsError),
  retryPublishInputs: () =>
    page.getByTestId(editorHeaderActions).getByRole('button', { name: 'Retry' }),
  scheduleCountdown: () => page.getByTestId(editorScheduleCountdown),
  /** A failed or refused save, which the status line reports in place of the status. */
  saveError: () => page.getByTestId(editorStatus).getByTestId(editorSaveError),
  retrySave: () =>
    page
      .getByTestId(editorStatus)
      .getByTestId(editorSaveError)
      .getByRole('button', { name: 'Retry' }),
  leaveDialog: () => page.getByTestId(editorLeaveDialog),
  /** The leave dialog as a raw selector, for DOM-level sampling a locator cannot do. */
  leaveDialogSelector: `[data-testid="${editorLeaveDialog}"]`,
  stayInEditor: () =>
    page.getByTestId(editorLeaveDialog).getByRole('button', { name: stayInEditorButton }),
  leaveEditor: () =>
    page.getByTestId(editorLeaveDialog).getByRole('button', { name: leaveEditorButton }),
  notFound: () => page.getByRole('heading', { name: 'Page not found' }),
  titleTkIndicator: () => page.getByTestId(tkIndicator),
  /** The marks a page that leaves out its title and feature image puts beside them. */
  titleHiddenIndicator: () => page.getByTestId(titleHiddenIndicator),
  featureImageHiddenIndicator: () => page.getByTestId(featureImageHiddenIndicator),
  /** The tooltip a hovered control shows, by its text. */
  tooltip: (text: string) => page.getByRole('tooltip', { name: text, exact: true }),

  settingsToggle: () => page.getByTestId(settingsMenuToggle),
  settingsSidebar: () => page.getByTestId(postSettingsSidebar),
  /** The settings fields scroll independently of their fixed heading. */
  settingsScrollPane: (): HTMLElement => {
    const sidebar = page.getByTestId(postSettingsSidebar).element();
    const pane = Array.from(sidebar.querySelectorAll('div')).find((element) =>
      ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
    );
    if (!pane) {
      throw new Error('The editor settings have no scroll surface');
    }
    return pane;
  },
  settingsExcerpt: () => page.getByTestId(settingsExcerptInput),
  /** A section's failed-browse notice, wherever the sidebar shows one. */
  settingsLoadError: () => page.getByTestId(settingsLoadError),
  settingsLoadErrorRetry: () =>
    page.getByTestId(settingsLoadError).getByRole('button', { name: 'Retry', exact: true }),
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
  settingsTiersInput: () => page.getByTestId(settingsTiersPicker).getByRole('combobox'),
  /** A tier's row in the open list; `aria-selected` says whether the post grants it. */
  settingsTierOption: (name: string) =>
    page.getByTestId(settingsTiersList).getByRole('option', { name, exact: true }),
  settingsTierGroup: (name: string) =>
    page.getByTestId(settingsTiersList).getByRole('group', { name, exact: true }),
  settingsTierChips: () => page.getByTestId(settingsTierChip),
  settingsTierChip: (name: string) =>
    page.getByTestId(settingsTiersPicker).getByRole('button', { name: `Remove ${name}` }),
  /** Opens the tier list and picks or unpicks a tier in it. */
  toggleSettingsTier: async (name: string) => {
    await page.getByTestId(settingsTiersPicker).getByRole('combobox').click();
    await page.getByTestId(settingsTiersList).getByRole('option', { name, exact: true }).click();
  },
  settingsTiersError: () => page.getByTestId(settingsTiersError),
  settingsTagsField: () => page.getByTestId(settingsTagsField),
  settingsTagsInput: () => page.getByTestId(settingsTagsInput),
  settingsTagsTokens: () => page.getByTestId(settingsTagsToken),
  settingsTagOption: (name: string | RegExp) =>
    page.getByTestId(settingsTagsList).getByRole('option', { name }),
  settingsTagOptions: () => page.getByTestId(settingsTagsList).getByRole('option'),
  /** Scrolls the open tag list to its last row. */
  scrollSettingsTagListToEnd: (): void => {
    const scroller = getScrollParent(page.getByTestId(settingsTagsList).element());
    scroller?.scrollTo({ top: scroller.scrollHeight });
  },
  removeSettingsTag: (name: string) =>
    page
      .getByTestId(settingsTagsField)
      .getByRole('button', { name: `Remove ${name}`, exact: true }),
  settingsTemplate: () => page.getByTestId(settingsTemplateSelect),
  settingsTemplateOption: (label: string) =>
    page.getByRole('listbox').getByRole('option', { name: label, exact: true }),
  settingsTemplateSlugMatch: () => page.getByTestId(settingsTemplateSlugMatch),
  settingsPublishDate: () => page.getByTestId(settingsPublishDate),
  settingsPublishDateCalendarButton: () =>
    page
      .getByTestId(postSettingsSidebar)
      .getByRole('button', { name: chooseDateButton, exact: true }),
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
  settingsCanonicalUrl: () => page.getByTestId(settingsCanonicalUrlInput),
  settingsSerpPreview: () => page.getByTestId(settingsSerpPreview),
  /** CodeMirror exposes its content as a textbox named by the editor's label. */
  settingsCodeInjection: (label: string) =>
    page.getByRole('textbox', { name: new RegExp(`^${label}`) }),
  /** Each keyboard-shortcut row as its label followed by the keys shown against it. */
  settingsShortcutRows: (): string[] =>
    page
      .getByTestId(settingsShortcutRow)
      .elements()
      .map((row) => row.textContent ?? ''),
  settingsXImage: () => page.getByTestId(settingsXImage),
  settingsXImageInput: () => page.getByLabelText(addXImageLabel),
  settingsXImageUnsplashButton: () => page.getByRole('button', { name: xImageUnsplashButton }),
  removeSettingsXImage: () => page.getByRole('button', { name: removeXImageButton }),
  editSettingsXImage: () => page.getByRole('button', { name: editXImageButton }),
  settingsXTitle: () => page.getByTestId(settingsXTitleInput),
  settingsXDescription: () => page.getByTestId(settingsXDescriptionInput),
  settingsXPreview: () => page.getByTestId(settingsXPreview),
  settingsXPreviewImage: () => page.getByTestId(settingsXPreviewImage),
  settingsFacebookTitle: () => page.getByTestId(settingsFacebookTitleInput),
  settingsFacebookDescription: () => page.getByTestId(settingsFacebookDescriptionInput),
  settingsFacebookPreview: () => page.getByTestId(settingsFacebookPreview),
  settingsFacebookPreviewImage: () => page.getByTestId(settingsFacebookPreviewImage),
  settingsFacebookImageInput: () => page.getByLabelText(addFacebookImageLabel),
  settingsFacebookImageUnsplashButton: () =>
    page.getByRole('button', { name: facebookImageUnsplashButton }),
  removeSettingsFacebookImage: () => page.getByRole('button', { name: removeFacebookImageButton }),
  editSettingsFacebookImage: () => page.getByRole('button', { name: editFacebookImageButton }),

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
  /** A card Koenig has selected in the preview, if any. */
  postHistoryPreviewSelectedCard: () =>
    document.querySelector(
      `[data-testid="${postHistoryPreviewBody}"] [data-kg-card-selected="true"]`,
    ),
  restoreConfirm: () => page.getByTestId(postHistoryRestoreConfirm),
  confirmRestore: () =>
    page
      .getByTestId(postHistoryRestoreConfirm)
      .getByRole('button', { name: restoreRevisionButton }),

  featureImage: () => page.getByTestId(editorFeatureImage),
  featureImageInput: () => page.getByLabelText(addFeatureImageLabel),
  featureImageUnsplashButton: () => page.getByRole('button', { name: featureImageUnsplashButton }),
  /** The Unsplash search modal, wherever the picker that opened it sits. */
  unsplashModal: () => page.getByRole('heading', { name: unsplashSearchHeading }),
  unsplashSearch: () => page.getByTestId(unsplashSearchModal),
  unsplashSearchInput: () => page.getByPlaceholder('Search free high-resolution photos'),
  unsplashInsertImage: () => page.getByTestId(unsplashSearchModal).getByText('Insert image'),
  removeFeatureImage: () => page.getByRole('button', { name: removeFeatureImageButton }),
  editFeatureImage: () => page.getByRole('button', { name: editFeatureImageButton }),
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
  analyticsBackLink: () => page.getByRole('link', { name: analyticsBackLink, exact: true }),
  /** Whether keyboard focus is inside the primary Koenig body. */
  bodyHasFocus: (): boolean =>
    document.querySelector(`[data-testid="${editorBody}"]`)?.contains(document.activeElement) ??
    false,
};
