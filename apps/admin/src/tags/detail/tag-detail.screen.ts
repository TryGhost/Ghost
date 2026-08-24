import { page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/tags';

/** The geometry CodeMirror's body-hosted autocomplete tooltip must satisfy; null until it renders. */
export interface AutocompleteTooltipProbe {
  containerBackground: string;
  containerHeight: number;
  hostParent: string | undefined;
  tooltipOnscreen: boolean;
  tooltipPosition: string;
}

/** Tag detail screen locators and gestures for acceptance specs; no assertions. */
export const tagDetailScreen = {
  detail: () => page.getByTestId(sel.tagDetail),
  title: () => page.getByTestId(sel.tagDetailTitle),
  internalBadge: () => page.getByTestId(sel.tagDetailInternalBadge),
  coreDataCard: () => page.getByTestId(sel.tagCoreDataCard),
  metadataCard: () => page.getByTestId(sel.tagMetadataCard),
  codeInjectionCard: () => page.getByTestId(sel.tagCodeInjectionCard),
  slugPreview: () => page.getByTestId(sel.tagSlugPreview),

  // exact: "Name"/"Slug"/"Description" are substrings of the metadata labels.
  nameInput: () => page.getByLabelText(sel.nameFieldLabel, { exact: true }),
  slugInput: () => page.getByLabelText(sel.slugFieldLabel, { exact: true }),
  descriptionInput: () => page.getByLabelText(sel.descriptionFieldLabel, { exact: true }),
  metaTitleInput: () => page.getByLabelText('Meta title'),
  xTitleInput: () => page.getByLabelText('X title'),
  facebookTitleInput: () => page.getByLabelText('Facebook title'),
  searchPreviewLabel: () => page.getByText('Search Engine Result Preview', { exact: true }),
  xPreviewLabel: () => page.getByText('X preview', { exact: true }),
  facebookPreviewLabel: () => page.getByText('Facebook preview', { exact: true }),

  colorPickerButton: () => page.getByRole('button', { name: sel.accentColorPickerButton }),
  accentColorHexInput: () => page.getByLabelText(sel.accentColorHexLabel),
  /** The hex input inside the opened Shade color-picker popover. */
  pickerHexInput: () => page.getByRole('textbox', { name: 'Hex color' }),
  uploadImageInput: () => page.getByLabelText(sel.uploadTagImageLabel),
  unsplashButton: () => page.getByRole('button', { name: sel.unsplashTagImageButton }),
  unsplashHeading: () => page.getByRole('heading', { name: 'Unsplash' }),

  codeInjectionTrigger: () =>
    page.getByRole('button', { name: new RegExp(sel.codeInjectionTriggerLabel) }),
  headerEditor: () =>
    page.getByRole('textbox', { name: new RegExp(`^${sel.tagHeaderEditorLabel}`) }),
  footerEditor: () =>
    page.getByRole('textbox', { name: new RegExp(`^${sel.tagFooterEditorLabel}`) }),

  actionsButton: () => page.getByRole('button', { name: sel.tagActionsButton }),
  viewPostsMenuItem: () => page.getByRole('menuitem', { name: sel.viewPostsMenuItem }),
  deleteTagMenuItem: () => page.getByRole('menuitem', { name: sel.deleteTagMenuItem, exact: true }),
  // exact: "Save" is a substring of "Saved" and the button is one element relabelling itself.
  saveButton: () => page.getByRole('button', { name: 'Save', exact: true }),
  savedButton: () => page.getByRole('button', { name: 'Saved' }),
  retryButton: () => page.getByRole('button', { name: 'Retry' }),
  backLink: () => tagDetailScreen.detail().getByRole('link', { name: 'Tags' }),

  deleteModal: () => page.getByTestId(sel.deleteTagModal),
  deletePostsCount: () => page.getByTestId(sel.deleteTagPostsCount),
  confirmDeleteButton: () => page.getByTestId(sel.confirmDeleteTag),
  deleteConfirmationText: () => page.getByText(sel.deleteTagConfirmationText),

  // Ember's ConfirmUnsavedChangesModal copy and actions.
  leaveConfirmationText: () => page.getByText('Are you sure you want to leave this page?'),
  stayButton: () => page.getByRole('button', { name: 'Stay' }),
  leaveButton: () => page.getByRole('button', { name: 'Leave' }),

  /** Error copy surfaced by save/upload failures — validation toasts, API contexts. */
  errorText: (text: string | RegExp) => page.getByText(text),

  /**
   * The name field's error element by its id — the aria-describedby target,
   * which no accessible locator reaches.
   */
  nameFieldError: () => page.elementLocator(document.getElementById('tag-name-error')!),

  /**
   * The breadcrumb link as a raw element: while a modal (e.g. the Unsplash
   * picker) marks the page inert, role-based location cannot reach it.
   */
  backLinkElement: (): HTMLAnchorElement | null =>
    document.querySelector<HTMLAnchorElement>(`[data-test-link="${sel.tagsBackLink}"]`),

  /**
   * Geometry of CodeMirror's autocomplete tooltip and its body-mounted host —
   * internal CodeMirror DOM no locator reaches; poll until it matches.
   */
  autocompleteTooltipProbe(): AutocompleteTooltipProbe | null {
    const tooltip = document.querySelector<HTMLElement>('.cm-tooltip-autocomplete');
    const tooltipParent = tooltip?.closest<HTMLElement>('.cm-tooltip-parent');
    const container = tooltipParent?.firstElementChild as HTMLElement | null;
    if (!tooltip || !tooltipParent || !container) {
      return null;
    }

    const tooltipRect = tooltip.getBoundingClientRect();

    return {
      containerBackground: getComputedStyle(container).backgroundColor,
      containerHeight: container.getBoundingClientRect().height,
      hostParent: tooltipParent.parentElement?.tagName,
      tooltipOnscreen:
        tooltipRect.bottom > 0 &&
        tooltipRect.right > 0 &&
        tooltipRect.top < window.innerHeight &&
        tooltipRect.left < window.innerWidth,
      tooltipPosition: getComputedStyle(tooltip).position,
    };
  },
};
