import { page } from 'vitest/browser';
import {
  editorBody,
  editorExcerptInput,
  editorLoadError,
  editorSecondaryInstance,
  editorTitleInput,
  editorWordCount,
  pagesBackLink,
  postEditor,
  postsBackLink,
  tkIndicator,
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
  notFound: () => page.getByRole('heading', { name: 'Page not found' }),
  titleTkIndicator: () => page.getByTestId(tkIndicator),
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
