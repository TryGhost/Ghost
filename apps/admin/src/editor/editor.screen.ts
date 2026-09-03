import { page } from 'vitest/browser';
import {
  addFeatureImageLabel,
  editorBody,
  editorConflictBanner,
  editorExcerptInput,
  editorFeatureImage,
  editorFeatureImageCaption,
  editorLoadError,
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
  pagesBackLink,
  postEditor,
  postsBackLink,
  removeFeatureImageButton,
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
  status: () => page.getByTestId(editorStatus),
  scheduleCountdown: () => page.getByTestId(editorScheduleCountdown),
  saveErrorBanner: () => page.getByTestId(editorSaveErrorBanner),
  dismissReauth: () =>
    page.getByTestId(editorReauthBanner).getByRole('button', { name: 'Dismiss' }),
  notFound: () => page.getByRole('heading', { name: 'Page not found' }),
  titleTkIndicator: () => page.getByTestId(tkIndicator),

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
